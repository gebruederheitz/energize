import { describe, expect, it } from 'vitest';
import { Energizable } from '../src/index';

class Tracked extends Energizable<HTMLElement> {
    public shownCalls = 0;
    public hiddenCalls = 0;

    protected onShown(): void {
        this.shownCalls++;
    }

    protected onHidden(): void {
        this.hiddenCalls++;
    }
}

class CustomHiddenClass extends Energizable<HTMLElement> {
    protected getClassNames(): Record<string, string> {
        return { hidden: 'is-hidden' };
    }
}

function div(attributes: string = ''): HTMLElement {
    document.body.innerHTML = `<div ${attributes}></div>`;

    return document.body.firstElementChild as HTMLElement;
}

describe('visibility', () => {
    describe('constructor sync', () => {
        it('treats an element without hidden class or aria-hidden as visible', () => {
            const element = div();
            const enhanced = new Energizable(element);

            expect(enhanced.isVisible()).toBe(true);
            expect(element.classList.contains('hidden')).toBe(false);
            expect(element.hasAttribute('aria-hidden')).toBe(false);
        });

        it('sets aria-hidden when the element has the hidden class', () => {
            const element = div('class="hidden"');
            const enhanced = new Energizable(element);

            expect(enhanced.isVisible()).toBe(false);
            expect(element.getAttribute('aria-hidden')).toBe('true');
        });

        it('adds the hidden class when the element has aria-hidden="true"', () => {
            const element = div('aria-hidden="true"');
            const enhanced = new Energizable(element);

            expect(enhanced.isVisible()).toBe(false);
            expect(element.classList.contains('hidden')).toBe(true);
        });

        it('treats aria-hidden="false" as visible', () => {
            const element = div('aria-hidden="false"');
            const enhanced = new Energizable(element);

            expect(enhanced.isVisible()).toBe(true);
            expect(element.classList.contains('hidden')).toBe(false);
        });
    });

    describe('hide', () => {
        it('adds the hidden class, sets aria-hidden and calls onHidden', () => {
            const element = div();
            const enhanced = new Tracked(element);

            expect(enhanced.hide()).toBe(enhanced);
            expect(enhanced.isVisible()).toBe(false);
            expect(element.classList.contains('hidden')).toBe(true);
            expect(element.getAttribute('aria-hidden')).toBe('true');
            expect(enhanced.hiddenCalls).toBe(1);
        });

        it('does nothing when already hidden', () => {
            const enhanced = new Tracked(div('class="hidden"'));

            enhanced.hide();

            expect(enhanced.hiddenCalls).toBe(0);
        });
    });

    describe('show', () => {
        it('removes the hidden class, sets aria-hidden="false" and calls onShown', () => {
            const element = div('class="hidden"');
            const enhanced = new Tracked(element);

            expect(enhanced.show()).toBe(enhanced);
            expect(enhanced.isVisible()).toBe(true);
            expect(element.classList.contains('hidden')).toBe(false);
            expect(element.getAttribute('aria-hidden')).toBe('false');
            expect(enhanced.shownCalls).toBe(1);
        });

        it('does nothing when already visible', () => {
            const enhanced = new Tracked(div());

            enhanced.show();

            expect(enhanced.shownCalls).toBe(0);
        });
    });

    describe('getClassNames override', () => {
        it('is used by the constructor sync', () => {
            const enhanced = new CustomHiddenClass(div('class="is-hidden"'));

            expect(enhanced.isVisible()).toBe(false);
        });

        it('is used by show and hide instead of the default class', () => {
            const element = div();
            const enhanced = new CustomHiddenClass(element);

            enhanced.hide();
            expect(element.className).toBe('is-hidden');

            enhanced.show();
            expect(element.className).toBe('');
        });
    });
});
