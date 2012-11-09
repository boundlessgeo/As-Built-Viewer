Ext.define('AsBuilt.view.Drawing', {
    extend: 'Ext.Container',
    requires: ['AsBuilt.util.Config', 'GXM.Map', 'Ext.SegmentedButton'],
    xtype: 'app_drawing',

    config: {
        attributes: null,
        fid: null,
        layout: 'fit',
        items: [{
            xtype: 'toolbar',
            docked: 'top',
            height: 50,
            items: [{
                xtype: 'segmentedbutton',
                defaults: {
                    ui: 'drawing'
                },
                items: [{
                    text: "Details"
                }, {
                    text: "Notes"
                }]
            }, {
                xtype: 'spacer',
                flex: 1
            }, {
                text: "Done"
            }]
        }]
    },

    initialize: function() {
        var attributes = this.getAttributes();
        // get the notes
        Ext.getStore('Notes').on({'load': function(store, records) {
            var item = this.down('segmentedbutton').getItems().items[1];
            if (records.length > 0) {
                item.setText(
                    records.length + " Notes"
                );
                item.title = "Notes";
                AsBuilt.app.getController('Notes').showNotes();
            } else { 
                item.setText(
                    'Add Note'
                );
                item.title = "Notes";
            } 
        }, scope: this});
        Ext.getStore('Notes').load({
            filter: new OpenLayers.Filter.Comparison({
                type: '==',
                property: 'DOC_ID',
                value: this.getFid().split(".").pop()
            })
        });
        // remove first / and add file extension
        var path = attributes.PATH;
        if (path.charAt(0) === "/") {
            path = path.substring(1);
        }
        path = path + "." + attributes.FILETYPE;
        var width = parseInt(attributes.WIDTH, 10);
        var height = parseInt(attributes.HEIGHT, 10);
        var map = new OpenLayers.Map({
            projection: "EPSG:404000",
            autoUpdateSize: false,
            theme: null,
            hasTransform3D: false,
            maxExtent: new OpenLayers.Bounds(
                0, -height,
                width, 0
            ),
            maxResolution: width/256,
            units: "m",
            controls : [
                new OpenLayers.Control.TouchNavigation({
                    dragPanOptions : {
                        interval : 100,
                        enableKinetic : true
                    }
                })
            ]
        });
        map.addLayers([new OpenLayers.Layer.WMS(null,
            AsBuilt.util.Config.getGeoserverUrl(), {
               layers: AsBuilt.util.Config.getPrefix() + ":" + AsBuilt.util.Config.getImagesLayer(),
               CQL_FILTER: "PATH='"+path+"'"
            }, {
               buffer: 0,
               transitionEffect: "resize",
               tileLoadingDelay: 300
            }
        )]);
        var mapZoom = 3;
        var res = map.getResolutionForZoom(mapZoom);
        var size = Ext.Viewport.getSize(), w = size.width, h = size.height;
        var factorX = (1 - ((res*w)/width/2));
        var factorY = (1 - ((res*h)/height/2));
        var center = [factorX*width, -factorY*height];
        this.add(Ext.create('GXM.Map', {map: map, mapCenter: center, mapZoom: mapZoom}));
        this.callParent(arguments);
    }
});
