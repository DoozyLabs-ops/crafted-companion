/**
 * CompanionStore.js — Redux-like state management for Companion Library SPA
 *
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define(['@uif-js/core'], function (core) {

    var Actions = {
        SET_PROMPTS: 'SET_PROMPTS',
        SET_TOOL_AVAILABILITY: 'SET_TOOL_AVAILABILITY',
        SET_ACCOUNT_CONFIG: 'SET_ACCOUNT_CONFIG',
        SET_DOMAINS: 'SET_DOMAINS',
        SET_LOADING: 'SET_LOADING',
        SET_ERROR: 'SET_ERROR',
        SET_SELECTED_DOMAIN: 'SET_SELECTED_DOMAIN',
        SET_SEARCH_QUERY: 'SET_SEARCH_QUERY',
        SET_EDITION_FILTER: 'SET_EDITION_FILTER',
        SET_GOVERNANCE_FILTER: 'SET_GOVERNANCE_FILTER',
        SET_SELECTED_PROMPT: 'SET_SELECTED_PROMPT',
        CLEAR_FILTERS: 'CLEAR_FILTERS'
    };

    var initialState = {
        prompts: [],
        toolAvailability: {},
        accountConfig: {},
        domains: [],
        loading: true,
        error: null,
        selectedDomain: null,
        searchQuery: '',
        editionFilter: null,
        governanceFilter: null,
        selectedPrompt: null
    };

    var handlers = {};

    handlers[Actions.SET_PROMPTS] = function (state, action) {
        return core.ImmutableObject.set(state, 'prompts', action.payload);
    };

    handlers[Actions.SET_TOOL_AVAILABILITY] = function (state, action) {
        return core.ImmutableObject.set(state, 'toolAvailability', action.payload);
    };

    handlers[Actions.SET_ACCOUNT_CONFIG] = function (state, action) {
        return core.ImmutableObject.set(state, 'accountConfig', action.payload);
    };

    handlers[Actions.SET_DOMAINS] = function (state, action) {
        return core.ImmutableObject.set(state, 'domains', action.payload);
    };

    handlers[Actions.SET_LOADING] = function (state, action) {
        return core.ImmutableObject.set(state, 'loading', action.payload);
    };

    handlers[Actions.SET_ERROR] = function (state, action) {
        return core.ImmutableObject.set(state, 'error', action.payload);
    };

    handlers[Actions.SET_SELECTED_DOMAIN] = function (state, action) {
        return core.ImmutableObject.set(state, 'selectedDomain', action.payload);
    };

    handlers[Actions.SET_SEARCH_QUERY] = function (state, action) {
        return core.ImmutableObject.set(state, 'searchQuery', action.payload);
    };

    handlers[Actions.SET_EDITION_FILTER] = function (state, action) {
        return core.ImmutableObject.set(state, 'editionFilter', action.payload);
    };

    handlers[Actions.SET_GOVERNANCE_FILTER] = function (state, action) {
        return core.ImmutableObject.set(state, 'governanceFilter', action.payload);
    };

    handlers[Actions.SET_SELECTED_PROMPT] = function (state, action) {
        return core.ImmutableObject.set(state, 'selectedPrompt', action.payload);
    };

    handlers[Actions.CLEAR_FILTERS] = function (state) {
        var s = core.ImmutableObject.set(state, 'searchQuery', '');
        s = core.ImmutableObject.set(s, 'editionFilter', null);
        s = core.ImmutableObject.set(s, 'governanceFilter', null);
        return s;
    };

    var reducer = core.Reducer.create(handlers);

    function createStore() {
        return core.Store.create({ reducer: reducer, initial: initialState });
    }

    return {
        Actions: Actions,
        createStore: createStore
    };
});
