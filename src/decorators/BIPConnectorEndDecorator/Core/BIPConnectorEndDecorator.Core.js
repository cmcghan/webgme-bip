/*globals define, _, DEBUG, $*/
/*jshint browser: true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'text!./svgs/export-port.svg',
    'text!./svgs/join.svg',
    'text!./svgs/synchron.svg',
    'text!./svgs/trigger.svg'
], function (EXPORT_PORT_SVG,
             JOIN_SVG,
             SYNCHRON_SVG,
             TRIGGER_SVG) {

    'use strict';
    var META_TO_TEMPLATE = {
        ExportPort: EXPORT_PORT_SVG,
        Join: JOIN_SVG,
        Synchron: SYNCHRON_SVG,
        Trigger: TRIGGER_SVG
    };

    function BIPConnectorEndCore () {
        this.skinParts.$svg = null;
        this.skinParts.$svgContainer = null;
        this.prevMetaTypeName = null;
        this.metaTypeName = null;
    }

    BIPConnectorEndCore.prototype.updateSvg = function (cardinalities) {
        var template = META_TO_TEMPLATE[this.metaTypeName] || EXPORT_PORT_SVG; // TODO: Make a fall back svg.

        if (this.prevMetaTypeName !== this.metaTypeName) {
            this.skinParts.$svgContainer = this.$el.find('.svg-container');
            this.skinParts.$svgContainer.empty();

            this.skinParts.$svg = $(template);

            if (cardinalities) {
                this.skinParts.$cardinalities = this.skinParts.$svg.find('.cardinalities');
                this.skinParts.$svgContainer.popover({
                    delay: {
                        show: 150,
                        hide: 0
                    },
                    animation: false,
                    trigger: 'hover',
                    title: 'Multiplicity: ' + cardinalities.multiplicity,
                    content: 'Degree : ' + cardinalities.degree
                });
            }

            this.skinParts.$svgContainer.append(this.skinParts.$svg);
        }

        if (cardinalities) {
            if (cardinalities.multiplicity.length === 1 && cardinalities.degree.length === 1) {
                this.skinParts.$cardinalities.text(cardinalities.multiplicity + ':' + cardinalities.degree);
            } else {
                this.skinParts.$cardinalities.text('...');
            }
        }

        // Store the current one as previous for next iteration.
        this.prevMetaTypeName = this.metaTypeName;
    };

    return BIPConnectorEndCore;
});