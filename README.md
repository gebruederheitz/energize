# Energize

_Reactive DOM operations with plain ES6+_

---
_energize_ is little more than some syntactic sugar to turn pre-rendered static
HTML elements into stateful reactive components.

Our real-word scenario is turning a Webflow site into an interactive application,
with stateful elements communicating with an external API. It can connect to any
store with a `subscribe(callback)` method that returns an unsubscribe function
(such as a Svelte store); we recommend
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

const store = atom('Hello!');

class MyComponent extends EnhancedElement<
    HTMLDivElement,
    typeof store,
    string
> {
    // Lifecycle hooks; all optional
    protected onInit(): void {
        // onInit() runs inside the base constructor, before this class's
        // fields are initialised: use methods here, not arrow-function fields
        this.on('click', (e) => this.onClick(e));
    }
    protected onAfterConnect(): void {}
    protected onShown(): void {}
    protected onHidden(): void {}
    protected onDestroyed(): void {}

    // Called on every store change (nanostores and Svelte stores also call it
    // once on connect)
    protected onStateUpdate(state: string): void {
        if (state) {
            this.content(state).show();
            this.emit('state-change', { state });
        } else {
            this.hide();
        }
    }

    private onClick(e: Event): void {
        this.store?.set('Ouch!');
    }
}

energize('[data-component="my-component"]', MyComponent, store);
energizeAll('[data-component="my-other-component"]', MyComponent, store);

setTimeout(() => {
    store.set('Goodbye');
}, 2000);
```

Without an `onStateUpdate()` override, a connected element dispatches a
`state-update` CustomEvent with the new state as `detail` instead.


## API

`energize()` and `energizeAll()` wrap the first or all elements matching a
selector. With a class, they instantiate it (passing any further arguments
to its constructor) and connect the store if you pass one; with an
`Element`/`Document` or nothing as the second argument, they return plain
`EnhancedElement`s found within it.

```ts
energize(selector, MyComponent, store?, ...constructorArgs): MyComponent | null;
energize(selector, searchRoot?): EnhancedElement | null;
energizeAll(selector, MyComponent, store?, ...constructorArgs): MyComponent[];
energizeAll(selector, searchRoot?): EnhancedElement[];
```

`EnhancedElement<ElementType, StoreType, State, InitOptions>`:

```ts
// Creating instances
static fromElement(element): EnhancedElement;
static fromElementType(tagName): EnhancedElement;
static fromNewDiv(): EnhancedElement;
static fromDefinition({ type, classNames, attributes, parent, content, children }): EnhancedElement;
static fromSelector(selector, searchRoot?): EnhancedElement | null;
static fromSelectorAll(selector, searchRoot?): EnhancedElement[];
static enhance(selector, MyComponent, store?, ...constructorArgs): MyComponent | null;
static enhanceAll(selector, MyComponent, store?, ...constructorArgs): MyComponent[];

// Stores
connect(store): this;                  // subscribes onStateUpdate(), then calls onAfterConnect()
destroy(): void;                       // removes the element and unsubscribes

// Visibility: toggles the "hidden" class and aria-hidden
show(): this;
hide(): this;
isVisible(): boolean;
protected getClassNames(): Record<string, string>; // override to rename "hidden"

// Content, classes, attributes and data
content(innerText: string): this;
contentOrHide(innerText: string | null): this; // hides the element for empty content
getContent(): string;
addClass(...classes: string[]): this;
removeClass(...classes: string[]): this;
getAttribute(name: string): string | null;
setAttribute(name: string, value: string): this;
dataset: DOMStringMap;
getData<T>(key: string): T;            // arbitrary values stored on the instance
setData(key: string, value: unknown): this;
getElement(): ElementType;

// Events
on(eventName, callback, options?): () => void; // returns a function that removes the listener
protected emit(eventName: string, detail: unknown): void; // dispatches a CustomEvent

// DOM
appendTo(parent: Element | EnhancedElement): this;
insertAfter(element: Element | EnhancedElement): this;
parent(selector?: string): HTMLElement; // closest ancestor matching selector, or the direct parent
find(selector): HTMLElement | null;
findAll(selector, asArray?: boolean): NodeList | HTMLElement[];
findAndWrap(selector): EnhancedElement | null;
findAndWrapAll(selector, store?): EnhancedElement[];
findAndWrapInto(selector, MyComponent, store?, ...constructorArgs): MyComponent | null;
findAndWrapAllInto(selector, MyComponent, store?, ...constructorArgs): MyComponent[];
clone(): EnhancedElement;
cloneInto(MyComponent, ...constructorArgs): MyComponent;
```
