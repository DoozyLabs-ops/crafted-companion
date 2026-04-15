/**
 * FilterPanel.js — Edition and governance level filters
 *
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define(['@uif-js/core', '@uif-js/component', '../jsx', '../store/CompanionStore'], function (core, c, h, CompanionStore) {

    var EDITIONS = ['Distillery', 'Winery', 'Brewery', 'Cross-Edition'];
    var GOVERNANCE_LEVELS = ['Minimal', 'Standard', 'Governed', 'Supervised'];

    return function FilterPanel() {
        var editionFilter = core.useSelector(function (s) { return s.editionFilter; });
        var governanceFilter = core.useSelector(function (s) { return s.governanceFilter; });
        var dispatch = core.useDispatch();

        var items = [];

        // Edition filter dropdown
        var editionOptions = [{ value: '', label: 'All Editions' }];
        for (var i = 0; i < EDITIONS.length; i++) {
            editionOptions.push({ value: EDITIONS[i], label: EDITIONS[i] });
        }

        items.push(
            h(c.StackPanel.Item, null,
                h(c.Dropdown, {
                    dataSource: new core.ArrayDataSource(editionOptions),
                    selectedValue: editionFilter || '',
                    size: c.InputSize.M,
                    onSelectedValueChanged: function (args) {
                        dispatch({
                            type: CompanionStore.Actions.SET_EDITION_FILTER,
                            payload: args.value || null
                        });
                    }
                })
            )
        );

        // Governance filter dropdown
        var govOptions = [{ value: '', label: 'All Levels' }];
        for (var j = 0; j < GOVERNANCE_LEVELS.length; j++) {
            govOptions.push({ value: GOVERNANCE_LEVELS[j], label: GOVERNANCE_LEVELS[j] });
        }

        items.push(
            h(c.StackPanel.Item, null,
                h(c.Dropdown, {
                    dataSource: new core.ArrayDataSource(govOptions),
                    selectedValue: governanceFilter || '',
                    size: c.InputSize.M,
                    onSelectedValueChanged: function (args) {
                        dispatch({
                            type: CompanionStore.Actions.SET_GOVERNANCE_FILTER,
                            payload: args.value || null
                        });
                    }
                })
            )
        );

        // Clear filters button
        if (editionFilter || governanceFilter) {
            items.push(
                h(c.StackPanel.Item, null,
                    h(c.Button, {
                        label: 'Clear Filters',
                        type: c.Button.Type.LINK,
                        action: function () {
                            dispatch({ type: CompanionStore.Actions.CLEAR_FILTERS });
                        }
                    })
                )
            );
        }

        return h(c.StackPanel, {
            orientation: c.StackPanel.Orientation.HORIZONTAL,
            itemGap: c.GapSize.S,
            alignment: c.StackPanel.VerticalAlignment.CENTER
        }, items);
    };
});
