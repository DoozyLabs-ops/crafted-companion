/**
 * AdminBanner.js — Shows which toolsets need deployment to unlock domains
 *
 * Only visible when some domains are hidden due to missing toolsets.
 *
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define(['@uif-js/core', '@uif-js/component', '../jsx'], function (core, c, h) {

    var TOOLSET_DISPLAY = {
        'barrel-intelligence': 'Barrel Intelligence',
        'lot-profitability': 'Lot Profitability',
        'inventory-supply': 'Inventory & Supply Chain',
        'compliance-audit': 'Compliance & Audit',
        'mrp-intelligence': 'MRP Intelligence',
        'batch-genealogy': 'Batch & Genealogy'
    };

    return function AdminBanner() {
        var toolAvailability = core.useSelector(function (s) { return s.toolAvailability; });

        var missing = [];
        var keys = Object.keys(toolAvailability);
        for (var i = 0; i < keys.length; i++) {
            if (!toolAvailability[keys[i]]) {
                missing.push(TOOLSET_DISPLAY[keys[i]] || keys[i]);
            }
        }

        if (missing.length === 0) return null;

        return h(c.Banner, {
            title: 'Additional domains available',
            color: c.Banner.Color.BLUE,
            content: h(c.Text, null,
                'Deploy these toolsets to unlock more prompts: ' + missing.join(', ') + '.'
            )
        });
    };
});
