import type { StoreType } from '../../src/index';

/**
 * A minimal store that implements nothing but `StoreType`, plus a `set` to
 * push new states and a subscriber count to observe (un)subscribing.
 */
export interface TestStore<T> extends StoreType<T> {
    set(state: T): void;
    readonly subscriberCount: number;
}

export function createTestStore<T>(): TestStore<T> {
    const subscribers = new Set<(state: T) => void>();

    return {
        subscribe(callback) {
            subscribers.add(callback);

            return () => {
                subscribers.delete(callback);
            };
        },
        set(state) {
            subscribers.forEach((callback) => callback(state));
        },
        get subscriberCount() {
            return subscribers.size;
        },
    };
}
