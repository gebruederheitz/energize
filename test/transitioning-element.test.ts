import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnhancedTransitioningElement } from '../src/index';

/**
 * The timing properties EnhancedTransitioningElement reads from the computed
 * style. happy-dom doesn't compute them from stylesheets, so each test sets
 * them per element.
 */
type Timing = Pick<
    CSSStyleDeclaration,
    | 'transitionProperty'
    | 'transitionDuration'
    | 'transitionDelay'
    | 'animationName'
    | 'animationDuration'
    | 'animationDelay'
    | 'animationIterationCount'
>;

const noTiming: Timing = {
    transitionProperty: 'none',
    transitionDuration: '0s',
    transitionDelay: '0s',
    animationName: 'none',
    animationDuration: '0s',
    animationDelay: '0s',
    animationIterationCount: '1',
};

const timings = new Map<Element, Timing>();

function setTiming(element: Element, timing: Partial<Timing>): void {
    timings.set(element, { ...noTiming, ...timing });
}

const fade = { transitionProperty: 'opacity', transitionDuration: '0.3s' };

class Tracked extends EnhancedTransitioningElement<HTMLElement> {
    public calls: string[] = [];

    protected onShown(): void {
        this.calls.push('shown');
    }

    protected onHidden(): void {
        this.calls.push('hidden');
    }
}

class DelayedShow extends Tracked {
    protected override readonly delayedShowTransition = true;
}

class DelayedHide extends Tracked {
    protected override readonly delayedHideTransition = true;
}

class CustomClasses extends EnhancedTransitioningElement<HTMLElement> {
    protected getClassNames(): Record<string, string> {
        return {
            hidden: 'is-hidden',
            show: 'is-entering',
            shown: 'is-shown',
            hide: 'is-leaving',
        };
    }
}

function div(attributes: string = ''): HTMLElement {
    document.body.innerHTML = `<div ${attributes}><span></span></div>`;

    return document.body.firstElementChild as HTMLElement;
}

function classes(element: Element): string {
    return [...element.classList].sort().join(' ');
}

function dispatchEnd(
    target: Element,
    type: 'transitionend' | 'animationend',
    elapsedTime: number
): void {
    target.dispatchEvent(
        Object.assign(new Event(type, { bubbles: true }), { elapsedTime })
    );
}

const nextFrame = () => vi.advanceTimersToNextFrame();

beforeEach(() => {
    vi.useFakeTimers({
        toFake: [
            'setTimeout',
            'clearTimeout',
            'requestAnimationFrame',
            'cancelAnimationFrame',
        ],
    });
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
        (element) => (timings.get(element) ?? noTiming) as CSSStyleDeclaration
    );
});

afterEach(() => {
    timings.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('EnhancedTransitioningElement', () => {
    describe('constructor', () => {
        it('adds the shown class to a visible element', () => {
            const element = div();
            const enhanced = new Tracked(element);

            expect(enhanced.isVisible()).toBe(true);
            expect(classes(element)).toBe('shown');
        });

        it('leaves a hidden element hidden', () => {
            const element = div('class="hidden"');
            const enhanced = new Tracked(element);

            expect(enhanced.isVisible()).toBe(false);
            expect(classes(element)).toBe('hidden');
            expect(element.getAttribute('aria-hidden')).toBe('true');
        });
    });

    describe('without a transition', () => {
        it('show() completes on the next frame', () => {
            const element = div('class="hidden"');
            const enhanced = new Tracked(element);

            enhanced.show();

            expect(enhanced.isVisible()).toBe(true);
            expect(element.getAttribute('aria-hidden')).toBe('false');
            expect(classes(element)).toBe('hidden show');

            nextFrame();

            expect(classes(element)).toBe('shown');
            expect(enhanced.calls).toEqual(['shown']);
        });

        it('hide() completes on the next frame', () => {
            const element = div();
            const enhanced = new Tracked(element);

            enhanced.hide();

            expect(enhanced.isVisible()).toBe(false);
            expect(element.getAttribute('aria-hidden')).toBe('true');
            expect(classes(element)).toBe('hide shown');

            nextFrame();

            expect(classes(element)).toBe('hidden');
            expect(enhanced.calls).toEqual(['hidden']);
        });

        it('completes immediately for an infinite animation', () => {
            const element = div();
            const enhanced = new Tracked(element);
            setTiming(element, {
                animationName: 'pulse',
                animationDuration: '1s',
                animationIterationCount: 'infinite',
            });

            enhanced.hide();
            nextFrame();

            expect(classes(element)).toBe('hidden');
        });
    });

    describe('with a transition', () => {
        it('finishes on the end event of the element', () => {
            const element = div('class="hidden"');
            const enhanced = new Tracked(element);
            setTiming(element, fade);

            enhanced.show();
            nextFrame();

            expect(classes(element)).toBe('show');
            expect(enhanced.calls).toEqual([]);

            dispatchEnd(element, 'transitionend', 0.3);

            expect(classes(element)).toBe('shown');
            expect(enhanced.calls).toEqual(['shown']);
        });

        it('ignores end events of descendants', () => {
            const element = div('class="hidden"');
            const enhanced = new Tracked(element);
            setTiming(element, fade);

            enhanced.show();
            nextFrame();
            dispatchEnd(element.querySelector('span'), 'transitionend', 0.3);
            dispatchEnd(element.querySelector('span'), 'animationend', 0.3);

            expect(classes(element)).toBe('show');
            expect(enhanced.calls).toEqual([]);
        });

        it('waits for the longest of several transitions', () => {
            const element = div();
            const enhanced = new Tracked(element);
            setTiming(element, {
                transitionProperty: 'opacity, transform',
                transitionDuration: '200ms, 400ms',
            });

            enhanced.hide();
            nextFrame();
            dispatchEnd(element, 'transitionend', 0.2);

            expect(classes(element)).toBe('hide');

            dispatchEnd(element, 'transitionend', 0.4);

            expect(classes(element)).toBe('hidden');
            expect(enhanced.calls).toEqual(['hidden']);
        });

        it('counts animation iterations', () => {
            const element = div();
            const enhanced = new Tracked(element);
            setTiming(element, {
                animationName: 'shake',
                animationDuration: '0.25s',
                animationIterationCount: '2',
            });

            enhanced.hide();
            nextFrame();
            dispatchEnd(element, 'animationend', 0.25);

            expect(classes(element)).toBe('hide');

            dispatchEnd(element, 'animationend', 0.5);

            expect(classes(element)).toBe('hidden');
        });

        it('falls back to a timeout of the total time plus 50 ms', () => {
            const element = div();
            const enhanced = new Tracked(element);
            setTiming(element, { ...fade, transitionDelay: '0.1s' });

            enhanced.hide();
            nextFrame();
            vi.advanceTimersByTime(449);

            expect(classes(element)).toBe('hide');

            vi.advanceTimersByTime(1);

            expect(classes(element)).toBe('hidden');
            expect(enhanced.calls).toEqual(['hidden']);
        });

        it('finishes only once when the end event and the timeout both arrive', () => {
            const element = div();
            const enhanced = new Tracked(element);
            setTiming(element, fade);

            enhanced.hide();
            nextFrame();
            dispatchEnd(element, 'transitionend', 0.3);
            vi.advanceTimersByTime(1000);
            dispatchEnd(element, 'transitionend', 0.3);

            expect(enhanced.calls).toEqual(['hidden']);
        });
    });

    describe('interruptions', () => {
        it('ignores show() while visible and hide() while hidden', () => {
            const shown = new Tracked(div());
            shown.show();
            vi.runAllTimers();

            const hidden = new Tracked(div('class="hidden"'));
            hidden.hide();
            vi.runAllTimers();

            expect(shown.calls).toEqual([]);
            expect(hidden.calls).toEqual([]);
        });

        it('reverses a hide transition when show() is called', () => {
            const element = div();
            const enhanced = new Tracked(element);
            setTiming(element, fade);

            enhanced.hide();
            nextFrame();
            enhanced.show();

            expect(enhanced.isVisible()).toBe(true);
            expect(element.getAttribute('aria-hidden')).toBe('false');
            expect(classes(element)).toBe('show');

            // The end event of the interrupted hide transition
            dispatchEnd(element, 'transitionend', 0.3);
            nextFrame();

            expect(classes(element)).toBe('show');

            dispatchEnd(element, 'transitionend', 0.3);

            expect(classes(element)).toBe('shown');
            expect(enhanced.calls).toEqual(['shown']);
        });

        it('cancels pending frame callbacks of an interrupted transition', () => {
            const element = div();
            const enhanced = new Tracked(element);

            // Both calls happen before the frame in which hide() would
            // remove "shown" and complete.
            enhanced.hide().show();
            vi.runAllTimers();

            expect(classes(element)).toBe('shown');
            expect(enhanced.calls).toEqual(['shown']);
        });

        it('cancels pending frame callbacks of an interrupted show()', () => {
            const element = div('class="hidden"');
            const enhanced = new Tracked(element);

            enhanced.show().hide();
            vi.runAllTimers();

            expect(classes(element)).toBe('hidden');
            expect(enhanced.calls).toEqual(['hidden']);
        });

        it('ends in the last requested state after rapid toggling', () => {
            const element = div();
            const enhanced = new Tracked(element);
            setTiming(element, fade);

            for (let i = 0; i < 5; i++) {
                enhanced.hide();
                nextFrame();
                enhanced.show();
                nextFrame();
            }
            enhanced.hide();
            vi.runAllTimers();

            expect(classes(element)).toBe('hidden');
            expect(element.getAttribute('aria-hidden')).toBe('true');
            expect(enhanced.calls).toEqual(['hidden']);
        });

        it('destroy() cancels a running transition', () => {
            const element = div();
            const enhanced = new Tracked(element);
            setTiming(element, fade);

            enhanced.hide();
            nextFrame();
            enhanced.destroy();
            vi.runAllTimers();
            dispatchEnd(element, 'transitionend', 0.3);

            // destroy() adds "hidden"; the cancelled transition would have
            // removed "hide" and called onHidden().
            expect(element.isConnected).toBe(false);
            expect(classes(element)).toBe('hidden hide');
            expect(enhanced.calls).toEqual([]);
        });
    });

    describe('delayed transitions', () => {
        it('delayedShowTransition adds shown one task after removing hidden', () => {
            const element = div('class="hidden"');
            const enhanced = new DelayedShow(element);
            setTiming(element, fade);

            enhanced.show();
            nextFrame();

            expect(classes(element)).toBe('show');

            vi.advanceTimersToNextTimer();

            expect(classes(element)).toBe('show shown');
            expect(enhanced.calls).toEqual([]);

            dispatchEnd(element, 'transitionend', 0.3);

            expect(classes(element)).toBe('shown');
            expect(enhanced.calls).toEqual(['shown']);
        });

        it('delayedHideTransition adds hidden one task after starting to hide', () => {
            const element = div();
            const enhanced = new DelayedHide(element);
            setTiming(element, fade);

            enhanced.hide();
            nextFrame();

            expect(classes(element)).toBe('hide');

            vi.advanceTimersToNextTimer();

            expect(classes(element)).toBe('hidden hide');
            expect(enhanced.calls).toEqual([]);

            dispatchEnd(element, 'transitionend', 0.3);

            expect(classes(element)).toBe('hidden');
            expect(enhanced.calls).toEqual(['hidden']);
        });

        it('a delayed show interrupted by hide() never adds shown', () => {
            const element = div('class="hidden"');
            const enhanced = new DelayedShow(element);
            setTiming(element, fade);

            enhanced.show();
            nextFrame();
            enhanced.hide();
            vi.advanceTimersToNextTimer();

            expect(classes(element)).toBe('hide');
        });

        it('a delayed hide interrupted by show() never adds hidden', () => {
            const element = div();
            const enhanced = new DelayedHide(element);
            setTiming(element, fade);

            enhanced.hide();
            nextFrame();
            enhanced.show();
            vi.advanceTimersToNextTimer();

            expect(classes(element)).toBe('show');
        });
    });

    it('takes the class names from getClassNames()', () => {
        const element = div('class="is-hidden"');
        const enhanced = new CustomClasses(element);
        setTiming(element, fade);

        enhanced.show();

        expect(classes(element)).toBe('is-entering is-hidden');

        nextFrame();
        dispatchEnd(element, 'transitionend', 0.3);

        expect(classes(element)).toBe('is-shown');

        enhanced.hide();

        expect(classes(element)).toBe('is-leaving is-shown');

        vi.runAllTimers();

        expect(classes(element)).toBe('is-hidden');
    });
});
