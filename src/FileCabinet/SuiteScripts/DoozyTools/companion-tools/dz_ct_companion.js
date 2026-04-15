/*
 * dz_ct_companion.js
 * Crafted ERP - Companion Intelligence Custom Tool
 *
 * Companion prompt orchestration tools: getPromptMeta, seedPrompt,
 * updatePrompt, logExecution. Manages the extension record layer
 * (customrecord_dz_prompt_meta) that links to Oracle's AI Companion
 * prompts and provides orchestration metadata for AI tool chains.
 *
 * @NApiVersion 2.1
 * @NScriptType CustomTool
 */
define(['N/query', 'N/log', 'N/record'], function (query, log, record) {

    var SCRIPT_VERSION = '1.1.0';

    // Atlas AI Companion defaults for Crafted prompts
    var ATLAS_CATEGORY_MANUFACTURING = 6;
    var ATLAS_ROLE_ADMINISTRATOR = 5;
    var ATLAS_INDUSTRY_FOOD_BEV = 17;

    // ========== HELPERS ==========

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
        try {
            return JSON.parse(str);
        } catch (e) {
            return fallback;
        }
    }

    // ========== getPromptMeta ==========

    function getPromptMeta(params) {
        params = params || {};
        var promptId = params.promptId;
        var externalId = params.externalId;

        if (!promptId && !externalId) {
            return Promise.resolve(JSON.stringify({
                error: 'Either promptId or externalId is required.',
                version: SCRIPT_VERSION
            }));
        }

        var sql;
        var sqlParams;

        if (promptId) {
            sql = 'SELECT ' +
                'pm.id AS meta_id, ' +
                'pm.custrecord_dz_pm_prompt_ref AS prompt_id, ' +
                'p.name AS prompt_name, ' +
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
                'JOIN customrecord_atlas_aicomp_prompts p ' +
                '  ON pm.custrecord_dz_pm_prompt_ref = p.id ' +
                'WHERE pm.custrecord_dz_pm_prompt_ref = ?';
            sqlParams = [promptId];
        } else {
            sql = 'SELECT ' +
                'pm.id AS meta_id, ' +
                'pm.custrecord_dz_pm_prompt_ref AS prompt_id, ' +
                'p.name AS prompt_name, ' +
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
                'JOIN customrecord_atlas_aicomp_prompts p ' +
                '  ON pm.custrecord_dz_pm_prompt_ref = p.id ' +
                'WHERE p.externalid = ?';
            sqlParams = [externalId];
        }

        return runSQL(sql, sqlParams, 'getPromptMeta').then(function (rows) {
            if (!rows || rows.length === 0) {
                var lookup = promptId ? ('prompt ID ' + promptId) : ('external ID ' + externalId);
                return JSON.stringify({
                    error: 'No extension record found for ' + lookup + '. This prompt may not have Crafted orchestration metadata, or the ID may be incorrect.',
                    version: SCRIPT_VERSION
                });
            }

            var r = rows[0];
            return JSON.stringify({
                meta_id: r.meta_id,
                prompt_id: r.prompt_id,
                prompt_name: sv(r.prompt_name),
                prompt_text: sv(r.prompt_text),
                domain: sv(r.domain),
                subdomain: sv(r.subdomain),
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
                _version: SCRIPT_VERSION
            });
        });
    }

    // ========== logExecution ==========

    function logExecution(params) {
        params = params || {};
        var promptId = params.promptId;
        var success = params.success;

        if (!promptId) {
            return Promise.resolve({
                error: 'promptId is required.',
                version: SCRIPT_VERSION
            });
        }
        if (success === undefined || success === null) {
            return Promise.resolve({
                error: 'success (true/false) is required.',
                version: SCRIPT_VERSION
            });
        }

        try {
            var rec = record.create({ type: 'customrecord_dz_exec_log' });
            rec.setValue({ fieldId: 'custrecord_dz_el_prompt_ref', value: promptId });
            rec.setValue({ fieldId: 'custrecord_dz_el_exec_date', value: new Date() });
            rec.setValue({ fieldId: 'custrecord_dz_el_success', value: success === true || success === 'true' });

            if (params.toolsCalled) {
                rec.setValue({ fieldId: 'custrecord_dz_el_tools_called', value: params.toolsCalled });
            }
            if (params.error) {
                rec.setValue({ fieldId: 'custrecord_dz_el_error', value: params.error });
            }
            if (params.duration) {
                rec.setValue({ fieldId: 'custrecord_dz_el_duration', value: parseInt(params.duration, 10) || 0 });
            }
            if (params.promptVersion) {
                rec.setValue({ fieldId: 'custrecord_dz_el_version', value: params.promptVersion });
            }
            if (params.agent) {
                rec.setValue({ fieldId: 'custrecord_dz_el_agent', value: params.agent });
            }

            var logId = rec.save();
            return Promise.resolve({
                success: true,
                logId: logId,
                message: 'Execution logged for prompt ' + promptId,
                version: SCRIPT_VERSION
            });
        } catch (e) {
            log.error({ title: 'logExecution', details: e.message });
            return Promise.resolve({
                error: 'Failed to create execution log: ' + e.message,
                version: SCRIPT_VERSION
            });
        }
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

        // Phase 1: Idempotency check — does this externalId already exist?
        var checkSql = 'SELECT id FROM customrecord_atlas_aicomp_prompts WHERE externalid = ?';
        return runSQL(checkSql, [extId], 'seedPrompt-check').then(function (existing) {
            var atlasId;

            if (existing && existing.length > 0) {
                // Atlas prompt already exists
                atlasId = existing[0].id;
                log.audit({ title: 'seedPrompt', details: 'Existing Atlas prompt found: ' + atlasId + ' for ' + extId });
            } else {
                // Create Atlas prompt
                var atlas = record.create({ type: 'customrecord_atlas_aicomp_prompts' });
                atlas.setValue({ fieldId: 'name', value: pName });
                atlas.setValue({ fieldId: 'externalid', value: extId });
                atlas.setValue({ fieldId: 'custrecord_atlas_aicomp_prompt_text', value: promptText });
                atlas.setValue({ fieldId: 'custrecord_atlas_aicomp_prompt_category', value: params.category || ATLAS_CATEGORY_MANUFACTURING });
                atlas.setValue({ fieldId: 'custrecord_atlas_aicomp_prompt_subcat', value: params.subdomain || '' });
                atlas.setValue({ fieldId: 'custrecord_atlas_aicomp_prompt_public', value: true });
                atlas.setValue({ fieldId: 'custrecord_atlas_aicomp_sdf_seeded', value: false });

                // Multi-select: roles
                var roleId = params.roleId || ATLAS_ROLE_ADMINISTRATOR;
                var rolesSublist = atlas.getSublist({ sublistId: 'custrecord_atlas_aicomp_prompt_roles' });
                if (rolesSublist) {
                    atlas.setSublistValue({ sublistId: 'custrecord_atlas_aicomp_prompt_roles', fieldId: 'id', line: 0, value: roleId });
                }

                // Multi-select: industries
                var industryId = params.industryId || ATLAS_INDUSTRY_FOOD_BEV;
                var indsSublist = atlas.getSublist({ sublistId: 'custrecord_atlas_aicomp_prompt_inds' });
                if (indsSublist) {
                    atlas.setSublistValue({ sublistId: 'custrecord_atlas_aicomp_prompt_inds', fieldId: 'id', line: 0, value: industryId });
                }

                atlasId = atlas.save();
                log.audit({ title: 'seedPrompt', details: 'Created Atlas prompt: ' + atlasId + ' (' + extId + ')' });
            }

            // Phase 2: Check if extension record already exists for this atlas prompt
            var metaCheckSql = 'SELECT id FROM customrecord_dz_prompt_meta WHERE custrecord_dz_pm_prompt_ref = ?';
            return runSQL(metaCheckSql, [atlasId], 'seedPrompt-meta-check').then(function (existingMeta) {
                if (existingMeta && existingMeta.length > 0) {
                    return JSON.stringify({
                        success: true,
                        action: 'existing',
                        promptId: atlasId,
                        metaId: existingMeta[0].id,
                        externalId: extId,
                        message: 'Prompt and extension record already exist. No changes made.',
                        version: SCRIPT_VERSION
                    });
                }

                // Create extension record
                var meta = record.create({ type: 'customrecord_dz_prompt_meta' });
                meta.setValue({ fieldId: 'name', value: pName });
                meta.setValue({ fieldId: 'custrecord_dz_pm_prompt_ref', value: atlasId });

                if (params.domain) meta.setValue({ fieldId: 'custrecord_dz_pm_domain', value: params.domain });
                if (params.subdomain) meta.setValue({ fieldId: 'custrecord_dz_pm_subdomain', value: params.subdomain });
                if (params.toolset) meta.setValue({ fieldId: 'custrecord_dz_pm_toolset', value: params.toolset });
                if (params.toolChain) meta.setValue({ fieldId: 'custrecord_dz_pm_tool_chain', value: params.toolChain });
                if (params.entryTool) meta.setValue({ fieldId: 'custrecord_dz_pm_entry_tool', value: params.entryTool });
                if (params.steps) meta.setValue({ fieldId: 'custrecord_dz_pm_steps', value: params.steps });
                if (params.toolDeps) meta.setValue({ fieldId: 'custrecord_dz_pm_tool_deps', value: params.toolDeps });
                if (params.edition) meta.setValue({ fieldId: 'custrecord_dz_pm_edition', value: params.edition });
                if (params.editionNotes) meta.setValue({ fieldId: 'custrecord_dz_pm_edition_notes', value: params.editionNotes });
                if (params.params) meta.setValue({ fieldId: 'custrecord_dz_pm_params', value: params.params });
                if (params.safetyRules) meta.setValue({ fieldId: 'custrecord_dz_pm_safety_rules', value: params.safetyRules });
                if (params.governance) meta.setValue({ fieldId: 'custrecord_dz_pm_governance', value: params.governance });
                meta.setValue({ fieldId: 'custrecord_dz_pm_artifact', value: params.artifact === true || params.artifact === 'true' });
                if (params.artifactType) meta.setValue({ fieldId: 'custrecord_dz_pm_artifact_type', value: params.artifactType });
                meta.setValue({ fieldId: 'custrecord_dz_pm_version', value: params.version || '1.0.0' });
                meta.setValue({ fieldId: 'custrecord_dz_pm_author', value: params.author || 'Doozy Labs' });
                if (params.status) meta.setValue({ fieldId: 'custrecord_dz_pm_status', value: params.status });

                var metaId = meta.save();
                log.audit({ title: 'seedPrompt', details: 'Created extension record: ' + metaId + ' for prompt ' + atlasId });

                var wasNew = !(existing && existing.length > 0);
                return JSON.stringify({
                    success: true,
                    action: wasNew ? 'created' : 'extended',
                    promptId: atlasId,
                    metaId: metaId,
                    externalId: extId,
                    message: wasNew
                        ? 'Created Atlas prompt ' + atlasId + ' and extension record ' + metaId
                        : 'Atlas prompt ' + atlasId + ' existed; created extension record ' + metaId,
                    version: SCRIPT_VERSION
                });
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

        // Find the extension record for this prompt
        var findSql = 'SELECT id, custrecord_dz_pm_version AS version FROM customrecord_dz_prompt_meta WHERE custrecord_dz_pm_prompt_ref = ?';
        return runSQL(findSql, [promptId], 'updatePrompt-find').then(function (rows) {
            if (!rows || rows.length === 0) {
                return JSON.stringify({
                    error: 'No extension record found for prompt ID ' + promptId,
                    version: SCRIPT_VERSION
                });
            }

            var metaId = rows[0].id;
            var currentVersion = sv(rows[0].version, '1.0.0');
            var updatedFields = [];

            // Update Atlas prompt text if provided
            if (params.promptText) {
                var atlas = record.load({ type: 'customrecord_atlas_aicomp_prompts', id: promptId });
                atlas.setValue({ fieldId: 'custrecord_atlas_aicomp_prompt_text', value: params.promptText });
                if (params.promptName) {
                    atlas.setValue({ fieldId: 'name', value: params.promptName });
                    updatedFields.push('prompt_name');
                }
                if (params.subdomain) {
                    atlas.setValue({ fieldId: 'custrecord_atlas_aicomp_prompt_subcat', value: params.subdomain });
                }
                atlas.save();
                updatedFields.push('prompt_text');
            } else if (params.promptName) {
                var atlas2 = record.load({ type: 'customrecord_atlas_aicomp_prompts', id: promptId });
                atlas2.setValue({ fieldId: 'name', value: params.promptName });
                atlas2.save();
                updatedFields.push('prompt_name');
            }

            // Update extension record fields
            var meta = record.load({ type: 'customrecord_dz_prompt_meta', id: metaId });

            if (params.domain) { meta.setValue({ fieldId: 'custrecord_dz_pm_domain', value: params.domain }); updatedFields.push('domain'); }
            if (params.subdomain) { meta.setValue({ fieldId: 'custrecord_dz_pm_subdomain', value: params.subdomain }); updatedFields.push('subdomain'); }
            if (params.toolset) { meta.setValue({ fieldId: 'custrecord_dz_pm_toolset', value: params.toolset }); updatedFields.push('toolset'); }
            if (params.toolChain) { meta.setValue({ fieldId: 'custrecord_dz_pm_tool_chain', value: params.toolChain }); updatedFields.push('tool_chain'); }
            if (params.entryTool) { meta.setValue({ fieldId: 'custrecord_dz_pm_entry_tool', value: params.entryTool }); updatedFields.push('entry_tool'); }
            if (params.steps) { meta.setValue({ fieldId: 'custrecord_dz_pm_steps', value: params.steps }); updatedFields.push('steps'); }
            if (params.toolDeps) { meta.setValue({ fieldId: 'custrecord_dz_pm_tool_deps', value: params.toolDeps }); updatedFields.push('tool_deps'); }
            if (params.edition) { meta.setValue({ fieldId: 'custrecord_dz_pm_edition', value: params.edition }); updatedFields.push('edition'); }
            if (params.editionNotes) { meta.setValue({ fieldId: 'custrecord_dz_pm_edition_notes', value: params.editionNotes }); updatedFields.push('edition_notes'); }
            if (params.params) { meta.setValue({ fieldId: 'custrecord_dz_pm_params', value: params.params }); updatedFields.push('params'); }
            if (params.safetyRules) { meta.setValue({ fieldId: 'custrecord_dz_pm_safety_rules', value: params.safetyRules }); updatedFields.push('safety_rules'); }
            if (params.governance) { meta.setValue({ fieldId: 'custrecord_dz_pm_governance', value: params.governance }); updatedFields.push('governance'); }
            if (params.artifact !== undefined) { meta.setValue({ fieldId: 'custrecord_dz_pm_artifact', value: params.artifact === true || params.artifact === 'true' }); updatedFields.push('artifact'); }
            if (params.artifactType) { meta.setValue({ fieldId: 'custrecord_dz_pm_artifact_type', value: params.artifactType }); updatedFields.push('artifact_type'); }
            if (params.author) { meta.setValue({ fieldId: 'custrecord_dz_pm_author', value: params.author }); updatedFields.push('author'); }
            if (params.status) { meta.setValue({ fieldId: 'custrecord_dz_pm_status', value: params.status }); updatedFields.push('status'); }

            // Version bump
            var newVersion = params.newVersion || bumpVersion(currentVersion);
            meta.setValue({ fieldId: 'custrecord_dz_pm_version', value: newVersion });
            updatedFields.push('version');

            meta.save();

            return JSON.stringify({
                success: true,
                promptId: promptId,
                metaId: metaId,
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
        var parts = ver.split('.');
        if (parts.length !== 3) return '1.0.1';
        var patch = parseInt(parts[2], 10) || 0;
        return parts[0] + '.' + parts[1] + '.' + (patch + 1);
    }

    return {
        getPromptMeta: getPromptMeta,
        logExecution: logExecution,
        seedPrompt: seedPrompt,
        updatePrompt: updatePrompt
    };
});
