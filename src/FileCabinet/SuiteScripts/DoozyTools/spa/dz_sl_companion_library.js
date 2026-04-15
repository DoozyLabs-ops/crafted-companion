/**
 * dz_sl_companion_library.js
 * Crafted Companion Library — Suitelet
 *
 * GET: Serves the Companion Library HTML page
 * POST: JSON API for prompt data, tool availability, account config
 *
 * Modeled after Oracle's AI Connector Service Companion Suitelet.
 *
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/query', 'N/log', 'N/runtime', 'N/file'], function (query, log, runtime, file) {

    var SCRIPT_VERSION = '1.0.0';

    // ========== HELPERS ==========

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

    function jsonResponse(response, data) {
        response.setHeader({ name: 'Content-Type', value: 'application/json' });
        response.write(JSON.stringify(data));
    }

    // ========== POST API ==========

    function handlePost(context) {
        var action = context.request.parameters.action;

        if (action === 'get-prompts') {
            var sql = 'SELECT ' +
                'pm.id AS meta_id, pm.custrecord_dz_pm_prompt_ref AS prompt_id, ' +
                'pm.externalid AS external_id, p.name AS prompt_name, ' +
                'p.custrecord_atlas_aicomp_prompt_text AS prompt_text, ' +
                'BUILTIN.DF(pm.custrecord_dz_pm_domain) AS domain, ' +
                'pm.custrecord_dz_pm_subdomain AS subdomain, ' +
                'pm.custrecord_dz_pm_toolset AS toolset, ' +
                'pm.custrecord_dz_pm_tool_chain AS tool_chain, ' +
                'pm.custrecord_dz_pm_entry_tool AS entry_tool, ' +
                'pm.custrecord_dz_pm_steps AS steps, ' +
                'pm.custrecord_dz_pm_tool_deps AS tool_deps, ' +
                'BUILTIN.DF(pm.custrecord_dz_pm_edition) AS edition, ' +
                'pm.custrecord_dz_pm_edition_notes AS edition_notes, ' +
                'pm.custrecord_dz_pm_params AS params, ' +
                'pm.custrecord_dz_pm_safety_rules AS safety_rules, ' +
                'BUILTIN.DF(pm.custrecord_dz_pm_governance) AS governance, ' +
                'pm.custrecord_dz_pm_artifact AS artifact, ' +
                'pm.custrecord_dz_pm_artifact_type AS artifact_type, ' +
                'pm.custrecord_dz_pm_version AS version, ' +
                'pm.custrecord_dz_pm_author AS author, ' +
                'BUILTIN.DF(pm.custrecord_dz_pm_status) AS status ' +
                'FROM customrecord_dz_prompt_meta pm ' +
                'JOIN customrecord_atlas_aicomp_prompts p ON pm.custrecord_dz_pm_prompt_ref = p.id ' +
                "WHERE BUILTIN.DF(pm.custrecord_dz_pm_status) = 'Active' " +
                'ORDER BY pm.custrecord_dz_pm_domain, p.name';
            var rows = runSQL(sql);
            var prompts = rows.map(function (r) {
                return {
                    meta_id: r.meta_id, prompt_id: r.prompt_id, external_id: r.external_id,
                    prompt_name: r.prompt_name || '', prompt_text: r.prompt_text || '',
                    domain: r.domain || '', subdomain: r.subdomain || '',
                    toolset: r.toolset || '', tool_chain: r.tool_chain || '',
                    entry_tool: r.entry_tool || '', steps: parseJSON(r.steps, []),
                    tool_deps: parseJSON(r.tool_deps, []), edition: r.edition || '',
                    edition_notes: r.edition_notes || '', params: parseJSON(r.params, {}),
                    safety_rules: parseJSON(r.safety_rules, []), governance: r.governance || '',
                    artifact: r.artifact === 'T', artifact_type: r.artifact_type || '',
                    version: r.version || '', author: r.author || '', status: r.status || ''
                };
            });
            jsonResponse(context.response, { prompts: prompts, count: prompts.length });

        } else if (action === 'get-tool-availability') {
            var tRows = runSQL("SELECT scriptid FROM custtoolset WHERE isinactive = 'F'");
            var avail = { 'barrel-intelligence': false, 'lot-profitability': false, 'inventory-supply': false, 'compliance-audit': false, 'mrp-intelligence': false, 'batch-genealogy': false };
            tRows.forEach(function (r) {
                var sid = (r.scriptid || '').toLowerCase();
                if (sid.indexOf('brl') > -1 || sid.indexOf('barrel') > -1) avail['barrel-intelligence'] = true;
                if (sid.indexOf('lot') > -1) avail['lot-profitability'] = true;
                if (sid.indexOf('inv') > -1 || sid.indexOf('bom') > -1 || sid.indexOf('item') > -1) avail['inventory-supply'] = true;
                if (sid.indexOf('compliance') > -1 || sid.indexOf('audit') > -1) avail['compliance-audit'] = true;
                if (sid.indexOf('mrp') > -1) avail['mrp-intelligence'] = true;
                if (sid.indexOf('genealogy') > -1 || sid.indexOf('batch') > -1 || sid.indexOf('lineage') > -1) avail['batch-genealogy'] = true;
            });
            jsonResponse(context.response, avail);

        } else if (action === 'get-domains') {
            jsonResponse(context.response, runSQL('SELECT id, name FROM customlist_dz_pm_domain ORDER BY id'));

        } else {
            jsonResponse(context.response, { error: 'Unknown action: ' + action });
        }
    }

    // ========== GET: SERVE HTML ==========

    function serveHTML(context) {
        var scriptUrl = '/app/site/hosting/scriptlet.nl?script=' +
            runtime.getCurrentScript().id + '&deploy=' +
            runtime.getCurrentScript().deploymentId;

        // Load HTML template from File Cabinet
        var htmlFiles = runSQL("SELECT id FROM file WHERE name = 'companion-library.html'");
        var html;
        if (htmlFiles && htmlFiles.length > 0) {
            var htmlFile = file.load({ id: htmlFiles[0].id });
            html = htmlFile.getContents();
            html = html.replace('{{API_URL}}', scriptUrl);
        } else {
            html = '<html><body><h1>Error</h1><p>companion-library.html not found in File Cabinet.</p></body></html>';
        }

        context.response.setHeader({ name: 'Content-Type', value: 'text/html; charset=utf-8' });
        context.response.write(html);
    }

    // ========== ENTRY POINT ==========

    function onRequest(context) {
        if (context.request.method === 'POST') {
            try { handlePost(context); }
            catch (e) { log.error({ title: 'SPA API', details: e.message }); jsonResponse(context.response, { error: e.message }); }
        } else {
            serveHTML(context);
        }
    }

    return { onRequest: onRequest };
});
