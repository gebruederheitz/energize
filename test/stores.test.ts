import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

    protected onDisconnected(): void {
        this.calls.push('disconnected');
    }

    protected onStateUpdate(state: number): void {
        this.calls.push(`state:${state}`);
    }

    protected onDestroyed(): void {
        this.calls.push('destroyed');
    }
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
});

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
        recorder.getElement().addEventListener('state-update', listener);

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
        enhanced.getElement().addEventListener('state-update', listener);

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

    it('destroy() disconnects, then calls onDestroyed', () => {
        const store = createTestStore<number>();
        const recorder = new Recorder(document.createElement('div'));
        recorder.connect(store);

        recorder.destroy();
        store.set(1);

        expect(store.subscriberCount).toBe(0);
        expect(recorder.calls).toEqual([
            'afterConnect',
            'disconnected',
            'destroyed',
        ]);
    });

    describe('disconnect', () => {
        it('unsubscribes, calls onDisconnected and chains', () => {
            const store = createTestStore<number>();
            const recorder = new Recorder(document.createElement('div'));
            recorder.connect(store);

            expect(recorder.disconnect()).toBe(recorder);
            store.set(1);

            expect(store.subscriberCount).toBe(0);
            expect(recorder.calls).toEqual(['afterConnect', 'disconnected']);
        });

        it('does nothing without a store', () => {
            const recorder = new Recorder(document.createElement('div'));

            expect(recorder.disconnect()).toBe(recorder);
            expect(recorder.calls).toEqual([]);
        });

        it('lets destroy() run after it without disconnecting again', () => {
            const store = createTestStore<number>();
            const recorder = new Recorder(document.createElement('div'));
            recorder.connect(store).disconnect();

            expect(() => recorder.destroy()).not.toThrow();
            expect(recorder.calls).toEqual([
                'afterConnect',
                'disconnected',
                'destroyed',
            ]);
        });

        it('switches stores with connect() without a warning', () => {
            const first = createTestStore<number>();
            const second = createTestStore<number>();
            const recorder = new Recorder(document.createElement('div'));

            recorder.connect(first).disconnect().connect(second);
            first.set(1);
            second.set(2);

            expect(first.subscriberCount).toBe(0);
            expect(second.subscriberCount).toBe(1);
            expect(recorder.calls).toEqual([
                'afterConnect',
                'disconnected',
                'afterConnect',
                'state:2',
            ]);
            expect(warn).not.toHaveBeenCalled();
        });
    });

    describe('isStoreConnected', () => {
        it('tells whether a store is connected', () => {
            const store = createTestStore<number>();
            const recorder = new Recorder(document.createElement('div'));

            expect(recorder.isStoreConnected()).toBe(false);

            recorder.connect(store);

            expect(recorder.isStoreConnected()).toBe(true);
            expect(store.subscriberCount).toBe(1);

            recorder.disconnect();

            expect(recorder.isStoreConnected()).toBe(false);
            expect(store.subscriberCount).toBe(0);
        });
    });

    describe('connect() while connected', () => {
        it('warns, then replaces the previous store', () => {
            const first = createTestStore<number>();
            const second = createTestStore<number>();
            const recorder = new Recorder(document.createElement('div'));
            recorder.connect(first);

            recorder.connect(second);
            first.set(1);
            second.set(2);

            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0][0]).toContain('Recorder');
            expect(warn.mock.calls[0][0]).toContain('disconnect()');
            expect(first.subscriberCount).toBe(0);
            expect(second.subscriberCount).toBe(1);
            expect(recorder.calls).toEqual([
                'afterConnect',
                'disconnected',
                'afterConnect',
                'state:2',
            ]);
        });

        it('warns for the same store and keeps one subscription', () => {
            const store = createTestStore<number>();
            const recorder = new Recorder(document.createElement('div'));
            recorder.connect(store);

            recorder.connect(store);
            store.set(1);

            expect(warn).toHaveBeenCalledTimes(1);
            expect(store.subscriberCount).toBe(1);
            expect(recorder.calls.filter((c) => c === 'state:1')).toHaveLength(
                1
            );
        });
    });
});
