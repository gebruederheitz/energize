# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@gebruederheitz/energize` is a small FOSS library (GPL-3.0-only, published to npm). It wraps pre-rendered static HTML, such as a Webflow site, in `EnhancedElement` subclasses and connects them to any store with a `subscribe(callback)` method that returns an unsubscribe function (such as a Svelte store). The README covers the public API from a user's point of view.

## Commands

The Node version is pinned in `.tool-versions` (asdf); it is the only pin. The Taskfile wraps the npm scripts with `asdf exec` and reinstalls dependencies when `package.json`/`package-lock.json` change:

- `task dev`: rebuild on changes (`npm run watch`, which is `tsc --watch`)
- `task build`: `npm run build`
- `task lint` (alias `task test`): `npm run lint`, which runs `prettier:check` and `tscheck` (`tsc --noEmit`)
- `npm run prettier:fix`: format `src/`

There is no test suite. `npm test` fails on purpose, and lint is the only check.

## Build pipeline

- The package is ESM-only (`"type": "module"`) and has no bundler. `tsc` compiles every file under `src/` one to one into `dist/`, with declarations and source maps next to the JS.
- Because of `module: nodenext`, relative imports in `src/` must use the `.js` extension of the emitted file (`'./store.js'`, not `'./store'`).
- `src/store.ts` holds only types (the `StoreType` contract); import it with `import type`.
- The public surface is the single `.` entry of the `exports` map in `package.json`, with a `types` and a `default` condition. The package has no runtime dependencies and declares `sideEffects: false`; keep module evaluation free of side effects.
- `dist/` is gitignored. `.npmignore` replaces `.gitignore` for npm, so any new repo-only file must be added there or it ends up in the published package.

## Architecture

- **`EnhancedElement<ET, S, STATE, InitOptionsArg>`** (`src/enhanced-element.ts`) wraps one element. Its type parameters are the element type, the store type (`StoreType<STATE>` or `void`), the state and the init options. The helper types `EEConstructor`, `EEConstructorArgs`, `EEStoreType` and `EEElementType` read these back from a subclass, so that the factories (`enhance*`, `findAndWrap*Into`, `cloneInto`, `energize*`) can type-check extra constructor arguments and pass them through. New factories should follow the same pattern.
- **Lifecycle:** the base constructor syncs visibility and then calls `onInit()` with no arguments. This happens inside `super()`, before the subclass's field initializers run, so inside `onInit` class fields (including arrow-function handlers) are still `undefined`. `connect(store)` subscribes `onStateUpdate` and then calls `onAfterConnect()`. By default, `onStateUpdate` dispatches a `state-update` CustomEvent. `destroy()` removes the element, unsubscribes and then calls `onDestroyed()`.
- **Visibility:** the hidden class from the overridable `getClassNames()` and `aria-hidden` are kept in sync. The constructor takes the initial `visible` state from whichever of the two is set. `show()`/`hide()` are no-ops when the state doesn't change, and otherwise fire `onShown()`/`onHidden()`.
- **Stores:** the core depends only on the `StoreType` shape (`subscribe(cb) → unsubscribe`). `examples/crossfade/index.html` has a minimal store implementation.
- **`energize`/`energizeAll`** (`src/energize.ts`) dispatch on the second argument. A constructor goes to `EnhancedElement.enhance`/`enhanceAll`, which query `document` and connect the store if one is given. An `Element`/`Document` or nothing goes to `fromSelector`/`fromSelectorAll`, which return plain `EnhancedElement`s.
- **`EnhancedTransitioningElement`** (`src/transitioning-element.ts`) overrides `show`/`hide` with a four-class state machine (`show` → `shown`, `hide` → `hidden`; names from `getClassNames()`). `visible` and `aria-hidden` change immediately. Every call bumps `transitionId`, and pending `requestAnimationFrame`/timeout callbacks and end listeners for an older id do nothing, which makes interruptions safe. It finishes on the end event of the element's longest transition or animation (from the computed style), on a timeout fallback, or immediately when the computed duration is zero. It ships no CSS; the README documents the classes.
- **Examples** (`examples/`): static pages that import the built `dist/` and need a static file server at the repository root (the README suggests `npx sirv-cli . --dev`), because ES modules don't load from `file://`. `examples/crossfade/` (a single page: views crossfade with CSS animations while the container animates to the new view's height) replaces the 1.x `/animations` entry. Examples aren't published to npm.
- `tsconfig.json` has `strict: false`, and the code relies on that (for example `= null` defaults on non-nullable parameters). Turning strict mode on is a real change, not a cleanup.

## Conventions

- Prettier settings are in `.prettierrc`. Only `src/` is checked.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`). Issue branches are named `issue/<number>-<slug>`.
- `npm run release` runs `release-it --only-version` and is allowed only on `main`, `release/*` and `next`. Before it starts, it runs lint, build and build:styles. After the version bump it runs `npm i` and stages the lockfile. It commits `chore: Release v<version>`, tags, publishes to npm and opens the prefilled GitHub release form in the browser. Only run it when asked.
