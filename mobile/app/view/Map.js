Ext.define("AsBuilt.view.Map",{
    extend: 'GXM.Map',
    alias: 'widget.app_map',
    requires: [
        'AsBuilt.util.Config',
        'AsBuilt.view.Popup',
        'AsBuilt.view.Drawing'
    ],
    initialize:function(){
        var options = {
            projection: "EPSG:900913",
            maxExtent: new OpenLayers.Bounds(
                -128 * 156543.0339, -128 * 156543.0339,
                128 * 156543.0339, 128 * 156543.0339
            ),
            maxResolution: 156543.03390625,
            resolutions: [156543.03390625, 78271.516953125, 39135.7584765625,
                19567.87923828125, 9783.939619140625, 4891.9698095703125,
                2445.9849047851562, 1222.9924523925781, 611.4962261962891,
                305.74811309814453, 152.87405654907226, 76.43702827453613,
                38.218514137268066, 19.109257068634033, 9.554628534317017,
                4.777314267158508, 2.388657133579254, 1.194328566789627,
                0.5971642833948135, 0.25, 0.1],
            serverResolutions: [156543.03390625, 78271.516953125, 39135.7584765625,
                19567.87923828125, 9783.939619140625,
                4891.9698095703125, 2445.9849047851562,
                1222.9924523925781, 611.4962261962891,
                305.74811309814453, 152.87405654907226,
                76.43702827453613, 38.218514137268066,
                19.109257068634033, 9.554628534317017,
                4.777314267158508, 2.388657133579254,
                1.194328566789627, 0.5971642833948135],
            numZoomLevels: 19,
            units: "m",
            buffer: 0,
            transitionEffect: "resize",
            tileLoadingDelay: 300
        };

        var streets = new OpenLayers.Layer.OSM("MapQuest OpenStreetMap",
            [
                "http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
                "http://otile2.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
                "http://otile3.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png",
                "http://otile4.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.png"
            ],
            OpenLayers.Util.applyDefaults({
                attribution: AsBuilt.util.Config.getMapQuestAttribution(),
                type: "osm"
            }, options)
        );

        var drawings = new OpenLayers.Layer.WMS(null,
            AsBuilt.util.Config.getGeoserverUrl(), {
                layers: AsBuilt.util.Config.getPrefix() + ":" + AsBuilt.util.Config.getDrawingsTable(),
                version: '1.1.1',
                transparent: true,
                styles: 'docs'
            },{
                buffer: 0,
                isBaseLayer: false,
                singleTile: true
            }
        );

        var style = new OpenLayers.Style({
            pointRadius: 0
        });
        var selectStyle = new OpenLayers.Style({
            pointRadius: 12,
            fillColor: 'F98D0C',
            strokeColor: 'E3E3D9',
            strokeWidth: 4
        });
        var styleMap = new OpenLayers.StyleMap({
            "default": style,
            "select": selectStyle
        });

        var drawings_vector = new OpenLayers.Layer.Vector(null, {
            styleMap: styleMap,
            protocol: new OpenLayers.Protocol.WFS({
                url: AsBuilt.util.Config.getGeoserverUrl(),
                featureType: AsBuilt.util.Config.getDrawingsTable(),
                featureNS: AsBuilt.util.Config.getFeatureNS(),
                geometryName: AsBuilt.util.Config.getGeomField(),
                version: "1.1.0",
                maxFeatures: 100,
                srsName: "EPSG:900913",
                outputFormat: 'json',
                readFormat: new OpenLayers.Format.GeoJSON()
            }),
            eventListeners: {
                "loadstart": function(evt) {
                    this._filter = evt.filter;
                },
                "loadend": function(evt) {
                    if (evt.response.features.length === evt.object.protocol.maxFeatures) {
                        if (!this.hitCount) {
                            this.hitCount = new OpenLayers.Protocol.WFS({
                                version: "1.1.0",
                                readOptions: {output: "object"},
                                resultType: "hits",
                                url: AsBuilt.util.Config.getGeoserverUrl(),
                                featureType: AsBuilt.util.Config.getDrawingsTable(),
                                featureNS: AsBuilt.util.Config.getFeatureNS()
                            });
                        }
                        this.hitCount.read({filter: this._filter, callback: function(response) {
                            var list = Ext.Viewport.down('toolbar[type="featurelist"]');
                            var filter = Ext.Viewport.down('segmentedbutton[type="mapped"]');
                            var pressed = filter.getPressedButtons();
                            var text = '';
                            if (pressed.length === 1) {
                                text = pressed[0].getText().toLowerCase();
                            }
                            if (text === 'all') {
                                text = '';
                            } else if (text !== '') {
                                text = ' ' + text;
                            }
                            list.down('container').setHtml('Your search returned ' + 
                                response.numberOfFeatures + text + ' images. Showing the first ' + 
                                evt.object.protocol.maxFeatures + '.');
                            list.show();
                        }});
                    } else {
                        Ext.Viewport.down('toolbar[type="featurelist"]').hide();
                    }
                },
                scope: this
            },
            renderers: ['Canvas'],
            strategies: [
                new OpenLayers.Strategy.BBOX({
                    autoActivate: false, 
                    active: false
                }), 
                new OpenLayers.Strategy.Fixed({
                    autoActivate: false, 
                    active: false
                })
            ]
        });

        var map = new OpenLayers.Map({
            projection: "EPSG:900913",
            autoUpdateSize: false,
            theme: null,
            hasTransform3D: false,
            controls : [
                new OpenLayers.Control.Zoom(),
                new OpenLayers.Control.TouchNavigation({
                    dragPanOptions : {
                        interval : 100,
                        enableKinetic : true
                    }
                }),
                new OpenLayers.Control.Attribution(),
                new OpenLayers.Control.WMSGetFeatureInfo({
                    infoFormat: "application/vnd.ogc.gml",
                    vendorParams: {
                        radius: 15
                    },
                    maxFeatures: 1,
                    layers: [drawings],
                    autoActivate: true,
                    eventListeners: {
                        "getfeatureinfo": function(evt) {
                            var erase = function(destroy) {
                                if (this.feature) {
                                    drawings_vector.eraseFeatures([this.feature]);
                                    if (destroy === true) {
                                        this.feature.destroy();
                                        this.feature = null;
                                    }
                                }
                            };
                            erase.call(this, true);
                            if (evt.features && evt.features.length === 1) {
                                var feature = evt.features[0];
                                Ext.Viewport.down("gxm_featurelist").deselectAll();
                                feature.geometry = feature.geometry.transform("EPSG:4326", "EPSG:900913");
                                drawings_vector.drawFeature(feature, "select");
                                this.feature = feature;
                                if (!this.popup) {
                                    this.popup = Ext.Viewport.add({
                                        xtype: 'app_popup',
                                        cls: 'featurepopup', 
                                        modal: false,
                                        maxWidth: '17em',
                                        feature: feature,
                                        centered: false,
                                        zIndex: 1000,
                                        tpl: new Ext.XTemplate('<div class="fp-title"><tpl if="feature.attributes.SDRAWTITLE != null">{feature.attributes.SDRAWTITLE}<tpl else>Title unknown</tpl><span class="follow">&gt;</span></div><div class="fp-container"><div class="fp-type"><tpl if="feature.attributes.TYPEDESC != null">{feature.attributes.TYPEDESC}<tpl else>Type unknown</tpl></div><div class="fp-date"><tpl if="feature.attributes.DDRAWDATE != null">{feature.attributes.DDRAWDATE}<tpl else>Date unknown</tpl></div></div>')
                                    });
                                    this.popup.on('show', function() { this.feature && drawings_vector.drawFeature(this.feature, "select"); }, this);
                                    this.popup.on('hide', erase, this);
                                    this.popup.element.on('tap', this.onTap, this);
                                } else {            
                                    this.popup.setFeature(feature);
                                }
                                this.popup.show();
                            } else {
                                if (this.popup) {
                                    this.popup.hide();
                                }
                            }
                        },
                        scope: this
                    }
                }),
                new OpenLayers.Control.Geolocate({
                    bind: false,
                    autoActivate: true,
                    eventListeners: {
                        "locationupdated": function(e) {
                            this.vector.removeAllFeatures();
                            var circle = new OpenLayers.Feature.Vector(
                                OpenLayers.Geometry.Polygon.createRegularPolygon(
                                    new OpenLayers.Geometry.Point(e.point.x, e.point.y),
                                    e.position.coords.accuracy/2,
                                    40,
                                    0
                                ),
                                {},
                                {
                                    fillColor: '#000',
                                    fillOpacity: 0.1,
                                    strokeWidth: 0
                                }
                            );
                            this.vector.addFeatures([
                                new OpenLayers.Feature.Vector(
                                    e.point,
                                    {},
                                    {
                                        graphicName: 'circle',
                                        strokeColor: '#ff0000',
                                        strokeWidth: 1,
                                        fillOpacity: 0.5,
                                        fillColor: '#0000ff',
                                        pointRadius: 8
                                    }
                                ),
                                circle
                            ]);
                        },
                        scope: this
                    },
                    geolocationOptions: {
                        enableHighAccuracy: true,
                        maximumAge: 0,
                        timeout: 7000
                    }
                })
            ]
        });

        this.vector = new OpenLayers.Layer.Vector();
        map.addLayers([streets, drawings, this.vector, drawings_vector]);
        this.setMap(map);
        this.setMapExtent(OpenLayers.Bounds.fromArray(AsBuilt.util.Config.getBounds()));
        this.callParent(arguments);
    },

    onTap: function() {
        this.popup.hide();
        var f = this.popup.getFeature();
        var drawing = Ext.create('AsBuilt.view.Drawing', {
            fid: f.fid,
            attributes: f.attributes
        });
        var search = Ext.Viewport.down('app_search');
        if (search) {
            search.hide();
        }
        Ext.Viewport.add(drawing);
        Ext.Viewport.setActiveItem(drawing);
    },

    onGeoUpdate: Ext.emptyFn

});
