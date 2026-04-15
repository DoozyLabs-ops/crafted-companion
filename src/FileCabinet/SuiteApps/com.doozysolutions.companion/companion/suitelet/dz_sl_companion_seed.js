/**
 * dz_sl_companion_seed.js
 * Crafted Companion — Seed Utility Suitelet
 *
 * Two actions:
 *   ?action=seed-meta   — Seeds/updates extension records from seed-data.json
 *   ?action=mirror-roles — Mirrors account NS roles as AI Companion prompt roles
 *
 * Run via URL after SDF deploy. Idempotent — safe to re-run.
 *
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/query', 'N/record', 'N/file', 'N/log', 'N/runtime'], function (query, record, file, log, runtime) {

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

    function jsonResponse(response, data) {
        response.setHeader({ name: 'Content-Type', value: 'application/json' });
        response.write(JSON.stringify(data, null, 2));
    }

    // ========== SEED EXTENSION RECORDS ==========

    function seedMeta(response) {
        var results = { action: 'seed-meta', created: [], updated: [], skipped: [], errors: [], version: SCRIPT_VERSION };

        // Load seed data from File Cabinet
        var seedFiles = runSQL(
            "SELECT id FROM file WHERE name = 'seed-data.json' AND folder IN (SELECT id FROM mediaitemfolder WHERE name = 'tools')"
        );

        if (!seedFiles || seedFiles.length === 0) {
            // Try broader search
            seedFiles = runSQL("SELECT id FROM file WHERE name = 'seed-data.json'");
        }

        if (!seedFiles || seedFiles.length === 0) {
            results.errors.push('seed-data.json not found in File Cabinet. Upload it to SuiteScripts/DoozyTools/companion-tools/ or any folder.');
            jsonResponse(response, results);
            return;
        }

        var seedFile = file.load({ id: seedFiles[0].id });
        var seedData = JSON.parse(seedFile.getContents());
        var defaults = seedData.defaults || {};
        var prompts = seedData.prompts || [];

        log.audit({ title: 'seedMeta', details: 'Loaded ' + prompts.length + ' prompts from seed-data.json' });

        // Get existing extension records by prompt_ref
        var existingRows = runSQL('SELECT id, custrecord_dz_pm_prompt_ref AS prompt_ref, externalid FROM customrecord_dz_prompt_meta');
        var existingByRef = {};
        existingRows.forEach(function (row) {
            existingByRef[row.prompt_ref] = row;
        });

        prompts.forEach(function (p) {
            try {
                var existing = existingByRef[p.prompt_ref];
                var rec;
                var isUpdate = false;

                if (existing) {
                    rec = record.load({ type: 'customrecord_dz_prompt_meta', id: existing.id });
                    isUpdate = true;
                } else {
                    rec = record.create({ type: 'customrecord_dz_prompt_meta' });
                }

                rec.setValue({ fieldId: 'name', value: p.name });
                rec.setValue({ fieldId: 'externalid', value: p.external_id });
                rec.setValue({ fieldId: 'custrecord_dz_pm_prompt_ref', value: p.prompt_ref });
                rec.setValue({ fieldId: 'custrecord_dz_pm_domain', value: p.domain || defaults.domain });
                rec.setValue({ fieldId: 'custrecord_dz_pm_subdomain', value: p.subdomain || '' });
                rec.setValue({ fieldId: 'custrecord_dz_pm_toolset', value: p.toolset || defaults.toolset });
                rec.setValue({ fieldId: 'custrecord_dz_pm_tool_chain', value: p.tool_chain || '' });
                rec.setValue({ fieldId: 'custrecord_dz_pm_entry_tool', value: p.entry_tool || '' });
                rec.setValue({ fieldId: 'custrecord_dz_pm_steps', value: p.steps ? JSON.stringify(p.steps) : '' });
                rec.setValue({ fieldId: 'custrecord_dz_pm_tool_deps', value: p.tool_deps || defaults.tool_deps || '' });
                rec.setValue({ fieldId: 'custrecord_dz_pm_edition', value: p.edition || defaults.edition });
                rec.setValue({ fieldId: 'custrecord_dz_pm_edition_notes', value: p.edition_notes || defaults.edition_notes || '' });
                rec.setValue({ fieldId: 'custrecord_dz_pm_params', value: p.params ? JSON.stringify(p.params) : '' });
                rec.setValue({ fieldId: 'custrecord_dz_pm_safety_rules', value: p.safety_rules ? JSON.stringify(p.safety_rules) : '' });
                rec.setValue({ fieldId: 'custrecord_dz_pm_governance', value: p.governance || defaults.governance || 1 });
                rec.setValue({ fieldId: 'custrecord_dz_pm_artifact', value: p.artifact === true });
                rec.setValue({ fieldId: 'custrecord_dz_pm_artifact_type', value: p.artifact_type || '' });
                rec.setValue({ fieldId: 'custrecord_dz_pm_version', value: p.version || defaults.version || '1.0.0' });
                rec.setValue({ fieldId: 'custrecord_dz_pm_author', value: p.author || defaults.author || 'Doozy Labs' });
                rec.setValue({ fieldId: 'custrecord_dz_pm_status', value: p.status || defaults.status || 1 });

                var savedId = rec.save();

                if (isUpdate) {
                    results.updated.push({ id: savedId, name: p.name, prompt_ref: p.prompt_ref });
                } else {
                    results.created.push({ id: savedId, name: p.name, prompt_ref: p.prompt_ref });
                }
            } catch (e) {
                log.error({ title: 'seedMeta', details: p.name + ': ' + e.message });
                results.errors.push({ name: p.name, prompt_ref: p.prompt_ref, error: e.message });
            }
        });

        results.summary = results.created.length + ' created, ' + results.updated.length + ' updated, ' + results.errors.length + ' errors';
        log.audit({ title: 'seedMeta', details: results.summary });
        jsonResponse(response, results);
    }

    // ========== MIRROR ROLES ==========

    function mirrorRoles(response) {
        var results = { action: 'mirror-roles', created: [], existing: [], mapped: [], errors: [], version: SCRIPT_VERSION };

        // Step 1: Get all active NS roles in this account
        var nsRoles = runSQL(
            "SELECT id, name FROM role WHERE isinactive = 'F' ORDER BY name"
        );
        log.audit({ title: 'mirrorRoles', details: 'Found ' + nsRoles.length + ' active NS roles' });

        // Step 2: Get existing AI Companion prompt roles
        var companionRoles = runSQL(
            'SELECT id, name, externalid FROM customrecord_atlas_aicomp_prompt_roles ORDER BY name'
        );
        var companionByName = {};
        companionRoles.forEach(function (r) {
            companionByName[r.name.toLowerCase().trim()] = r;
        });
        log.audit({ title: 'mirrorRoles', details: 'Found ' + companionRoles.length + ' existing Companion roles' });

        // Step 3: Get existing role mappings
        var mappings = runSQL(
            'SELECT id, custrecord_atlas_aicomp_rm_ns_role AS ns_role, custrecord_atlas_aicomp_rm_comp_role AS comp_role FROM customrecord_atlas_aicomp_role_mapping'
        );
        var mappedNsRoles = {};
        mappings.forEach(function (m) {
            mappedNsRoles[m.ns_role] = m;
        });

        // Step 4: For each NS role, ensure a Companion role exists and is mapped
        nsRoles.forEach(function (nsRole) {
            try {
                var roleName = nsRole.name.trim();
                var key = roleName.toLowerCase();
                var companionRole = companionByName[key];

                if (!companionRole) {
                    // Create new Companion role
                    var extId = 'aipromptrole_crafted_' + nsRole.id;
                    var newRole = record.create({ type: 'customrecord_atlas_aicomp_prompt_roles' });
                    newRole.setValue({ fieldId: 'name', value: roleName });
                    newRole.setValue({ fieldId: 'externalid', value: extId });
                    var newId = newRole.save();

                    companionRole = { id: newId, name: roleName, externalid: extId };
                    companionByName[key] = companionRole;
                    results.created.push({ companion_id: newId, name: roleName, ns_role_id: nsRole.id });
                } else {
                    results.existing.push({ companion_id: companionRole.id, name: roleName, ns_role_id: nsRole.id });
                }

                // Ensure role mapping exists
                if (!mappedNsRoles[nsRole.id]) {
                    var mapping = record.create({ type: 'customrecord_atlas_aicomp_role_mapping' });
                    mapping.setValue({ fieldId: 'custrecord_atlas_aicomp_rm_ns_role', value: nsRole.id });
                    mapping.setValue({ fieldId: 'custrecord_atlas_aicomp_rm_comp_role', value: companionRole.id });
                    mapping.setValue({ fieldId: 'custrecord_atlas_aicomp_rm_confidence', value: 100 });
                    mapping.setValue({ fieldId: 'custrecord_atlas_aicomp_rm_method', value: 3 }); // Manual Override
                    var mapId = mapping.save();
                    results.mapped.push({ mapping_id: mapId, ns_role: roleName, companion_role: companionRole.name });
                }
            } catch (e) {
                log.error({ title: 'mirrorRoles', details: nsRole.name + ': ' + e.message });
                results.errors.push({ ns_role: nsRole.name, ns_role_id: nsRole.id, error: e.message });
            }
        });

        results.summary = results.created.length + ' roles created, ' +
            results.existing.length + ' already existed, ' +
            results.mapped.length + ' new mappings, ' +
            results.errors.length + ' errors';
        log.audit({ title: 'mirrorRoles', details: results.summary });
        jsonResponse(response, results);
    }

    // ========== ENTRY POINT ==========

    function onRequest(context) {
        var action = context.request.parameters.action;

        if (action === 'seed-meta') {
            seedMeta(context.response);
        } else if (action === 'mirror-roles') {
            mirrorRoles(context.response);
        } else {
            jsonResponse(context.response, {
                name: 'Crafted Companion Seed Utility',
                version: SCRIPT_VERSION,
                actions: {
                    'seed-meta': 'Seeds/updates extension records from seed-data.json. Idempotent.',
                    'mirror-roles': 'Mirrors account NS roles as AI Companion prompt roles with mappings. Idempotent.'
                },
                usage: 'Append ?action=seed-meta or ?action=mirror-roles to this URL.',
                account: runtime.accountId
            });
        }
    }

    return { onRequest: onRequest };
});
