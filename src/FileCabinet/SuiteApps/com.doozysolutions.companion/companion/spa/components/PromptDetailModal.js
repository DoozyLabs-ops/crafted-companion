/**
 * PromptDetailModal.js — Full prompt detail overlay
 *
 * Shows prompt text, tool chain, parameters, safety rules, governance,
 * edition notes, version info. Copy to Clipboard action button.
 *
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define(['@uif-js/core', '@uif-js/component', '../jsx', '../store/CompanionStore'], function (core, c, h, CompanionStore) {

    var GOVERNANCE_COLORS = {
        'Minimal': 'uif-color--success',
        'Standard': 'uif-color--info',
        'Governed': 'uif-color--warning',
        'Supervised': 'uif-color--danger'
    };

    return function PromptDetailModal() {
        var selectedPrompt = core.useSelector(function (s) { return s.selectedPrompt; });
        var dispatch = core.useDispatch();

        if (!selectedPrompt) return null;
        var p = selectedPrompt;

        function close() {
            dispatch({ type: CompanionStore.Actions.SET_SELECTED_PROMPT, payload: null });
        }

        // Build content sections imperatively
        var sections = [];

        // Header badges
        var badgeItems = [];
        badgeItems.push(h(c.StackPanel.Item, null, h(c.Badge, { label: p.governance, classList: GOVERNANCE_COLORS[p.governance] || '' })));
        badgeItems.push(h(c.StackPanel.Item, null, h(c.Badge, { label: p.edition })));
        badgeItems.push(h(c.StackPanel.Item, null, h(c.Badge, { label: p.domain })));
        if (p.artifact) {
            badgeItems.push(h(c.StackPanel.Item, null, h(c.Badge, { label: p.artifact_type || 'Artifact' })));
        }
        sections.push(h(c.StackPanel.Item, null,
            h(c.StackPanel, { orientation: c.StackPanel.Orientation.HORIZONTAL, itemGap: c.GapSize.XS }, badgeItems)
        ));

        // Prompt text
        sections.push(h(c.StackPanel.Item, null,
            h(c.FieldGroup, { title: 'Prompt Text', color: c.FieldGroup.Color.NEUTRAL },
                h(c.ContentPanel, { outerGap: c.GapSize.S },
                    h(c.Text, { rootStyle: { whiteSpace: 'pre-wrap' } }, p.prompt_text)
                )
            )
        ));

        // Tool chain
        sections.push(h(c.StackPanel.Item, null,
            h(c.FieldGroup, { title: 'Tool Chain', color: c.FieldGroup.Color.NEUTRAL },
                h(c.ContentPanel, { outerGap: c.GapSize.S },
                    h(c.StackPanel, { orientation: c.StackPanel.Orientation.VERTICAL, itemGap: c.GapSize.XS },
                        h(c.StackPanel.Item, null,
                            h(c.Text, { type: c.Text.Type.STRONG }, p.tool_chain || p.entry_tool)
                        ),
                        h(c.StackPanel.Item, null,
                            h(c.Text, { type: c.Text.Type.WEAK }, 'Entry tool: ' + (p.entry_tool || 'N/A'))
                        )
                    )
                )
            )
        ));

        // Steps
        if (p.steps && p.steps.length > 0) {
            var stepItems = [];
            for (var i = 0; i < p.steps.length; i++) {
                var step = p.steps[i];
                var stepText = (i + 1) + '. ' + step.call + ' \u2014 ' + (step.purpose || '');
                if (step.condition) stepText += ' (if: ' + step.condition + ')';
                stepItems.push(h(c.StackPanel.Item, null, h(c.Text, null, stepText)));
            }
            sections.push(h(c.StackPanel.Item, null,
                h(c.FieldGroup, { title: 'Orchestration Steps', color: c.FieldGroup.Color.NEUTRAL },
                    h(c.ContentPanel, { outerGap: c.GapSize.S },
                        h(c.StackPanel, { orientation: c.StackPanel.Orientation.VERTICAL, itemGap: c.GapSize.XXS }, stepItems)
                    )
                )
            ));
        }

        // Parameters
        var paramKeys = Object.keys(p.params || {});
        if (paramKeys.length > 0) {
            var paramItems = [];
            for (var j = 0; j < paramKeys.length; j++) {
                var pk = paramKeys[j];
                var pv = p.params[pk];
                var paramLine = pk + ' (' + pv.type + (pv.required ? ', required' : '') + ')';
                if (pv.hint) paramLine += ' \u2014 ' + pv.hint;
                paramItems.push(h(c.StackPanel.Item, null, h(c.Text, null, paramLine)));
            }
            sections.push(h(c.StackPanel.Item, null,
                h(c.FieldGroup, { title: 'Parameters', color: c.FieldGroup.Color.NEUTRAL },
                    h(c.ContentPanel, { outerGap: c.GapSize.S },
                        h(c.StackPanel, { orientation: c.StackPanel.Orientation.VERTICAL, itemGap: c.GapSize.XXS }, paramItems)
                    )
                )
            ));
        }

        // Safety rules
        if (p.safety_rules && p.safety_rules.length > 0) {
            var ruleItems = [];
            for (var k = 0; k < p.safety_rules.length; k++) {
                ruleItems.push(h(c.StackPanel.Item, null, h(c.Text, null, '\u2022 ' + p.safety_rules[k])));
            }
            sections.push(h(c.StackPanel.Item, null,
                h(c.FieldGroup, { title: 'Safety Rules', color: c.FieldGroup.Color.NEUTRAL },
                    h(c.ContentPanel, { outerGap: c.GapSize.S },
                        h(c.StackPanel, { orientation: c.StackPanel.Orientation.VERTICAL, itemGap: c.GapSize.XXS }, ruleItems)
                    )
                )
            ));
        }

        // Edition notes
        if (p.edition_notes) {
            sections.push(h(c.StackPanel.Item, null,
                h(c.FieldGroup, { title: 'Edition Notes', color: c.FieldGroup.Color.NEUTRAL },
                    h(c.ContentPanel, { outerGap: c.GapSize.S },
                        h(c.Text, null, p.edition_notes)
                    )
                )
            ));
        }

        // Footer: metadata
        sections.push(h(c.StackPanel.Item, null,
            h(c.StackPanel, { orientation: c.StackPanel.Orientation.HORIZONTAL, itemGap: c.GapSize.M },
                h(c.StackPanel.Item, null, h(c.Text, { type: c.Text.Type.WEAK }, 'v' + (p.version || '1.0.0'))),
                h(c.StackPanel.Item, null, h(c.Text, { type: c.Text.Type.WEAK }, p.author || '')),
                h(c.StackPanel.Item, null, h(c.Text, { type: c.Text.Type.WEAK }, 'Toolset: ' + (p.toolset || ''))),
                h(c.StackPanel.Item, null, h(c.Text, { type: c.Text.Type.WEAK }, 'ID: ' + p.prompt_id))
            )
        ));

        // Action buttons
        sections.push(h(c.StackPanel.Item, null,
            h(c.StackPanel, { orientation: c.StackPanel.Orientation.HORIZONTAL, itemGap: c.GapSize.S },
                h(c.StackPanel.Item, null,
                    h(c.Button, {
                        label: 'Copy Prompt',
                        type: c.Button.Type.PRIMARY,
                        icon: core.SystemIcon.COPY,
                        action: function () {
                            if (navigator && navigator.clipboard) {
                                navigator.clipboard.writeText(p.prompt_text);
                            }
                        }
                    })
                ),
                h(c.StackPanel.Item, null,
                    h(c.Button, {
                        label: 'Close',
                        type: c.Button.Type.GHOST,
                        action: close
                    })
                )
            )
        ));

        var modalContent = h(c.ContentPanel, { outerGap: c.GapSize.M },
            h(c.StackPanel, { orientation: c.StackPanel.Orientation.VERTICAL, itemGap: c.GapSize.S }, sections)
        );

        return h(c.Modal, {
            title: p.prompt_name,
            rootStyle: { width: '70vw', maxWidth: '900px' },
            closeButton: false,
            content: modalContent
        });
    };
});
