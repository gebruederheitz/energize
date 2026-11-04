import type {
    EnergizableConstructor,
    EnergizableStoreArgument,
    SomeEnergizable,
} from './energizable-types.js';
import { Energizable } from './energizable.js';
import { construct } from './construct.js';
import { createElement, type ElementDefinition } from './create-element.js';

type TagName = keyof HTMLElementTagNameMap;

/** The element type that spark() creates for a tag name or definition. */
export type SparkedElement<D extends TagName | ElementDefinition<TagName>> =
    D extends TagName
        ? HTMLElementTagNameMap[D]
        : D extends { type: infer K extends TagName }
          ? HTMLElementTagNameMap[K]
          : HTMLDivElement;

// The implementations accept whatever any of their overloads does.
type AnyComponent = new (
    element: HTMLElement,
    ...args: unknown[]
) => SomeEnergizable;
type AnyStoreArgument = EnergizableStoreArgument<SomeEnergizable>;

/**
 * Wraps the first element in the document matching `selector` into
 * `Component`, passing `additionalArgs` to its constructor, and connects it to
 * `store`. Element type, store type and constructor arguments are inferred
 * from `Component`.
 *
 * Without a component, it returns a plain Energizable for the first match
 * within `searchRoot` (default: the document).
 */
export function energize<T extends HTMLElement = HTMLElement>(
    selector: string,
    searchRoot?: Element | Document | null
): Energizable<T> | null;
export function energize<E extends SomeEnergizable, ARGS extends unknown[]>(
    selector: string,
    Component: EnergizableConstructor<E, ARGS>,
    store?: NoInfer<EnergizableStoreArgument<E>>,
    ...additionalArgs: NoInfer<ARGS>
): E | null;
export function energize(
    selector: string,
    target: Element | Document | AnyComponent | null = null,
    store: AnyStoreArgument = null,
    ...additionalArgs: unknown[]
): SomeEnergizable | null {
    if (typeof target === 'function') {
        const element = document.querySelector<HTMLElement>(selector);

        return element
            ? construct(target, element, store, additionalArgs)
            : null;
    }

    const element = (target ?? document).querySelector<HTMLElement>(selector);

    return element ? new Energizable(element) : null;
}

/**
 * Like energize(), for every match.
 */
export function energizeAll<T extends HTMLElement = HTMLElement>(
    selector: string,
    searchRoot?: Element | Document | null
): Energizable<T>[];
export function energizeAll<E extends SomeEnergizable, ARGS extends unknown[]>(
    selector: string,
    Component: EnergizableConstructor<E, ARGS>,
    store?: NoInfer<EnergizableStoreArgument<E>>,
    ...additionalArgs: NoInfer<ARGS>
): E[];
export function energizeAll(
    selector: string,
    target: Element | Document | AnyComponent | null = null,
    store: AnyStoreArgument = null,
    ...additionalArgs: unknown[]
): SomeEnergizable[] {
    if (typeof target === 'function') {
        return Array.from(
            document.querySelectorAll<HTMLElement>(selector),
            (element) => construct(target, element, store, additionalArgs)
        );
    }

    return Array.from(
        (target ?? document).querySelectorAll<HTMLElement>(selector),
        (element) => new Energizable(element)
    );
}

/**
 * Creates a new, detached element from a tag name or an element definition
 * and wraps it into `Component`, passing `additionalArgs` to its constructor
 * and connecting it to `store`. `Component` must accept the element type.
 *
 * Without a component, it returns a plain Energizable.
 */
export function spark<D extends TagName | ElementDefinition<TagName>>(
    type: D
): Energizable<SparkedElement<D>>;
export function spark<
    D extends TagName | ElementDefinition<TagName>,
    E extends SomeEnergizable,
    ARGS extends unknown[],
>(
    type: D,
    Component: new (element: SparkedElement<D>, ...args: ARGS) => E,
    store?: NoInfer<EnergizableStoreArgument<E>>,
    ...additionalArgs: NoInfer<ARGS>
): E;
export function spark(
    type: TagName | ElementDefinition<TagName>,
    Component: AnyComponent | null = null,
    store: AnyStoreArgument = null,
    ...additionalArgs: unknown[]
): SomeEnergizable {
    const element = createElement(typeof type === 'string' ? { type } : type);

    return Component
        ? construct(Component, element, store, additionalArgs)
        : new Energizable(element);
}
