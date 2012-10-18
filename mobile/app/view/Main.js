Ext.define("AsBuilt.view.Main", {
    extend: 'Ext.Container',
    xtype: 'main',
    requires: [
        'AsBuilt.view.Map'
    ],
    config: {
        user: null,
        fullscreen: true,
        layout: 'fit',
        items: [
            {
                xtype: 'app_map'
            }, {
                xtype: 'toolbar',
                height: 50,
                docked: 'bottom',
                items: [{
                    xtype: 'spacer',
                    flex: 1
                }, {
                    iconMask: 'true',
                    iconCls: 'search'
                }, {
                    text: 'Cancel',
                    hidden: true
                }, {
                    text: 'Reset',
                    hidden: true
                }, {
                    text: 'Modify Search',
                    hidden: true
                }]
            }
        ]
    }
});
