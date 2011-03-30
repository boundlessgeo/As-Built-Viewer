/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the BSD license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

Ext.ns("AsBuilt");

/** api: (define)
 *  module = AsBuilt
 *  class = Search
 *  extends = gxp.plugins.Tool
 */

/** api: constructor
 *  .. class:: Search(config)
 *
 *    Search for images.
 */
AsBuilt.Search = Ext.extend(gxp.plugins.Tool, {

    /** api: ptype = app_search */
    ptype: "app_search",

    /** api: config[featureManager]
     *  ``String`` The id of the :class:`gxp.plugins.FeatureManager` to use
     *  with this tool.
     */
    featureManager: null,

    /** api: config[attributeLabel]
     *  ``String``
     *  Label for attributes fieldset (i18n).
     */
    attributeLabel: "Image attributes",

    /** api: config[streetLabel]
     *  ``String``
     *  Label for street fieldset (i18n).
     */
    streetLabel: "Street location",

    /** api: config[queryActionText]
     *  ``String``
     *  Text for query action (i18n).
     */
    queryActionText: "Query",

    /** private: cnns
     * ``Array(String)`` List of center network node identifiers
     * to use in the search.
     */
    cnns: null,

    /** api: method[init]
     *  :arg target: ``gxp.Viewer``
     *  Initialize the plugin.
     */
    init: function(target) {
        AsBuilt.Search.superclass.init.apply(this, arguments);
        this.initContainer();
    },

    addActions: function(config) {
        this.addOutput();
        return AsBuilt.Search.superclass.addActions.call(this, []);
    },

    getCnnList: function() {
        var street = Ext.getCmp('streetname').getValue();
        var start = Ext.getCmp('start_intersection').getValue();
        var end = Ext.getCmp('end_intersection').getValue();
        if (street != "" && start != "" && end != "") {
            Ext.Ajax.request({
                url: '/stub/' + street + '-cnn.json',
                success: function(response) {
                    var cnn = Ext.decode(response.responseText).cnn;
                    // take all cnn from minIndex to maxIndex - 1
                    var minIndex = Math.min(start, end);
                    var maxIndex = Math.max(start, end);
                    this.cnns = [];
                    for (var key in cnn) {
                        key = parseInt(key);
                        if (key >= minIndex && key < maxIndex) {
                            this.cnns = this.cnns.concat(cnn[key]);
                        }
                    }
                },
                failure: function() {
                    // TODO handle failure
                },
                scope: this
            });
        }
    },

    performSearch: function() {
        var featureManager = this.target.tools[this.featureManager];
        var filters = [];
        // always use a BBOX filter
/*        filters.push(new OpenLayers.Filter.Spatial({
            type: OpenLayers.Filter.Spatial.BBOX,
            property: featureManager.featureStore.geometryName,
            value: this.target.mapPanel.map.getExtent()
        }));*/
        if (this.cnns) {
            var subFilters = [];
            for (var i=0,ii=this.cnns.length;i<ii;i++) {
                subFilters.push(new OpenLayers.Filter.Comparison({
                    type: OpenLayers.Filter.Comparison.LIKE,
                    property: 'cnn',
                    value: '*' + this.cnns[i] + '*'
                }));
            }
            if (subFilters.length > 1) {
                filters.push(new OpenLayers.Filter.Logical({
                    type: OpenLayers.Filter.Logical.OR,
                    filters: subFilters
                }));
            } else {
                filters.push(subFilters[0]);
            }
        }
        featureManager.loadFeatures(
            new OpenLayers.Filter.Logical({
                type: OpenLayers.Filter.Logical.AND,
                filters: filters
            })
        );
    },

    /** private: method[initContainer]
     *  Create the primary output container.  All other items will be added to 
     *  this when the group feature store is ready.
     */
    initContainer: function() {

        this.container = new Ext.Container(Ext.apply({
            layout: "fit",
            items: [{
                layout: "form",
                bbar: ["->", {text: this.queryActionText, iconCls: "gxp-icon-find", handler: this.performSearch, scope: this}],
                border: false,
                bodyStyle: "padding: 5px",
                items: [{
                    xtype: "fieldset",
                    title: this.attributeLabel,
                    items: [{
                        xtype: "combo",
                        disabled: true,
                        name: 'mechanical_type',
                        fieldLabel: "Mechanical type"
                    }]}, {
                    xtype: "fieldset",
                    title: this.streetLabel,
                    items: [{
                        xtype: "combo",
                        name: "streetname",
                        id: "streetname",
                        fieldLabel: "Street name",
                        emptyText: "Select a street",
                        triggerAction: 'all',
                        listeners: {
                            "select": function(cmb, rec, idx) {
                                var store = new Ext.data.JsonStore({
                                    fields: ['name', 'index'],
                                    root: 'intersections',
                                    autoLoad: true,
                                    url: "/stub/"+cmb.getValue()+"-intersections.json"
                                });
                                var cmps = ['start_intersection', 'end_intersection'];
                                for (var i=0,ii=cmps.length; i<ii; i++) {
                                    var cmp = Ext.getCmp(cmps[i]);
                                    cmp.clearValue();
                                    cmp.bindStore(store);
                                    cmp.enable();
                                }
                            },
                            scope: this
                        },
                        displayField: 'name',
                        valueField: 'id',
                        store: new Ext.data.JsonStore({
                            fields: ['name', 'id'],
                            root: 'streets',
                            url: "/stub/streets.json"
                        })
                    }, {
                        xtype: "combo",
                        id: 'start_intersection',
                        disabled: true,
                        displayField: 'name',
                        valueField: "index",
                        triggerAction: 'all',
                        listeners: {
                            "select": this.getCnnList,
                            scope: this
                        },
                        mode: 'local',
                        name: "start_intersection",
                        fieldLabel: "Starting intersection"
                    }, {
                        xtype: "combo",
                        id: 'end_intersection',
                        disabled: true,
                        displayField: 'name',
                        valueField: "index",
                        triggerAction: 'all',
                        listeners: {
                            "select": this.getCnnList,
                            scope: this
                        },
                        mode: 'local',
                        name: "end_intersection",
                        fieldLabel: "Ending intersection"
                    }]
                }]
            }]
        }, this.outputConfig));
        delete this.outputConfig;
    },

    /** api: method[addOutput]
     */
    addOutput: function() {
        return AsBuilt.Search.superclass.addOutput.call(this, this.container);
    }

});

Ext.preg(AsBuilt.Search.prototype.ptype, AsBuilt.Search);
