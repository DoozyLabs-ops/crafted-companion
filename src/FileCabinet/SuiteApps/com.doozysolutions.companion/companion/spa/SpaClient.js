/**
 * SpaClient.js — Crafted Companion Library SPA (bundled)
 *
 * Single-file UIF SPA containing all components, store, data service,
 * and JSX factory. UIF SPA runtime requires a single entry point with
 * no relative module imports.
 *
 * @NApiVersion 2.1
 * @NScriptType SpaClientScript
 */
define(['@uif-js/core', '@uif-js/component', 'N/query', 'N/runtime', 'N/log'], function (core, c, query, runtime, log) {

    // ========== JSX FACTORY ==========

    function flattenChildren(args) {
        var result = [];
        for (var i = 0; i < args.length; i++) {
            var child = args[i];
            if (child === false || child === true || child == null) continue;
            if (Array.isArray(child)) {
                var flat = flattenChildren(child);
                for (var j = 0; j < flat.length; j++) result.push(flat[j]);
            } else {
                result.push(child);
            }
        }
        return result;
    }

    function h(type, props) {
        var children = [];
        for (var i = 2; i < arguments.length; i++) children.push(arguments[i]);
        var flat = flattenChildren(children);
        if (flat.length === 0) return core.VDom(type, props);
        if (flat.length === 1) return core.VDom(type, props, flat[0]);
        return core.VDom(type, props, flat);
    }

    // ========== DATA SERVICE ==========

    function runSQL(sql, params) {
        var rs = query.runSuiteQL({ query: sql, params: params || [] });
        var rows = rs.asMappedResults();
        rows.forEach(function (row) {
            Object.keys(row).forEach(function (k) {
                if (row[k] && typeof row[k] === 'object' && typeof row[k].toString === 'function') {
                    var s = row[k].toString();
                    if (s === '[object ScriptNullObjectAdapter]') row[k] = null;
                    else row[k] = s;
                }
            });
        });
        return rows;
    }

    function parseJSON(str, fallback) {
        if (!str) return fallback;
        try { return JSON.parse(str); } catch (e) { return fallback; }
    }

    function loadPrompts() {
        var sql = 'SELECT ' +
            'pm.id AS meta_id, ' +
            'pm.custrecord_dz_pm_prompt_ref AS prompt_id, ' +
            'pm.externalid AS external_id, ' +
            'p.name AS prompt_name, ' +
            'p.custrecord_atlas_aicomp_prompt_text AS prompt_text, ' +
            'BUILTIN.DF(pm.custrecord_dz_pm_domain) AS domain, ' +
            'pm.custrecord_dz_pm_domain AS domain_id, ' +
            'pm.custrecord_dz_pm_subdomain AS subdomain, ' +
            'pm.custrecord_dz_pm_toolset AS toolset, ' +
            'pm.custrecord_dz_pm_tool_chain AS tool_chain, ' +
            'pm.custrecord_dz_pm_entry_tool AS entry_tool, ' +
            'pm.custrecord_dz_pm_steps AS steps, ' +
            'pm.custrecord_dz_pm_tool_deps AS tool_deps, ' +
            'BUILTIN.DF(pm.custrecord_dz_pm_edition) AS edition, ' +
            'pm.custrecord_dz_pm_edition AS edition_id, ' +
            'pm.custrecord_dz_pm_edition_notes AS edition_notes, ' +
            'pm.custrecord_dz_pm_params AS params, ' +
            'pm.custrecord_dz_pm_safety_rules AS safety_rules, ' +
            'BUILTIN.DF(pm.custrecord_dz_pm_governance) AS governance, ' +
            'pm.custrecord_dz_pm_governance AS governance_id, ' +
            'pm.custrecord_dz_pm_artifact AS artifact, ' +
            'pm.custrecord_dz_pm_artifact_type AS artifact_type, ' +
            'pm.custrecord_dz_pm_version AS version, ' +
            'pm.custrecord_dz_pm_author AS author, ' +
            'BUILTIN.DF(pm.custrecord_dz_pm_status) AS status ' +
            'FROM customrecord_dz_prompt_meta pm ' +
            'JOIN customrecord_atlas_aicomp_prompts p ' +
            '  ON pm.custrecord_dz_pm_prompt_ref = p.id ' +
            "WHERE BUILTIN.DF(pm.custrecord_dz_pm_status) = 'Active' " +
            'ORDER BY pm.custrecord_dz_pm_domain, p.name';

        var rows = runSQL(sql);
        return rows.map(function (r) {
            return {
                meta_id: r.meta_id, prompt_id: r.prompt_id, external_id: r.external_id,
                prompt_name: r.prompt_name || '', prompt_text: r.prompt_text || '',
                domain: r.domain || '', domain_id: r.domain_id,
                subdomain: r.subdomain || '', toolset: r.toolset || '',
                tool_chain: r.tool_chain || '', entry_tool: r.entry_tool || '',
                steps: parseJSON(r.steps, []), tool_deps: parseJSON(r.tool_deps, []),
                edition: r.edition || '', edition_id: r.edition_id,
                edition_notes: r.edition_notes || '',
                params: parseJSON(r.params, {}), safety_rules: parseJSON(r.safety_rules, []),
                governance: r.governance || '', governance_id: r.governance_id,
                artifact: r.artifact === 'T', artifact_type: r.artifact_type || '',
                version: r.version || '', author: r.author || '', status: r.status || ''
            };
        });
    }

    function loadToolAvailability() {
        var rows = runSQL("SELECT scriptid, name FROM custtoolset WHERE isinactive = 'F'");
        var availability = {
            'barrel-intelligence': false, 'lot-profitability': false,
            'inventory-supply': false, 'compliance-audit': false,
            'mrp-intelligence': false, 'batch-genealogy': false
        };
        rows.forEach(function (r) {
            var sid = (r.scriptid || '').toLowerCase();
            if (sid.indexOf('brl') > -1 || sid.indexOf('barrel') > -1) availability['barrel-intelligence'] = true;
            if (sid.indexOf('lot') > -1) availability['lot-profitability'] = true;
            if (sid.indexOf('inv') > -1 || sid.indexOf('bom') > -1 || sid.indexOf('item') > -1) availability['inventory-supply'] = true;
            if (sid.indexOf('compliance') > -1 || sid.indexOf('audit') > -1) availability['compliance-audit'] = true;
            if (sid.indexOf('mrp') > -1) availability['mrp-intelligence'] = true;
            if (sid.indexOf('genealogy') > -1 || sid.indexOf('batch') > -1 || sid.indexOf('lineage') > -1) availability['batch-genealogy'] = true;
        });
        return availability;
    }

    function loadAccountConfig() {
        var config = { accountId: runtime.accountId, editions: [], crafted_installed: false };
        try {
            var rows = runSQL('SELECT custrecord_dz_ic_ce_installed, custrecord_dz_ic_editions FROM customrecord_dz_intel_config WHERE id = 1');
            if (rows.length > 0) {
                config.crafted_installed = rows[0].custrecord_dz_ic_ce_installed === 'T';
                config.editions = (rows[0].custrecord_dz_ic_editions || '').split(',').map(function (e) { return e.trim(); }).filter(function (e) { return e; });
            }
        } catch (e) {
            log.debug({ title: 'DataService', details: 'Intel config not available: ' + e.message });
        }
        return config;
    }

    function loadDomains() {
        return runSQL('SELECT id, name FROM customlist_dz_pm_domain ORDER BY id');
    }

    // ========== STORE ==========

    var Actions = {
        SET_PROMPTS: 'SET_PROMPTS', SET_TOOL_AVAILABILITY: 'SET_TOOL_AVAILABILITY',
        SET_ACCOUNT_CONFIG: 'SET_ACCOUNT_CONFIG', SET_DOMAINS: 'SET_DOMAINS',
        SET_LOADING: 'SET_LOADING', SET_ERROR: 'SET_ERROR',
        SET_SELECTED_DOMAIN: 'SET_SELECTED_DOMAIN', SET_SEARCH_QUERY: 'SET_SEARCH_QUERY',
        SET_EDITION_FILTER: 'SET_EDITION_FILTER', SET_GOVERNANCE_FILTER: 'SET_GOVERNANCE_FILTER',
        SET_SELECTED_PROMPT: 'SET_SELECTED_PROMPT', CLEAR_FILTERS: 'CLEAR_FILTERS'
    };

    var initialState = {
        prompts: [], toolAvailability: {}, accountConfig: {}, domains: [],
        loading: true, error: null, selectedDomain: null, searchQuery: '',
        editionFilter: null, governanceFilter: null, selectedPrompt: null
    };

    var handlers = {};
    handlers[Actions.SET_PROMPTS] = function (s, a) { return core.ImmutableObject.set(s, 'prompts', a.payload); };
    handlers[Actions.SET_TOOL_AVAILABILITY] = function (s, a) { return core.ImmutableObject.set(s, 'toolAvailability', a.payload); };
    handlers[Actions.SET_ACCOUNT_CONFIG] = function (s, a) { return core.ImmutableObject.set(s, 'accountConfig', a.payload); };
    handlers[Actions.SET_DOMAINS] = function (s, a) { return core.ImmutableObject.set(s, 'domains', a.payload); };
    handlers[Actions.SET_LOADING] = function (s, a) { return core.ImmutableObject.set(s, 'loading', a.payload); };
    handlers[Actions.SET_ERROR] = function (s, a) { return core.ImmutableObject.set(s, 'error', a.payload); };
    handlers[Actions.SET_SELECTED_DOMAIN] = function (s, a) { return core.ImmutableObject.set(s, 'selectedDomain', a.payload); };
    handlers[Actions.SET_SEARCH_QUERY] = function (s, a) { return core.ImmutableObject.set(s, 'searchQuery', a.payload); };
    handlers[Actions.SET_EDITION_FILTER] = function (s, a) { return core.ImmutableObject.set(s, 'editionFilter', a.payload); };
    handlers[Actions.SET_GOVERNANCE_FILTER] = function (s, a) { return core.ImmutableObject.set(s, 'governanceFilter', a.payload); };
    handlers[Actions.SET_SELECTED_PROMPT] = function (s, a) { return core.ImmutableObject.set(s, 'selectedPrompt', a.payload); };
    handlers[Actions.CLEAR_FILTERS] = function (s) {
        var n = core.ImmutableObject.set(s, 'searchQuery', '');
        n = core.ImmutableObject.set(n, 'editionFilter', null);
        return core.ImmutableObject.set(n, 'governanceFilter', null);
    };

    var reducer = core.Reducer.create(handlers);
    function createStore() { return core.Store.create({ reducer: reducer, initial: initialState }); }

    // ========== CONSTANTS ==========

    var GOVERNANCE_COLORS = {
        'Minimal': 'uif-color--success', 'Standard': 'uif-color--info',
        'Governed': 'uif-color--warning', 'Supervised': 'uif-color--danger'
    };

    var DOMAIN_TOOLSETS = {
        'Barrel Operations': 'barrel-intelligence', 'Lot Profitability': 'lot-profitability',
        'Inventory & Supply Chain': 'inventory-supply', 'Compliance & Audit': 'compliance-audit',
        'MRP Intelligence': 'mrp-intelligence', 'Batch & Genealogy': 'batch-genealogy'
    };

    var TOOLSET_DISPLAY = {
        'barrel-intelligence': 'Barrel Intelligence', 'lot-profitability': 'Lot Profitability',
        'inventory-supply': 'Inventory & Supply Chain', 'compliance-audit': 'Compliance & Audit',
        'mrp-intelligence': 'MRP Intelligence', 'batch-genealogy': 'Batch & Genealogy'
    };

    var EDITIONS = ['Distillery', 'Winery', 'Brewery', 'Cross-Edition'];
    var GOVERNANCE_LEVELS = ['Minimal', 'Standard', 'Governed', 'Supervised'];

    // ========== COMPONENTS ==========

    // --- AdminBanner ---
    function AdminBanner() {
        var toolAvailability = core.useSelector(function (s) { return s.toolAvailability; });
        var missing = [];
        var keys = Object.keys(toolAvailability);
        for (var i = 0; i < keys.length; i++) {
            if (!toolAvailability[keys[i]]) missing.push(TOOLSET_DISPLAY[keys[i]] || keys[i]);
        }
        if (missing.length === 0) return h(c.StackPanel, { orientation: c.StackPanel.Orientation.VERTICAL },
            h(c.StackPanel.Item, null, h(c.Text, { type: c.Text.Type.WEAK }, ''))
        );
        return h(c.Banner, {
            title: 'Additional domains available',
            color: c.Banner.Color.BLUE,
            content: h(c.Text, null, 'Deploy these toolsets to unlock more prompts: ' + missing.join(', ') + '.')
        });
    }

    // --- SearchBar ---
    function SearchBar() {
        var searchQuery = core.useSelector(function (s) { return s.searchQuery; });
        var dispatch = core.useDispatch();
        return h(c.TextBox, {
            text: searchQuery, placeholder: 'Search prompts by name, tool, or keyword...',
            size: c.InputSize.L, rootStyle: { maxWidth: '500px' },
            onTextChanged: function (args) { dispatch({ type: Actions.SET_SEARCH_QUERY, payload: args.text }); }
        });
    }

    // --- FilterPanel ---
    function Filters() {
        var editionFilter = core.useSelector(function (s) { return s.editionFilter; });
        var governanceFilter = core.useSelector(function (s) { return s.governanceFilter; });
        var dispatch = core.useDispatch();

        var editionOpts = [{ value: '', label: 'All Editions' }];
        for (var i = 0; i < EDITIONS.length; i++) editionOpts.push({ value: EDITIONS[i], label: EDITIONS[i] });

        var govOpts = [{ value: '', label: 'All Levels' }];
        for (var j = 0; j < GOVERNANCE_LEVELS.length; j++) govOpts.push({ value: GOVERNANCE_LEVELS[j], label: GOVERNANCE_LEVELS[j] });

        var items = [];
        items.push(h(c.StackPanel.Item, null,
            h(c.Dropdown, {
                dataSource: new core.ArrayDataSource(editionOpts),
                selectedValue: editionFilter || '', size: c.InputSize.M,
                onSelectedValueChanged: function (args) { dispatch({ type: Actions.SET_EDITION_FILTER, payload: args.value || null }); }
            })
        ));
        items.push(h(c.StackPanel.Item, null,
            h(c.Dropdown, {
                dataSource: new core.ArrayDataSource(govOpts),
                selectedValue: governanceFilter || '', size: c.InputSize.M,
                onSelectedValueChanged: function (args) { dispatch({ type: Actions.SET_GOVERNANCE_FILTER, payload: args.value || null }); }
            })
        ));
        if (editionFilter || governanceFilter) {
            items.push(h(c.StackPanel.Item, null,
                h(c.Button, { label: 'Clear Filters', type: c.Button.Type.LINK,
                    action: function () { dispatch({ type: Actions.CLEAR_FILTERS }); } })
            ));
        }
        return h(c.StackPanel, { orientation: c.StackPanel.Orientation.HORIZONTAL, itemGap: c.GapSize.S }, items);
    }

    // --- DomainTabs ---
    function DomainTabs() {
        var domains = core.useSelector(function (s) { return s.domains; });
        var toolAvailability = core.useSelector(function (s) { return s.toolAvailability; });
        var selectedDomain = core.useSelector(function (s) { return s.selectedDomain; });
        var dispatch = core.useDispatch();

        var tabs = [];
        tabs.push(h(c.TabPanel.Tab, { label: 'All', value: '__all__' }));
        for (var i = 0; i < domains.length; i++) {
            var d = domains[i];
            var tk = DOMAIN_TOOLSETS[d.name];
            if (tk && !toolAvailability[tk]) continue;
            tabs.push(h(c.TabPanel.Tab, { label: d.name, value: d.name }));
        }
        return h(c.TabPanel, {
            selectedValue: selectedDomain || '__all__',
            on: { selectionChanged: function (args) {
                dispatch({ type: Actions.SET_SELECTED_DOMAIN, payload: args.value === '__all__' ? null : args.value });
            }}
        }, tabs);
    }

    // --- PromptCard ---
    function PromptCard(props) {
        var p = props.prompt;
        var onSelect = props.onSelect;
        var toolCount = (p.steps || []).length;

        var items = [];
        items.push(h(c.StackPanel.Item, null, h(c.Heading, { type: c.Heading.Type.MEDIUM_HEADING }, p.prompt_name)));

        var badgeItems = [];
        badgeItems.push(h(c.StackPanel.Item, null, h(c.Badge, { label: p.governance, size: c.Badge.Size.SMALL, classList: GOVERNANCE_COLORS[p.governance] || '' })));
        if (p.edition && p.edition !== 'Cross-Edition') {
            badgeItems.push(h(c.StackPanel.Item, null, h(c.Badge, { label: p.edition, size: c.Badge.Size.SMALL })));
        }
        if (p.artifact) {
            badgeItems.push(h(c.StackPanel.Item, null, h(c.Badge, { label: p.artifact_type || 'Artifact', size: c.Badge.Size.SMALL })));
        }
        items.push(h(c.StackPanel.Item, null, h(c.StackPanel, { orientation: c.StackPanel.Orientation.HORIZONTAL, itemGap: c.GapSize.XS }, badgeItems)));

        if (p.subdomain) {
            items.push(h(c.StackPanel.Item, null, h(c.Text, { type: c.Text.Type.WEAK }, p.subdomain)));
        }
        items.push(h(c.StackPanel.Item, null, h(c.Text, null, p.tool_chain || p.entry_tool || '')));
        items.push(h(c.StackPanel.Item, null, h(c.Text, { type: c.Text.Type.WEAK },
            toolCount + (toolCount === 1 ? ' tool' : ' tools') + '  \u00b7  v' + (p.version || '1.0.0'))));

        return h(c.Card, {
            rootStyle: { cursor: 'pointer', minHeight: '160px' },
            on: { click: function () { if (onSelect) onSelect(p); } }
        },
            h(c.ContentPanel, { outerGap: c.GapSize.M },
                h(c.StackPanel, { orientation: c.StackPanel.Orientation.VERTICAL, itemGap: c.GapSize.XS }, items))
        );
    }

    // --- CardGrid ---
    function CardGrid() {
        var prompts = core.useSelector(function (s) { return s.prompts; });
        var toolAvailability = core.useSelector(function (s) { return s.toolAvailability; });
        var selectedDomain = core.useSelector(function (s) { return s.selectedDomain; });
        var searchQuery = core.useSelector(function (s) { return s.searchQuery; });
        var editionFilter = core.useSelector(function (s) { return s.editionFilter; });
        var governanceFilter = core.useSelector(function (s) { return s.governanceFilter; });
        var dispatch = core.useDispatch();

        var filtered = prompts.filter(function (p) {
            var deps = p.tool_deps || [];
            for (var i = 0; i < deps.length; i++) { if (!toolAvailability[deps[i]]) return false; }
            if (selectedDomain && p.domain !== selectedDomain) return false;
            if (editionFilter && p.edition !== editionFilter && p.edition !== 'Cross-Edition') return false;
            if (governanceFilter && p.governance !== governanceFilter) return false;
            if (searchQuery) {
                var q = searchQuery.toLowerCase();
                if ((p.prompt_name + ' ' + p.subdomain + ' ' + p.tool_chain + ' ' + p.prompt_text).toLowerCase().indexOf(q) === -1) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            return h(c.ContentPanel, { outerGap: c.GapSize.L, horizontalAlignment: c.ContentPanel.HorizontalAlignment.CENTER },
                h(c.StackPanel, { orientation: c.StackPanel.Orientation.VERTICAL, itemGap: c.GapSize.M },
                    h(c.StackPanel.Item, null, h(c.Heading, { type: c.Heading.Type.MEDIUM_HEADING }, 'No prompts match your filters')),
                    h(c.StackPanel.Item, null, h(c.Text, { type: c.Text.Type.WEAK }, 'Try adjusting your search, domain tab, or edition filter.'))
                )
            );
        }

        var gridItems = [];
        for (var i = 0; i < filtered.length; i++) {
            (function (prompt) {
                gridItems.push(h(c.GridPanel.Item, null,
                    h(PromptCard, { prompt: prompt, onSelect: function () {
                        dispatch({ type: Actions.SET_SELECTED_PROMPT, payload: prompt });
                    }})
                ));
            })(filtered[i]);
        }
        return h(c.GridPanel, { columns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: c.GapSize.M }, gridItems);
    }

    // --- PromptDetailModal ---
    function PromptDetailModal() {
        var selectedPrompt = core.useSelector(function (s) { return s.selectedPrompt; });
        var dispatch = core.useDispatch();
        if (!selectedPrompt) return null;
        var p = selectedPrompt;

        function close() { dispatch({ type: Actions.SET_SELECTED_PROMPT, payload: null }); }

        var sections = [];

        // Badges
        var badgeItems = [];
        badgeItems.push(h(c.StackPanel.Item, null, h(c.Badge, { label: p.governance, classList: GOVERNANCE_COLORS[p.governance] || '' })));
        badgeItems.push(h(c.StackPanel.Item, null, h(c.Badge, { label: p.edition })));
        badgeItems.push(h(c.StackPanel.Item, null, h(c.Badge, { label: p.domain })));
        if (p.artifact) badgeItems.push(h(c.StackPanel.Item, null, h(c.Badge, { label: p.artifact_type || 'Artifact' })));
        sections.push(h(c.StackPanel.Item, null, h(c.StackPanel, { orientation: c.StackPanel.Orientation.HORIZONTAL, itemGap: c.GapSize.XS }, badgeItems)));

        // Prompt text
        sections.push(h(c.StackPanel.Item, null,
            h(c.FieldGroup, { title: 'Prompt Text', color: c.FieldGroup.Color.NEUTRAL },
                h(c.ContentPanel, { outerGap: c.GapSize.S },
                    h(c.Text, { rootStyle: { whiteSpace: 'pre-wrap' } }, p.prompt_text)))));

        // Tool chain
        sections.push(h(c.StackPanel.Item, null,
            h(c.FieldGroup, { title: 'Tool Chain', color: c.FieldGroup.Color.NEUTRAL },
                h(c.ContentPanel, { outerGap: c.GapSize.S },
                    h(c.StackPanel, { orientation: c.StackPanel.Orientation.VERTICAL, itemGap: c.GapSize.XS },
                        h(c.StackPanel.Item, null, h(c.Text, { type: c.Text.Type.STRONG }, p.tool_chain || p.entry_tool)),
                        h(c.StackPanel.Item, null, h(c.Text, { type: c.Text.Type.WEAK }, 'Entry tool: ' + (p.entry_tool || 'N/A'))))))));

        // Steps
        if (p.steps && p.steps.length > 0) {
            var stepItems = [];
            for (var i = 0; i < p.steps.length; i++) {
                var step = p.steps[i];
                var txt = (i + 1) + '. ' + step.call + ' \u2014 ' + (step.purpose || '');
                if (step.condition) txt += ' (if: ' + step.condition + ')';
                stepItems.push(h(c.StackPanel.Item, null, h(c.Text, null, txt)));
            }
            sections.push(h(c.StackPanel.Item, null,
                h(c.FieldGroup, { title: 'Orchestration Steps', color: c.FieldGroup.Color.NEUTRAL },
                    h(c.ContentPanel, { outerGap: c.GapSize.S },
                        h(c.StackPanel, { orientation: c.StackPanel.Orientation.VERTICAL, itemGap: c.GapSize.XXS }, stepItems)))));
        }

        // Parameters
        var paramKeys = Object.keys(p.params || {});
        if (paramKeys.length > 0) {
            var paramItems = [];
            for (var j = 0; j < paramKeys.length; j++) {
                var pk = paramKeys[j]; var pv = p.params[pk];
                var line = pk + ' (' + pv.type + (pv.required ? ', required' : '') + ')';
                if (pv.hint) line += ' \u2014 ' + pv.hint;
                paramItems.push(h(c.StackPanel.Item, null, h(c.Text, null, line)));
            }
            sections.push(h(c.StackPanel.Item, null,
                h(c.FieldGroup, { title: 'Parameters', color: c.FieldGroup.Color.NEUTRAL },
                    h(c.ContentPanel, { outerGap: c.GapSize.S },
                        h(c.StackPanel, { orientation: c.StackPanel.Orientation.VERTICAL, itemGap: c.GapSize.XXS }, paramItems)))));
        }

        // Safety rules
        if (p.safety_rules && p.safety_rules.length > 0) {
            var ruleItems = [];
            for (var k = 0; k < p.safety_rules.length; k++) {
                ruleItems.push(h(c.StackPanel.Item, null, h(c.Text, null, '\u2022 ' + p.safety_rules[k])));
            }
            sections.push(h(c.StackPanel.Item, null,
                h(c.FieldGroup, { title: 'Safety Rules', color: c.FieldGroup.Color.NEUTRAL },
                    h(c.ContentPanel, { outerGap: c.GapSize.S },
                        h(c.StackPanel, { orientation: c.StackPanel.Orientation.VERTICAL, itemGap: c.GapSize.XXS }, ruleItems)))));
        }

        // Edition notes
        if (p.edition_notes) {
            sections.push(h(c.StackPanel.Item, null,
                h(c.FieldGroup, { title: 'Edition Notes', color: c.FieldGroup.Color.NEUTRAL },
                    h(c.ContentPanel, { outerGap: c.GapSize.S }, h(c.Text, null, p.edition_notes)))));
        }

        // Metadata footer
        sections.push(h(c.StackPanel.Item, null,
            h(c.StackPanel, { orientation: c.StackPanel.Orientation.HORIZONTAL, itemGap: c.GapSize.M },
                h(c.StackPanel.Item, null, h(c.Text, { type: c.Text.Type.WEAK }, 'v' + (p.version || '1.0.0'))),
                h(c.StackPanel.Item, null, h(c.Text, { type: c.Text.Type.WEAK }, p.author || '')),
                h(c.StackPanel.Item, null, h(c.Text, { type: c.Text.Type.WEAK }, 'Toolset: ' + (p.toolset || ''))),
                h(c.StackPanel.Item, null, h(c.Text, { type: c.Text.Type.WEAK }, 'ID: ' + p.prompt_id)))));

        // Action buttons
        sections.push(h(c.StackPanel.Item, null,
            h(c.StackPanel, { orientation: c.StackPanel.Orientation.HORIZONTAL, itemGap: c.GapSize.S },
                h(c.StackPanel.Item, null, h(c.Button, { label: 'Copy Prompt', type: c.Button.Type.PRIMARY,
                    action: function () { if (navigator && navigator.clipboard) navigator.clipboard.writeText(p.prompt_text); } })),
                h(c.StackPanel.Item, null, h(c.Button, { label: 'Close', type: c.Button.Type.GHOST, action: close })))));

        return h(c.Modal, {
            title: p.prompt_name,
            rootStyle: { width: '70vw', maxWidth: '900px' },
            closeButton: false,
            content: h(c.ContentPanel, { outerGap: c.GapSize.M },
                h(c.StackPanel, { orientation: c.StackPanel.Orientation.VERTICAL, itemGap: c.GapSize.S }, sections))
        });
    }

    // ========== APP CONTENT ==========

    function AppContent() {
        var loading = core.useSelector(function (s) { return s.loading; });
        var error = core.useSelector(function (s) { return s.error; });
        var selectedPrompt = core.useSelector(function (s) { return s.selectedPrompt; });
        var dispatch = core.useDispatch();

        core.useEffect(function () {
            var source = new core.CancellationTokenSource();
            var token = source.token;
            try {
                var prompts = loadPrompts();
                if (token.cancelled) return;
                dispatch({ type: Actions.SET_PROMPTS, payload: prompts });

                var tools = loadToolAvailability();
                if (token.cancelled) return;
                dispatch({ type: Actions.SET_TOOL_AVAILABILITY, payload: tools });

                var config = loadAccountConfig();
                if (token.cancelled) return;
                dispatch({ type: Actions.SET_ACCOUNT_CONFIG, payload: config });

                var domains = loadDomains();
                if (token.cancelled) return;
                dispatch({ type: Actions.SET_DOMAINS, payload: domains });

                dispatch({ type: Actions.SET_LOADING, payload: false });
            } catch (e) {
                if (token.cancelled) return;
                dispatch({ type: Actions.SET_ERROR, payload: e.message });
                dispatch({ type: Actions.SET_LOADING, payload: false });
            }
            return function () { source.cancel(); };
        }, []);

        var rootItems = [];

        // Header
        rootItems.push(h(c.StackPanel.Item, { shrink: 0 }, h(c.ApplicationHeader, { title: 'Crafted Companion Library' })));

        if (loading) {
            rootItems.push(h(c.StackPanel.Item, null,
                h(c.ContentPanel, { outerGap: c.GapSize.XL, horizontalAlignment: c.ContentPanel.HorizontalAlignment.CENTER },
                    h(c.Loader, { label: 'Loading prompts...' }))));
        } else if (error) {
            rootItems.push(h(c.StackPanel.Item, null,
                h(c.Banner, { title: 'Error loading data', color: c.Banner.Color.ORANGE, content: h(c.Text, null, error) })));
        } else {
            // Admin banner
            rootItems.push(h(c.StackPanel.Item, { shrink: 0 }, h(AdminBanner, null)));

            // Search + filters
            rootItems.push(h(c.StackPanel.Item, { shrink: 0 },
                h(c.ContentPanel, { outerGap: c.GapSize.M },
                    h(c.StackPanel, { orientation: c.StackPanel.Orientation.HORIZONTAL, itemGap: c.GapSize.M },
                        h(c.StackPanel.Item, { grow: 1 }, h(SearchBar, null)),
                        h(c.StackPanel.Item, null, h(Filters, null))))));

            // Domain tabs
            rootItems.push(h(c.StackPanel.Item, { shrink: 0 }, h(DomainTabs, null)));

            // Card grid
            rootItems.push(h(c.StackPanel.Item, { grow: 1 },
                h(c.ContentPanel, { outerGap: c.GapSize.M }, h(CardGrid, null))));
        }

        // Modal at root level
        if (selectedPrompt) {
            rootItems.push(h(c.StackPanel.Item, null, h(PromptDetailModal, null)));
        }

        return h(c.StackPanel, { orientation: c.StackPanel.Orientation.VERTICAL, outerGap: c.GapSize.NONE, itemGap: c.GapSize.NONE }, rootItems);
    }

    // ========== ROOT ==========

    function CompanionApp() {
        var store = core.useMemo(function () { return createStore(); }, []);
        return h(core.Store.Provider, { store: store }, h(AppContent, null));
    }

    // ========== ENTRY POINT ==========

    function run(app) {
        app.setLayout('application');
        app.setContent(h(CompanionApp, null));
    }

    return { run: run };
});
