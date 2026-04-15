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
define(['N/query', 'N/log', 'N/runtime'], function (query, log, runtime) {

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

        var html = getPageHTML(scriptUrl);
        context.response.setHeader({ name: 'Content-Type', value: 'text/html; charset=utf-8' });
        context.response.write(html);
    }

    function getPageHTML(apiUrl) {
        return '<!DOCTYPE html>\n' +
        '<html lang="en"><head><meta charset="utf-8"><title>Crafted Companion Library</title>\n' +
        '<style>\n' +
        '*, *::before, *::after { box-sizing: border-box; }\n' +
        'body { margin: 0; font-family: "Oracle Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; color: #161513; background: #f5f4f2; }\n' +
        '.cc-header { background: #003764; color: #fff; padding: 28px 32px 20px; position: relative; overflow: hidden; }\n' +
        '.cc-header h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; }\n' +
        '.cc-header p { margin: 0; font-size: 14px; opacity: 0.85; max-width: 700px; }\n' +
        '.cc-stats { display: flex; gap: 24px; margin-top: 16px; }\n' +
        '.cc-stat { text-align: center; }\n' +
        '.cc-stat-val { font-size: 24px; font-weight: 700; }\n' +
        '.cc-stat-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; }\n' +
        '.cc-filters { background: #fff; padding: 12px 32px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #e4e1dd; flex-wrap: wrap; }\n' +
        '.cc-filters input[type="text"] { flex: 1; min-width: 200px; padding: 8px 12px; border: 1px solid #d4cfca; border-radius: 4px; font-size: 14px; font-family: inherit; outline: none; }\n' +
        '.cc-filters input[type="text"]:focus { border-color: #36677D; }\n' +
        '.cc-filters select { padding: 8px 12px; border: 1px solid #d4cfca; border-radius: 4px; font-size: 14px; font-family: inherit; background: #fff; outline: none; cursor: pointer; }\n' +
        '.cc-filters select:focus { border-color: #36677D; }\n' +
        '.cc-clear { background: none; border: none; color: #36677D; font-size: 14px; cursor: pointer; font-family: inherit; padding: 8px; }\n' +
        '.cc-clear:hover { text-decoration: underline; }\n' +
        '.cc-body { padding: 24px 32px; }\n' +
        '.cc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }\n' +
        '.cc-card { background: #fff; border-radius: 8px; border: 1px solid #e4e1dd; padding: 20px; display: flex; flex-direction: column; transition: box-shadow 0.15s; }\n' +
        '.cc-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }\n' +
        '.cc-card-title { font-size: 16px; font-weight: 700; margin: 0 0 8px; color: #161513; }\n' +
        '.cc-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }\n' +
        '.cc-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }\n' +
        '.cc-badge-domain { background: #e8f0f5; color: #003764; }\n' +
        '.cc-badge-governance { background: #e8f5e9; color: #3D7A41; }\n' +
        '.cc-badge-governance-standard { background: #e3f2fd; color: #36677D; }\n' +
        '.cc-badge-governance-governed { background: #fff3e0; color: #B95C00; }\n' +
        '.cc-badge-governance-supervised { background: #fce4ec; color: #D64700; }\n' +
        '.cc-badge-edition { background: #f3e5f5; color: #6a1b9a; }\n' +
        '.cc-badge-artifact { background: #fff8e1; color: #B95C00; }\n' +
        '.cc-card-meta { font-size: 12px; color: #6b6560; margin-bottom: 8px; }\n' +
        '.cc-card-text { font-size: 13px; color: #4a4844; line-height: 1.5; flex: 1; margin-bottom: 12px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; }\n' +
        '.cc-card-tools { font-size: 12px; color: #6b6560; margin-bottom: 12px; }\n' +
        '.cc-card-actions { display: flex; gap: 8px; margin-top: auto; }\n' +
        '.cc-btn { padding: 6px 14px; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid transparent; transition: background 0.15s; }\n' +
        '.cc-btn-copy { background: #fff; border-color: #d4cfca; color: #161513; }\n' +
        '.cc-btn-copy:hover { background: #f5f4f2; }\n' +
        '.cc-btn-use { background: #3D7A41; color: #fff; }\n' +
        '.cc-btn-use:hover { background: #2e6331; }\n' +
        '.cc-btn-detail { background: #fff; border-color: #d4cfca; color: #36677D; }\n' +
        '.cc-btn-detail:hover { background: #f5f4f2; }\n' +
        '.cc-empty { text-align: center; padding: 60px 20px; color: #6b6560; }\n' +
        '.cc-empty h2 { font-size: 18px; margin: 0 0 8px; color: #161513; }\n' +
        '.cc-loading { text-align: center; padding: 60px 20px; color: #6b6560; font-size: 16px; }\n' +
        '.cc-banner { background: #e3f2fd; border: 1px solid #b3d4fc; border-radius: 6px; padding: 12px 20px; margin-bottom: 16px; color: #003764; font-size: 13px; }\n' +
        '.cc-modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center; }\n' +
        '.cc-modal-overlay.active { display: flex; }\n' +
        '.cc-modal { background: #fff; border-radius: 8px; width: 90%; max-width: 800px; max-height: 85vh; overflow-y: auto; padding: 24px 28px; position: relative; }\n' +
        '.cc-modal h2 { margin: 0 0 12px; font-size: 20px; }\n' +
        '.cc-modal-close { position: absolute; top: 16px; right: 20px; background: none; border: none; font-size: 20px; cursor: pointer; color: #6b6560; }\n' +
        '.cc-modal-close:hover { color: #161513; }\n' +
        '.cc-modal-section { margin-bottom: 16px; }\n' +
        '.cc-modal-section h3 { font-size: 14px; font-weight: 700; color: #003764; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.3px; }\n' +
        '.cc-modal-section pre { background: #f5f4f2; padding: 12px; border-radius: 4px; font-size: 13px; white-space: pre-wrap; word-wrap: break-word; font-family: inherit; margin: 0; }\n' +
        '.cc-modal-section ul { margin: 4px 0; padding-left: 20px; font-size: 13px; }\n' +
        '.cc-modal-footer { font-size: 12px; color: #6b6560; display: flex; gap: 16px; flex-wrap: wrap; border-top: 1px solid #e4e1dd; padding-top: 12px; margin-top: 16px; }\n' +
        '</style></head><body>\n' +

        '<div class="cc-header">\n' +
        '  <h1>Crafted Companion Library</h1>\n' +
        '  <p>Ready-to-go prompts for Crafted ERP intelligence. Browse by domain, filter by edition, and use with your AI assistant.</p>\n' +
        '  <div class="cc-stats" id="stats"></div>\n' +
        '</div>\n' +

        '<div class="cc-filters">\n' +
        '  <input type="text" id="search" placeholder="Search title, tools, or prompt text...">\n' +
        '  <select id="filterDomain"><option value="">All Domains</option></select>\n' +
        '  <select id="filterEdition"><option value="">All Editions</option><option>Distillery</option><option>Winery</option><option>Brewery</option><option>Cross-Edition</option></select>\n' +
        '  <select id="filterGov"><option value="">All Levels</option><option>Minimal</option><option>Standard</option><option>Governed</option><option>Supervised</option></select>\n' +
        '  <button class="cc-clear" id="clearBtn">Clear</button>\n' +
        '</div>\n' +

        '<div class="cc-body">\n' +
        '  <div id="banner"></div>\n' +
        '  <div id="grid" class="cc-grid"><div class="cc-loading">Loading prompts...</div></div>\n' +
        '</div>\n' +

        '<div class="cc-modal-overlay" id="modal">\n' +
        '  <div class="cc-modal" id="modalContent"></div>\n' +
        '</div>\n' +

        '<script>\n' +
        '(function() {\n' +
        '  var API = "' + apiUrl + '";\n' +
        '  var allPrompts = [], toolAvail = {}, domains = [];\n' +
        '\n' +
        '  function post(action) {\n' +
        '    return fetch(API, { method: "POST", headers: {"Content-Type":"application/x-www-form-urlencoded"}, body: "action=" + action })\n' +
        '      .then(function(r) { return r.json(); });\n' +
        '  }\n' +
        '\n' +
        '  function init() {\n' +
        '    Promise.all([post("get-prompts"), post("get-tool-availability"), post("get-domains")])\n' +
        '      .then(function(results) {\n' +
        '        allPrompts = results[0].prompts || [];\n' +
        '        toolAvail = results[1] || {};\n' +
        '        domains = results[2] || [];\n' +
        '        populateDomainFilter();\n' +
        '        renderBanner();\n' +
        '        renderStats();\n' +
        '        render();\n' +
        '      })\n' +
        '      .catch(function(e) {\n' +
        '        document.getElementById("grid").innerHTML = \'<div class="cc-empty"><h2>Error loading data</h2><p>\' + e.message + \'</p></div>\';\n' +
        '      });\n' +
        '  }\n' +
        '\n' +
        '  function populateDomainFilter() {\n' +
        '    var sel = document.getElementById("filterDomain");\n' +
        '    domains.forEach(function(d) { var o = document.createElement("option"); o.value = d.name; o.textContent = d.name; sel.appendChild(o); });\n' +
        '  }\n' +
        '\n' +
        '  function renderBanner() {\n' +
        '    var missing = [];\n' +
        '    var names = {"barrel-intelligence":"Barrel Intelligence","lot-profitability":"Lot Profitability","inventory-supply":"Inventory & Supply Chain","compliance-audit":"Compliance & Audit","mrp-intelligence":"MRP Intelligence","batch-genealogy":"Batch & Genealogy"};\n' +
        '    Object.keys(toolAvail).forEach(function(k) { if (!toolAvail[k]) missing.push(names[k] || k); });\n' +
        '    var el = document.getElementById("banner");\n' +
        '    if (missing.length > 0) {\n' +
        '      el.innerHTML = \'<div class="cc-banner">Deploy these toolsets to unlock more prompts: <strong>\' + missing.join(", ") + \'</strong></div>\';\n' +
        '    }\n' +
        '  }\n' +
        '\n' +
        '  function getFiltered() {\n' +
        '    var q = document.getElementById("search").value.toLowerCase();\n' +
        '    var dom = document.getElementById("filterDomain").value;\n' +
        '    var ed = document.getElementById("filterEdition").value;\n' +
        '    var gov = document.getElementById("filterGov").value;\n' +
        '    return allPrompts.filter(function(p) {\n' +
        '      var deps = p.tool_deps || [];\n' +
        '      for (var i = 0; i < deps.length; i++) { if (!toolAvail[deps[i]]) return false; }\n' +
        '      if (dom && p.domain !== dom) return false;\n' +
        '      if (ed && p.edition !== ed && p.edition !== "Cross-Edition") return false;\n' +
        '      if (gov && p.governance !== gov) return false;\n' +
        '      if (q && (p.prompt_name + " " + p.subdomain + " " + p.tool_chain + " " + p.prompt_text).toLowerCase().indexOf(q) === -1) return false;\n' +
        '      return true;\n' +
        '    });\n' +
        '  }\n' +
        '\n' +
        '  function renderStats() {\n' +
        '    var visible = getFiltered();\n' +
        '    var doms = {}; var eds = {}; var govs = {};\n' +
        '    allPrompts.forEach(function(p) { doms[p.domain] = 1; eds[p.edition] = 1; govs[p.governance] = 1; });\n' +
        '    document.getElementById("stats").innerHTML =\n' +
        '      stat(allPrompts.length, "Total Prompts") + stat(Object.keys(doms).length, "Domains") +\n' +
        '      stat(Object.keys(eds).length, "Editions") + stat(Object.keys(govs).length, "Governance Levels") +\n' +
        '      stat(visible.length, "Showing");\n' +
        '  }\n' +
        '\n' +
        '  function stat(val, label) {\n' +
        '    return \'<div class="cc-stat"><div class="cc-stat-val">\' + val + \'</div><div class="cc-stat-lbl">\' + label + \'</div></div>\';\n' +
        '  }\n' +
        '\n' +
        '  function govBadgeClass(g) {\n' +
        '    if (g === "Standard") return "cc-badge-governance-standard";\n' +
        '    if (g === "Governed") return "cc-badge-governance-governed";\n' +
        '    if (g === "Supervised") return "cc-badge-governance-supervised";\n' +
        '    return "cc-badge-governance";\n' +
        '  }\n' +
        '\n' +
        '  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }\n' +
        '\n' +
        '  function render() {\n' +
        '    var filtered = getFiltered();\n' +
        '    renderStats();\n' +
        '    var grid = document.getElementById("grid");\n' +
        '    if (filtered.length === 0) {\n' +
        '      grid.innerHTML = \'<div class="cc-empty"><h2>No prompts match your filters</h2><p>Try adjusting your search, domain, or edition filter.</p></div>\';\n' +
        '      return;\n' +
        '    }\n' +
        '    var html = "";\n' +
        '    filtered.forEach(function(p, idx) {\n' +
        '      html += \'<div class="cc-card">\';\n' +
        '      html += \'<div class="cc-card-title">\' + esc(p.prompt_name) + \'</div>\';\n' +
        '      html += \'<div class="cc-badges">\';\n' +
        '      html += \'<span class="cc-badge cc-badge-domain">\' + esc(p.domain) + \'</span>\';\n' +
        '      html += \'<span class="cc-badge \' + govBadgeClass(p.governance) + \'">\' + esc(p.governance) + \'</span>\';\n' +
        '      if (p.edition && p.edition !== "Cross-Edition") html += \'<span class="cc-badge cc-badge-edition">\' + esc(p.edition) + \'</span>\';\n' +
        '      if (p.artifact) html += \'<span class="cc-badge cc-badge-artifact">\' + esc(p.artifact_type || "Artifact") + \'</span>\';\n' +
        '      html += \'</div>\';\n' +
        '      if (p.tool_chain) html += \'<div class="cc-card-tools">TOOLS: \' + esc(p.tool_chain) + \'</div>\';\n' +
        '      html += \'<div class="cc-card-text">\' + esc(p.prompt_text) + \'</div>\';\n' +
        '      html += \'<div class="cc-card-actions">\';\n' +
        '      html += \'<button class="cc-btn cc-btn-copy" data-idx="\' + idx + \'">Copy</button>\';\n' +
        '      html += \'<button class="cc-btn cc-btn-use" data-idx="\' + idx + \'">Use Prompt &rsaquo;</button>\';\n' +
        '      html += \'<button class="cc-btn cc-btn-detail" data-idx="\' + idx + \'">Details...</button>\';\n' +
        '      html += \'</div></div>\';\n' +
        '    });\n' +
        '    grid.innerHTML = html;\n' +
        '\n' +
        '    grid.querySelectorAll(".cc-btn-copy").forEach(function(btn) {\n' +
        '      btn.onclick = function() { var p = filtered[+this.dataset.idx]; navigator.clipboard.writeText(p.prompt_text); this.textContent = "Copied!"; var b = this; setTimeout(function() { b.textContent = "Copy"; }, 1500); };\n' +
        '    });\n' +
        '    grid.querySelectorAll(".cc-btn-use").forEach(function(btn) {\n' +
        '      btn.onclick = function() { var p = filtered[+this.dataset.idx]; navigator.clipboard.writeText(p.prompt_text); this.textContent = "Copied!"; var b = this; setTimeout(function() { b.textContent = "Use Prompt \\u203a"; }, 1500); };\n' +
        '    });\n' +
        '    grid.querySelectorAll(".cc-btn-detail").forEach(function(btn) {\n' +
        '      btn.onclick = function() { showModal(filtered[+this.dataset.idx]); };\n' +
        '    });\n' +
        '  }\n' +
        '\n' +
        '  function showModal(p) {\n' +
        '    var h = \'<button class="cc-modal-close" id="modalClose">&times;</button>\';\n' +
        '    h += \'<h2>\' + esc(p.prompt_name) + \'</h2>\';\n' +
        '    h += \'<div class="cc-badges" style="margin-bottom:16px">\';\n' +
        '    h += \'<span class="cc-badge \' + govBadgeClass(p.governance) + \'">\' + esc(p.governance) + \'</span>\';\n' +
        '    h += \'<span class="cc-badge cc-badge-edition">\' + esc(p.edition) + \'</span>\';\n' +
        '    h += \'<span class="cc-badge cc-badge-domain">\' + esc(p.domain) + \'</span>\';\n' +
        '    if (p.artifact) h += \'<span class="cc-badge cc-badge-artifact">\' + esc(p.artifact_type || "Artifact") + \'</span>\';\n' +
        '    h += \'</div>\';\n' +
        '    h += \'<div class="cc-modal-section"><h3>Prompt Text</h3><pre>\' + esc(p.prompt_text) + \'</pre></div>\';\n' +
        '    h += \'<div class="cc-modal-section"><h3>Tool Chain</h3><p>\' + esc(p.tool_chain || p.entry_tool) + \'</p></div>\';\n' +
        '    if (p.steps && p.steps.length) {\n' +
        '      h += \'<div class="cc-modal-section"><h3>Orchestration Steps</h3><ul>\';\n' +
        '      p.steps.forEach(function(s, i) { h += "<li><strong>" + (i+1) + ". " + esc(s.call) + "</strong> &mdash; " + esc(s.purpose || ""); if (s.condition) h += " <em>(if: " + esc(s.condition) + ")</em>"; h += "</li>"; });\n' +
        '      h += \'</ul></div>\';\n' +
        '    }\n' +
        '    var pk = Object.keys(p.params || {});\n' +
        '    if (pk.length) {\n' +
        '      h += \'<div class="cc-modal-section"><h3>Parameters</h3><ul>\';\n' +
        '      pk.forEach(function(k) { var v = p.params[k]; h += "<li><strong>" + esc(k) + "</strong> (" + esc(v.type) + (v.required ? ", required" : "") + ")"; if (v.hint) h += " &mdash; " + esc(v.hint); h += "</li>"; });\n' +
        '      h += \'</ul></div>\';\n' +
        '    }\n' +
        '    if (p.safety_rules && p.safety_rules.length) {\n' +
        '      h += \'<div class="cc-modal-section"><h3>Safety Rules</h3><ul>\';\n' +
        '      p.safety_rules.forEach(function(r) { h += "<li>" + esc(r) + "</li>"; });\n' +
        '      h += \'</ul></div>\';\n' +
        '    }\n' +
        '    if (p.edition_notes) h += \'<div class="cc-modal-section"><h3>Edition Notes</h3><p>\' + esc(p.edition_notes) + \'</p></div>\';\n' +
        '    h += \'<div class="cc-modal-footer">\';\n' +
        '    h += \'<span>v\' + esc(p.version || "1.0.0") + \'</span><span>\' + esc(p.author || "") + \'</span>\';\n' +
        '    h += \'<span>Toolset: \' + esc(p.toolset || "") + \'</span><span>ID: \' + p.prompt_id + \'</span>\';\n' +
        '    h += \'</div>\';\n' +
        '    h += \'<div style="margin-top:16px;display:flex;gap:8px">\';\n' +
        '    h += \'<button class="cc-btn cc-btn-use" id="modalCopyBtn">Copy Prompt</button>\';\n' +
        '    h += \'<button class="cc-btn cc-btn-copy" id="modalCloseBtn">Close</button>\';\n' +
        '    h += \'</div>\';\n' +
        '    document.getElementById("modalContent").innerHTML = h;\n' +
        '    document.getElementById("modal").classList.add("active");\n' +
        '    document.getElementById("modalClose").onclick = closeModal;\n' +
        '    document.getElementById("modalCloseBtn").onclick = closeModal;\n' +
        '    document.getElementById("modalCopyBtn").onclick = function() { navigator.clipboard.writeText(p.prompt_text); this.textContent = "Copied!"; };\n' +
        '  }\n' +
        '\n' +
        '  function closeModal() { document.getElementById("modal").classList.remove("active"); }\n' +
        '  document.getElementById("modal").onclick = function(e) { if (e.target === this) closeModal(); };\n' +
        '\n' +
        '  document.getElementById("search").oninput = render;\n' +
        '  document.getElementById("filterDomain").onchange = render;\n' +
        '  document.getElementById("filterEdition").onchange = render;\n' +
        '  document.getElementById("filterGov").onchange = render;\n' +
        '  document.getElementById("clearBtn").onclick = function() {\n' +
        '    document.getElementById("search").value = "";\n' +
        '    document.getElementById("filterDomain").value = "";\n' +
        '    document.getElementById("filterEdition").value = "";\n' +
        '    document.getElementById("filterGov").value = "";\n' +
        '    render();\n' +
        '  };\n' +
        '\n' +
        '  init();\n' +
        '})();\n' +
        '</script></body></html>';
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
