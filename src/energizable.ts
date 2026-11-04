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
     *
     * An element has one store at a time: call disconnect() before connecting
     * another one. If it is still connected, connect() logs a warning and
     * disconnects the previous store first.
     */
    public connect(store: STORE): this {
        if (this.isStoreConnected()) {
            console.warn(
                `@gebruederheitz/energize: ${this.constructor.name} is already connected to a store. Call disconnect() before connect(); disconnecting the previous store now.`
            );
            this.disconnect();
        }

        this.store = store;
        this.unsubscribe = store.subscribe((state) =>
            this.onStateUpdate(state)
        );
        this.onAfterConnect();

        return this;
    }

    /**
     * Unsubscribes from the connected store, then calls onDisconnected().
     * Does nothing if no store is connected. Chainable.
     */
    public disconnect(): this {
        if (!this.isStoreConnected()) return this;

        this.unsubscribe?.();
        this.unsubscribe = null;
        this.store = null;
        this.onDisconnected();

        return this;
    }

    /**
     * Whether a store is connected.
     */
    public isStoreConnected(): boolean {
        return this.store !== null;
    }

    protected onAfterConnect(): void {}

    protected onDisconnected(): void {}

    protected onInit(): void {}

    protected onShown(): void {}

    protected onHidden(): void {}

    protected onDestroyed(): void {}

    public getElement(): ET {
        return this.element;
    }

    /**
     * Listen to events on the DOM element.
     *
     * @example energizedElement.on('click', () => { console.log('First click!'); }, { once: true });
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

    /**
     * Displays the DOM element by removing the "hidden" class and setting
     * `aria-hidden` to false. Calls onShown() after the element is displayed,
     * allowing you to hook into the change.
     */
    public show(): this {
        if (this.visible) return this;

        const classes = this.getClassNames();
        this.removeClass(classes.hidden);
        this.setAttribute('aria-hidden', 'false');
        this.visible = true;

        this.onShown();

        return this;
    }

    /**
     * Hides the DOM element, adding the configured "hidden" class and setting
     * `aria-hidden`. Calls onHidden() after hiding, allowing you to hook into
     * the change.
     */
    public hide(): this {
        if (!this.visible) return this;

        const classes = this.getClassNames();
        this.addClass(classes.hidden);
        this.setAttribute('aria-hidden', 'true');
        this.visible = false;

        this.onHidden();

        return this;
    }

    /**
     * Set the innerText of the element. Chainable.
     */
    public content(innerText: string): this {
        if (innerText !== this.element.innerText) {
            this.element.innerText = innerText;
        }

        return this;
    }

    /**
     * Set the innerText of the element, or hide it if the text is null or
     * empty. Chainable.
     * Will not change a hidden element's visibility.
     *
     * @deprecated Use toggleWithContent(), which also shows the element when
     *             there is text. contentOrHide() will be removed in the next
     *             major release.
     */
    public contentOrHide(innerText: string | null = null): this {
        if (!innerText) {
            this.hide();

            return this;
        }

        return this.content(innerText);
    }

    /**
     * Set the innerText of the element and show it, or hide it if the text is
     * null or empty, keeping the previous content. Chainable.
     */
    public toggleWithContent(innerText: string | null = null): this {
        if (!innerText) return this.hide();

        return this.content(innerText).show();
    }

    /**
     * Proxy to getElement().innerText.
     */
    public getContent(): string {
        return this.element.innerText;
    }

    /**
     * Adds one or more classes to the element. Chainable.
     */
    public addClass(...classes: string[]): this {
        this.element.classList.add(...classes);

        return this;
    }

    /**
     * Removes one or more classes from the element. Chainable.
     */
    public removeClass(...classes: string[]): this {
        this.element.classList.remove(...classes);

        return this;
    }

    /**
     * Appends the element to a parent element or another Energizable. Chainable.
     */
    public appendTo(parent: Element | SomeEnergizable): this {
        if (parent instanceof Energizable) {
            parent.getElement().appendChild(this.element);
        } else {
            parent.appendChild(this.element);
        }

        return this;
    }

    /**
     * Inserts the element after a given element or another Energizable. Chainable.
     */
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

    /**
     * Destroys the element, removing it from the DOM and disconnecting its
     * store, then calls onDestroyed().
     */
    public destroy(): void {
        const classes = this.getClassNames();
        this.element.classList.add(classes.hidden);
        this.element.remove();
        this.disconnect();

        this.onDestroyed();
    }

    /**
     * Creates a deep-cloned Energizable (detached) from the current one.
     */
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

    /**
     * Searches for the first element matching the given _selector_ within the
     * component's DOM subtree.
     */
    public find<T extends HTMLElement = HTMLElement>(
        selector: string
    ): T | null {
        return this.element.querySelector<T>(selector);
    }

    /**
     * Searches for all elements matching the given _selector_ within the
     * component's DOM subtree. Returns a NodeList, unless _asArray_ is set to
     * true, in which case it returns an Array.
     */
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
     * Without parameters, returns the component's parent element in the DOM.
     * Passing the _selector_ will traverse the DOM tree upwards and return the
     * first element matching it; `null` if no matching ancestor is found.
     *
     * @example energize('.child')?.parent('.ancestor');
     *          body
     *            .ancestor     <-- returns this element
     *              .dummy
     *                .child
     */
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

    /**
     * Finds the first element within the component's DOM subtree matching
     * _selector_ and energizes that with a plain Energizable. Returns null if
     * no matching element is found.
     * Optionally connects _store_ automatically.
     *
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

    /**
     * Finds all elements within the component's DOM subtree matching _selector_
     * and energizes each with a plain Energizable. Returns an empty array if no
     * matching element is found.
     * Optionally connects _store_ automatically.
     */
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

    /**
     * Finds the first element within the component's DOM subtree matching
     * _selector_ and energizes that with the given Energizable _Component_.
     * Returns null if no matching element is found.
     * Optionally connects _store_ automatically.
     */
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

    /**
     * Finds all elements within the component's DOM subtree matching
     * _selector_ and energizes each with the given Energizable _Component_.
     * Returns an empty array if no matching element is found.
     * Optionally connects _store_ automatically.
     */
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

    /**
     * Returns the value of the element's attribute _name_, or null if the
     * element doesn't have it.
     */
    public getAttribute(name: string): string | null {
        return this.element.getAttribute(name);
    }

    public setAttribute(attributeName: string, attributeValue: string): this {
        this.element.setAttribute(attributeName, attributeValue);

        return this;
    }

    public get dataset() {
        return this.element.dataset;
    }

    /**
     * Allows you to retrieve arbitrary data stored on the Energizable instance
     * through {@link Energizable.setData}.
     */
    public getData<T>(key: string): T {
        return this.data.get(key) as T;
    }

    /**
     * Allows you to store arbitrary data on this Energizable instance, which
     * can be retrieved with {@link Energizable.getData}. Chainable.
     */
    public setData(key: string, value: unknown): this {
        this.data.set(key, value);

        return this;
    }

    /**
     * Internal method – the object returned defines the class names used for
     * reflecting states. You can override this in your extending component
     * to change the default "hidden" for a non-visible element.
     */
    protected getClassNames(): Record<string, string> {
        return {
            hidden: 'hidden',
        };
    }

    /**
     * Dispatches a custom event _eventName_ with details _data_ on the DOM
     * element.
     */
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
