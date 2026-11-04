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


```html
<!-- Pre-existing HTML and CSS -->
<div class="my-component" data-component="my-component"></div>
<div class="my-other-component" data-component="my-other-component"></div>
<div class="my-other-component" data-component="my-other-component"></div>
```

```ts
import { Energizable, energize, energizeAll } from '@gebruederheitz/energize';
import { atom } from 'nanostores';

const store = atom('Hello!');

// Wraps a div, receives string states and writes to its store, so it names
// the store type too
class MyComponent extends Energizable<HTMLDivElement, string, typeof store> {
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


## Types

`Energizable<ElementType, State, Store>` takes up to three type parameters:

- `ElementType`: the wrapped element, such as `HTMLDivElement`.
- `State`: what `onStateUpdate()` receives. Leave it out for an element
  without state; such an element accepts no store.
- `Store`: the store it connects to. It defaults to any store holding `State`,
  so a component that only reads its state works with nanostores, Svelte stores
  or your own. Name it only if the component uses more of its store, such as
  `set()` above.

The factories infer everything from the component you pass them: the element
type, the store type and any further constructor arguments, which follow the
store argument. Pass `null` as the store to give constructor arguments without
one.

```ts
class Toggle extends Energizable<HTMLButtonElement, boolean> {
    constructor(element: HTMLButtonElement, private label: string) {
        super(element);
    }
}

energize('.toggle', Toggle, isOpen, 'Menu');  // Toggle | null
energize('.toggle', Toggle, isOpen);          // error: missing label
energize('.toggle', Toggle, count, 'Menu');   // error: count holds numbers
spark('div', Toggle, null, 'Menu');           // error: Toggle needs a button
```


## API

`energize()` and `energizeAll()` wrap the first or all elements matching a
selector in the document; `spark()` creates a new, detached element from a tag
name or an element definition. With a component class, they instantiate it
(passing any further arguments to its constructor) and connect the store if you
pass one. Without one, they return plain `Energizable`s: `energize()` and
`energizeAll()` then search within the element or document you pass (default:
the document).

```ts
energize(selector, MyComponent, store?, ...constructorArgs): MyComponent | null;
energize(selector, searchRoot?): Energizable | null;
energizeAll(selector, MyComponent, store?, ...constructorArgs): MyComponent[];
energizeAll(selector, searchRoot?): Energizable[];
spark('button', MyComponent?, store?, ...constructorArgs): MyComponent;
spark({ type, classNames, attributes, parent, content, children }, MyComponent?, store?, ...constructorArgs): MyComponent;
```

To wrap an element you already hold, call the constructor:
`new MyComponent(element)`.

`Energizable<ElementType, State, Store>`:

```ts
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
appendTo(parent: Element | Energizable): this;
insertAfter(element: Element | Energizable): this;
parent(selector?: string): HTMLElement; // closest ancestor matching selector, or the direct parent
find(selector): HTMLElement | null;
findAll(selector, asArray?: boolean): NodeList | HTMLElement[];
findAndWrap(selector, store?): Energizable | null;
findAndWrapAll(selector, store?): Energizable[];
findAndWrapInto(selector, MyComponent, store?, ...constructorArgs): MyComponent | null;
findAndWrapAllInto(selector, MyComponent, store?, ...constructorArgs): MyComponent[];
clone(): Energizable;
cloneInto(MyComponent, ...constructorArgs): MyComponent;
```

The utility types `EnergizableConstructor`, `EnergizableElementType`,
`EnergizableStoreType` and `EnergizableStoreArgument` are exported for writing
your own factories.


## Transitions

`TransitioningEnergizable` is an `Energizable` whose `show()` and
`hide()` run your CSS transitions or animations. energize ships no CSS for it:
it only moves the element through four state classes, and you style them.

| Call     | While transitioning | When finished |
|----------|---------------------|---------------|
| `show()` | `show`              | `shown`       |
| `hide()` | `hide`              | `hidden`      |

- `aria-hidden` and `isVisible()` change immediately; `onShown()` and
  `onHidden()` run when the transition has finished.
- Calling `hide()` during a show transition (or the reverse) turns it around
  cleanly; repeated calls in the same direction are ignored.
- If no transition or animation applies, the change completes right away.
- Only transitions and animations of the element itself count; those of child
  elements are ignored. With several transitioned properties, the longest one
  decides when the transition has finished.
- Override `getClassNames()` to rename the classes, for example
  `{ ...super.getClassNames(), show: 'entering' }`.

By default, `show` and `hide` carry the styles the transition runs *to*:
showing transitions from `hidden` to `show`, hiding from `shown` to `hide`. A
fade, where the hidden element stays in the layout:

```css
.fade { transition: opacity 300ms ease, visibility 300ms; }
.fade.hide,
.fade.hidden { opacity: 0; visibility: hidden; }
```

Transitions can't start from `display: none`. If `hidden` removes the element
from the layout, set `delayedShowTransition`: energize then removes `hidden`
first and adds `shown` a moment later, so `show` holds the styles to start
*from* and the transition runs from `show` to `shown`.

```css
.slide { overflow: hidden; transition: max-height 200ms ease; }
.slide.show,
.slide.hide { max-height: 0; }
.slide.shown { max-height: 20rem; }
.slide.hidden { display: none; }
```

```ts
import { TransitioningEnergizable, energize } from '@gebruederheitz/energize';

class Panel extends TransitioningEnergizable<HTMLDivElement> {
    protected override readonly delayedShowTransition = true;
}

const panel = energize('.slide', Panel);
panel?.show();
```

`delayedHideTransition` does the same in the other direction: it adds `hidden`
right after `hide()` starts, so the transition runs towards the `hidden` styles.

For coordinating several transitioning elements, see the
[crossfade example](examples/crossfade/): a container that crossfades between
views, connected to a minimal custom store. It replaces the `/animations`
entry of energize 1.x.

To run the examples in a clone of this repository, build the package
(`task build` or `npm run build`), serve the repository root with any static
file server and open `/examples/crossfade/`. For example:

```sh
npx sirv-cli . --dev
# then open http://localhost:8080/examples/crossfade/
```

The examples import the package from `dist/` and need a server, because
browsers don't load ES modules from `file://` pages. `--dev` turns off caching,
so with `task dev` running, a reload picks up changes to the library.
