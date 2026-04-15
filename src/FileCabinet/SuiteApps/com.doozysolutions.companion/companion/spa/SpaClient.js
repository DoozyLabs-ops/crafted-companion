/**
 * SpaClient.js — Crafted Companion Library SPA Client Entry Point
 *
 * Sets the application layout and renders the root CompanionApp component.
 *
 * @NApiVersion 2.1
 * @NScriptType SpaClientScript
 */
define(['@uif-js/core', './jsx', './CompanionApp'], function (core, h, CompanionApp) {

    function run(app) {
        app.setLayout('application');
        app.setContent(h(CompanionApp, null));
    }

    return { run: run };
});
