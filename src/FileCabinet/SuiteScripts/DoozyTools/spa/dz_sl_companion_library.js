/**
 * dz_sl_companion_library.js
 * Crafted Intelligence Library - Suitelet
 *
 * GET: Serves the Companion Library HTML page
 * POST: JSON API for prompt data, tool availability, account config
 *
 * Independent from Oracle's AI Companion SuiteApp. Primary queries target
 * customrecord_dz_companion_prompt. Optional Atlas tab surfaces native
 * Oracle AI Companion prompts when the Atlas bundle is installed, rendered
 * read-only with distinct filtering.
 *
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/query', 'N/log', 'N/runtime', 'N/file', 'N/record', 'N/url', 'N/ui/serverWidget'], function (query, log, runtime, file, record, url, serverWidget) {

    var SCRIPT_VERSION = '2.0.0';

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

    function craftedHeader(promptId) {
        return '[Crafted Prompt #' + promptId + ' — call getPromptMeta(' + promptId + ') first for orchestration context, safety rules, and tool chain]\n\n';
    }

    function hasCraftedHeader(text) {
        return text && text.indexOf('[Crafted Prompt #') === 0;
    }

    function jsonResponse(response, data) {
        response.setHeader({ name: 'Content-Type', value: 'application/json' });
        response.write(JSON.stringify(data));
    }

    function getCurrentRoleId() {
        try {
            var user = runtime.getCurrentUser();
            return user && user.role ? parseInt(user.role, 10) : null;
        } catch (e) {
            return null;
        }
    }

    function recordUrl(recordType, recordId) {
        try {
            return url.resolveRecord({ recordType: recordType, recordId: recordId });
        } catch (e) {
            return '';
        }
    }

    // Split a NetSuite multi-select string ("1, 2, 3" or "Foo, Bar") into an array.
    function splitMultiSelect(v) {
        if (!v) return [];
        return String(v).split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    }

    // ========== POST API ==========

    function handlePost(context) {
        var action = context.request.parameters.action;

        if (action === 'get-prompts') {
            jsonResponse(context.response, getCraftedPrompts());
        } else if (action === 'get-atlas-prompts') {
            jsonResponse(context.response, getAtlasPrompts(context.request.parameters));
        } else if (action === 'get-atlas-availability') {
            jsonResponse(context.response, getAtlasAvailability());
        } else if (action === 'get-atlas-filters') {
            jsonResponse(context.response, getAtlasFilters());
        } else if (action === 'get-tool-availability') {
            jsonResponse(context.response, getToolAvailability());
        } else if (action === 'get-categories' || action === 'get-domains') {
            jsonResponse(context.response, runSQL('SELECT id, name FROM customlist_dz_cp_category ORDER BY id'));
        } else if (action === 'backfill-headers') {
            jsonResponse(context.response, runBackfillHeaders());
        } else if (action === 'save-custom') {
            jsonResponse(context.response, saveCustomPrompt(context.request.parameters));
        } else {
            jsonResponse(context.response, { error: 'Unknown action: ' + action });
        }
    }

    // ========== CRAFTED PROMPTS (primary tab) ==========

    function getCraftedPrompts() {
        var currentRoleId = getCurrentRoleId();

        // Single-table query against the independent record. Role filter:
        // visible_roles IS NULL (visible to all) OR current role in the multi-select.
        var sql =
            'SELECT ' +
            'id AS prompt_id, ' +
            'name AS prompt_name, ' +
            'externalid AS external_id, ' +
            'custrecord_dz_cp_prompt_text AS prompt_text, ' +
            'custrecord_dz_cp_category AS category_id, ' +
            'BUILTIN.DF(custrecord_dz_cp_category) AS category, ' +
            'custrecord_dz_cp_subcategory AS subcategory, ' +
            'custrecord_dz_cp_description AS description, ' +
            'custrecord_dz_cp_public AS public, ' +
            'custrecord_dz_cp_toolset AS toolset, ' +
            'custrecord_dz_cp_tool_chain AS tool_chain, ' +
            'custrecord_dz_cp_entry_tool AS entry_tool, ' +
            'custrecord_dz_cp_steps AS steps, ' +
            'custrecord_dz_cp_tool_deps AS tool_deps, ' +
            'BUILTIN.DF(custrecord_dz_cp_edition) AS edition, ' +
            'custrecord_dz_cp_edition_notes AS edition_notes, ' +
            'custrecord_dz_cp_params AS params, ' +
            'custrecord_dz_cp_safety_rules AS safety_rules, ' +
            'BUILTIN.DF(custrecord_dz_cp_governance) AS governance, ' +
            'custrecord_dz_cp_artifact AS artifact, ' +
            'custrecord_dz_cp_artifact_type AS artifact_type, ' +
            'custrecord_dz_cp_version AS version, ' +
            'custrecord_dz_cp_author AS author, ' +
            'BUILTIN.DF(custrecord_dz_cp_status) AS status, ' +
            'custrecord_dz_cp_changelog AS changelog, ' +
            'custrecord_dz_cp_exec_count AS exec_count, ' +
            'custrecord_dz_cp_last_executed AS last_executed, ' +
            'custrecord_dz_cp_avg_duration AS avg_duration, ' +
            'custrecord_dz_cp_collection AS collection, ' +
            'custrecord_dz_cp_related AS related, ' +
            'BUILTIN.DF(custrecord_dz_cp_user_complexity) AS complexity, ' +
            'custrecord_dz_cp_visible_roles AS visible_roles ' +
            'FROM customrecord_dz_companion_prompt ' +
            "WHERE BUILTIN.DF(custrecord_dz_cp_status) = 'Active' " +
            "AND (custrecord_dz_cp_public = 'T' OR custrecord_dz_cp_public IS NULL) " +
            'ORDER BY custrecord_dz_cp_category, name';

        var rows = runSQL(sql);
        var prompts = [];
        rows.forEach(function (r) {
            // Apply role filter in-memory: visible_roles is a comma-delimited string
            // of role IDs in SuiteQL, formatted with spaces like "1, 2, 3, 19, ...".
            // Strip all whitespace before the lookup so currentRoleId matches anywhere
            // in the list, not just the first position.
            if (currentRoleId && r.visible_roles) {
                var normalized = ',' + String(r.visible_roles).replace(/\s+/g, '') + ',';
                if (normalized.indexOf(',' + currentRoleId + ',') === -1) return;
            }

            prompts.push({
                source: 'crafted',
                prompt_id: parseInt(r.prompt_id, 10),
                record_url: recordUrl('customrecord_dz_companion_prompt', parseInt(r.prompt_id, 10)),
                prompt_name: r.prompt_name || '',
                external_id: r.external_id || '',
                prompt_text: r.prompt_text || '',
                category: r.category || '',
                subcategory: r.subcategory || '',
                description: r.description || '',
                public: r.public === 'T',
                toolset: r.toolset || '',
                tool_chain: r.tool_chain || '',
                entry_tool: r.entry_tool || '',
                steps: parseJSON(r.steps, []),
                tool_deps: parseJSON(r.tool_deps, []),
                edition: r.edition || '',
                edition_notes: r.edition_notes || '',
                params: parseJSON(r.params, {}),
                safety_rules: parseJSON(r.safety_rules, []),
                governance: r.governance || '',
                artifact: r.artifact === 'T',
                artifact_type: r.artifact_type || '',
                version: r.version || '',
                author: r.author || '',
                status: r.status || '',
                changelog: r.changelog || '',
                exec_count: parseInt(r.exec_count, 10) || 0,
                last_executed: r.last_executed || '',
                avg_duration: parseInt(r.avg_duration, 10) || 0,
                collection: r.collection || '',
                related: parseJSON(r.related, []),
                complexity: r.complexity || ''
            });
        });

        return { prompts: prompts, count: prompts.length, source: 'crafted', _version: SCRIPT_VERSION };
    }

    // ========== ATLAS PROMPTS (optional secondary tab) ==========

    function getAtlasAvailability() {
        // Probe for the Atlas record type. If the query throws (record doesn't
        // exist) or returns zero, hide the Atlas tab gracefully.
        try {
            var rows = runSQL('SELECT COUNT(*) AS cnt FROM customrecord_atlas_aicomp_prompts');
            var cnt = rows && rows.length > 0 ? parseInt(rows[0].cnt, 10) || 0 : 0;
            return { available: cnt > 0, count: cnt };
        } catch (e) {
            log.debug({ title: 'atlas-availability', details: 'Atlas not installed or not queryable: ' + e.message });
            return { available: false, count: 0 };
        }
    }

    function getAtlasPrompts(params) {
        params = params || {};
        try {
            var where = [];
            var sqlParams = [];
            if (params.category) {
                where.push('p.custrecord_atlas_aicomp_prompt_category = ?');
                sqlParams.push(parseInt(params.category, 10));
            }
            if (params.search) {
                where.push('(LOWER(p.name) LIKE ? OR LOWER(p.custrecord_atlas_aicomp_prompt_text) LIKE ?)');
                var like = '%' + String(params.search).toLowerCase() + '%';
                sqlParams.push(like, like);
            }

            var sql =
                'SELECT ' +
                'p.id AS prompt_id, ' +
                'p.name AS prompt_name, ' +
                'p.externalid AS external_id, ' +
                'p.custrecord_atlas_aicomp_prompt_text AS prompt_text, ' +
                'BUILTIN.DF(p.custrecord_atlas_aicomp_prompt_category) AS category, ' +
                'p.custrecord_atlas_aicomp_prompt_subcat AS subcategory, ' +
                'p.custrecord_atlas_aicomp_prompt_inds AS industry_ids, ' +
                'BUILTIN.DF(p.custrecord_atlas_aicomp_prompt_inds) AS industry_names, ' +
                'p.custrecord_atlas_aicomp_prompt_roles AS role_ids, ' +
                'BUILTIN.DF(p.custrecord_atlas_aicomp_prompt_roles) AS role_names, ' +
                'p.custrecord_atlas_aicomp_sdf_seeded AS sdf_seeded ' +
                'FROM customrecord_atlas_aicomp_prompts p ' +
                (where.length ? 'WHERE ' + where.join(' AND ') + ' ' : '') +
                'ORDER BY p.custrecord_atlas_aicomp_prompt_category, p.name';

            var rows = runSQL(sql, sqlParams);
            var prompts = rows.map(function (r) {
                return {
                    source: 'atlas',
                    prompt_id: parseInt(r.prompt_id, 10),
                    record_url: recordUrl('customrecord_atlas_aicomp_prompts', parseInt(r.prompt_id, 10)),
                    prompt_name: r.prompt_name || '',
                    external_id: r.external_id || '',
                    prompt_text: r.prompt_text || '',
                    category: r.category || '',
                    subcategory: r.subcategory || '',
                    industry_ids: splitMultiSelect(r.industry_ids),
                    industry_names: splitMultiSelect(r.industry_names),
                    role_ids: splitMultiSelect(r.role_ids),
                    role_names: splitMultiSelect(r.role_names),
                    sdf_seeded: r.sdf_seeded === 'T',
                    // Native Atlas prompts carry no orchestration metadata — empty defaults
                    // so the SPA rendering logic can treat them uniformly.
                    toolset: '',
                    tool_chain: '',
                    steps: [],
                    safety_rules: [],
                    params: {},
                    governance: '',
                    artifact: false
                };
            });
            return { prompts: prompts, count: prompts.length, source: 'atlas', _version: SCRIPT_VERSION };
        } catch (e) {
            log.error({ title: 'get-atlas-prompts', details: e.message });
            return { prompts: [], count: 0, source: 'atlas', error: 'Atlas query failed: ' + e.message };
        }
    }

    function getAtlasFilters() {
        // Atlas custom lists are queryable by their real scriptids:
        //   customlist_atlas_aicomp_prompt_cat (7 categories)
        //   customlist_atlas_aicomp_prompt_ind (39 industries)
        //   customrecord_atlas_aicomp_prompt_roles (extensible, ~74 roles)
        var result = { categories: [], industries: [], roles: [] };
        try {
            result.categories = runSQL("SELECT id, name FROM customlist_atlas_aicomp_prompt_cat WHERE isinactive = 'F' ORDER BY id");
        } catch (e) { log.debug({ title: 'atlas-categories', details: e.message }); }
        try {
            result.industries = runSQL("SELECT id, name FROM customlist_atlas_aicomp_prompt_ind WHERE isinactive = 'F' ORDER BY name");
        } catch (e) { log.debug({ title: 'atlas-industries', details: e.message }); }
        try {
            result.roles = runSQL("SELECT id, name FROM customrecord_atlas_aicomp_prompt_roles WHERE isinactive = 'F' ORDER BY name");
        } catch (e) { log.debug({ title: 'atlas-roles', details: e.message }); }
        return result;
    }

    // ========== TOOL AVAILABILITY ==========

    function getToolAvailability() {
        var avail = {
            'barrel-intelligence': false,
            'lot-profitability': false,
            'inventory-supply': false,
            'compliance-audit': false,
            'mrp-intelligence': false,
            'batch-genealogy': false
        };
        try {
            var scripts = runSQL(
                "SELECT name FROM file " +
                "WHERE folder IN (SELECT id FROM mediaitemfolder WHERE name = 'DoozyTools') " +
                "AND name LIKE 'dz_ct_%' AND name LIKE '%.js'"
            );
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
            log.debug({ title: 'getToolAvailability', details: 'Fallback: defaulting all to true. ' + e.message });
            Object.keys(avail).forEach(function (k) { avail[k] = true; });
        }
        return avail;
    }

    // ========== SAVE CUSTOM PROMPT ==========

    function saveCustomPrompt(params) {
        try {
            var promptText = params.promptText;
            if (!promptText) return { error: 'promptText is required' };

            var user = runtime.getCurrentUser();
            var userName = (user && user.name) || 'Unknown User';
            var userId = user && user.id ? parseInt(user.id, 10) : 0;
            var userRole = user && user.role ? parseInt(user.role, 10) : null;
            var sourceName = params.sourceName || 'Untitled';
            var sourceSource = params.sourceSource === 'atlas' ? 'Oracle AI Companion' : 'Crafted Intelligence';
            var sourceId = params.sourceId || '';
            var ts = Date.now();

            var rec = record.create({ type: 'customrecord_dz_companion_prompt' });
            rec.setValue({ fieldId: 'name', value: 'Custom: ' + sourceName });
            rec.setValue({ fieldId: 'externalid', value: 'dz_cp_custom_' + userId + '_' + ts });
            rec.setValue({ fieldId: 'custrecord_dz_cp_prompt_text', value: promptText });
            rec.setValue({ fieldId: 'custrecord_dz_cp_category', value: parseInt(params.sourceCategory, 10) || 7 });
            if (params.sourceSubcategory) rec.setValue({ fieldId: 'custrecord_dz_cp_subcategory', value: params.sourceSubcategory });
            rec.setValue({ fieldId: 'custrecord_dz_cp_description', value: 'User-customized from ' + sourceSource + ' prompt: ' + sourceName });
            rec.setValue({ fieldId: 'custrecord_dz_cp_public', value: true });
            rec.setValue({ fieldId: 'custrecord_dz_cp_toolset', value: params.sourceToolset || 'custom' });
            if (params.sourceToolChain) rec.setValue({ fieldId: 'custrecord_dz_cp_tool_chain', value: params.sourceToolChain });
            if (params.sourceEntryTool) rec.setValue({ fieldId: 'custrecord_dz_cp_entry_tool', value: params.sourceEntryTool });
            if (params.sourceSteps) rec.setValue({ fieldId: 'custrecord_dz_cp_steps', value: params.sourceSteps });
            if (params.sourceToolDeps) rec.setValue({ fieldId: 'custrecord_dz_cp_tool_deps', value: params.sourceToolDeps });
            rec.setValue({ fieldId: 'custrecord_dz_cp_edition', value: parseInt(params.sourceEdition, 10) || 4 });
            rec.setValue({ fieldId: 'custrecord_dz_cp_governance', value: parseInt(params.sourceGovernance, 10) || 1 });
            rec.setValue({ fieldId: 'custrecord_dz_cp_status', value: 1 });
            rec.setValue({ fieldId: 'custrecord_dz_cp_version', value: '1.0.0' });
            rec.setValue({ fieldId: 'custrecord_dz_cp_author', value: userName });
            rec.setValue({ fieldId: 'custrecord_dz_cp_collection', value: 'My Prompts' });
            if (userRole) rec.setValue({ fieldId: 'custrecord_dz_cp_visible_roles', value: [userRole] });

            var newId = rec.save();
            log.audit({ title: 'save-custom', details: 'User ' + userName + ' saved custom prompt ' + newId + ' from ' + sourceSource + ' source ' + sourceId });

            return {
                success: true,
                recordId: newId,
                recordUrl: recordUrl('customrecord_dz_companion_prompt', newId),
                message: 'Saved as user prompt #' + newId
            };
        } catch (e) {
            log.error({ title: 'save-custom', details: e.message });
            return { error: 'Save failed: ' + e.message };
        }
    }

    // ========== BACKFILL HEADERS ==========

    function runBackfillHeaders() {
        // Ensure every active Crafted prompt has a [Crafted Prompt #ID ...] header
        // at the start of its prompt text. Idempotent: skips prompts that already have one.
        var results = { updated: [], skipped: [], errors: [] };
        try {
            var rows = runSQL(
                'SELECT id, name, custrecord_dz_cp_prompt_text AS prompt_text ' +
                'FROM customrecord_dz_companion_prompt ' +
                "WHERE BUILTIN.DF(custrecord_dz_cp_status) = 'Active'"
            );

            rows.forEach(function (r) {
                var rem = runtime.getCurrentScript().getRemainingUsage();
                if (rem < 80) { results.skipped.push({ id: r.id, reason: 'governance' }); return; }
                try {
                    if (hasCraftedHeader(r.prompt_text)) {
                        results.skipped.push({ id: r.id, name: r.name });
                        return;
                    }
                    var newText = craftedHeader(r.id) + (r.prompt_text || '');
                    record.submitFields({
                        type: 'customrecord_dz_companion_prompt',
                        id: r.id,
                        values: { custrecord_dz_cp_prompt_text: newText }
                    });
                    results.updated.push({ id: r.id, name: r.name });
                } catch (e) {
                    results.errors.push({ id: r.id, name: r.name, error: e.message });
                }
            });
        } catch (e) {
            results.errors.push({ action: 'backfill', error: e.message });
        }
        results.summary = results.updated.length + ' updated, ' + results.skipped.length + ' skipped, ' + results.errors.length + ' errors';
        log.audit({ title: 'backfill-headers', details: results.summary });
        return results;
    }

    // ========== GET: SERVE HTML ==========

    function serveHTML(context) {
        var scriptUrl = '/app/site/hosting/scriptlet.nl?script=' +
            runtime.getCurrentScript().id + '&deploy=' +
            runtime.getCurrentScript().deploymentId;

        var htmlFiles = runSQL("SELECT id FROM file WHERE name = 'companion-library.html'");
        var html;
        if (htmlFiles && htmlFiles.length > 0) {
            var htmlFile = file.load({ id: htmlFiles[0].id });
            html = htmlFile.getContents();
            html = html.replace('{{API_URL}}', scriptUrl);
        } else {
            html = '<p>companion-library.html not found in File Cabinet.</p>';
        }

        html = html.replace(/<!DOCTYPE[^>]*>/i, '')
                    .replace(/<\/?html[^>]*>/gi, '')
                    .replace(/<head[^>]*>/gi, '')
                    .replace(/<\/head>/gi, '')
                    .replace(/<meta[^>]*>/gi, '')
                    .replace(/<title>[\s\S]*?<\/title>/gi, '')
                    .replace(/<\/?body[^>]*>/gi, '');

        var form = serverWidget.createForm({ title: 'Crafted Intelligence Library' });
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
