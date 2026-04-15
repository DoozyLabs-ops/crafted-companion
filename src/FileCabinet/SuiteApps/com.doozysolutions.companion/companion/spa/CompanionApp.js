/**
 * CompanionApp.js — Root component for Crafted Companion Library SPA
 *
 * Layout: ApplicationHeader > AdminBanner > Search + Filters > DomainTabs > CardGrid
 * Modal rendered at root level to avoid stacking context issues.
 *
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define([
    '@uif-js/core',
    '@uif-js/component',
    './jsx',
    './store/CompanionStore',
    './DataService',
    './components/DomainTabs',
    './components/SearchBar',
    './components/FilterPanel',
    './components/CardGrid',
    './components/PromptDetailModal',
    './components/AdminBanner'
], function (core, c, h, CompanionStore, DataService, DomainTabs, SearchBar, FilterPanel, CardGrid, PromptDetailModal, AdminBanner) {

    return function CompanionApp() {
        var store = core.useMemo(function () { return CompanionStore.createStore(); }, []);

        return h(core.Store.Provider, { store: store },
            h(AppContent, null)
        );
    };

    function AppContent() {
        var loading = core.useSelector(function (s) { return s.loading; });
        var error = core.useSelector(function (s) { return s.error; });
        var selectedPrompt = core.useSelector(function (s) { return s.selectedPrompt; });
        var dispatch = core.useDispatch();

        // Load data on mount
        core.useEffect(function () {
            var source = new core.CancellationTokenSource();
            var token = source.token;

            try {
                var prompts = DataService.loadPrompts();
                if (token.cancelled) return;
                dispatch({ type: CompanionStore.Actions.SET_PROMPTS, payload: prompts });

                var tools = DataService.loadToolAvailability();
                if (token.cancelled) return;
                dispatch({ type: CompanionStore.Actions.SET_TOOL_AVAILABILITY, payload: tools });

                var config = DataService.loadAccountConfig();
                if (token.cancelled) return;
                dispatch({ type: CompanionStore.Actions.SET_ACCOUNT_CONFIG, payload: config });

                var domains = DataService.loadDomains();
                if (token.cancelled) return;
                dispatch({ type: CompanionStore.Actions.SET_DOMAINS, payload: domains });

                dispatch({ type: CompanionStore.Actions.SET_LOADING, payload: false });
            } catch (e) {
                if (token.cancelled) return;
                dispatch({ type: CompanionStore.Actions.SET_ERROR, payload: e.message });
                dispatch({ type: CompanionStore.Actions.SET_LOADING, payload: false });
            }

            return function () { source.cancel(); };
        }, []);

        // Build root items imperatively (StackPanel rejects null)
        var rootItems = [];

        // Application header
        rootItems.push(
            h(c.StackPanel.Item, { shrink: 0 },
                h(c.ApplicationHeader, { title: 'Crafted Companion Library' })
            )
        );

        if (loading) {
            rootItems.push(
                h(c.StackPanel.Item, null,
                    h(c.ContentPanel, { outerGap: c.GapSize.XL, horizontalAlignment: c.ContentPanel.HorizontalAlignment.CENTER },
                        h(c.Loader, { label: 'Loading prompts...' })
                    )
                )
            );
        } else if (error) {
            rootItems.push(
                h(c.StackPanel.Item, null,
                    h(c.Banner, { title: 'Error loading data', color: c.Banner.Color.ORANGE, content: h(c.Text, null, error) })
                )
            );
        } else {
            // Admin banner (if toolsets missing)
            rootItems.push(
                h(c.StackPanel.Item, { shrink: 0 },
                    h(AdminBanner, null)
                )
            );

            // Search + filters row
            rootItems.push(
                h(c.StackPanel.Item, { shrink: 0 },
                    h(c.ContentPanel, { outerGap: c.GapSize.M },
                        h(c.StackPanel, { orientation: c.StackPanel.Orientation.HORIZONTAL, itemGap: c.GapSize.M, alignment: c.StackPanel.VerticalAlignment.CENTER },
                            h(c.StackPanel.Item, { grow: 1 },
                                h(SearchBar, null)
                            ),
                            h(c.StackPanel.Item, null,
                                h(FilterPanel, null)
                            )
                        )
                    )
                )
            );

            // Domain tabs
            rootItems.push(
                h(c.StackPanel.Item, { shrink: 0 },
                    h(DomainTabs, null)
                )
            );

            // Card grid
            rootItems.push(
                h(c.StackPanel.Item, { grow: 1 },
                    h(c.ContentPanel, { outerGap: c.GapSize.M },
                        h(CardGrid, null)
                    )
                )
            );
        }

        // Modal at root level (avoid stacking context issues)
        if (selectedPrompt) {
            rootItems.push(
                h(c.StackPanel.Item, null,
                    h(PromptDetailModal, null)
                )
            );
        }

        return h(c.StackPanel, {
            orientation: c.StackPanel.Orientation.VERTICAL,
            outerGap: c.GapSize.NONE,
            itemGap: c.GapSize.NONE
        }, rootItems);
    }
});
