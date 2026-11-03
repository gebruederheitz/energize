import { beforeEach, describe, expect, it } from 'vitest';
import { EnhancedElement } from '../src/index';
import { Counter, Widget } from './support/components';
import { createTestStore } from './support/store';

describe('static factories', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div class="item" id="first"></div>
            <section id="root">
                <div class="item" id="second"></div>
                <div class="item" id="third"></div>
            </section>
        `;
    });

    it('fromElement wraps the given element', () => {
        const element = document.getElementById('first');

        expect(EnhancedElement.fromElement(element).getElement()).toBe(element);
    });

    it('fromElementType creates a detached element of the given type', () => {
        const element = EnhancedElement.fromElementType('span').getElement();

        expect(element.tagName).toBe('SPAN');
        expect(element.parentNode).toBeNull();
    });

    it('fromNewDiv creates a detached div', () => {
        const element = EnhancedElement.fromNewDiv().getElement();

        expect(element).toBeInstanceOf(HTMLDivElement);
        expect(element.parentNode).toBeNull();
    });

    it('fromDefinition creates the element through createElement', () => {
        const element = EnhancedElement.fromDefinition<'button'>({
            type: 'button',
            classNames: ['primary'],
            attributes: { type: 'submit' },
        }).getElement();

        expect(element.tagName).toBe('BUTTON');
        expect(element.classList.contains('primary')).toBe(true);
        expect(element.type).toBe('submit');
    });

    describe('fromSelector', () => {
        it('wraps the first match in the document', () => {
            expect(EnhancedElement.fromSelector('.item').getElement().id).toBe(
                'first'
            );
        });

        it('searches only within the given root', () => {
            const root = document.getElementById('root');

            expect(
                EnhancedElement.fromSelector('.item', root).getElement().id
            ).toBe('second');
        });

        it('returns null when nothing matches', () => {
            expect(EnhancedElement.fromSelector('.missing')).toBeNull();
        });
    });

    describe('fromSelectorAll', () => {
        it('wraps every match in the document, in document order', () => {
            const ids = EnhancedElement.fromSelectorAll('.item').map(
                (e) => e.getElement().id
            );

            expect(ids).toEqual(['first', 'second', 'third']);
        });

        it('searches only within the given root', () => {
            const root = document.getElementById('root');
            const ids = EnhancedElement.fromSelectorAll('.item', root).map(
                (e) => e.getElement().id
            );

            expect(ids).toEqual(['second', 'third']);
        });

        it('returns an empty array when nothing matches', () => {
            expect(EnhancedElement.fromSelectorAll('.missing')).toEqual([]);
        });
    });

    describe('enhance', () => {
        it('instantiates the subclass for the first match and passes extra arguments', () => {
            const widget = EnhancedElement.enhance(
                '.item',
                Widget,
                null,
                'custom'
            );

            expect(widget).toBeInstanceOf(Widget);
            expect(widget.getElement().id).toBe('first');
            expect(widget.label).toBe('custom');
        });

        it('connects the store when one is given', () => {
            const store = createTestStore<number>();
            const counter = EnhancedElement.enhance('.item', Counter, store);

            store.set(1);

            expect(store.subscriberCount).toBe(1);
            expect(counter.states).toEqual([1]);
        });

        it('returns null when nothing matches', () => {
            expect(EnhancedElement.enhance('.missing', Widget)).toBeNull();
        });
    });

    describe('enhanceAll', () => {
        it('instantiates the subclass for every match and passes extra arguments', () => {
            const widgets = EnhancedElement.enhanceAll(
                '.item',
                Widget,
                null,
                'custom'
            );

            expect(widgets).toHaveLength(3);
            widgets.forEach((widget) => {
                expect(widget).toBeInstanceOf(Widget);
                expect(widget.label).toBe('custom');
            });
        });

        it('connects every instance to the store when one is given', () => {
            const store = createTestStore<number>();
            const counters = EnhancedElement.enhanceAll(
                '.item',
                Counter,
                store
            );

            store.set(1);

            expect(store.subscriberCount).toBe(3);
            counters.forEach((counter) => expect(counter.states).toEqual([1]));
        });

        it('returns an empty array when nothing matches', () => {
            expect(EnhancedElement.enhanceAll('.missing', Widget)).toEqual([]);
        });
    });
});
