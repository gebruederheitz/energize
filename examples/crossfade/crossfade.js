import {
    EnhancedElement,
    EnhancedTransitioningElement,
} from '../../dist/index.js';

/**
 * A container that shows one of its children at a time, crossfading between
 * them. Children name themselves with `data-crossfade-item`; connect a store
 * holding the name of the child to show.
 */
export class Crossfade extends EnhancedElement {
    items = this.findAndWrapAllInto(':scope > *', EnhancedTransitioningElement);

    select(name) {
        for (const item of this.items) {
            if (item.dataset.crossfadeItem === name) {
                item.show();
            } else {
                item.hide();
            }
        }
    }

    onStateUpdate(name) {
        this.select(name);
    }
}

/**
 * All energize needs from a store: `subscribe(callback)` returning an
 * unsubscribe function. Any store with that method works, such as nanostores
 * or Svelte stores.
 */
export function createStore(value) {
    const subscribers = new Set();

    return {
        get: () => value,
        set(newValue) {
            value = newValue;
            subscribers.forEach((callback) => callback(value));
        },
        subscribe(callback) {
            subscribers.add(callback);
            callback(value);

            return () => subscribers.delete(callback);
        },
    };
}
