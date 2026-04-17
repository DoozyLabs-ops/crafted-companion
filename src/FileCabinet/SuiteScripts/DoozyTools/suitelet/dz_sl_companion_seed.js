/**
 * dz_sl_companion_seed.js
 * Crafted Intelligence - Prompt Deployment Dashboard Suitelet
 *
 * GET: Serves a dashboard showing seed data version, deployed version,
 *      prompts to create/update/skip, and a Deploy button.
 * POST: JSON API
 *   action=deploy   - Triggers the prompt seed Map/Reduce script
 *   action=status   - Checks M/R job status for polling
 *   action=preview  - Previews role resolution without creating records
 *   action=export   - Returns current prompt records as JSON (backup)
 *
 * Replaces the v1 seed + mirror-roles inline logic. Delegates bulk seeding
 * to customscript_dz_mr_promptseed for governance and retry safety.
 *
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/query', 'N/file', 'N/task', 'N/log', 'N/runtime', 'N/ui/serverWidget'], function (query, file, task, log, runtime, serverWidget) {

    var SCRIPT_VERSION = '2.0.0';
    var MR_SCRIPT_ID = 'customscript_dz_mr_promptseed';
    var MR_DEPLOY_ID = 'customdeploy_dz_mr_promptseed';
    var SEED_FILE_PATH = 'SuiteScripts/DoozyTools/companion-tools/seed-data.json';

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

    function loadSeedData() {
        var files = runSQL(
            "SELECT id FROM file WHERE name = 'seed-data.json' AND folder IN (SELECT id FROM mediaitemfolder WHERE name = 'companion-tools')"
        );
        if (!files || files.length === 0) files = runSQL("SELECT id FROM file WHERE name = 'seed-data.json'");
        if (!files || files.length === 0) return null;
        var f = file.load({ id: files[0].id });
        try { return JSON.parse(f.getContents()); } catch (e) { return null; }
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

    // ========== DIFF: seed vs deployed ==========

    function computeDiff() {
        var diff = { create: [], update: [], skip: [], orphan: [], seed_version: '', prompt_count: 0 };

        var seed = loadSeedData();
        if (!seed) { diff.error = 'seed-data.json not found or invalid JSON'; return diff; }
        diff.seed_version = seed.version || 'unknown';
        diff.prompt_count = (seed.prompts || []).length;

        var deployedRows = runSQL(
            'SELECT id, externalid, name, custrecord_dz_cp_version AS version ' +
            'FROM customrecord_dz_companion_prompt'
        );
        var deployedByExtId = {};
        deployedRows.forEach(function (r) { if (r.externalid) deployedByExtId[r.externalid] = r; });

        var seedExtIds = {};
        (seed.prompts || []).forEach(function (p) {
            seedExtIds[p.external_id] = true;
            var deployed = deployedByExtId[p.external_id];
            if (!deployed) {
                diff.create.push({ external_id: p.external_id, name: p.name, seed_version: p.version || '1.0.0' });
            } else if (isNewer(p.version || '1.0.0', deployed.version || '0.0.0')) {
                diff.update.push({
                    external_id: p.external_id, name: p.name,
                    deployed_version: deployed.version, seed_version: p.version || '1.0.0', id: deployed.id
                });
            } else {
                diff.skip.push({ external_id: p.external_id, name: p.name, version: deployed.version });
            }
        });

        // Orphans: deployed but not in seed (customer-created or deprecated)
        Object.keys(deployedByExtId).forEach(function (extId) {
            if (!seedExtIds[extId]) {
                var r = deployedByExtId[extId];
                diff.orphan.push({ external_id: extId, name: r.name, version: r.version, id: r.id });
            }
        });

        return diff;
    }

    // ========== POST ACTIONS ==========

    function triggerDeploy() {
        try {
            var mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: MR_SCRIPT_ID,
                deploymentId: MR_DEPLOY_ID
            });
            var taskId = mrTask.submit();
            log.audit({ title: 'deploy triggered', details: 'MR task ID: ' + taskId });
            return { success: true, taskId: taskId, message: 'Map/Reduce seed triggered. Poll status for completion.' };
        } catch (e) {
            log.error({ title: 'deploy failed', details: e.message });
            return { success: false, error: e.message };
        }
    }

    function checkStatus(taskId) {
        if (!taskId) return { error: 'taskId is required' };
        try {
            var status = task.checkStatus({ taskId: taskId });
            return { taskId: taskId, status: status.status || 'unknown' };
        } catch (e) {
            return { taskId: taskId, error: e.message };
        }
    }

    function previewRoles() {
        // Simulate role resolution against account roles without creating records.
        // Returns the pattern-to-role map so admin can verify before deploy.
        var seed = loadSeedData();
        if (!seed) return { error: 'seed-data.json not found' };

        var allRoles = runSQL("SELECT id, name FROM role WHERE isinactive = 'F' ORDER BY name");
        var patternMap = {};

        (seed.prompts || []).forEach(function (p) {
            (p.role_patterns || []).forEach(function (pattern) {
                if (!patternMap[pattern]) patternMap[pattern] = [];
            });
        });

        Object.keys(patternMap).forEach(function (pattern) {
            var lower = pattern.toLowerCase();
            allRoles.forEach(function (role) {
                var roleName = (role.name || '').toLowerCase();
                if (roleName.indexOf(lower) !== -1) {
                    patternMap[pattern].push({ id: parseInt(role.id, 10), name: role.name });
                }
            });
        });

        return {
            total_patterns: Object.keys(patternMap).length,
            total_active_roles: allRoles.length,
            pattern_matches: patternMap
        };
    }

    function exportPrompts() {
        var rows = runSQL(
            'SELECT id, name, externalid, ' +
            'custrecord_dz_cp_version AS version, ' +
            'BUILTIN.DF(custrecord_dz_cp_category) AS category, ' +
            'BUILTIN.DF(custrecord_dz_cp_status) AS status ' +
            'FROM customrecord_dz_companion_prompt ORDER BY externalid'
        );
        return { count: rows.length, exported_at: new Date().toISOString(), prompts: rows };
    }

    function handlePost(context) {
        var action = context.request.parameters.action;
        if (action === 'deploy') {
            jsonResponse(context.response, triggerDeploy());
        } else if (action === 'status') {
            jsonResponse(context.response, checkStatus(context.request.parameters.taskId));
        } else if (action === 'preview') {
            jsonResponse(context.response, previewRoles());
        } else if (action === 'export') {
            jsonResponse(context.response, exportPrompts());
        } else if (action === 'diff') {
            jsonResponse(context.response, computeDiff());
        } else {
            jsonResponse(context.response, { error: 'Unknown action: ' + action });
        }
    }

    // ========== GET: HTML DASHBOARD ==========

    function renderDashboard() {
        var diff = computeDiff();
        var parts = [];
        parts.push('<style>');
        parts.push('body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;padding:20px;color:#333}');
        parts.push('.hdr{display:flex;gap:40px;margin-bottom:24px;padding:16px;background:#f5f7fa;border-radius:6px}');
        parts.push('.hdr div{font-size:14px}');
        parts.push('.hdr b{display:block;font-size:20px;color:#1a1a1a}');
        parts.push('.sec{margin-bottom:24px}');
        parts.push('.sec h3{margin:0 0 8px 0;font-size:15px;color:#333}');
        parts.push('table{width:100%;border-collapse:collapse;font-size:13px}');
        parts.push('th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #eee}');
        parts.push('th{background:#f5f7fa;font-weight:600}');
        parts.push('.pill{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}');
        parts.push('.pill.create{background:#e6f4ea;color:#137333}');
        parts.push('.pill.update{background:#fef7e0;color:#b06000}');
        parts.push('.pill.skip{background:#e8eaed;color:#5f6368}');
        parts.push('.pill.orphan{background:#fce8e6;color:#c5221f}');
        parts.push('button{background:#1a73e8;color:#fff;border:0;padding:10px 20px;border-radius:4px;font-size:14px;cursor:pointer;margin-right:8px}');
        parts.push('button:disabled{opacity:0.5;cursor:not-allowed}');
        parts.push('button.sec-btn{background:#fff;color:#1a73e8;border:1px solid #dadce0}');
        parts.push('#status{margin-top:16px;padding:12px;background:#f5f7fa;border-radius:4px;display:none}');
        parts.push('</style>');

        parts.push('<h2>Crafted Intelligence Prompt Deployment</h2>');
        parts.push('<div class="hdr">');
        parts.push('<div>Seed Version<b>' + (diff.seed_version || '—') + '</b></div>');
        parts.push('<div>Total in Seed<b>' + diff.prompt_count + '</b></div>');
        parts.push('<div>To Create<b>' + diff.create.length + '</b></div>');
        parts.push('<div>To Update<b>' + diff.update.length + '</b></div>');
        parts.push('<div>Up to Date<b>' + diff.skip.length + '</b></div>');
        parts.push('<div>Orphans<b>' + diff.orphan.length + '</b></div>');
        parts.push('</div>');

        if (diff.error) {
            parts.push('<p style="color:#c5221f"><b>Error:</b> ' + diff.error + '</p>');
        }

        parts.push('<div class="sec"><button id="deploy">Deploy Prompts</button><button id="preview" class="sec-btn">Preview Role Resolution</button><button id="export" class="sec-btn">Export Current Prompts</button></div>');
        parts.push('<div id="status"></div>');

        if (diff.create.length) {
            parts.push('<div class="sec"><h3><span class="pill create">CREATE</span> ' + diff.create.length + ' new prompts</h3>');
            parts.push('<table><tr><th>External ID</th><th>Name</th><th>Version</th></tr>');
            diff.create.forEach(function (p) {
                parts.push('<tr><td>' + p.external_id + '</td><td>' + p.name + '</td><td>' + p.seed_version + '</td></tr>');
            });
            parts.push('</table></div>');
        }
        if (diff.update.length) {
            parts.push('<div class="sec"><h3><span class="pill update">UPDATE</span> ' + diff.update.length + ' prompts with newer versions</h3>');
            parts.push('<table><tr><th>External ID</th><th>Name</th><th>Deployed</th><th>Seed</th></tr>');
            diff.update.forEach(function (p) {
                parts.push('<tr><td>' + p.external_id + '</td><td>' + p.name + '</td><td>' + p.deployed_version + '</td><td>' + p.seed_version + '</td></tr>');
            });
            parts.push('</table></div>');
        }
        if (diff.orphan.length) {
            parts.push('<div class="sec"><h3><span class="pill orphan">ORPHAN</span> ' + diff.orphan.length + ' deployed but not in seed</h3>');
            parts.push('<table><tr><th>External ID</th><th>Name</th><th>Version</th></tr>');
            diff.orphan.forEach(function (p) {
                parts.push('<tr><td>' + p.external_id + '</td><td>' + p.name + '</td><td>' + p.version + '</td></tr>');
            });
            parts.push('</table></div>');
        }

        var scriptUrl = '/app/site/hosting/scriptlet.nl?script=' +
            runtime.getCurrentScript().id + '&deploy=' +
            runtime.getCurrentScript().deploymentId;

        parts.push('<script>(function(){');
        parts.push('var api = ' + JSON.stringify(scriptUrl) + ';');
        parts.push('function post(action, body){var b="action="+action;if(body){Object.keys(body).forEach(function(k){b+="&"+encodeURIComponent(k)+"="+encodeURIComponent(body[k])})}return fetch(api,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:b}).then(function(r){return r.json()})}');
        parts.push('var s = document.getElementById("status");');
        parts.push('function show(msg){s.style.display="block";s.innerHTML=msg}');
        parts.push('document.getElementById("deploy").onclick=function(){show("Triggering Map/Reduce...");post("deploy").then(function(r){if(r.success){show("Deploy triggered. Task ID: "+r.taskId+". <a href=\\"#\\" onclick=\\"checkStatus(\'"+r.taskId+"\')\\">Check status</a>")}else{show("<span style=color:#c5221f>Error: "+r.error+"</span>")}})};');
        parts.push('window.checkStatus=function(tid){post("status",{taskId:tid}).then(function(r){show("Task "+tid+": "+r.status)})};');
        parts.push('document.getElementById("preview").onclick=function(){show("Computing role matches...");post("preview").then(function(r){show("<pre>"+JSON.stringify(r,null,2)+"</pre>")})};');
        parts.push('document.getElementById("export").onclick=function(){post("export").then(function(r){show("Exported "+r.count+" prompts. <pre>"+JSON.stringify(r,null,2)+"</pre>")})};');
        parts.push('})();</script>');
        return parts.join('\n');
    }

    function serveHTML(context) {
        var form = serverWidget.createForm({ title: 'Crafted Intelligence Prompt Deployment' });
        form.addField({
            id: 'custpage_seed_html',
            type: serverWidget.FieldType.INLINEHTML,
            label: ' '
        }).defaultValue = renderDashboard();
        context.response.writePage(form);
    }

    // ========== ENTRY POINT ==========

    function onRequest(context) {
        if (context.request.method === 'POST') {
            try { handlePost(context); }
            catch (e) { log.error({ title: 'seed POST', details: e.message }); jsonResponse(context.response, { error: e.message }); }
        } else {
            serveHTML(context);
        }
    }

    return { onRequest: onRequest };
});
