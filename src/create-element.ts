export function createElement<T extends HTMLElement>({
    type = 'DIV',
    classNames = [],
    attributes = null,
    parent = null,
    content = null,
    children = [],
}: {
    type?: string;
    classNames?: string[];
    attributes?: Record<string, string>;
    parent?: HTMLElement;
    content?: string;
    children?: HTMLElement[];
} = {}): T {
    const e = <T>document.createElement(type);
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
