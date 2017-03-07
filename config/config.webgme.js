// DO NOT EDIT THIS FILE
// This file is automatically generated from the webgme-setup-tool.
'use strict';


var config = require('webgme/config/config.default'),
    validateConfig = require('webgme/config/validator');

// The paths can be loaded from the webgme-setup.json
config.plugin.basePaths.push(__dirname + '/../src/plugins');
config.visualization.decoratorPaths.push(__dirname + '/../src/decorators');
config.seedProjects.basePaths.push(__dirname + '/../src/seeds/BIP');



config.visualization.panelPaths.push(__dirname + '/../node_modules/webgme-codeeditor/src/visualizers/panels');
config.visualization.panelPaths.push(__dirname + '/../node_modules/diagram-designers/src/visualizers/panels');




// Visualizer descriptors
config.visualization.visualizerDescriptors.push(__dirname + '/../src/visualizers/Visualizers.json');
// Add requirejs paths
config.requirejsPaths = {
  'ModelEditorDD': 'panels/ModelEditor/ModelEditorPanel',
  'CodeEditor': 'panels/CodeEditor/CodeEditorPanel',
  'panels': './src/visualizers/panels',
  'widgets': './src/visualizers/widgets',
  'panels/ModelEditor': './node_modules/diagram-designers/src/visualizers/panels/ModelEditor',
  'widgets/ModelEditor': './node_modules/diagram-designers/src/visualizers/widgets/ModelEditor',
  'panels/CodeEditor': './node_modules/webgme-codeeditor/src/visualizers/panels/CodeEditor',
  'widgets/CodeEditor': './node_modules/webgme-codeeditor/src/visualizers/widgets/CodeEditor'
};


config.mongo.uri = 'mongodb://127.0.0.1:27017/bip';
validateConfig(config);
module.exports = config;
