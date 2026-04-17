/*
 * dz_ct_companion.js
 * Crafted Intelligence - Companion Prompt Custom Tools
 *
 * Four focused tools for managing Crafted Intelligence prompts:
 *   getPromptMeta  - Read a prompt record with all orchestration metadata
 *   seedPrompt     - Create a prompt record idempotently
 *   updatePrompt   - Update prompt fields with semantic version bump
 *   logExecution   - Record an execution log and update usage analytics
 *
 * Independent from Oracle's AI Companion SuiteApp. All data lives in
 * customrecord_dz_companion_prompt — a single independent record type.
 * No JOINs, no FK fragility, no bundle-lock constraints.
 *
 * @NApiVersion 2.1
 * @NScriptType CustomTool
 */
define(['N/query', 'N/log', 'N/record'], function (query, log, record) {

    var SCRIPT_VERSION = '2.0.0';

    // ========== SHARED HELPERS ==========

    function runSQL(sql, params, label) {
        return query.runSuiteQL.promise({
            query: sql,
            params: params || []
        }).then(function (resultSet) {
            var rows = resultSet.asMappedResults();
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
        }).catch(function (e) {
            log.error({ title: 'runSQL [' + label + ']', details: e.message + ' | SQL: ' + sql });
            return [];
        });
    }

    function sv(v, fb) {
        if (v === null || v === undefined) return fb || '';
        var s = String(v);
        return (s === '[object ScriptNullObjectAdapter]' || s === 'undefined') ? (fb || '') : s;
    }

    function parseJSON(str, fallback) {
        if (!str) return fallback;
        try { return JSON.parse(str); } catch (e) { return fallback; }
    }

    function jsonString(v) {
        if (v === null || v === undefined) return '';
        if (typeof v === 'string') return v;
        try { return JSON.stringify(v); } catch (e) { return ''; }
    }

    // Shared SELECT column list for the prompt record — used by getPromptMeta
    var SELECT_COLUMNS =
        'id AS prompt_id, ' +
        'name AS prompt_name, ' +
        'externalid AS external_id, ' +
        'custrecord_dz_cp_prompt_text AS prompt_text, ' +
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
        'BUILTIN.DF(custrecord_dz_cp_user_complexity) AS complexity';

    function shapeRow(r) {
        return {
            prompt_id: r.prompt_id,
            external_id: sv(r.external_id),
            prompt_name: sv(r.prompt_name),
            prompt_text: sv(r.prompt_text),
            category: sv(r.category),
            subcategory: sv(r.subcategory),
            description: sv(r.description),
            public: r.public === 'T' || r.public === true,
            toolset: sv(r.toolset),
            tool_chain: sv(r.tool_chain),
            entry_tool: sv(r.entry_tool),
            steps: parseJSON(r.steps, []),
            tool_deps: parseJSON(r.tool_deps, []),
            edition: sv(r.edition),
            edition_notes: sv(r.edition_notes),
            params: parseJSON(r.params, {}),
            safety_rules: parseJSON(r.safety_rules, []),
            governance: sv(r.governance),
            artifact: r.artifact === 'T' || r.artifact === true,
            artifact_type: sv(r.artifact_type),
            version: sv(r.version),
            author: sv(r.author),
            status: sv(r.status),
            changelog: sv(r.changelog),
            exec_count: parseInt(r.exec_count, 10) || 0,
            last_executed: sv(r.last_executed),
            avg_duration: parseInt(r.avg_duration, 10) || 0,
            collection: sv(r.collection),
            related: parseJSON(r.related, []),
            complexity: sv(r.complexity)
        };
    }

    // ========== getPromptMeta ==========

    function getPromptMeta(params) {
        params = params || {};
        var promptId = params.promptId;
        var externalId = params.externalId;

        if (!promptId && !externalId) {
            return Promise.resolve(JSON.stringify({
                error: 'Either promptId or externalId is required.',
                _version: SCRIPT_VERSION
            }));
        }

        var sql = 'SELECT ' + SELECT_COLUMNS + ' FROM customrecord_dz_companion_prompt WHERE ';
        var sqlParams;
        if (promptId) {
            sql += 'id = ?';
            sqlParams = [promptId];
        } else {
            sql += 'externalid = ?';
            sqlParams = [externalId];
        }

        return runSQL(sql, sqlParams, 'getPromptMeta').then(function (rows) {
            if (!rows || rows.length === 0) {
                var lookup = promptId ? ('prompt ID ' + promptId) : ('external ID ' + externalId);
                return JSON.stringify({
                    error: 'No Crafted Intelligence prompt found for ' + lookup + '. The ID may be incorrect or the prompt may not be deployed.',
                    _version: SCRIPT_VERSION
                });
            }
            var result = shapeRow(rows[0]);
            result._version = SCRIPT_VERSION;
            return JSON.stringify(result);
        });
    }

    // ========== seedPrompt ==========

    function seedPrompt(params) {
        params = params || {};
        var pName = params.name;
        var extId = params.externalId;
        var promptText = params.promptText;

        if (!pName || !extId || !promptText) {
            return Promise.resolve(JSON.stringify({
                error: 'name, externalId, and promptText are all required.',
                version: SCRIPT_VERSION
            }));
        }

        var checkSql = 'SELECT id FROM customrecord_dz_companion_prompt WHERE externalid = ?';
        return runSQL(checkSql, [extId], 'seedPrompt-check').then(function (existing) {
            if (existing && existing.length > 0) {
                return JSON.stringify({
                    success: true,
                    action: 'existing',
                    promptId: parseInt(existing[0].id, 10),
                    externalId: extId,
                    message: 'Prompt already exists. No changes made.',
                    version: SCRIPT_VERSION
                });
            }

            var rec = record.create({ type: 'customrecord_dz_companion_prompt' });

            // Identity
            rec.setValue({ fieldId: 'name', value: pName });
            rec.setValue({ fieldId: 'externalid', value: extId });
            rec.setValue({ fieldId: 'custrecord_dz_cp_prompt_text', value: promptText });
            rec.setValue({ fieldId: 'custrecord_dz_cp_category', value: params.category || 7 });
            if (params.subcategory) rec.setValue({ fieldId: 'custrecord_dz_cp_subcategory', value: params.subcategory });
            if (params.description) rec.setValue({ fieldId: 'custrecord_dz_cp_description', value: params.description });
            rec.setValue({ fieldId: 'custrecord_dz_cp_public', value: params.public !== false });

            // Orchestration
            if (params.toolset) rec.setValue({ fieldId: 'custrecord_dz_cp_toolset', value: params.toolset });
            if (params.toolChain) rec.setValue({ fieldId: 'custrecord_dz_cp_tool_chain', value: params.toolChain });
            if (params.entryTool) rec.setValue({ fieldId: 'custrecord_dz_cp_entry_tool', value: params.entryTool });
            if (params.steps) rec.setValue({ fieldId: 'custrecord_dz_cp_steps', value: jsonString(params.steps) });
            if (params.toolDeps) rec.setValue({ fieldId: 'custrecord_dz_cp_tool_deps', value: jsonString(params.toolDeps) });

            // Edition
            rec.setValue({ fieldId: 'custrecord_dz_cp_edition', value: params.edition || 4 });
            if (params.editionNotes) rec.setValue({ fieldId: 'custrecord_dz_cp_edition_notes', value: params.editionNotes });

            // Params & safety
            if (params.params) rec.setValue({ fieldId: 'custrecord_dz_cp_params', value: jsonString(params.params) });
            if (params.safetyRules) rec.setValue({ fieldId: 'custrecord_dz_cp_safety_rules', value: jsonString(params.safetyRules) });

            // Governance & artifacts
            rec.setValue({ fieldId: 'custrecord_dz_cp_governance', value: params.governance || 1 });
            rec.setValue({ fieldId: 'custrecord_dz_cp_artifact', value: params.artifact === true || params.artifact === 'true' });
            if (params.artifactType) rec.setValue({ fieldId: 'custrecord_dz_cp_artifact_type', value: params.artifactType });

            // Metadata
            rec.setValue({ fieldId: 'custrecord_dz_cp_version', value: params.version || '1.0.0' });
            rec.setValue({ fieldId: 'custrecord_dz_cp_author', value: params.author || 'Doozy Labs' });
            rec.setValue({ fieldId: 'custrecord_dz_cp_status', value: params.status || 1 });
            if (params.changelog) rec.setValue({ fieldId: 'custrecord_dz_cp_changelog', value: params.changelog });

            // Collections & discovery
            if (params.collection) rec.setValue({ fieldId: 'custrecord_dz_cp_collection', value: params.collection });
            if (params.related) rec.setValue({ fieldId: 'custrecord_dz_cp_related', value: jsonString(params.related) });
            if (params.complexity) rec.setValue({ fieldId: 'custrecord_dz_cp_user_complexity', value: params.complexity });

            // Role patterns — store raw; library SPA admin Suitelet handles batch role resolution
            if (params.rolePatterns) rec.setValue({ fieldId: 'custrecord_dz_cp_role_patterns', value: jsonString(params.rolePatterns) });

            var newId = rec.save();
            log.audit({ title: 'seedPrompt', details: 'Created prompt ' + newId + ' (' + extId + ')' });

            return JSON.stringify({
                success: true,
                action: 'created',
                promptId: newId,
                externalId: extId,
                message: 'Created Crafted Intelligence prompt record ' + newId,
                version: SCRIPT_VERSION
            });
        }).catch(function (e) {
            log.error({ title: 'seedPrompt', details: e.message });
            return JSON.stringify({
                error: 'seedPrompt failed: ' + e.message,
                version: SCRIPT_VERSION
            });
        });
    }

    // ========== updatePrompt ==========

    function updatePrompt(params) {
        params = params || {};
        var promptId = params.promptId;

        if (!promptId) {
            return Promise.resolve(JSON.stringify({
                error: 'promptId is required.',
                version: SCRIPT_VERSION
            }));
        }

        var findSql = 'SELECT id, custrecord_dz_cp_version AS version FROM customrecord_dz_companion_prompt WHERE id = ?';
        return runSQL(findSql, [promptId], 'updatePrompt-find').then(function (rows) {
            if (!rows || rows.length === 0) {
                return JSON.stringify({
                    error: 'No Crafted Intelligence prompt found for ID ' + promptId,
                    version: SCRIPT_VERSION
                });
            }

            var currentVersion = sv(rows[0].version, '1.0.0');
            var updatedFields = [];
            var rec = record.load({ type: 'customrecord_dz_companion_prompt', id: promptId });

            function setIf(fieldId, apiKey, transform) {
                if (params[apiKey] !== undefined && params[apiKey] !== null && params[apiKey] !== '') {
                    var val = transform ? transform(params[apiKey]) : params[apiKey];
                    rec.setValue({ fieldId: fieldId, value: val });
                    updatedFields.push(apiKey);
                }
            }

            setIf('name', 'promptName');
            setIf('custrecord_dz_cp_prompt_text', 'promptText');
            setIf('custrecord_dz_cp_category', 'category');
            setIf('custrecord_dz_cp_subcategory', 'subcategory');
            setIf('custrecord_dz_cp_description', 'description');
            setIf('custrecord_dz_cp_toolset', 'toolset');
            setIf('custrecord_dz_cp_tool_chain', 'toolChain');
            setIf('custrecord_dz_cp_entry_tool', 'entryTool');
            setIf('custrecord_dz_cp_steps', 'steps', jsonString);
            setIf('custrecord_dz_cp_tool_deps', 'toolDeps', jsonString);
            setIf('custrecord_dz_cp_edition', 'edition');
            setIf('custrecord_dz_cp_edition_notes', 'editionNotes');
            setIf('custrecord_dz_cp_params', 'params', jsonString);
            setIf('custrecord_dz_cp_safety_rules', 'safetyRules', jsonString);
            setIf('custrecord_dz_cp_governance', 'governance');
            setIf('custrecord_dz_cp_artifact_type', 'artifactType');
            setIf('custrecord_dz_cp_author', 'author');
            setIf('custrecord_dz_cp_status', 'status');
            setIf('custrecord_dz_cp_changelog', 'changelog');
            setIf('custrecord_dz_cp_collection', 'collection');
            setIf('custrecord_dz_cp_related', 'related', jsonString);
            setIf('custrecord_dz_cp_user_complexity', 'complexity');

            if (params.artifact !== undefined) {
                rec.setValue({ fieldId: 'custrecord_dz_cp_artifact', value: params.artifact === true || params.artifact === 'true' });
                updatedFields.push('artifact');
            }

            var newVersion = params.newVersion || bumpVersion(currentVersion);
            rec.setValue({ fieldId: 'custrecord_dz_cp_version', value: newVersion });
            updatedFields.push('version');

            rec.save();

            return JSON.stringify({
                success: true,
                promptId: parseInt(promptId, 10),
                previousVersion: currentVersion,
                newVersion: newVersion,
                updatedFields: updatedFields,
                message: 'Updated ' + updatedFields.length + ' field(s) on prompt ' + promptId,
                version: SCRIPT_VERSION
            });
        }).catch(function (e) {
            log.error({ title: 'updatePrompt', details: e.message });
            return JSON.stringify({
                error: 'updatePrompt failed: ' + e.message,
                version: SCRIPT_VERSION
            });
        });
    }

    function bumpVersion(ver) {
        var parts = (ver || '1.0.0').split('.');
        if (parts.length !== 3) return '1.0.1';
        var patch = parseInt(parts[2], 10) || 0;
        return parts[0] + '.' + parts[1] + '.' + (patch + 1);
    }

    // ========== logExecution ==========

    function logExecution(params) {
        params = params || {};
        var promptId = params.promptId;
        var success = params.success;

        if (!promptId) {
            return Promise.resolve(JSON.stringify({
                error: 'promptId is required.',
                version: SCRIPT_VERSION
            }));
        }
        if (success === undefined || success === null) {
            return Promise.resolve(JSON.stringify({
                error: 'success (true/false) is required.',
                version: SCRIPT_VERSION
            }));
        }

        try {
            // Create the execution log record
            var rec = record.create({ type: 'customrecord_dz_exec_log' });
            rec.setValue({ fieldId: 'custrecord_dz_el_prompt_ref', value: promptId });
            rec.setValue({ fieldId: 'custrecord_dz_el_exec_date', value: new Date() });
            rec.setValue({ fieldId: 'custrecord_dz_el_success', value: success === true || success === 'true' });
            if (params.toolsCalled) rec.setValue({ fieldId: 'custrecord_dz_el_tools_called', value: params.toolsCalled });
            if (params.error) rec.setValue({ fieldId: 'custrecord_dz_el_error', value: params.error });
            if (params.duration) rec.setValue({ fieldId: 'custrecord_dz_el_duration', value: parseInt(params.duration, 10) || 0 });
            if (params.promptVersion) rec.setValue({ fieldId: 'custrecord_dz_el_version', value: params.promptVersion });
            if (params.agent) rec.setValue({ fieldId: 'custrecord_dz_el_agent', value: params.agent });

            var logId = rec.save();

            // Best-effort analytics writeback on the prompt record
            try {
                var promptRec = record.load({ type: 'customrecord_dz_companion_prompt', id: promptId });
                var oldCount = parseInt(promptRec.getValue('custrecord_dz_cp_exec_count') || 0, 10);
                var newCount = oldCount + 1;
                promptRec.setValue({ fieldId: 'custrecord_dz_cp_exec_count', value: newCount });
                promptRec.setValue({ fieldId: 'custrecord_dz_cp_last_executed', value: new Date() });

                if (params.duration) {
                    var oldAvg = parseInt(promptRec.getValue('custrecord_dz_cp_avg_duration') || 0, 10);
                    var dur = parseInt(params.duration, 10) || 0;
                    var newAvg = Math.round((oldAvg * oldCount + dur) / newCount);
                    promptRec.setValue({ fieldId: 'custrecord_dz_cp_avg_duration', value: newAvg });
                }
                promptRec.save();
            } catch (analyticsErr) {
                log.debug({ title: 'logExecution analytics', details: 'Best-effort update failed: ' + analyticsErr.message });
            }

            return Promise.resolve(JSON.stringify({
                success: true,
                logId: logId,
                message: 'Execution logged for prompt ' + promptId,
                version: SCRIPT_VERSION
            }));
        } catch (e) {
            log.error({ title: 'logExecution', details: e.message });
            return Promise.resolve(JSON.stringify({
                error: 'Failed to create execution log: ' + e.message,
                version: SCRIPT_VERSION
            }));
        }
    }

    return {
        getPromptMeta: getPromptMeta,
        logExecution: logExecution,
        seedPrompt: seedPrompt,
        updatePrompt: updatePrompt
    };
});
