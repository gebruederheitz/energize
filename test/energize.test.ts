import { beforeEach, describe, expect, it } from 'vitest';
import { EnhancedElement, energize, energizeAll } from '../src/index';
import { Counter, Widget } from './support/components';
import { createTestStore } from './support/store';

beforeEach(() => {
    document.body.innerHTML = `
        <div class="item" id="first"></div>
        <section id="root">
            <div class="item" id="second"></div>
            <div class="item" id="third"></div>
        </section>
    `;
});

const ids = (elements: EnhancedElement<HTMLElement, any>[]) =>
    elements.map((e) => e.getElement().id);

describe('energize', () => {
    describe('with a constructor', () => {
        it('instantiates it for the first match with store and extra arguments', () => {
            const store = createTestStore<number>();
            const counter = energize('.item', Counter, store, 'custom');

            store.set(1);

            expect(counter).toBeInstanceOf(Counter);
            expect(counter.getElement().id).toBe('first');
            expect(counter.label).toBe('custom');
            expect(counter.states).toEqual([1]);
        });

        it('works without a store', () => {
            expect(energize('.item', Widget)).toBeInstanceOf(Widget);
        });

        it('returns null when nothing matches', () => {
            expect(energize('.missing', Widget)).toBeNull();
        });
    });

    describe('with a search root', () => {
        it('wraps the first match within an element', () => {
            const root = document.getElementById('root');
            const enhanced = energize('.item', root);

            expect(enhanced).toBeInstanceOf(EnhancedElement);
            expect(enhanced.getElement().id).toBe('second');
        });

        it('wraps the first match within a document', () => {
            expect(energize('.item', document).getElement().id).toBe('first');
        });

        it('searches the document when no root is given', () => {
            expect(energize('.item').getElement().id).toBe('first');
        });

        it('returns null when nothing matches', () => {
            expect(
                energize('.missing', document.getElementById('root'))
            ).toBeNull();
        });
    });
});

describe('energizeAll', () => {
    describe('with a constructor', () => {
        it('instantiates it for every match with store and extra arguments', () => {
            const store = createTestStore<number>();
            const counters = energizeAll('.item', Counter, store, 'custom');

            store.set(1);

            expect(ids(counters)).toEqual(['first', 'second', 'third']);
            counters.forEach((counter) => {
                expect(counter).toBeInstanceOf(Counter);
                expect(counter.label).toBe('custom');
                expect(counter.states).toEqual([1]);
            });
        });

        it('returns an empty array when nothing matches', () => {
            expect(energizeAll('.missing', Widget)).toEqual([]);
        });
    });

    describe('with a search root', () => {
        it('wraps every match within an element', () => {
            const root = document.getElementById('root');

            expect(ids(energizeAll('.item', root))).toEqual([
                'second',
                'third',
            ]);
        });

        it('wraps every match within a document', () => {
            expect(ids(energizeAll('.item', document))).toEqual([
                'first',
                'second',
                'third',
            ]);
        });

        it('searches the document when no root is given', () => {
            expect(ids(energizeAll('.item'))).toEqual([
                'first',
                'second',
                'third',
            ]);
        });

        it('returns an empty array when nothing matches', () => {
            expect(energizeAll('.missing', document)).toEqual([]);
        });
    });
});
