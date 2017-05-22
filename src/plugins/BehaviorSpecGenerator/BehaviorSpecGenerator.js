/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Generated by PluginGenerator 1.7.0 from webgme on Wed Mar 08 2017 15:24:49 GMT-0600 (Central Standard Time).
 * A plugin that inherits from the PluginBase. To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 */

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'q',
    'common/util/ejs',
    'bipsrc/util/utils',
    'bipsrc/templates/ejsCache',
    'bipsrc/parsers/javaExtra',
    'bipsrc/bower_components/pegjs/peg-0.10.0'
], function (
    PluginConfig,
    pluginMetadata,
    PluginBase,
    Q,
    ejs,
    utils,
    ejsCache,
    javaParser,
    peg) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of ComponentTypeGenerator.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin ComponentTypeGenerator.
     * @constructor
     */
    var BehaviorSpecGenerator = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructue etc.
     * This is also available at the instance at this.pluginMetadata.
     * @type {object}
     */
    BehaviorSpecGenerator.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    BehaviorSpecGenerator.prototype = Object.create(PluginBase.prototype);
    BehaviorSpecGenerator.prototype.constructor = BehaviorSpecGenerator;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    BehaviorSpecGenerator.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point
        var self = this,
            filesToAdd = {},
            violations = [],
            nodes,
            artifact,
            componentTypes = [],
            guardExpressionParser,
            i,
            path, fs;

        path = self.core.getAttribute(self.core.getParent(self.activeNode), 'path');

        if (path) {
            path += '/' + self.core.getAttribute(self.activeNode, 'name');
            path = path.replace(/\s+/g, '');
            try {
                fs = require('fs');
            } catch (e) {
                self.logger.error('To save directly to file system, plugin needs to run on server!');
            }
            //console.log(path);
        }

        function checkComponentModel (componentType, fileName) {
            var deferred = Q.defer();

            utils.getModelOfComponentType(self.core, nodes[componentType]).then(function (componentModel) {
                filesToAdd[fileName] = ejs.render(ejsCache.componentType.complete, componentModel);
                var parseResult = javaParser.checkWholeFile(filesToAdd[fileName]);
                if (parseResult) {
                    self.logger.debug(parseResult.line);
                    self.logger.debug(parseResult.message);
                    parseResult.node = nodes[componentType];
                    violations.push(parseResult);
                }
                guardExpressionParser = self.getGuardExpression(componentModel);
                for (i = 0; i < componentModel.transitions.length; i += 1) {
                    if (componentModel.transitions[i].guard.length > 0) {
                        try {
                            parseResult = guardExpressionParser.parse(componentModel.transitions[i].guard);
                        } catch (e) {
                            violations.push({
                                message: 'Guard expression should be a logical expression ' +
                                'that has only defined guard names as symbols.',
                                node: nodes[componentModel.transitions[i]]
                            });
                        }
                    }
                }
                deferred.resolve();
            });
            return deferred.promise;
        }

        self.loadNodeMap(self.activeNode)
          .then(function (nodes_) {
                    var promises = [],
                        type,
                        fileName;

                    nodes = nodes_;
                    componentTypes = self.getComponentTypeNodes(nodes);
                    self.logger.debug(componentTypes.length);
                    for (type of componentTypes) {
                        fileName = self.core.getAttribute(nodes[type], 'name') + '.java';
                        self.logger.debug('filename ' + fileName);
                        promises.push(checkComponentModel(type, fileName));
                    }
                    return Q.all(promises);})
                    .then(function () {
                        var type, tempPath,
                          fileName, pathArrayForFile, j;
                        violations.push.apply(violations, self.hasViolations(componentTypes, nodes));
                        if (violations.length > 0) {
                            violations.forEach(function (violation) {
                                self.createMessage(violation.node, violation.message, 'error');
                            });
                            throw new Error ('Model has ' + violations.length + ' violation(s). See messages for details.');
                        }
                        for (type of componentTypes) {
                            fileName = self.core.getAttribute(nodes[type], 'name') + '.java';
                            pathArrayForFile = fileName.split('/');
                            if (path) {
                                if (pathArrayForFile.length >= 1) {
                                    for (j = 0; j<=pathArrayForFile.length - 1; j+=1) {
                                        tempPath += '/' + pathArrayForFile[j];
                                        try {
                                            fs.statSync(path);
                                        } catch (err) {
                                            if (err.code === 'ENOENT') {
                                                fs.mkdirSync(path);
                                            }
                                        }
                                    }
                                    fs.writeFileSync(path + '/' + fileName, filesToAdd[fileName], 'utf8');
                                }
                            }
                        }
                        artifact = self.blobClient.createArtifact('BehaviorSpecifications');
                        return artifact.addFiles(filesToAdd);
                    })
                .then(function (fileHash) {
                    self.result.addArtifact(fileHash);
                    return artifact.save();
                })
                .then(function (artifactHash) {
                    self.result.addArtifact(artifactHash);
                    self.result.setSuccess(true);
                    callback(null, self.result);
                })
                .catch(function (err) {
                    self.logger.error(err.stack);
                    // Result success is false at invocation.
                    callback(err, self.result);
                });

    };

    BehaviorSpecGenerator.prototype.getGuardExpression = function (componentModel) {
        var guardNames = [],
          i,
          guardExpressionParser;

        for (i = 0; i < componentModel.guards.length; i += 1) {
            guardNames.push(componentModel.guards[i].name);
        }
        if (guardNames.length > 0) {
            guardExpressionParser = peg.generate(
              ejs.render(ejsCache.guardExpression, {guardNames: guardNames})
          );
        }
        return guardExpressionParser;
    };

    BehaviorSpecGenerator.prototype.getComponentTypeNodes = function (nodes) {
        var self = this,
            path,
            node,
            componentTypes = [];

        for (path in nodes) {
            node = nodes[path];
            if (self.isMetaTypeOf(node, self.META.ComponentType)) {
                componentTypes.push(path);
            }
        }
        return componentTypes;
    };

    BehaviorSpecGenerator.prototype.hasViolations = function (componentTypes, nodes) {
            var componentTypeNames = {},
            name, type, node,
            child, childPath, childName,
            self = this,
            noInitialState,
            nameAndViolations = {
                violations: [],
                totalStateNames: {},
                transitionNames: {},
                guardNames: {}
            };

            for (type of componentTypes) {
                nameAndViolations.guardNames = {};
                nameAndViolations.totalStateNames = {};
                nameAndViolations.transitionNames = {};
                noInitialState = true;
                node = nodes[type];
                name = self.core.getAttribute(node, 'name');
                if (componentTypeNames.hasOwnProperty(name)) {
                    nameAndViolations.violations.push({
                        node: node,
                        message: 'Name [' + name + '] of component type [' + type + '] is not unique. Please rename. Component types must have unique names. '
                    });
                }
                componentTypeNames[name] = self.core.getPath(node);
                for (childPath of self.core.getChildrenPaths(node)) {
                    child = nodes[childPath];
                    childName = self.core.getAttribute(child, 'name');
                    if ((self.isMetaTypeOf(child, self.META.InitialState))) {
                        noInitialState = false;
                    }
                    nameAndViolations = self.hasChildViolations(child, childName, nameAndViolations);
                }
                if (noInitialState) {
                    nameAndViolations.violations.push({
                        node: node,
                        message: 'Component type [' + name + '] does not have an initial state. Please define an initial state.'
                    });
                }
            }
            return nameAndViolations.violations;
        };

    BehaviorSpecGenerator.prototype.hasChildViolations = function (child, childName, nameAndViolations) {
            var self = this;

            if ((self.isMetaTypeOf(child, self.META.State)) || (self.isMetaTypeOf(child, self.META.InitialState))) {
                if (nameAndViolations.totalStateNames.hasOwnProperty(childName)) {
                    nameAndViolations.violations.push({
                        node: child,
                        message: 'Name [' + childName + '] of state [' + child + '] is not unique. Please rename. States that belong to the same component type must have unique names.'
                    });
                }
                nameAndViolations.totalStateNames[childName] = self.core.getPath(child);
            }
            if (self.isMetaTypeOf(child, self.META.EnforceableTransition) || self.isMetaTypeOf(child, self.META.SpontaneousTransition) || self.isMetaTypeOf(child, self.META.InternalTransition)) {
                if (this.core.getPointerPath(child, 'dst') === null) {
                    nameAndViolations.violations.push({
                        node: child,
                        message: 'Transition [' + childName + '] with no destination encountered. Please connect or remove it.'
                    });
                }
                if (this.core.getPointerPath(child, 'src') === null) {
                    nameAndViolations.violations.push({
                        node: child,
                        message: 'Transition [' + childName + '] with no source encountered. Please connect or remove it.'
                    });
                }
                if (this.core.getAttribute(child, 'transitionMethod') === '') {
                    nameAndViolations.violations.push({
                        node: child,
                        message: 'Attribute transitionMethod of transition [' + childName + '] is not defined. Please define transitionMethod.'
                    });
                }
            }
            if ( self.isMetaTypeOf(child, self.META.EnforceableTransition) || self.isMetaTypeOf(child, self.META.SpontaneousTransition)) {
                if (nameAndViolations.transitionNames.hasOwnProperty(childName)) {
                    nameAndViolations.violations.push({
                        node: child,
                        message: 'Name [' + childName + '] of transition [' + child + '] is not unique. Please rename. Enforceable and spontaneous transitions of the same component type must have unique names.'
                    });
                }
                nameAndViolations.transitionNames[childName] = self.core.getPath(child);
            }
            if (self.isMetaTypeOf(child, self.META.Guard)) {
                if (nameAndViolations.guardNames.hasOwnProperty(childName)) {
                    nameAndViolations.violations.push({
                        node: child,
                        message: 'Name [' + childName + '] of guard [' + child + '] is not unique. Please rename. Guards of the same component type must have unique names.'
                    });
                }
                nameAndViolations.guardNames[childName] = self.core.getPath(child);

                if (self.core.getAttribute(child, 'guardMethod') === '') {
                    nameAndViolations.violations.push({
                        node: child,
                        message: 'Attribute guardMethod of transition [' + childName + '] is not defined. Please define guardMethod.'
                    });
                }
            }
            return nameAndViolations;
    };

    return BehaviorSpecGenerator;
});
