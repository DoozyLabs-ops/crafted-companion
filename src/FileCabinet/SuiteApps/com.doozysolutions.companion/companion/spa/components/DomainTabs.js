/**
 * DomainTabs.js — Tab panel with one tab per Crafted domain
 *
 * Tabs are hidden for domains with no deployed toolset (hard tool validation).
 * "All" tab shows all prompts across domains.
 *
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define(['@uif-js/core', '@uif-js/component', '../jsx', '../store/CompanionStore'], function (core, c, h, CompanionStore) {

    return function DomainTabs() {
        var domains = core.useSelector(function (s) { return s.domains; });
        var toolAvailability = core.useSelector(function (s) { return s.toolAvailability; });
        var selectedDomain = core.useSelector(function (s) { return s.selectedDomain; });
        var dispatch = core.useDispatch();

        // Domain-to-toolset mapping
        var domainToolsets = {
            'Barrel Operations': 'barrel-intelligence',
            'Lot Profitability': 'lot-profitability',
            'Inventory & Supply Chain': 'inventory-supply',
            'Compliance & Audit': 'compliance-audit',
            'MRP Intelligence': 'mrp-intelligence',
            'Batch & Genealogy': 'batch-genealogy'
        };

        // Build tabs imperatively
        var tabs = [];

        // "All" tab always visible
        tabs.push(
            h(c.TabPanel.Tab, { label: 'All', value: '__all__' })
        );

        // Domain tabs — hidden if toolset not deployed
        for (var i = 0; i < domains.length; i++) {
            var domain = domains[i];
            var toolsetKey = domainToolsets[domain.name];
            if (toolsetKey && !toolAvailability[toolsetKey]) continue;
            tabs.push(
                h(c.TabPanel.Tab, { label: domain.name, value: domain.name })
            );
        }

        var currentValue = selectedDomain || '__all__';

        return h(c.TabPanel, {
            selectedValue: currentValue,
            on: {
                selectionChanged: function (args) {
                    var val = args.value === '__all__' ? null : args.value;
                    dispatch({ type: CompanionStore.Actions.SET_SELECTED_DOMAIN, payload: val });
                }
            }
        }, tabs);
    };
});
