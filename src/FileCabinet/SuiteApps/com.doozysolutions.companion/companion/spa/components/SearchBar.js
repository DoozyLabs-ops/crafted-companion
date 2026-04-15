/**
 * SearchBar.js — Client-side search across prompt name, text, and tools
 *
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define(['@uif-js/core', '@uif-js/component', '../jsx', '../store/CompanionStore'], function (core, c, h, CompanionStore) {

    return function SearchBar() {
        var searchQuery = core.useSelector(function (s) { return s.searchQuery; });
        var dispatch = core.useDispatch();

        return h(c.TextBox, {
            text: searchQuery,
            placeholder: 'Search prompts by name, tool, or keyword...',
            size: c.InputSize.L,
            icon: core.SystemIcon.SEARCH,
            rootStyle: { maxWidth: '500px' },
            onTextChanged: function (args) {
                dispatch({ type: CompanionStore.Actions.SET_SEARCH_QUERY, payload: args.text });
            }
        });
    };
});
