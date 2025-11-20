import { energize, StoreType, EnhancedElement } from '../index';
import { atom, type WritableAtom } from 'nanostores';

export class EnhancedTransitionElement<
    E extends HTMLElement,
    S extends StoreType<unknown> | void = void,
> extends EnhancedElement<E, S> {
    public static transitionStore: WritableAtom<EnhancedTransitionElement<
        HTMLElement,
        StoreType<any> | void
    > | null> = atom(null);

    constructor(e: E, startsHidden: boolean = false) {
        super(e);

        const classes = this.getClassNames();
        if (startsHidden) {
            this.visible = false;
            this.addClass(classes.hidden);
            this.setAttribute('aria-hidden', 'true');
        }
        this.addClass('energize-transition');
        this.onEntered = this.onEntered.bind(this);
        this.onExited = this.onExited.bind(this);
    }

    protected onEntered() {
        const classes = this.getClassNames();
        this.removeClass(classes.entering);
        this.visible = true;
    }

    protected onExited() {
        const classes = this.getClassNames();
        this.addClass(classes.hidden);
        this.removeClass(classes.exiting);
        this.visible = false;
    }

    public override show(): this {
        if (this.visible) {
            return this;
        }

        const classes = this.getClassNames();
        this.on('animationend', this.onEntered, { once: true });
        this.addClass(classes.entering);
        this.removeClass(classes.hidden);
        this.setAttribute('aria-hidden', 'false');
        window.requestAnimationFrame(() => {
            EnhancedTransitionElement.transitionStore.set(this);
        });

        return this;
    }

    public override hide(): this {
        if (!this.visible) {
            return this;
        }

        const classes = this.getClassNames();
        this.on('animationend', this.onExited, { once: true });
        this.addClass(classes.exiting);
        this.setAttribute('aria-hidden', 'true');

        return this;
    }

    protected override getClassNames(): Record<string, string> {
        const classNames = super.getClassNames();

        return {
            ...classNames,
            exiting: 'exiting',
            entering: 'entering',
        };
    }
}

class TransitionsContainer extends EnhancedElement<HTMLElement> {
    constructor(e: HTMLElement) {
        super(e);

        EnhancedTransitionElement.transitionStore.subscribe(
            (
                enteringElement: EnhancedTransitionElement<HTMLElement> | null
            ) => {
                if (enteringElement) {
                    const elementHeight =
                        enteringElement.getElement().offsetHeight;
                    this.element.style.setProperty(
                        '--min-height',
                        `${elementHeight}px`
                    );
                }
            }
        );
    }
}

energize('.energize-transitions', TransitionsContainer);
