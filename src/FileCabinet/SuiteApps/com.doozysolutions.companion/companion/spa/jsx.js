/**
 * jsx.js — JSX factory shim for UIF VDom
 *
 * Adapts h(type, props, ...children) calls to UIF's VDom(type, config, children).
 * UIF VDom expects at most 3 arguments; variadic children are flattened into an array.
 *
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define(['@uif-js/core'], function (core) {

    function flattenChildren(args) {
        var result = [];
        for (var i = 0; i < args.length; i++) {
            var child = args[i];
            if (child === false || child === true || child == null) continue;
            if (Array.isArray(child)) {
                var flat = flattenChildren(child);
                for (var j = 0; j < flat.length; j++) result.push(flat[j]);
            } else {
                result.push(child);
            }
        }
        return result;
    }

    function h(type, props) {
        var children = [];
        for (var i = 2; i < arguments.length; i++) children.push(arguments[i]);
        var flat = flattenChildren(children);
        if (flat.length === 0) return core.VDom(type, props);
        if (flat.length === 1) return core.VDom(type, props, flat[0]);
        return core.VDom(type, props, flat);
    }

    h.Fragment = core.VDom.Fragment;

    return h;
});
