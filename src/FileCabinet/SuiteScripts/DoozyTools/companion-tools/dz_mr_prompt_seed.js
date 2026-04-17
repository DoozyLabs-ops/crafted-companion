/**
 * dz_mr_prompt_seed.js
 * Crafted Intelligence - Prompt Seed Map/Reduce
 *
 * Reads seed-data.json from File Cabinet and creates/updates
 * Crafted Intelligence prompt records idempotently. Handles role
 * resolution by matching seed patterns against the account's
 * actual NetSuite roles. Version-aware: skips records where the
 * deployed version is >= the seed version.
 *
 * Triggered by the admin seed Suitelet or manually from the
 * NetSuite UI. Runs as Administrator to ensure full access to
 * prompt record and account role metadata.
 *
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/file', 'N/record', 'N/query', 'N/log'], function (file, record, query, log) {

    var SCRIPT_VERSION = '2.0.0';
    var SEED_FILE_PATH = 'SuiteScripts/DoozyTools/companion-tools/seed-data.json';

    // ========== ENTRY POINTS ==========

    function getInputData() {
        var seedFiles = runSQL(
            "SELECT id FROM file WHERE name = ? AND folder IN " +
            "(SELECT id FROM mediaitemfolder WHERE name = 'companion-tools')",
            ['seed-data.json']
        );
        if (!seedFiles || seedFiles.length === 0) {
            log.error({ title: 'dz_mr_prompt_seed', details: 'seed-data.json not found in File Cabinet' });
            return [];
        }

        var seedFile = file.load({ id: seedFiles[0].id });
        var seedData;
        try {
            seedData = JSON.parse(seedFile.getContents());
        } catch (e) {
            log.error({ title: 'dz_mr_prompt_seed', details: 'Failed to parse seed-data.json: ' + e.message });
            return [];
        }

        log.audit({
            title: 'Seed Started',
            details: 'Version: ' + (seedData.version || 'unknown') + ' | Prompts: ' + (seedData.prompts || []).length
        });

        return seedData.prompts || [];
    }

    function map(context) {
        var prompt;
        try {
            prompt = JSON.parse(context.value);
        } catch (e) {
            log.error({ title: 'map parse error', details: e.message });
            return;
        }
        if (!prompt.external_id) {
            log.error({ title: 'map skip', details: 'Prompt missing external_id: ' + (prompt.name || 'unnamed') });
            return;
        }
        context.write({ key: prompt.external_id, value: JSON.stringify(prompt) });
    }

    function reduce(context) {
        var externalId = context.key;
        var prompt;
        try {
            prompt = JSON.parse(context.values[0]);
        } catch (e) {
            log.error({ title: 'reduce parse error', details: externalId + ': ' + e.message });
            return;
        }

        try {
            var existing = runSQL(
                'SELECT id, custrecord_dz_cp_version AS version ' +
                'FROM customrecord_dz_companion_prompt WHERE externalid = ?',
                [externalId]
            );

            if (existing && existing.length > 0) {
                var deployedVersion = existing[0].version || '0.0.0';
                var seedVersion = prompt.version || '1.0.0';
                if (!isNewer(seedVersion, deployedVersion)) {
                    log.debug({ title: 'Skip', details: externalId + ' v' + deployedVersion + ' >= seed v' + seedVersion });
                    return;
                }
                updatePromptRecord(existing[0].id, prompt);
                log.audit({ title: 'Updated', details: externalId + ' v' + deployedVersion + ' -> v' + seedVersion });
            } else {
                var newId = createPromptRecord(prompt, externalId);
                log.audit({ title: 'Created', details: externalId + ' -> ID ' + newId });
            }
        } catch (e) {
            log.error({ title: 'Seed Error: ' + externalId, details: e.message });
        }
    }

    function summarize(summary) {
        var errorCount = 0;
        summary.reduceSummary.errors.iterator().each(function (key, error) {
            log.error({ title: 'Reduce error: ' + key, details: error });
            errorCount++;
            return true;
        });

        log.audit({
            title: 'Seed Complete',
            details: 'Version ' + SCRIPT_VERSION +
                ' | Processed ' + summary.inputSummary.recordCount +
                ' | Reduce yields: ' + summary.reduceSummary.yields +
                ' | Errors: ' + errorCount
        });
    }

    // ========== RECORD OPERATIONS ==========

    function createPromptRecord(prompt, externalId) {
        var rec = record.create({ type: 'customrecord_dz_companion_prompt' });

        // Identity
        rec.setValue({ fieldId: 'name', value: prompt.name });
        rec.setValue({ fieldId: 'externalid', value: externalId });
        rec.setValue({ fieldId: 'custrecord_dz_cp_prompt_text', value: prompt.prompt_text || '' });
        rec.setValue({ fieldId: 'custrecord_dz_cp_category', value: prompt.category || 7 });
        if (prompt.subcategory) rec.setValue({ fieldId: 'custrecord_dz_cp_subcategory', value: prompt.subcategory });
        if (prompt.description) rec.setValue({ fieldId: 'custrecord_dz_cp_description', value: prompt.description });
        rec.setValue({ fieldId: 'custrecord_dz_cp_public', value: prompt.public !== false });

        // Orchestration
        rec.setValue({ fieldId: 'custrecord_dz_cp_toolset', value: prompt.toolset || '' });
        if (prompt.tool_chain) rec.setValue({ fieldId: 'custrecord_dz_cp_tool_chain', value: prompt.tool_chain });
        if (prompt.entry_tool) rec.setValue({ fieldId: 'custrecord_dz_cp_entry_tool', value: prompt.entry_tool });
        if (prompt.steps) rec.setValue({ fieldId: 'custrecord_dz_cp_steps', value: jsonString(prompt.steps) });
        if (prompt.tool_deps) rec.setValue({ fieldId: 'custrecord_dz_cp_tool_deps', value: jsonString(prompt.tool_deps) });

        // Edition
        rec.setValue({ fieldId: 'custrecord_dz_cp_edition', value: prompt.edition || 4 });
        if (prompt.edition_notes) rec.setValue({ fieldId: 'custrecord_dz_cp_edition_notes', value: prompt.edition_notes });

        // Params & safety
        if (prompt.params) rec.setValue({ fieldId: 'custrecord_dz_cp_params', value: jsonString(prompt.params) });
        if (prompt.safety_rules) rec.setValue({ fieldId: 'custrecord_dz_cp_safety_rules', value: jsonString(prompt.safety_rules) });

        // Governance & artifacts
        rec.setValue({ fieldId: 'custrecord_dz_cp_governance', value: prompt.governance || 1 });
        rec.setValue({ fieldId: 'custrecord_dz_cp_artifact', value: prompt.artifact === true });
        if (prompt.artifact_type) rec.setValue({ fieldId: 'custrecord_dz_cp_artifact_type', value: prompt.artifact_type });

        // Metadata
        rec.setValue({ fieldId: 'custrecord_dz_cp_version', value: prompt.version || '1.0.0' });
        rec.setValue({ fieldId: 'custrecord_dz_cp_author', value: prompt.author || 'Doozy Labs' });
        rec.setValue({ fieldId: 'custrecord_dz_cp_status', value: prompt.status || 1 });
        if (prompt.changelog) rec.setValue({ fieldId: 'custrecord_dz_cp_changelog', value: prompt.changelog });

        // Collections & discovery
        if (prompt.collection) rec.setValue({ fieldId: 'custrecord_dz_cp_collection', value: prompt.collection });
        if (prompt.related) rec.setValue({ fieldId: 'custrecord_dz_cp_related', value: jsonString(prompt.related) });
        if (prompt.complexity) rec.setValue({ fieldId: 'custrecord_dz_cp_user_complexity', value: prompt.complexity });

        // Role resolution
        if (prompt.role_patterns) {
            rec.setValue({ fieldId: 'custrecord_dz_cp_role_patterns', value: jsonString(prompt.role_patterns) });
            var roleIds = resolveRoles(prompt.role_patterns);
            if (roleIds.length > 0) {
                rec.setValue({ fieldId: 'custrecord_dz_cp_visible_roles', value: roleIds });
            }
        }

        return rec.save();
    }

    function updatePromptRecord(id, prompt) {
        var rec = record.load({ type: 'customrecord_dz_companion_prompt', id: id });

        if (prompt.name) rec.setValue({ fieldId: 'name', value: prompt.name });
        if (prompt.prompt_text) rec.setValue({ fieldId: 'custrecord_dz_cp_prompt_text', value: prompt.prompt_text });
        if (prompt.category) rec.setValue({ fieldId: 'custrecord_dz_cp_category', value: prompt.category });
        if (prompt.subcategory) rec.setValue({ fieldId: 'custrecord_dz_cp_subcategory', value: prompt.subcategory });
        if (prompt.description) rec.setValue({ fieldId: 'custrecord_dz_cp_description', value: prompt.description });
        if (prompt.public !== undefined) rec.setValue({ fieldId: 'custrecord_dz_cp_public', value: prompt.public !== false });
        if (prompt.toolset) rec.setValue({ fieldId: 'custrecord_dz_cp_toolset', value: prompt.toolset });
        if (prompt.tool_chain) rec.setValue({ fieldId: 'custrecord_dz_cp_tool_chain', value: prompt.tool_chain });
        if (prompt.entry_tool) rec.setValue({ fieldId: 'custrecord_dz_cp_entry_tool', value: prompt.entry_tool });
        if (prompt.steps) rec.setValue({ fieldId: 'custrecord_dz_cp_steps', value: jsonString(prompt.steps) });
        if (prompt.tool_deps) rec.setValue({ fieldId: 'custrecord_dz_cp_tool_deps', value: jsonString(prompt.tool_deps) });
        if (prompt.edition) rec.setValue({ fieldId: 'custrecord_dz_cp_edition', value: prompt.edition });
        if (prompt.edition_notes) rec.setValue({ fieldId: 'custrecord_dz_cp_edition_notes', value: prompt.edition_notes });
        if (prompt.params) rec.setValue({ fieldId: 'custrecord_dz_cp_params', value: jsonString(prompt.params) });
        if (prompt.safety_rules) rec.setValue({ fieldId: 'custrecord_dz_cp_safety_rules', value: jsonString(prompt.safety_rules) });
        if (prompt.governance) rec.setValue({ fieldId: 'custrecord_dz_cp_governance', value: prompt.governance });
        if (prompt.artifact !== undefined) rec.setValue({ fieldId: 'custrecord_dz_cp_artifact', value: prompt.artifact === true });
        if (prompt.artifact_type) rec.setValue({ fieldId: 'custrecord_dz_cp_artifact_type', value: prompt.artifact_type });
        if (prompt.version) rec.setValue({ fieldId: 'custrecord_dz_cp_version', value: prompt.version });
        if (prompt.author) rec.setValue({ fieldId: 'custrecord_dz_cp_author', value: prompt.author });
        if (prompt.status) rec.setValue({ fieldId: 'custrecord_dz_cp_status', value: prompt.status });
        if (prompt.changelog) rec.setValue({ fieldId: 'custrecord_dz_cp_changelog', value: prompt.changelog });
        if (prompt.collection) rec.setValue({ fieldId: 'custrecord_dz_cp_collection', value: prompt.collection });
        if (prompt.related) rec.setValue({ fieldId: 'custrecord_dz_cp_related', value: jsonString(prompt.related) });
        if (prompt.complexity) rec.setValue({ fieldId: 'custrecord_dz_cp_user_complexity', value: prompt.complexity });

        if (prompt.role_patterns) {
            rec.setValue({ fieldId: 'custrecord_dz_cp_role_patterns', value: jsonString(prompt.role_patterns) });
            var roleIds = resolveRoles(prompt.role_patterns);
            if (roleIds.length > 0) {
                rec.setValue({ fieldId: 'custrecord_dz_cp_visible_roles', value: roleIds });
            }
        }

        rec.save();
    }

    // ========== ROLE RESOLUTION ==========

    function resolveRoles(patterns) {
        var roleIds = [];
        var seen = {};

        // Always include CI base roles if present in account
        var ciRoles = runSQL(
            "SELECT id FROM role WHERE scriptid IN ('customrole_dz_ci_admin', 'customrole_dz_ci_user')",
            []
        );
        ciRoles.forEach(function (r) {
            var idNum = parseInt(r.id, 10);
            if (!seen[idNum]) { roleIds.push(idNum); seen[idNum] = true; }
        });

        // Fuzzy-match patterns against active account roles (case-insensitive contains)
        var allRoles = runSQL("SELECT id, name FROM role WHERE isinactive = 'F'", []);
        patterns.forEach(function (pattern) {
            var lowerPattern = (pattern || '').toLowerCase();
            if (!lowerPattern) return;
            allRoles.forEach(function (role) {
                var roleName = (role.name || '').toLowerCase();
                var idNum = parseInt(role.id, 10);
                if (roleName.indexOf(lowerPattern) !== -1 && !seen[idNum]) {
                    roleIds.push(idNum);
                    seen[idNum] = true;
                }
            });
        });

        return roleIds;
    }

    // ========== HELPERS ==========

    function runSQL(sql, params) {
        var results = query.runSuiteQL({ query: sql, params: params || [] });
        return results.asMappedResults().map(function (row) {
            Object.keys(row).forEach(function (k) {
                if (row[k] && typeof row[k] === 'object' && typeof row[k].toString === 'function') {
                    var s = row[k].toString();
                    if (s === '[object ScriptNullObjectAdapter]') row[k] = null;
                    else row[k] = s;
                }
            });
            return row;
        });
    }

    function jsonString(v) {
        if (v === null || v === undefined) return '';
        if (typeof v === 'string') return v;
        try { return JSON.stringify(v); } catch (e) { return ''; }
    }

    function isNewer(seedVer, deployedVer) {
        var s = (seedVer || '0.0.0').split('.').map(function (n) { return parseInt(n, 10) || 0; });
        var d = (deployedVer || '0.0.0').split('.').map(function (n) { return parseInt(n, 10) || 0; });
        for (var i = 0; i < 3; i++) {
            if ((s[i] || 0) > (d[i] || 0)) return true;
            if ((s[i] || 0) < (d[i] || 0)) return false;
        }
        return false;
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
