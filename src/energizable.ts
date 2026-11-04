import type { StoreType } from './store.js';
import type {
    DefaultStore,
    EnergizableConstructor,
    EnergizableElementType,
    EnergizableStoreArgument,
    SomeEnergizable,
} from './energizable-types.js';
import { construct } from './construct.js';

/**
 * Wraps one element and connects it to a store.
 *
 * @template ET     The wrapped element's type.
 * @template STATE  The state the element receives in onStateUpdate();
 *                  `never` for an element without state.
 * @template STORE  The store it connects to. Defaults to any store of STATE;
 *                  narrow it if the element uses more of its store's API, such
 *                  as `set()`.
 */
export class Energizable<
    ET extends HTMLElement = HTMLElement,
    STATE = never,
    STORE extends StoreType<STATE> = DefaultStore<STATE>,
> {
    protected visible: boolean = true;
    // for connected elements:
    protected unsubscribe: (() => void) | null = null;
    protected store: STORE | null = null;
    protected data: Map<string, unknown> = new Map();

    constructor(protected element: ET) {
        const classes = this.getClassNames();
        if (this.element.classList.contains(classes.hidden)) {
            this.visible = false;
            this.setAttribute('aria-hidden', 'true');
        }
        if (
            this.visible &&
            this.element.getAttribute('aria-hidden') === 'true'
        ) {
            this.visible = false;
            this.addClass(classes.hidden);
        }

        this.onInit();
    }

    /**
     * Use this to connect your element to a subscribable store. Elements
     * without state don't accept one.
     */
    public connect(store: STORE): this {
        this.store = store;
        this.unsubscribe = store.subscribe((state) =>
            this.onStateUpdate(state)
        );
        this.onAfterConnect();

        return this;
    }

    protected onAfterConnect(): void {}

    protected onInit(): void {}

    protected onShown(): void {}

    protected onHidden(): void {}

    protected onDestroyed(): void {}

    public getElement(): ET {
        return this.element;
    }

    /**
     * @return {() => void}  An "unsubscriber" function to remove the event listener again.
     */
    public on(
        eventName: string,
        callback: EventListenerOrEventListenerObject,
        options?: boolean | (EventListenerOptions & AddEventListenerOptions)
    ): () => void {
        this.element.addEventListener(eventName, callback, options);

        return () => {
            this.element.removeEventListener(eventName, callback, options);
        };
    }

    public show(): this {
        if (this.visible) return this;

        const classes = this.getClassNames();
        this.removeClass(classes.hidden);
        this.setAttribute('aria-hidden', 'false');
        this.visible = true;

        this.onShown();

        return this;
    }

    public hide(): this {
        if (!this.visible) return this;

        const classes = this.getClassNames();
        this.addClass(classes.hidden);
        this.setAttribute('aria-hidden', 'true');
        this.visible = false;

        this.onHidden();

        return this;
    }

    public content(innerText: string): this {
        if (innerText !== this.element.innerText) {
            this.element.innerText = innerText;
        }

        return this;
    }

    public contentOrHide(innerText: string | null = null): this {
        if (!innerText) {
            this.hide();

            return this;
        }

        return this.content(innerText);
    }

    public getContent(): string {
        return this.element.innerText;
    }

    public addClass(...classes: string[]): this {
        this.element.classList.add(...classes);

        return this;
    }

    public removeClass(...classes: string[]): this {
        this.element.classList.remove(...classes);

        return this;
    }

    public appendTo(parent: Element | SomeEnergizable): this {
        if (parent instanceof Energizable) {
            parent.getElement().appendChild(this.element);
        } else {
            parent.appendChild(this.element);
        }

        return this;
    }

    public insertAfter(element: Element | SomeEnergizable): this {
        const elementUsed =
            element instanceof Energizable ? element.getElement() : element;

        const parent = elementUsed.parentElement;
        if (elementUsed.nextElementSibling !== null) {
            parent.insertBefore(this.element, elementUsed.nextElementSibling);
        } else {
            parent.appendChild(this.element);
        }

        return this;
    }

    public destroy(): void {
        const classes = this.getClassNames();
        this.element.classList.add(classes.hidden);
        this.element.remove();

        if (this.store) {
            this.store = null;

            if (this.unsubscribe) {
                this.unsubscribe();
            }
        }

        this.onDestroyed();
    }

    public clone(): Energizable<ET, STATE, STORE> {
        const clonedElement = this.element.cloneNode(true) as ET;
        return new Energizable<ET, STATE, STORE>(clonedElement);
    }

    /**
     * Clones the element into `Component`, which must accept this element's
     * type, passing `additionalArgs` to its constructor.
     */
    public cloneInto<E extends SomeEnergizable, ARGS extends unknown[]>(
        Component: new (element: ET, ...args: ARGS) => E,
        ...additionalArgs: NoInfer<ARGS>
    ): E {
        const clonedElement = this.element.cloneNode(true) as ET;
        return new Component(clonedElement, ...additionalArgs);
    }

    public isVisible(): boolean {
        return this.visible;
    }

    public find<T extends HTMLElement = HTMLElement>(
        selector: string
    ): T | null {
        return this.element.querySelector<T>(selector);
    }

    public findAll<T extends HTMLElement = HTMLElement>(
        selector: string,
        asArray?: true
    ): T[];
    public findAll<T extends HTMLElement = HTMLElement>(
        selector: string,
        asArray?: false
    ): NodeListOf<T>;
    public findAll<T extends HTMLElement = HTMLElement>(
        selector: string,
        asArray?: boolean
    ): T[] | NodeListOf<T>;
    public findAll<T extends HTMLElement = HTMLElement>(
        selector: string,
        asArray: boolean = false
    ): T[] | NodeListOf<T> {
        const nodeList = this.element.querySelectorAll<T>(selector);

        return asArray ? Array.from(nodeList) : nodeList;
    }

    /**
     * The state and store types are inferred from `store`; without one, the
     * result has no state.
     */
    public findAndWrap<
        T extends HTMLElement = HTMLElement,
        STx = never,
        STOREx extends StoreType<STx> = DefaultStore<STx>,
    >(
        selector: string,
        // The intersection lets TypeScript infer STx from the store's
        // subscribe() callback as well as STOREx from the store itself.
        store: (STOREx & StoreType<STx>) | null = null
    ): Energizable<T, STx, STOREx> | null {
        const element = this.find<T>(selector);
        if (!element) return null;

        const wrapped = new Energizable<T, STx, STOREx>(element);
        return store ? wrapped.connect(store) : wrapped;
    }

    public findAndWrapAll<
        T extends HTMLElement = HTMLElement,
        STx = never,
        STOREx extends StoreType<STx> = DefaultStore<STx>,
    >(
        selector: string,
        // See findAndWrap()
        store: (STOREx & StoreType<STx>) | null = null
    ): Energizable<T, STx, STOREx>[] {
        return this.findAll<T>(selector, true).map((element) => {
            const wrapped = new Energizable<T, STx, STOREx>(element);
            return store ? wrapped.connect(store) : wrapped;
        });
    }

    public findAndWrapInto<E extends SomeEnergizable, ARGS extends unknown[]>(
        selector: string,
        Component: EnergizableConstructor<E, ARGS>,
        store: NoInfer<EnergizableStoreArgument<E>> = null,
        ...additionalArgs: NoInfer<ARGS>
    ): E | null {
        const element = this.find<EnergizableElementType<E>>(selector);

        return element
            ? construct(Component, element, store, additionalArgs)
            : null;
    }

    public findAndWrapAllInto<
        E extends SomeEnergizable,
        ARGS extends unknown[],
    >(
        selector: string,
        Component: EnergizableConstructor<E, ARGS>,
        store: NoInfer<EnergizableStoreArgument<E>> = null,
        ...additionalArgs: NoInfer<ARGS>
    ): E[] {
        return this.findAll<EnergizableElementType<E>>(selector, true).map(
            (element) => construct(Component, element, store, additionalArgs)
        );
    }

    public parent<T extends HTMLElement = HTMLElement>(
        selector: string = null
    ): T {
        if (selector) {
            let parent = null;
            let nextParent = this.element.parentElement;

            while (parent === null && nextParent !== document.body) {
                if (nextParent.matches(selector)) {
                    parent = nextParent;
                }

                nextParent = nextParent.parentElement;
            }

            return parent;
        }

        return this.element.parentElement as T;
    }

    public get getAttribute() {
        return this.element.getAttribute;
    }

    public setAttribute(attributeName: string, attributeValue: string): this {
        this.element.setAttribute(attributeName, attributeValue);

        return this;
    }

    public get dataset() {
        return this.element.dataset;
    }

    public getData<T>(key: string): T {
        return this.data.get(key) as T;
    }

    public setData(key: string, value: unknown): this {
        this.data.set(key, value);

        return this;
    }

    protected getClassNames(): Record<string, string> {
        return {
            hidden: 'hidden',
        };
    }

    protected emit(eventName: string, data: unknown) {
        this.element.dispatchEvent(
            new CustomEvent<typeof data>(eventName, {
                detail: data,
            })
        );
    }

    /**
     * Override this on connected components to subscribe to updates from your
     * store. Otherwise it will trigger "state-update" events on the wrapped
     * element.
     */
    protected onStateUpdate(state: STATE): void {
        this.element.dispatchEvent(
            new CustomEvent<STATE>('state-update', {
                detail: state,
            })
        );
    }
}
