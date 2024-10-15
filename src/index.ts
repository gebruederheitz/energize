import { createElement } from './create-element';

export interface StoreType<StateType> {
    subscribe(callback: (state: StateType) => void): () => void;
}

type CreateElementDefinition<S extends keyof HTMLElementTagNameMap> =
    Parameters<typeof createElement<HTMLElementTagNameMap[S]>>[0];

type EEElementType<C extends EnhancedElement<any>> =
    C extends EnhancedElement<infer ET> ? ET : never;

export type EEStoreType<C extends EnhancedElement<any, any>> =
    C extends EnhancedElement<any, infer S> ? S : never;

export interface EEConstructor<
    ET extends HTMLElement,
    S extends StoreType<STATE> | void,
    STATE extends any = any,
> {
    new (element: ET, ...args: any[]): EnhancedElement<ET, S>;
}

type EEConstructorArgs<C extends EEConstructor<any, any>> = C extends new (
    element: any,
    ...args: infer D
) => InstanceType<C>
    ? D
    : never;

type StateByStore<S> = S extends StoreType<infer STATE> ? STATE : never;

export class EnhancedElement<
    ET extends HTMLElement,
    S extends StoreType<STATE> | void = void,
    STATE extends any = any,
> {
    protected visible: boolean = true;
    // for connected elements:
    protected unsubscribe: () => void | null = null;
    protected store: S | null = null;
    protected data: Map<string, any> = new Map();

    public static fromElement<
        T extends HTMLElement,
        Sx extends StoreType<STx> | void = void,
        STx extends any = any,
    >(element: T): EnhancedElement<T, Sx, STx> {
        return new EnhancedElement(element);
    }

    public static fromElementType<
        ETS extends keyof HTMLElementTagNameMap,
        Sx extends StoreType<STx> | void = void,
        STx extends any = any,
    >(elementType: ETS): EnhancedElement<HTMLElementTagNameMap[ETS], Sx, STx> {
        const element = document.createElement<ETS>(elementType);

        return new EnhancedElement(element);
    }

    public static fromNewDiv<
        Sx extends StoreType<STx> | void = void,
        STx extends any = any,
    >(): EnhancedElement<HTMLDivElement, Sx, STx> {
        return EnhancedElement.fromElementType('div');
    }

    public static fromDefinition<
        S extends keyof HTMLElementTagNameMap,
        Sx extends StoreType<STx> | void = void,
        STx extends any = any,
    >(
        definition: CreateElementDefinition<S>
    ): EnhancedElement<HTMLElementTagNameMap[S], Sx, STx> {
        const element = createElement<HTMLElementTagNameMap[S]>(definition);

        return new EnhancedElement(element);
    }

    public static fromSelector<
        T extends HTMLElement,
        Sx extends StoreType<any> | void = void,
        STx extends any = any,
    >(
        selector: string,
        searchRoot: Element | Document = document
    ): EnhancedElement<T, Sx, STx> | null {
        const element = searchRoot.querySelector<T>(selector);
        if (element) {
            return new EnhancedElement(element);
        }

        return null;
    }

    public static fromSelectorAll<
        T extends HTMLElement,
        Sx extends StoreType<STx> | void = void,
        STx extends any = any,
    >(
        selector: string,
        searchRoot: Element | Document = document
    ): EnhancedElement<T, Sx, STx>[] {
        const elements = searchRoot.querySelectorAll<T>(selector);
        return Array.from(elements).map(
            (element) => new EnhancedElement<T, Sx, STx>(element)
        );
    }

    public static enhance<
        T extends HTMLElement,
        C extends EEConstructor<T, any>,
        E extends EnhancedElement<T, any> = InstanceType<C>,
    >(
        selector: string,
        Component: C,
        store: EEStoreType<E> = null,
        ...additionalArgs: EEConstructorArgs<C>
    ): E | null {
        const element = document.querySelector<T>(selector);

        if (element) {
            const enhanced = new Component(element, ...additionalArgs) as E;
            if (store) {
                enhanced.connect(store);
            }

            return enhanced;
        }

        return null;
    }

    public static enhanceAll<
        T extends HTMLElement,
        C extends EEConstructor<T, any>,
        E extends EnhancedElement<T, any> = InstanceType<C>,
    >(
        selector: string,
        Component: C,
        store: EEStoreType<E> = null,
        ...additionalArgs: EEConstructorArgs<C>
    ): E[] {
        const elements = document.querySelectorAll<T>(selector);
        return Array.from(elements).map((e) => {
            const enhanced = new Component(e, ...additionalArgs) as E;
            if (store) {
                enhanced.connect(store);
            }

            return enhanced;
        });
    }

    constructor(protected element: ET) {
        const classes = this.getClassNames();
        if (this.element.classList.contains(classes.hidden)) {
            this.visible = false;
            this.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Use this to connect your element to a subscribable store.
     */
    public connect<Sx extends StoreType<any>>(store: Sx): this {
        this.store = store as unknown as S;
        this.unsubscribe = store.subscribe(this.onStateUpdate.bind(this));
        this.onAfterConnect();

        return this;
    }

    protected onAfterConnect() {}

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

        return this;
    }

    public hide(): this {
        if (!this.visible) return this;

        const classes = this.getClassNames();
        this.addClass(classes.hidden);
        this.setAttribute('aria-hidden', 'true');
        this.visible = false;

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

    public appendTo(parent: Element | EnhancedElement<any>): this {
        if (parent instanceof EnhancedElement) {
            parent.getElement().appendChild(this.element);
        } else {
            parent.appendChild(this.element);
        }

        return this;
    }

    public insertAfter(element: Element | EnhancedElement<any>): this {
        const elementUsed =
            element instanceof EnhancedElement ? element.getElement() : element;

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
    }

    public clone(): EnhancedElement<ET, S, STATE> {
        const clonedElement = this.element.cloneNode(true) as ET;
        return new EnhancedElement<ET, S>(clonedElement);
    }

    public cloneInto<
        C extends EEConstructor<any, any>,
        T extends EnhancedElement<any, any> = InstanceType<C>,
    >(constructor: C, ...additionalArgs: EEConstructorArgs<C>): T {
        const clonedElement = this.element.cloneNode(true) as ET;
        return new constructor(clonedElement, ...additionalArgs) as T;
    }

    public isVisible(): boolean {
        return this.visible;
    }

    public find<T extends HTMLElement>(selector: string): T | null {
        return this.element.querySelector(selector);
    }

    public findAll<T extends HTMLElement>(
        selector: string,
        asArray?: true
    ): T[];
    public findAll<T extends HTMLElement>(
        selector: string,
        asArray?: false
    ): NodeListOf<T>;
    public findAll<T extends HTMLElement>(
        selector: string,
        asArray?: boolean
    ): T[] | NodeListOf<T>;
    public findAll<T extends HTMLElement>(
        selector: string,
        asArray: boolean = false
    ): T[] | NodeListOf<T> {
        const nodeList = this.element.querySelectorAll<T>(selector);

        return asArray ? Array.from(nodeList) : nodeList;
    }

    public findAndWrap<
        T extends HTMLElement,
        Sx extends StoreType<STx> | void = void,
        STx extends any = any,
    >(selector: string): EnhancedElement<T, Sx, STx> | null {
        const baseElement = this.find<T>(selector);
        return baseElement
            ? new EnhancedElement<T, Sx, STx>(baseElement)
            : null;
    }

    public findAndWrapAll<
        T extends HTMLElement,
        Sx extends StoreType<any> | void = void,
        STx extends any = any,
    >(selector: string, store: Sx = null): EnhancedElement<T, Sx, STx>[] {
        return this.findAll<T>(selector, true).map((e) => {
            const enhanced = new EnhancedElement<T, Sx, STx>(e);
            if (store) {
                enhanced.connect(store);
            }

            return enhanced;
        });
    }

    public findAndWrapInto<
        C extends EEConstructor<any, any>,
        T extends EnhancedElement<any, any> = InstanceType<C>,
    >(
        selector: string,
        into: C,
        store: EEStoreType<T> = null,
        ...additionalArgs: EEConstructorArgs<C>
    ): T | null {
        const baseElement = this.find<EEElementType<T>>(selector);
        if (baseElement) {
            const enhanced = new into(baseElement, ...additionalArgs);
            if (store) {
                enhanced.connect(store);
            }

            return enhanced as T;
        }

        return null;
    }

    public findAndWrapAllInto<
        C extends EEConstructor<any, any>,
        T extends EnhancedElement<any, any> = InstanceType<C>,
    >(
        selector: string,
        into: C,
        store: EEStoreType<T> = null,
        ...additionalArgs: EEConstructorArgs<C>
    ): T[] {
        return this.findAll<EEElementType<T>>(selector, true).map((e) => {
            const enhanced = new into(e, ...additionalArgs) as T;
            if (store) {
                enhanced.connect(store);
            }

            return enhanced;
        });
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

    public getData<T extends unknown>(key: string): T {
        return this.data.get(key);
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
    protected onStateUpdate(state: STATE): void;
    protected onStateUpdate(state: StateByStore<S>): void;
    protected onStateUpdate(state): void {
        this.element.dispatchEvent(
            new CustomEvent<typeof state>('state-update', {
                detail: state,
            })
        );
    }
}

export function energize<
    T extends HTMLElement,
    Sx extends StoreType<any> | void = void,
    STx extends any = any,
>(
    selector: string,
    searchRoot?: Element | Document
): EnhancedElement<T, Sx, STx> | null;

export function energize<
    T extends HTMLElement,
    C extends EEConstructor<T, any>,
    E extends EnhancedElement<T, any> = InstanceType<C>,
>(
    selector: string,
    energizer: C,
    store?: EEStoreType<E>,
    ...additionalArgs: EEConstructorArgs<C>
): E;

export function energize<
    T extends HTMLElement,
    C extends EEConstructor<T, any>,
    E extends EnhancedElement<T, any>,
    Sx extends StoreType<any> | void = void,
    STx extends any = any,
>(
    selector: string,
    energizer: C | Element | Document = null,
    store: EEStoreType<E> = null,
    ...additionalArgs: EEConstructorArgs<C>
): E | EnhancedElement<T, Sx, STx> | null {
    if (
        !energizer ||
        energizer instanceof Element ||
        energizer instanceof Document
    ) {
        return EnhancedElement.fromSelector(
            selector,
            energizer as null | Element | Document
        );
    }

    return EnhancedElement.enhance(
        selector,
        energizer,
        store,
        ...additionalArgs
    );
}

export function energizeAll<
    T extends HTMLElement,
    Sx extends StoreType<any> | void = void,
    STx extends any = any,
>(
    selector: string,
    searchRoot?: Element | Document
): EnhancedElement<T, Sx, STx>[] | null;

export function energizeAll<
    T extends HTMLElement,
    C extends EEConstructor<T, any>,
    E extends EnhancedElement<T, any> = InstanceType<C>,
>(
    selector: string,
    energizer: C,
    store?: EEStoreType<E>,
    ...additionalArgs: EEConstructorArgs<C>
): E[];
export function energizeAll<
    T extends HTMLElement,
    C extends EEConstructor<T, any>,
    E extends EnhancedElement<T, any>,
    Sx extends StoreType<any> | void = void,
    STx extends any = any,
>(
    selector: string,
    energizer: C | Element | Document = null,
    store: EEStoreType<E> = null,
    ...additionalArgs: EEConstructorArgs<C>
): E[] | EnhancedElement<T, Sx, STx>[] | null {
    if (
        !energizer ||
        energizer instanceof Element ||
        energizer instanceof Document
    ) {
        return EnhancedElement.fromSelectorAll(
            selector,
            energizer as null | Element | Document
        );
    }

    return EnhancedElement.enhanceAll(
        selector,
        energizer,
        store,
        ...additionalArgs
    );
}
