/**
 * CardGrid.js — Grid of prompt cards, filtered by domain/search/edition/governance
 *
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define(['@uif-js/core', '@uif-js/component', '../jsx', './PromptCard'], function (core, c, h, PromptCard) {

    return function CardGrid() {
        var prompts = core.useSelector(function (s) { return s.prompts; });
        var toolAvailability = core.useSelector(function (s) { return s.toolAvailability; });
        var selectedDomain = core.useSelector(function (s) { return s.selectedDomain; });
        var searchQuery = core.useSelector(function (s) { return s.searchQuery; });
        var editionFilter = core.useSelector(function (s) { return s.editionFilter; });
        var governanceFilter = core.useSelector(function (s) { return s.governanceFilter; });
        var dispatch = core.useDispatch();

        // Filter prompts
        var filtered = prompts.filter(function (p) {
            // Hard tool validation: hide if toolset not deployed
            var deps = p.tool_deps || [];
            for (var i = 0; i < deps.length; i++) {
                if (!toolAvailability[deps[i]]) return false;
            }

            // Domain filter
            if (selectedDomain && p.domain !== selectedDomain) return false;

            // Edition filter
            if (editionFilter && p.edition !== editionFilter && p.edition !== 'Cross-Edition') return false;

            // Governance filter
            if (governanceFilter && p.governance !== governanceFilter) return false;

            // Search filter
            if (searchQuery) {
                var q = searchQuery.toLowerCase();
                var searchable = (p.prompt_name + ' ' + p.subdomain + ' ' + p.tool_chain + ' ' + p.prompt_text).toLowerCase();
                if (searchable.indexOf(q) === -1) return false;
            }

            return true;
        });

        if (filtered.length === 0) {
            return h(c.ContentPanel, { outerGap: c.GapSize.L, horizontalAlignment: c.ContentPanel.HorizontalAlignment.CENTER },
                h(c.StackPanel, { orientation: c.StackPanel.Orientation.VERTICAL, itemGap: c.GapSize.M, alignment: c.StackPanel.HorizontalAlignment.CENTER },
                    h(c.StackPanel.Item, null,
                        h(c.Heading, { type: c.Heading.Type.MEDIUM_HEADING }, 'No prompts match your filters')
                    ),
                    h(c.StackPanel.Item, null,
                        h(c.Text, { type: c.Text.Type.WEAK }, 'Try adjusting your search, domain tab, or edition filter.')
                    )
                )
            );
        }

        // Build grid items imperatively (StackPanel rejects null children)
        var gridItems = [];
        for (var i = 0; i < filtered.length; i++) {
            (function (prompt) {
                gridItems.push(
                    h(c.GridPanel.Item, null,
                        h(PromptCard, {
                            prompt: prompt,
                            onSelect: function () {
                                dispatch({ type: 'SET_SELECTED_PROMPT', payload: prompt });
                            }
                        })
                    )
                );
            })(filtered[i]);
        }

        return h(c.GridPanel, {
            columns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: c.GapSize.M
        }, gridItems);
    };
});
