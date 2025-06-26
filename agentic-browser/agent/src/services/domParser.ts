import { Page, Locator } from 'playwright';
import { Logger } from './logger';

/**
 * High‑level representation of an element in the observation output.
 */
export interface ElementDescriptor {
    /** ARIA / accessibility role (e.g. "button", "link", "textbox") */
    role: string;
    /** Accessible name or label (human‑readable text) */
    name: string;
    /** Locator string that can be resolved via page.locator() or page.getByRole() */
    selector: string;
}

/**
 * The structure returned by the DOM parser for LLM consumption.
 */
export interface PageObservation {
    /** Markdown‑ish summary of the visible UI */
    content: string;
    /** Map of incremental element IDs → descriptor used for replaying actions */
    elementMap: Map<number, ElementDescriptor>;
}

/**
 * Roles considered interactive / actionable by default.
 * (Extend as needed – Playwright role selectors follow ARIA spec.)
 */
const INTERACTIVE_ROLES = new Set([
    'button',
    'link',
    'textbox',
    'checkbox',
    'radio',
    'combobox',
    'listbox',
    'option',
    'menuitem',
    'tab',
    'switch',
    'slider',
]);

/** Convenience */
const isInteractiveRole = (role: string | undefined): role is string =>
    !!role && INTERACTIVE_ROLES.has(role);

/** Sanitize whitespace and collapse long strings */
const clean = (txt: string, max = 120): string => {
    const out = txt.replace(/\s+/g, ' ').trim();
    return out.length > max ? out.slice(0, max - 1) + '…' : out;
};

/**
 * DOM / accessibility‑tree parser for a Playwright Page.
 * Produces a structured snapshot that is easy for an LLM to read & reference.
 */
export class DomParser {
    private idCounter = 1;
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    async getPageObservation(page: Page): Promise<PageObservation> {
        await page.waitForLoadState('domcontentloaded');
        debugger;
        try {
            await page.waitForLoadState('networkidle', { timeout: 2000 });
        } catch (error) {
            this.logger.debug('dom_parser', `Error waiting for networkidle: ${error}`);
        }

        debugger;

        const elementMap = new Map<number, ElementDescriptor>();
        let content = '';

        // Page meta
        const title = await page.title();
        content += `**${title || 'Untitled'}**\nURL: ${page.url()}\n`;

        const snapshot = await page.accessibility.snapshot({ interestingOnly: true });

        if (!snapshot) {
            this.logger.warn('dom_parser', 'Could not get snapshot. Falling back to body text.');
            // Extremely rare – fallback to raw body text
            const bodyText = await page.textContent('body');
            if (bodyText) content += `\n${clean(bodyText, 400)}\n`;
            return { content, elementMap };
        }

        const lines: string[] = [];
        this.idCounter = 1;

        /** Recursively process a11y tree nodes */
        const walk = (node: any, depth = 0) => {
            const indent = '  '.repeat(depth);
            const { role, name = '', level, checked, disabled, value } = node as {
                role?: string; name?: string; level?: number; checked?: boolean;
                disabled?: boolean; value?: string;
            };

            // Headings → Markdown style
            if (role === 'heading') {
                const lvl = level ?? 0;
                lines.push(`\n${indent}**${name || 'Heading'}** (Level ${lvl})`);
            }
            // Text nodes – small snippets only
            else if (role === 'text' || role === 'staticText') {
                if (name) lines.push(`${indent}${clean(name)}`);
            }
            // Landmark / region roles as section headers
            else if (role === 'navigation' || role === 'main' || role === 'contentinfo' || role === 'banner') {
                lines.push(`\n${indent}__${role.toUpperCase()}__:`);
            }
            // Interactive elements
            else if (isInteractiveRole(role)) {
                const label = name || value || role;
                const id = this.idCounter++;
                const selector = `getByRole:${role}:${label}`;
                elementMap.set(id, { role, name: label, selector });
                const state = [checked ? '(checked)' : '', disabled ? '(disabled)' : ''].filter(Boolean).join(' ');
                lines.push(`${indent}- ${role.charAt(0).toUpperCase() + role.slice(1)} "${label}" [${id}] ${state}`.trim());
            }

            // Recurse
            for (const child of node.children || []) walk(child, depth + 1);
        };

        walk(snapshot);
        content += `\n${lines.join('\n')}`;
        return { content, elementMap };
    }

    /**
     * Resolve an ElementDescriptor back to a Playwright Locator.
     * Use when executing actions.
     */
    resolveLocator(page: Page, desc: ElementDescriptor): Locator {
        if (desc.selector.startsWith('getByRole:')) {
            const [, role, name] = desc.selector.split(':', 3);
            return page.getByRole(role as any, { name });
        }
        return page.locator(desc.selector);
    }
}