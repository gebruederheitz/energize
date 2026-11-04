import { describe, expect, it } from 'vitest';
import { createElement } from '../src/create-element';

describe('createElement', () => {
    it('creates a detached, empty div by default', () => {
        const element = createElement();

        expect(element.tagName).toBe('DIV');
        expect(element.attributes).toHaveLength(0);
        expect(element.childNodes).toHaveLength(0);
        expect(element.parentNode).toBeNull();
    });

    it('creates an element of the given type', () => {
        expect(createElement({ type: 'section' }).tagName).toBe('SECTION');
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
        const first = document.createElement('span');
        const second = document.createElement('em');
        const element = createElement({ children: [first, second] });

        expect(Array.from(element.children)).toEqual([first, second]);
    });

    it('appends the element to the parent', () => {
        const parent = document.createElement('div');
        parent.append(document.createElement('span'));

        const element = createElement({ parent });

        expect(parent.lastElementChild).toBe(element);
    });
});
