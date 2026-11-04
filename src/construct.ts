import type {
    EnergizableStoreArgument,
    SomeEnergizable,
} from './energizable-types.js';

/**
 * Instantiates Component for element with additionalArgs, and connects it to
 * store if there is one. Internal: not exported from the package.
 */
export function construct<
    ET extends HTMLElement,
    E extends SomeEnergizable,
    ARGS extends unknown[],
>(
    Component: new (element: ET, ...args: ARGS) => E,
    element: ET,
    store: EnergizableStoreArgument<E>,
    additionalArgs: ARGS
): E {
    const energized = new Component(element, ...additionalArgs);
    if (store) {
        energized.connect(store);
    }

    return energized;
}
