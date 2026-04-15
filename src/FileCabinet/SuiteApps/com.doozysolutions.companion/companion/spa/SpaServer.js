/**
 * SpaServer.js — Crafted Companion Library SPA Server
 *
 * Server-side initialization for the SPA. Minimal — data access
 * happens via DataService module imported by components.
 *
 * @NApiVersion 2.1
 * @NScriptType SpaServerScript
 */
define(['N/log'], function (log) {

    function initializeSpa(context) {
        log.debug({ title: 'CompanionSPA', details: 'SPA server initialized' });
    }

    return { initializeSpa: initializeSpa };
});
