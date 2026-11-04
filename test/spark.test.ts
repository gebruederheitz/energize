import { describe, expect, it } from 'vitest';
import { Energizable, spark } from '../src/index';
import { Counter, Widget } from './support/components';
import { createTestStore } from './support/store';

describe('spark', () => {
    describe('without a component', () => {
        it('creates a detached element of the given type', () => {
            const element = spark('span').getElement();

            expect(element.tagName).toBe('SPAN');
            expect(element.parentNode).toBeNull();
        });

        it('creates the element from a definition', () => {
            const element = spark({
                type: 'button',
                classNames: ['primary'],
                attributes: { type: 'submit' },
            }).getElement();

            expect(element.tagName).toBe('BUTTON');
            expect(element.classList.contains('primary')).toBe(true);
            expect(element.type).toBe('submit');
        });

        it('creates a div from a definition without a type', () => {
            const element = spark({ content: 'Hello' }).getElement();

            expect(element).toBeInstanceOf(HTMLDivElement);
            expect(element.innerText).toBe('Hello');
        });

        it('returns a plain Energizable', () => {
            expect(spark('div')).toBeInstanceOf(Energizable);
        });
    });

    describe('with a component', () => {
        it('instantiates it and passes extra arguments', () => {
            const widget = spark('section', Widget, null, 'custom');

            expect(widget).toBeInstanceOf(Widget);
            expect(widget.getElement().tagName).toBe('SECTION');
            expect(widget.label).toBe('custom');
        });

        it('connects the store when one is given', () => {
            const store = createTestStore<number>();
            const counter = spark({ type: 'div' }, Counter, store);

            store.set(1);

            expect(store.subscriberCount).toBe(1);
            expect(counter.states).toEqual([1]);
        });

        it('works without a store', () => {
            const counter = spark('div', Counter);

            expect(counter).toBeInstanceOf(Counter);
            expect(counter.getElement().tagName).toBe('DIV');
        });
    });
});
