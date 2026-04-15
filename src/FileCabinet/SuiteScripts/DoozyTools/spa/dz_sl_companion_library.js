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
define(['N/query', 'N/log', 'N/runtime', 'N/file', 'N/record', 'N/ui/serverWidget'], function (query, log, runtime, file, record, serverWidget) {

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

    // Generate the Crafted header that instructs the AI to call getPromptMeta first
    function craftedHeader(promptId) {
        return '[Crafted Prompt #' + promptId + ' — call getPromptMeta(' + promptId + ') first for orchestration context, safety rules, and tool chain]\n\n';
    }

    // Check if prompt text already has the Crafted header
    function hasCraftedHeader(text) {
        return text && text.indexOf('[Crafted Prompt #') === 0;
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
            // Check tool availability by looking for script files in the File Cabinet
            // custtoolset is not queryable via SuiteQL, so we check for deployed script files
            var avail = { 'barrel-intelligence': false, 'lot-profitability': false, 'inventory-supply': false, 'compliance-audit': false, 'mrp-intelligence': false, 'batch-genealogy': false };
            try {
                var scripts = runSQL("SELECT name FROM file WHERE folder IN (SELECT id FROM mediaitemfolder WHERE name = 'DoozyTools') AND name LIKE 'dz_ct_%' AND name LIKE '%.js'");
                scripts.forEach(function (r) {
                    var fn = (r.name || '').toLowerCase();
                    if (fn.indexOf('barrel') > -1 || fn.indexOf('brl') > -1) avail['barrel-intelligence'] = true;
                    if (fn.indexOf('lot') > -1) avail['lot-profitability'] = true;
                    if (fn.indexOf('inv') > -1 || fn.indexOf('bom') > -1 || fn.indexOf('item') > -1) avail['inventory-supply'] = true;
                    if (fn.indexOf('compliance') > -1 || fn.indexOf('audit') > -1) avail['compliance-audit'] = true;
                    if (fn.indexOf('mrp') > -1) avail['mrp-intelligence'] = true;
                    if (fn.indexOf('genealogy') > -1 || fn.indexOf('batch') > -1 || fn.indexOf('lineage') > -1) avail['batch-genealogy'] = true;
                });
            } catch (e) {
                // If query fails, default all to true so prompts are visible
                log.debug({ title: 'getToolAvailability', details: 'Fallback: defaulting all to true. ' + e.message });
                Object.keys(avail).forEach(function (k) { avail[k] = true; });
            }
            jsonResponse(context.response, avail);

        } else if (action === 'get-domains') {
            jsonResponse(context.response, runSQL('SELECT id, name FROM customlist_dz_pm_domain ORDER BY id'));

        } else if (action === 'auto-setup') {
            jsonResponse(context.response, runAutoSetup());

        } else if (action === 'backfill-headers') {
            jsonResponse(context.response, runBackfillHeaders());

        } else {
            jsonResponse(context.response, { error: 'Unknown action: ' + action });
        }
    }

    // ========== AUTO-SETUP: SEED + MIRROR ROLES ==========

    function runAutoSetup() {
        var results = { seeded: [], roles_created: [], roles_mapped: [], errors: [] };

        // --- SEED ATLAS PROMPTS + EXTENSION RECORDS ---
        try {
            var seedFiles = runSQL("SELECT id FROM file WHERE name = 'seed-data.json'");
            if (seedFiles && seedFiles.length > 0) {
                var seedFile = file.load({ id: seedFiles[0].id });
                var seedData = JSON.parse(seedFile.getContents());
                var prompts = seedData.prompts || [];

                // Get existing Atlas prompts by externalid
                var atlasRows = runSQL("SELECT id, externalid FROM customrecord_atlas_aicomp_prompts WHERE externalid LIKE 'aiprompt_crafted_%'");
                var atlasByExtId = {};
                atlasRows.forEach(function (r) { atlasByExtId[r.externalid] = r.id; });

                // Get existing extension records by externalid
                var metaRows = runSQL('SELECT id, externalid FROM customrecord_dz_prompt_meta');
                var metaByExtId = {};
                metaRows.forEach(function (r) { metaByExtId[r.externalid] = r.id; });

                prompts.forEach(function (p) {
                    if (metaByExtId[p.external_id]) return; // extension record exists, skip
                    // Check governance before each record creation
                    var remaining = runtime.getCurrentScript().getRemainingUsage();
                    if (remaining < 100) { log.audit({ title: 'auto-setup', details: 'Governance low (' + remaining + '), stopping seed batch' }); return; }
                    try {
                        // Step 1: Ensure Atlas prompt exists
                        var atlasId = atlasByExtId[p.atlas_external_id];
                        if (!atlasId && p.prompt_text) {
                            var atlas = record.create({ type: 'customrecord_atlas_aicomp_prompts' });
                            atlas.setValue({ fieldId: 'name', value: p.name });
                            atlas.setValue({ fieldId: 'externalid', value: p.atlas_external_id });
                            atlas.setValue({ fieldId: 'custrecord_atlas_aicomp_prompt_text', value: p.prompt_text });
                            atlas.setValue({ fieldId: 'custrecord_atlas_aicomp_prompt_category', value: 6 }); // Manufacturing
                            atlas.setValue({ fieldId: 'custrecord_atlas_aicomp_prompt_subcat', value: p.subdomain || '' });
                            atlas.setValue({ fieldId: 'custrecord_atlas_aicomp_prompt_roles', value: [5] }); // Administrator
                            atlas.setValue({ fieldId: 'custrecord_atlas_aicomp_prompt_inds', value: [17] }); // Food & Beverage
                            atlas.setValue({ fieldId: 'custrecord_atlas_aicomp_prompt_public', value: true });
                            atlas.setValue({ fieldId: 'custrecord_atlas_aicomp_sdf_seeded', value: false });
                            atlasId = atlas.save();
                            atlasByExtId[p.atlas_external_id] = atlasId;

                            // Now that we have the ID, update the prompt_text with the header
                            try {
                                record.submitFields({
                                    type: 'customrecord_atlas_aicomp_prompts',
                                    id: atlasId,
                                    values: { custrecord_atlas_aicomp_prompt_text: craftedHeader(atlasId) + p.prompt_text }
                                });
                            } catch (hdrErr) {
                                log.debug({ title: 'auto-setup', details: 'Header update failed for ' + atlasId + ': ' + hdrErr.message });
                            }
                        }
                        if (!atlasId) { results.errors.push({ name: p.name, error: 'No Atlas prompt and no prompt_text' }); return; }

                        // Step 2: Create extension record
                        var rec = record.create({ type: 'customrecord_dz_prompt_meta' });
                        rec.setValue({ fieldId: 'name', value: p.name });
                        rec.setValue({ fieldId: 'externalid', value: p.external_id });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_prompt_ref', value: atlasId });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_domain', value: p.domain || 1 });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_subdomain', value: p.subdomain || '' });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_toolset', value: p.toolset || '' });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_tool_chain', value: p.tool_chain || '' });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_entry_tool', value: p.entry_tool || '' });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_steps', value: p.steps ? JSON.stringify(p.steps) : '' });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_tool_deps', value: p.tool_deps || '' });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_edition', value: p.edition || 4 });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_edition_notes', value: p.edition_notes || '' });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_params', value: p.params ? JSON.stringify(p.params) : '' });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_safety_rules', value: p.safety_rules ? JSON.stringify(p.safety_rules) : '' });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_governance', value: p.governance || 1 });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_artifact', value: p.artifact === true });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_artifact_type', value: p.artifact_type || '' });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_version', value: p.version || '1.0.0' });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_author', value: p.author || 'Doozy Labs' });
                        rec.setValue({ fieldId: 'custrecord_dz_pm_status', value: p.status || 1 });
                        var metaId = rec.save();
                        results.seeded.push({ metaId: metaId, atlasId: atlasId, name: p.name });
                    } catch (e) {
                        results.errors.push({ name: p.name, error: e.message });
                    }
                });
            }
        } catch (e) {
            results.errors.push({ action: 'seed', error: e.message });
        }

        // --- MIRROR ROLES ---
        try {
            var nsRoles = runSQL("SELECT id, name FROM role WHERE isinactive = 'F' ORDER BY name");
            var companionRoles = runSQL('SELECT id, name FROM customrecord_atlas_aicomp_prompt_roles ORDER BY name');
            var companionByName = {};
            companionRoles.forEach(function (r) { companionByName[(r.name || '').toLowerCase().trim()] = r; });

            var mappings = runSQL('SELECT custrecord_atlas_aicomp_ns_role_id AS ns_role FROM customrecord_atlas_aicomp_role_mapping');
            var mappedNsRoles = {};
            mappings.forEach(function (m) { mappedNsRoles[m.ns_role] = true; });

            nsRoles.forEach(function (nsRole) {
                var rem = runtime.getCurrentScript().getRemainingUsage();
                if (rem < 80) return; // governance check
                try {
                    var key = (nsRole.name || '').toLowerCase().trim();
                    var companionRole = companionByName[key];

                    if (!companionRole) {
                        var newRole = record.create({ type: 'customrecord_atlas_aicomp_prompt_roles' });
                        newRole.setValue({ fieldId: 'name', value: nsRole.name.trim() });
                        newRole.setValue({ fieldId: 'externalid', value: 'aipromptrole_crafted_' + nsRole.id });
                        var newId = newRole.save();
                        companionRole = { id: newId, name: nsRole.name.trim() };
                        companionByName[key] = companionRole;
                        results.roles_created.push({ id: newId, name: nsRole.name, ns_role_id: nsRole.id });
                    }

                    if (!mappedNsRoles[nsRole.id]) {
                        var mapping = record.create({ type: 'customrecord_atlas_aicomp_role_mapping' });
                        mapping.setValue({ fieldId: 'custrecord_atlas_aicomp_ns_role_id', value: nsRole.id });
                        mapping.setValue({ fieldId: 'custrecord_atlas_aicomp_ns_role_name', value: nsRole.name });
                        mapping.setValue({ fieldId: 'custrecord_atlas_aicomp_prompt_role', value: companionRole.id });
                        mapping.setValue({ fieldId: 'custrecord_atlas_aicomp_map_confidence', value: 100 });
                        mapping.setValue({ fieldId: 'custrecord_atlas_aicomp_mapping_method', value: 3 }); // Manual Override
                        var mapId = mapping.save();
                        results.roles_mapped.push({ id: mapId, ns_role: nsRole.name, companion_role: companionRole.name });
                    }
                } catch (e) {
                    results.errors.push({ role: nsRole.name, error: e.message });
                }
            });
        } catch (e) {
            results.errors.push({ action: 'mirror-roles', error: e.message });
        }

        results.summary = results.seeded.length + ' seeded, ' + results.roles_created.length + ' roles created, ' + results.roles_mapped.length + ' mapped, ' + results.errors.length + ' errors';
        log.audit({ title: 'auto-setup', details: results.summary });
        return results;
    }

    // ========== BACKFILL HEADERS ==========

    function runBackfillHeaders() {
        var results = { updated: [], skipped: [], errors: [] };
        try {
            // Get all Crafted Atlas prompts and their text
            var rows = runSQL(
                "SELECT p.id, p.name, p.custrecord_atlas_aicomp_prompt_text AS prompt_text " +
                "FROM customrecord_atlas_aicomp_prompts p " +
                "JOIN customrecord_dz_prompt_meta pm ON pm.custrecord_dz_pm_prompt_ref = p.id"
            );

            rows.forEach(function (r) {
                var rem = runtime.getCurrentScript().getRemainingUsage();
                if (rem < 80) return; // governance check
                try {
                    if (hasCraftedHeader(r.prompt_text)) {
                        results.skipped.push({ id: r.id, name: r.name });
                        return;
                    }
                    var newText = craftedHeader(r.id) + (r.prompt_text || '');
                    record.submitFields({
                        type: 'customrecord_atlas_aicomp_prompts',
                        id: r.id,
                        values: { custrecord_atlas_aicomp_prompt_text: newText }
                    });
                    results.updated.push({ id: r.id, name: r.name });
                } catch (e) {
                    results.errors.push({ id: r.id, name: r.name, error: e.message });
                }
            });
        } catch (e) {
            results.errors.push({ action: 'backfill', error: e.message });
        }
        results.summary = results.updated.length + ' updated, ' + results.skipped.length + ' already had header, ' + results.errors.length + ' errors';
        log.audit({ title: 'backfill-headers', details: results.summary });
        return results;
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
            html = '<p>companion-library.html not found in File Cabinet.</p>';
        }

        // Extract style + body content for INLINEHTML
        // Keep <style> blocks but strip document wrapper tags
        html = html.replace(/<!DOCTYPE[^>]*>/i, '')
                    .replace(/<\/?html[^>]*>/gi, '')
                    .replace(/<head[^>]*>/gi, '')
                    .replace(/<\/head>/gi, '')
                    .replace(/<meta[^>]*>/gi, '')
                    .replace(/<title>[\s\S]*?<\/title>/gi, '')
                    .replace(/<\/?body[^>]*>/gi, '');

        var form = serverWidget.createForm({ title: 'Crafted Companion Library' });
        form.addField({
            id: 'custpage_companion_html',
            type: serverWidget.FieldType.INLINEHTML,
            label: ' '
        }).defaultValue = html;

        context.response.writePage(form);
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
