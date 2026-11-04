import { describe, expect, it } from 'vitest';
import { createElement } from '../src/create-element';

describe('createElement', () => {
    it('creates a detached, empty div by default', () => {
        const element = createElement();

        expect(element).toBeInstanceOf(HTMLDivElement);
        expect(element.tagName).toBe('DIV');
        expect(element.attributes).toHaveLength(0);
        expect(element.childNodes).toHaveLength(0);
        expect(element.parentNode).toBeNull();
    });

    it('creates an element of the given type', () => {
        const element = createElement({ type: 'button' });

        expect(element).toBeInstanceOf(HTMLButtonElement);
        expect(element.tagName).toBe('BUTTON');
    });

    it('adds the class names', () => {
        const element = createElement({ classNames: ['a', 'b'] });

        expect(Array.from(element.classList)).toEqual(['a', 'b']);
    });

    it('sets the attributes', () => {
        const element = createElement({
            attributes: { id: 'x', 'data-role': 'tab' },
        });

        expect(element.id).toBe('x');
        expect(element.dataset.role).toBe('tab');
    });

    it('sets the content as text, not as markup', () => {
        const element = createElement({ content: '<b>bold</b>' });

        expect(element.innerText).toBe('<b>bold</b>');
        expect(element.children).toHaveLength(0);
    });

    it('appends the children in order', () => {
        // Identical spans, so that only identity tells them apart: toEqual()
        // compares DOM nodes with isEqualNode(). Five of them leave a random
        // order a 1 in 120 chance of passing.
        const children = Array.from({ length: 5 }, () =>
            document.createElement('span')
        );
        const element = createElement({ children });

        expect(element.children).toHaveLength(children.length);
        children.forEach((child, index) => {
            expect(element.children[index]).toBe(child);
        });
    });

    it('appends the element to the parent', () => {
        const parent = document.createElement('div');
        parent.append(document.createElement('span'));

        const element = createElement({ parent });

        expect(parent.lastElementChild).toBe(element);
    });
});
