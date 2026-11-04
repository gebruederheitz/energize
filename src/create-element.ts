/**
 * Describes an element for createElement() and spark(). The element type
 * follows from `type` (default: div).
 */
export interface ElementDefinition<
    K extends keyof HTMLElementTagNameMap = 'div',
> {
    type?: K;
    classNames?: string[];
    attributes?: Record<string, string>;
    parent?: HTMLElement;
    content?: string;
    children?: HTMLElement[];
}

export function createElement<K extends keyof HTMLElementTagNameMap = 'div'>({
    type,
    classNames = [],
    attributes = null,
    parent = null,
    content = null,
    children = [],
}: ElementDefinition<K> = {}): HTMLElementTagNameMap[K] {
    // Without a type, K is 'div'.
    const e = document.createElement(type ?? 'div') as HTMLElementTagNameMap[K];
    if (classNames.length) {
        e.classList.add(...classNames);
    }

    if (attributes) {
        Object.entries(attributes).forEach(([name, value]) => {
            e.setAttribute(name, value);
        });
    }

    if (content) {
        e.innerText = content;
    }

    if (children.length) {
        e.append(...children);
    }

    if (parent) {
        parent.appendChild(e);
    }

    return e;
}
