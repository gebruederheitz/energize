import type { StoreType } from './store.js';
import { EnhancedElement } from './enhanced-element.js';

/**
 * An EnhancedElement that runs CSS transitions or animations when it is shown
 * or hidden. Instead of toggling ".hidden" directly, it moves through four
 * state classes (names from getClassNames()):
 *
 *   show()  → "show" while entering, then "shown"
 *   hide()  → "hide" while leaving, then "hidden"
 *
 * Calling show() during a hide transition (or vice versa) reverses it
 * cleanly. If no transition or animation applies, the state change completes
 * immediately.
 */
export class EnhancedTransitioningElement<
    ET extends HTMLElement,
    S extends StoreType<STATE> | void = void,
    STATE extends any = any,
    InitOptionsArg extends unknown = undefined,
> extends EnhancedElement<ET, S, STATE, InitOptionsArg> {
    /**
     * Add "shown" one task after removing "hidden" instead of when the
     * transition ends. Use this when "hidden" sets `display: none`, which
     * transitions can't start from: the transition then runs from the "show"
     * styles to the "shown" styles.
     */
    protected readonly delayedShowTransition: boolean = false;
    /**
     * Add "hidden" one task after starting to hide instead of when the
     * transition ends, so the transition runs towards the "hidden" styles.
     */
    protected readonly delayedHideTransition: boolean = false;

    private transitionId = 0;
    private cancelTransitionEnd: (() => void) | null = null;

    constructor(element: ET) {
        super(element);

        if (this.visible) {
            this.addClass(this.getClassNames().shown);
        }
    }

    public override show(): this {
        if (this.visible) return this;

        const classes = this.getClassNames();
        const id = this.startTransition();
        this.visible = true;
        this.removeClass(classes.hide);
        this.setAttribute('aria-hidden', 'false');
        this.addClass(classes.show);

        const onEnd = () => {
            this.addClass(classes.shown);
            this.removeClass(classes.show);
            this.onShown();
        };

        window.requestAnimationFrame(() => {
            if (id !== this.transitionId) return;
            this.removeClass(classes.hidden);

            if (this.delayedShowTransition) {
                window.setTimeout(() => {
                    if (id !== this.transitionId) return;
                    this.addClass(classes.shown);
                    this.awaitTransitionEnd(id, onEnd);
                }, 0);
            } else {
                this.awaitTransitionEnd(id, onEnd);
            }
        });

        return this;
    }

    public override hide(): this {
        if (!this.visible) return this;

        const classes = this.getClassNames();
        const id = this.startTransition();
        this.visible = false;
        this.removeClass(classes.show);
        this.setAttribute('aria-hidden', 'true');
        this.addClass(classes.hide);

        const onEnd = () => {
            this.addClass(classes.hidden);
            this.removeClass(classes.hide);
            this.onHidden();
        };

        window.requestAnimationFrame(() => {
            if (id !== this.transitionId) return;
            this.removeClass(classes.shown);

            if (this.delayedHideTransition) {
                window.setTimeout(() => {
                    if (id !== this.transitionId) return;
                    this.addClass(classes.hidden);
                    this.awaitTransitionEnd(id, onEnd);
                }, 0);
            } else {
                this.awaitTransitionEnd(id, onEnd);
            }
        });

        return this;
    }

    public override destroy(): void {
        this.startTransition();
        super.destroy();
    }

    protected override getClassNames(): Record<string, string> {
        return {
            ...super.getClassNames(),
            show: 'show',
            shown: 'shown',
            hide: 'hide',
        };
    }

    /**
     * Invalidates any pending transition and returns the id of the new one.
     */
    private startTransition(): number {
        this.cancelTransitionEnd?.();
        this.cancelTransitionEnd = null;

        return ++this.transitionId;
    }

    /**
     * Calls `done` when the element's own transitions and animations have
     * finished: on the end event of the longest one, or after their total
     * time as a fallback in case no end event arrives.
     */
    private awaitTransitionEnd(id: number, done: () => void): void {
        const { duration, total } = getTiming(
            window.getComputedStyle(this.element)
        );

        if (total <= 0) {
            done();
            return;
        }

        const onEnd = (event: TransitionEvent | AnimationEvent) => {
            // Both events bubble up from descendants
            if (event.target !== this.element) return;
            if (event.elapsedTime < duration - 0.001) return;
            finish();
        };
        const timeout = window.setTimeout(() => finish(), total * 1000 + 50);
        const cleanup = () => {
            this.element.removeEventListener('transitionend', onEnd);
            this.element.removeEventListener('animationend', onEnd);
            window.clearTimeout(timeout);
        };
        const finish = () => {
            cleanup();
            this.cancelTransitionEnd = null;
            if (id === this.transitionId) done();
        };

        this.element.addEventListener('transitionend', onEnd);
        this.element.addEventListener('animationend', onEnd);
        this.cancelTransitionEnd = cleanup;
    }
}

/**
 * The longest transition or animation run time (without delays, matching the
 * end events' `elapsedTime`) and the longest total time including delays, in
 * seconds.
 */
function getTiming(style: CSSStyleDeclaration): {
    duration: number;
    total: number;
} {
    let duration = 0;
    let total = 0;

    const add = (
        durations: string,
        delays: string,
        iterations: string = '1'
    ) => {
        const d = parseList(durations, parseTime);
        const dl = parseList(delays, parseTime);
        const it = parseList(iterations, (v) =>
            v === 'infinite' ? 0 : parseFloat(v) || 0
        );
        const count = Math.max(d.length, dl.length);

        for (let i = 0; i < count; i++) {
            const runTime = d[i % d.length] * it[i % it.length];
            duration = Math.max(duration, runTime);
            total = Math.max(total, runTime + dl[i % dl.length]);
        }
    };

    if (style.transitionProperty !== 'none') {
        add(style.transitionDuration, style.transitionDelay);
    }
    if (style.animationName && style.animationName !== 'none') {
        add(
            style.animationDuration,
            style.animationDelay,
            style.animationIterationCount
        );
    }

    return { duration, total };
}

function parseList(value: string, parse: (v: string) => number): number[] {
    return (value || '0').split(',').map((v) => parse(v.trim()));
}

function parseTime(value: string): number {
    const n = parseFloat(value) || 0;

    return value.endsWith('ms') ? n / 1000 : n;
}
