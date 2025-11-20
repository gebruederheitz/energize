# Energize

_Reactive DOM operations with plain ES6+_

---
_energize_ is little more than some syntactic sugar to turn pre-rendered static
HTML elements into stateful reactive components.

Our real-word scenario is turning a Webflow site into an interactive application,
with stateful elements communicating with an external API. It can connect to any
store fulfilling the Svelte store contract; we recommend 
[`nanostores`](https://www.npmjs.com/package/nanostores).


## Installation

```shell
npm i @gebruederheitz/energize
```


## Basic Usage

```html
<!-- Pre-existing HTML and CSS -->
<div class="my-component" data-component="my-component"></div>
<div class="my-other-component" data-component="my-other-component"></div>
<div class="my-other-component" data-component="my-other-component"></div>
```

```ts
import { EnhancedElement, energize, energizeAll } from '@gebruederheitz/energize';
import { atom } from 'nanostores';

type State = string;
const store = atom<State>('Hello!');

class MyComponent extends EnhancedElement<HTMLDivElement, State> {
    // "lifecycle" hooks:
    protected onAfterConnect(): void {}
    protected onShown(): void {}
    protected onHidden(): void {}
    protected onDestroyed(): void {}
    protected onInit(): void {
        this.on('click', this.onClick);
    }
    
    // Your entrypoint for state management:
    protected onStoreUpdate(newState): void {
        if (newState) {
            // Utility for manipulating innerText
            this.content(newState);
            // Utility for dispatching CustomEvent instances from the element
            this.emit('state-change', {newState});
        } else {
            // Utility to add a configurable set of classes (default: "hidden")
            // to the element and mark it as hidden using a class property; as
            // well as setting aria-hidden to allow for advanced transition
            // handling and non-standard visual hiding techniques.
            this.hide();
        }
    }
    
    private onClick = (e: MouseEvent) => {
        this.store.set('Ouch!');
    };

    public destroy(): void;

    public clone(): EnhancedElement<ET, S, STATE>;
    public cloneInto<
        C extends EEConstructor<any, any>,
        T extends EnhancedElement<any, any> = InstanceType<C>,
    >(constructor: C, ...additionalArgs: EEConstructorArgs<C>): T;
    
    // Utilities as proxies to standard DOM operations:
    public on(
        eventName: string,
        callback: EventListenerOrEventListenerObject,
        options?: boolean | (EventListenerOptions & AddEventListenerOptions)
    ): () => void;
    protected emit(eventName: string, data: unknown);
    public show(): this;
    public hide(): this;
    public content(innerText: string): this;
    public contentOrHide(innerText: string | null = null): this;
    public getContent(): string;
    public addClass(...classes: string[]): this;
    public removeClass(...classes: string[]): this;
    public appendTo(parent: Element | EnhancedElement<any>): this;
    public insertAfter(element: Element | EnhancedElement<any>): this;
    // Will unsubscribe from any stores if required:
    public destroy(): void;
    public find<T extends HTMLElement>(selector: string): T | null;
    public findAll<T extends HTMLElement>(
        selector: string,
        asArray: boolean = false
    ): T[] | NodeListOf<T>;
    public parent<T extends HTMLElement = HTMLElement>(
        selector: string = null
    ): T;
    public get getAttribute();
    public setAttribute(attributeName: string, attributeValue: string): this;
    public get dataset();
    
    // Internal properties & their management
    public isVisible(): boolean;
    public getData<T extends unknown>(key: string): T;
    public setData(key: string, value: unknown): this;
    protected getClassNames(): Record<string, string> {
        return {
            hidden: 'hidden',
        };
    }
    public getElement(): ET;
    // Manually connect a store
    public connect<Sx extends StoreType<any>>(store: Sx): this;
    
    // Creating EnhancedElement children:
    public findAndWrap<
        T extends HTMLElement,
        Sx extends StoreType<STx> | void = void,
        STx extends any = any,
    >(selector: string): EnhancedElement<T, Sx, STx> | null;
    public findAndWrapAll<
        T extends HTMLElement,
        Sx extends StoreType<any> | void = void,
        STx extends any = any,
    >(selector: string, store: Sx = null): EnhancedElement<T, Sx, STx>[];
    public findAndWrapInto<
        C extends EEConstructor<any, any>,
        T extends EnhancedElement<any, any> = InstanceType<C>,
    >(
        selector: string,
        into: C,
        store: EEStoreType<T> = null,
        ...additionalArgs: EEConstructorArgs<C>
    ): T | null;
    public findAndWrapAllInto<
        C extends EEConstructor<any, any>,
        T extends EnhancedElement<any, any> = InstanceType<C>,
    >(
        selector: string,
        into: C,
        store: EEStoreType<T> = null,
        ...additionalArgs: EEConstructorArgs<C>
    ): T[];
}

energize('[data-component="my-component"]', MyComponent, store);
energizeAll('[data-component="my-other-component"]', MyComponent, store);
setTimeout(() => {
    store.set('Goodbye')
}, 2000)

```
