# Upgrading

## From 1.x to 2.0

2.0 is ESM-only, renames the classes, reorders their type parameters and
replaces the static factories with three functions. The instance API is
unchanged, including the protected members `element`, `visible` and `store`
that subclasses use.

### Package

- **ESM only.** There is no CommonJS entry any more (the 1.x one hadn't worked
  since 1.5.5). Import the package; don't `require()` it.
- **TypeScript needs `exports`-aware resolution.** The package has only an
  `exports` map, without `main`, `types` or `typesVersions`. Set
  `moduleResolution` to `bundler`, `node16` or `nodenext`; the legacy `node`
  (`node10`) setting finds neither the types nor the entry.
- **`/animations` and `/animations.css` are gone.** See
  [Transitions](#transitions).
- **nanostores is no longer installed with energize.** If you use it, add it to
  your own dependencies: `npm i nanostores`.

### Renames

| 1.x                         | 2.0                                 |
|-----------------------------|-------------------------------------|
| `EnhancedElement`           | `Energizable`                       |
| `EnhancedTransitionElement` | `TransitioningEnergizable` (new behaviour, see [Transitions](#transitions)) |
| `EEConstructor`             | `EnergizableConstructor<Component, Args>` |
| `EEConstructorArgs`         | the `Args` parameter of `EnergizableConstructor` |
| `EEElementType`             | `EnergizableElementType`            |
| `EEStoreType`               | `EnergizableStoreType`              |

### Type parameters

The order has changed: the state now comes before the store, and the store is
optional. Don't just rename the class, or the store ends up in the state slot.

```ts
// 1.x: <ElementType, Store, State, InitOptions>
class Counter extends EnhancedElement<HTMLDivElement, StoreType<number>, number> {}

// 2.0: <ElementType, State, Store>
class Counter extends Energizable<HTMLDivElement, number> {}
```

Name the store only if the component uses more of it than `subscribe()`:

```ts
class Counter extends Energizable<HTMLDivElement, number, WritableAtom<number>> {
    increment() {
        this.store?.set(this.store.get() + 1);
    }
}
```

An element without state leaves out both: `Energizable<HTMLDivElement>`. The
element type defaults to `HTMLElement`.

The fourth parameter, `InitOptions`, is gone, and `onInit()` takes no
arguments. 1.x never passed it any.

### Factories

The static methods are removed:

| 1.x                                                | 2.0                                             |
|----------------------------------------------------|-------------------------------------------------|
| `EnhancedElement.fromElement(element)`             | `new Energizable(element)`                      |
| `EnhancedElement.fromElementType('button')`        | `spark('button')`                               |
| `EnhancedElement.fromNewDiv()`                     | `spark('div')`                                  |
| `EnhancedElement.fromDefinition(definition)`       | `spark(definition)`                             |
| `EnhancedElement.fromSelector(selector, root)`     | `energize(selector, root)`                      |
| `EnhancedElement.fromSelectorAll(selector, root)`  | `energizeAll(selector, root)`                   |
| `EnhancedElement.enhance(selector, Component, store, ...args)` | `energize(selector, Component, store, ...args)` |
| `EnhancedElement.enhanceAll(selector, Component, store, ...args)` | `energizeAll(selector, Component, store, ...args)` |

`spark()` also takes a component: `spark('button', Toggle, store, ...args)`.
In a definition, `type` is a lower-case tag name (`'div'`, not `'DIV'`), and
the element type follows from it.

The plain wrappers that `energize(selector)`, `energizeAll(selector)` and
`spark(type)` return have no state, and these functions no longer take state
or store type arguments. For a plain wrapper with state, call the constructor,
or let `findAndWrap()` infer state and store from the store you pass:

```ts
// 1.x
EnhancedElement.fromSelector<HTMLDivElement, typeof label, string>('.label');

// 2.0
new Energizable<HTMLDivElement, string>(element).connect(label);
parent.findAndWrap('.label', label); // Energizable<HTMLElement, string, typeof label>
```

Inference stops as soon as you give a type argument, so
`findAndWrap<HTMLDivElement>('.label', label)` is an error; name all three or
none.

### Type checks

2.0 infers the element type, state, store and constructor arguments from the
component and checks them, so code that compiled with 1.x may now report
errors. They point to calls that were wrong before:

- `energize(selector, Component)` returns `Component | null` instead of
  `Component`. Handle the missing element, for example with `?.`.
- A store must hold the component's state, and a component without state
  accepts no store, in the factories as well as in `connect()`.
- The constructor arguments after the store are checked against the
  component's constructor. Pass `null` as the store to give arguments without
  one.
- The component must accept the element it gets: `spark('div', Toggle)` is an
  error if `Toggle` wraps a button.

### Transitions

The 1.x `/animations` entry (`EnhancedTransitionElement`, `animations.css` and
the `.energize-transitions` container) has no direct replacement.
`TransitioningEnergizable` handles a single element's show and hide
transitions; the [crossfade example](examples/crossfade/) shows how to build
the container on top of it.

- **No shipped CSS.** Write your own styles for the state classes; the README
  lists them in its Transitions section.
- **New state classes.** `entering` becomes `show` and `exiting` becomes
  `hide`. When a transition finishes, the element gets `shown` or `hidden`.
  Visible elements get `shown` when they are wrapped, so styles that rely on
  the absence of a class may need adjusting. To keep the old names, override
  `getClassNames()`:

  ```ts
  protected override getClassNames() {
      return { ...super.getClassNames(), show: 'entering', hide: 'exiting' };
  }
  ```

- **Transitions and animations.** It finishes on `transitionend` as well as
  `animationend`, on a timeout if neither fires, and immediately if no
  transition or animation applies. Interrupting a transition reverses it.
- **No `startsHidden` argument.** The constructor takes only the element. Mark
  elements that start hidden in the markup with the `hidden` class or
  `aria-hidden="true"`.
- **No side effects.** Importing energize no longer wraps
  `.energize-transitions` elements, sets `--min-height` or adds the
  `energize-transition` class, and there is no `transitionStore`. The example
  sizes its container itself.

### Fixes you may have worked around

- `energize(selector)` and `energizeAll(selector)` without a search root
  search the document. In 1.x they threw, so you had to pass `document`
  explicitly. Passing it still works.
- `energizeAll(selector)` is typed as an array, not `… | null`.
