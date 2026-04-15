/**
 * PromptCard.js — Single prompt card in the grid
 *
 * Displays prompt name, domain badge, governance badge, tool chain, and subdomain.
 * Click opens the detail modal.
 *
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define(['@uif-js/core', '@uif-js/component', '../jsx'], function (core, c, h) {

    var GOVERNANCE_COLORS = {
        'Minimal': 'uif-color--success',
        'Standard': 'uif-color--info',
        'Governed': 'uif-color--warning',
        'Supervised': 'uif-color--danger'
    };

    return function PromptCard(props) {
        var prompt = props.prompt;
        var onSelect = props.onSelect;

        var toolCount = (prompt.steps || []).length;

        var items = [];

        // Header: prompt name
        items.push(
            h(c.StackPanel.Item, null,
                h(c.Heading, { type: c.Heading.Type.MEDIUM_HEADING }, prompt.prompt_name)
            )
        );

        // Badges row
        var badgeItems = [];
        badgeItems.push(
            h(c.StackPanel.Item, null,
                h(c.Badge, { label: prompt.governance, size: c.Badge.Size.SMALL, classList: GOVERNANCE_COLORS[prompt.governance] || '' })
            )
        );
        if (prompt.edition && prompt.edition !== 'Cross-Edition') {
            badgeItems.push(
                h(c.StackPanel.Item, null,
                    h(c.Badge, { label: prompt.edition, size: c.Badge.Size.SMALL })
                )
            );
        }
        if (prompt.artifact) {
            badgeItems.push(
                h(c.StackPanel.Item, null,
                    h(c.Badge, { label: prompt.artifact_type || 'Artifact', size: c.Badge.Size.SMALL })
                )
            );
        }

        items.push(
            h(c.StackPanel.Item, null,
                h(c.StackPanel, { orientation: c.StackPanel.Orientation.HORIZONTAL, itemGap: c.GapSize.XS }, badgeItems)
            )
        );

        // Subdomain
        if (prompt.subdomain) {
            items.push(
                h(c.StackPanel.Item, null,
                    h(c.Text, { type: c.Text.Type.WEAK }, prompt.subdomain)
                )
            );
        }

        // Tool chain
        items.push(
            h(c.StackPanel.Item, null,
                h(c.Text, null, prompt.tool_chain || prompt.entry_tool || '')
            )
        );

        // Footer: tool count + version
        items.push(
            h(c.StackPanel.Item, null,
                h(c.Text, { type: c.Text.Type.WEAK },
                    toolCount + (toolCount === 1 ? ' tool' : ' tools') + '  \u00b7  v' + (prompt.version || '1.0.0')
                )
            )
        );

        return h(c.Card, {
            rootStyle: { cursor: 'pointer', minHeight: '160px' },
            on: { click: function () { if (onSelect) onSelect(prompt); } }
        },
            h(c.ContentPanel, { outerGap: c.GapSize.M },
                h(c.StackPanel, {
                    orientation: c.StackPanel.Orientation.VERTICAL,
                    itemGap: c.GapSize.XS
                }, items)
            )
        );
    };
});
