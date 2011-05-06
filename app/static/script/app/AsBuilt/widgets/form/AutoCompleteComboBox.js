/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the BSD license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @include AsBuilt/data/AutoCompleteReader.js
 * @include AsBuilt/data/AutoCompleteProxy.js
 */

/** api: (define)
 *  module = AsBuilt.form
 *  class = AutoCompleteComboBox
 *  base_link = `Ext.form.ComboBox <http://extjs.com/deploy/dev/docs/?class=Ext.form.ComboBox>`_
 */
Ext.namespace("AsBuilt.form");

/** api: constructor
 *  .. class:: AutoCompleteComboBox(config)
 *
 *  Creates an autocomplete combo box that issues queries to a WFS typename.
 *
 */
AsBuilt.form.AutoCompleteComboBox = Ext.extend(Ext.form.ComboBox, {

    /** api: xtype = app_autocompletecombo */
    xtype: "app_autocompletecombo",

    id: null,

    featureType: null,

    featurePrefix: null,

    fieldLabel: null,

    geometryName: null,

    maxFeatures: 500,

    url: null,

    autoHeight: true,

    hideTrigger: true,

    srsName: null,

    /** api: config[customSortInfo]
     *  ``Object``
     *  Providing custom sort info allows sorting of a single field value by
     *  multiple parts within that value.  For example, a value representing
     *  a street address like "1234 Main Street" would make sense to sort first
     *  by "Main Street" (case insensitive) and then by "1234" (as an integer).
     *  The ``customSortInfo`` object must contain ``matcher`` and ``parts``
     *  properties.
     *
     *  The ``matcher`` value will be used to create a regular expression (with 
     *  ``new RegExp(matcher)``).  This regular expression is assumed to have 
     *  grouping parentheses for each part of the value to be compared.
     * 
     *  The ``parts`` value must be an array with the same length as the number
     *  of groups, or parts of the value to be compared.  Each item in the 
     *  ``parts`` array may have an ``order`` property and a ``sortType``
     *  property.  The optional ``order`` value determines precedence for a part
     *  (e.g. part with order 0 will be compared before part with order 1).
     *  The optional ``sortType`` value must be a string matching one of the
     *  ``Ext.data.SortTypes`` methods (e.g. "asFloat").
     *
     *  Example custom sort info to match addresses like "123 Main St" first by
     *  street name and then by number:
     *
     *  .. code-block:: javascript
     *  
     *      customSortInfo: {
     *          matcher: "^(\\d+)\\s(.*)$",
     *          parts: [
     *              {order: 1, sortType: "asInt"},
     *              {order: 0, sortType: "asUCString"}
     *          ]
     *      }
     */
    customSortInfo: null,

    /** private: method[initComponent]
     *  Override
     */
    initComponent: function() {
        var fields = [{name: this.id}];
        var propertyNames = [this.id];
        if (this.geometryName !== null) {
            fields.push({name: this.geometryName});
            propertyNames.push(this.geometryName);
        }
        this.name = this.valueField = this.displayField = this.id;
        this.tpl = new Ext.XTemplate('<tpl for="."><div class="x-form-field">','{'+this.name+'}','</div></tpl>');
        this.itemSelector = 'div.x-form-field';
        this.store = new Ext.data.Store({
            fields: fields,
            reader: new AsBuilt.data.AutoCompleteReader({uniqueField: this.id}, propertyNames),
            proxy: new AsBuilt.data.AutoCompleteProxy({protocol: new OpenLayers.Protocol.WFS({
                version: "1.1.0",
                url: this.url,
                featureType: this.featureType,
                featurePrefix: this.featurePrefix,
                srsName: this.srsName,
                propertyNames: propertyNames,
                maxFeatures: this.maxFeatures
            }), setParamsAsOptions: true}),
            sortInfo: this.customSortInfo && {
                field: this.id,
                direction: this.customSortInfo.direction
            }
        });
        if (this.customSortInfo) {
            this.store.createSortFunction = this.createCustomSortFunction();
        }
        return AsBuilt.form.AutoCompleteComboBox.superclass.initComponent.apply(this, arguments);
    },
    
    /** private: method[createCustomSortFunction]
     *  If a ``customSortInfo`` property is provided, this method will be called
     *  to replace the store's ``createSortFunction`` method.
     */
    createCustomSortFunction: function() {

        /** Example customSortInfo:
         *
         *  customSortInfo: {
         *      matcher: "^(\\d+)\\s(.*)$",
         *      parts: [
         *          {order: 1, sortType: "asInt"},
         *          {order: 0, sortType: "asUCString"}
         *      ]
         *  };
         */
        
        var matchRE = new RegExp(this.customSortInfo.matcher);
        var num = this.customSortInfo.parts.length;
        var orderLookup = new Array(num);
        var part;
        for (var i=0; i<num; ++i) {
            part = this.customSortInfo.parts[i];
            orderLookup[i] = {
                index: i,
                sortType: Ext.data.SortTypes[part.sortType || "none"],
                order: part.order || 0
            };
        }
        orderLookup.sort(function(a, b) {
            return a.order - b.order;
        });

        // this method is the replacement for store.createSortFunction
        return function(field, direction) {
            direction = direction || "ASC";
            var directionModifier = direction.toUpperCase() == "DESC" ? -1 : 1;
            
            // this is our custom comparison function that uses the given regex
            // to sort by parts of a single field value
            return function(r1, r2) {
                var d1 = r1.data[field];
                var d2 = r2.data[field];
                var matches1 = matchRE.exec(d1) || [];
                var matches2 = matchRE.exec(d2) || [];
                
                // compare matched parts in order - stopping at first unequal match
                var cmp, v1, v2, lookup;
                for (var i=0, ii=orderLookup.length; i<ii; ++i) {
                    lookup = orderLookup[i];
                    v1 = lookup.sortType(matches1[lookup.index + 1] || d1);
                    v2 = lookup.sortType(matches2[lookup.index + 1] || d2);
                    cmp = (v1 > v2 ? 1 : (v1 < v2 ? -1 : 0));
                    if (cmp) {
                        break;
                    }
                }
                // flip the sign if descending
                return directionModifier * cmp;
            };
        };

    }

});

Ext.reg(AsBuilt.form.AutoCompleteComboBox.prototype.xtype, AsBuilt.form.AutoCompleteComboBox);
