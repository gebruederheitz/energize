import { describe, expect, it, vi } from 'vitest';
import { Energizable, StoreType } from '../src/index';
import { createTestStore } from './support/store';

/** Records the order of the store-related hooks; reads any store of numbers. */
class Recorder extends Energizable<HTMLElement, number> {
    public calls: string[] = [];
    public storeInAfterConnect: unknown;

    protected onAfterConnect(): void {
        this.calls.push('afterConnect');
        this.storeInAfterConnect = this.store;
    }

    protected onStateUpdate(state: number): void {
        this.calls.push(`state:${state}`);
    }

    protected onDestroyed(): void {
        this.calls.push('destroyed');
    }
}

describe('stores', () => {
    it('connect() subscribes, calls onAfterConnect and chains', () => {
        const store = createTestStore<number>();
        const recorder = new Recorder(document.createElement('div'));

        expect(recorder.connect(store)).toBe(recorder);
        expect(store.subscriberCount).toBe(1);
        expect(recorder.calls).toEqual(['afterConnect']);
    });

    it('makes the store available to subclasses by onAfterConnect', () => {
        const store = createTestStore<number>();
        const recorder = new Recorder(document.createElement('div'));

        recorder.connect(store);

        expect(recorder.storeInAfterConnect).toBe(store);
    });

    it('passes every state to an overridden onStateUpdate', () => {
        const store = createTestStore<number>();
        const recorder = new Recorder(document.createElement('div'));
        const listener = vi.fn();
        recorder.on('state-update', listener);

        recorder.connect(store);
        store.set(1);
        store.set(2);

        expect(recorder.calls).toEqual(['afterConnect', 'state:1', 'state:2']);
        expect(listener).not.toHaveBeenCalled();
    });

    it('dispatches a state-update event by default', () => {
        const store = createTestStore<string>();
        const enhanced = new Energizable<HTMLDivElement, string>(
            document.createElement('div')
        ).connect(store);
        const listener = vi.fn();
        enhanced.on('state-update', listener);

        store.set('next');

        expect(listener).toHaveBeenCalledTimes(1);
        const event = listener.mock.calls[0][0];
        expect(event).toBeInstanceOf(CustomEvent);
        expect(event.detail).toBe('next');
    });

    it('handles a state delivered during subscribe before onAfterConnect', () => {
        // Svelte stores and nanostores call the subscriber immediately.
        const eagerStore: StoreType<number> = {
            subscribe(callback) {
                callback(0);

                return () => {};
            },
        };
        const recorder = new Recorder(document.createElement('div'));

        recorder.connect(eagerStore);

        expect(recorder.calls).toEqual(['state:0', 'afterConnect']);
    });

    it('destroy() unsubscribes and calls onDestroyed', () => {
        const store = createTestStore<number>();
        const recorder = new Recorder(document.createElement('div'));
        recorder.connect(store);

        recorder.destroy();
        store.set(1);

        expect(store.subscriberCount).toBe(0);
        expect(recorder.calls).toEqual(['afterConnect', 'destroyed']);
    });
});
