/**
 * DataService.js — Server-side data access for Companion Library SPA
 *
 * Provides prompt data, tool availability, and account config via N/query.
 * Imported by SPA components — runs server-side within the UIF SPA context.
 *
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define(['N/query', 'N/runtime', 'N/log'], function (query, runtime, log) {

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

    // ========== PROMPTS ==========

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
                meta_id: r.meta_id,
                prompt_id: r.prompt_id,
                external_id: r.external_id,
                prompt_name: r.prompt_name || '',
                prompt_text: r.prompt_text || '',
                domain: r.domain || '',
                domain_id: r.domain_id,
                subdomain: r.subdomain || '',
                toolset: r.toolset || '',
                tool_chain: r.tool_chain || '',
                entry_tool: r.entry_tool || '',
                steps: parseJSON(r.steps, []),
                tool_deps: parseJSON(r.tool_deps, []),
                edition: r.edition || '',
                edition_id: r.edition_id,
                edition_notes: r.edition_notes || '',
                params: parseJSON(r.params, {}),
                safety_rules: parseJSON(r.safety_rules, []),
                governance: r.governance || '',
                governance_id: r.governance_id,
                artifact: r.artifact === 'T',
                artifact_type: r.artifact_type || '',
                version: r.version || '',
                author: r.author || '',
                status: r.status || ''
            };
        });
    }

    // ========== TOOL AVAILABILITY ==========

    function loadToolAvailability() {
        var rows = runSQL("SELECT scriptid, name FROM custtoolset WHERE isinactive = 'F'");

        var availability = {
            'barrel-intelligence': false,
            'lot-profitability': false,
            'inventory-supply': false,
            'compliance-audit': false,
            'mrp-intelligence': false,
            'batch-genealogy': false
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

    // ========== ACCOUNT CONFIG ==========

    function loadAccountConfig() {
        var config = {
            accountId: runtime.accountId,
            editions: [],
            crafted_installed: false
        };

        try {
            var rows = runSQL(
                'SELECT custrecord_dz_ic_ce_installed, custrecord_dz_ic_editions ' +
                'FROM customrecord_dz_intel_config WHERE id = 1'
            );
            if (rows.length > 0) {
                config.crafted_installed = rows[0].custrecord_dz_ic_ce_installed === 'T';
                config.editions = (rows[0].custrecord_dz_ic_editions || '').split(',')
                    .map(function (e) { return e.trim(); })
                    .filter(function (e) { return e; });
            }
        } catch (e) {
            log.debug({ title: 'DataService', details: 'Intel config not available: ' + e.message });
        }

        return config;
    }

    // ========== DOMAINS ==========

    function loadDomains() {
        var rows = runSQL(
            'SELECT id, name FROM customlist_dz_pm_domain ORDER BY id'
        );
        return rows;
    }

    return {
        loadPrompts: loadPrompts,
        loadToolAvailability: loadToolAvailability,
        loadAccountConfig: loadAccountConfig,
        loadDomains: loadDomains
    };
});
