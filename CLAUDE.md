# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@gebruederheitz/energize` is a small FOSS library (GPL-3.0-only, published to npm). It wraps pre-rendered static HTML, such as a Webflow site, in `Energizable` subclasses and connects them to any store with a `subscribe(callback)` method that returns an unsubscribe function (such as a Svelte store). The README covers the public API from a user's point of view.

## Commands

The Node version is pinned in `.tool-versions` (asdf); it is the only pin. The Taskfile wraps the npm scripts with `asdf exec` and reinstalls dependencies when `package.json`/`package-lock.json` change:

- `task dev`: rebuild on changes (`npm run watch`, which is `tsc --watch`)
- `task build`: `npm run build`
- `task lint`: `npm run lint`, which runs `prettier:check` and `tscheck` (`tsc` on `tsconfig.json` and on `test/tsconfig.json`)
- `task test`: `npm test`, which runs the vitest suite once; `npm run test:watch` keeps it running
- `task test -- test/stores.test.ts` runs a single file, `task test -- -t 'destroy'` the tests whose name matches; anything after `--` goes to vitest
- `npm run prettier:fix`: format `src/`, `test/` and `vitest.config.mts`

## Tests

- The tests live in `test/`, one file per area, and import the library from `../src/`. `vitest.config.mts` sets the environment to happy-dom, because jsdom doesn't implement `innerText`, which `content()`, `getContent()` and `createElement` use.
- `test/setup.ts` empties `document.body` after each test.
- `test/support/store.ts` is a minimal store that implements only `StoreType`; use it rather than a store library.
- happy-dom doesn't compute transition or animation timings from stylesheets. `test/transitioning-energizable.test.ts` stubs `getComputedStyle` per element, uses fake timers for `requestAnimationFrame`/`setTimeout`, and dispatches the end events itself.
- `test/types.test.ts` holds type-level tests (`expectTypeOf` and `@ts-expect-error`, in functions that never run). `npm run lint` enforces them through `tsc -p test/tsconfig.json`; `npm test` doesn't. Also check new typings with `strict: true`, because consumers' settings apply to the published declarations.
- Tests describe intended behaviour. A known defect is an `it.fails` test with a comment that names the issue; when the fix lands, vitest reports it as failing until it becomes a plain `it`.

## Build pipeline

- The package is ESM-only (`"type": "module"`) and has no bundler. `tsc` compiles every file under `src/` one to one into `dist/`, with declarations and source maps next to the JS.
- Because of `module: nodenext`, relative imports in `src/` must use the `.js` extension of the emitted file (`'./store.js'`, not `'./store'`).
- `src/store.ts` holds only types (the `StoreType` contract); import it with `import type`.
- The public surface is the single `.` entry of the `exports` map in `package.json`, with a `types` and a `default` condition. The package has no runtime dependencies and declares `sideEffects: false`; keep module evaluation free of side effects.
- `dist/` is gitignored. `.npmignore` replaces `.gitignore` for npm, so any new repo-only file must be added there or it ends up in the published package.

## Architecture

- **`Energizable<ET, STATE, STORE>`** (`src/energizable.ts`) wraps one element; the class has only instance methods. `STATE` defaults to `never` (no state: `STORE` is then `never` and `connect()` accepts nothing). `STORE` defaults to any `StoreType<STATE>` and is narrowed only by components that use more of their store, such as `set()`.
- **Utility types** (`src/energizable-types.ts`): `EnergizableElementType` and `EnergizableStoreType` read the type parameters back from an instance type, `EnergizableConstructor<E, ARGS>` describes a component constructor, and `EnergizableStoreArgument` is the store parameter of the factories (only `null`/`undefined` without state, because `never | null` is `never` without strictNullChecks). Factories take one type parameter for the instance and one for the extra constructor arguments, infer both from the component (store and arguments are wrapped in `NoInfer`), and create instances through the internal `construct()` (`src/construct.ts`, not exported from the package). New factories should follow the same pattern; avoid `any`.
- **Lifecycle:** the base constructor syncs visibility and then calls `onInit()` with no arguments. This happens inside `super()`, before the subclass's field initializers run, so inside `onInit` class fields (including arrow-function handlers) are still `undefined`. `connect(store)` subscribes `onStateUpdate` and then calls `onAfterConnect()`. By default, `onStateUpdate` dispatches a `state-update` CustomEvent. `destroy()` removes the element, unsubscribes and then calls `onDestroyed()`.
- **Visibility:** the hidden class from the overridable `getClassNames()` and `aria-hidden` are kept in sync. The constructor takes the initial `visible` state from whichever of the two is set. `show()`/`hide()` are no-ops when the state doesn't change, and otherwise fire `onShown()`/`onHidden()`.
- **Stores:** the core depends only on the `StoreType` shape (`subscribe(cb) → unsubscribe`). `examples/crossfade/index.html` has a minimal store implementation.
- **`energize`/`energizeAll`/`spark`** (`src/energize.ts`) are the only factories. `energize`/`energizeAll` dispatch on whether the second argument is a function: a component is instantiated for the matches in `document` and connected to the store if one is given; an `Element`/`Document` or nothing gives plain `Energizable`s found within it. `spark` creates a detached element from a tag name or an `ElementDefinition` (`src/create-element.ts`), whose `type` decides the element type (`SparkedElement`), and wraps it like `energize` does.
- **`TransitioningEnergizable`** (`src/transitioning-energizable.ts`) overrides `show`/`hide` with a four-class state machine (`show` → `shown`, `hide` → `hidden`; names from `getClassNames()`). `visible` and `aria-hidden` change immediately. Every call bumps `transitionId`, and pending `requestAnimationFrame`/timeout callbacks and end listeners for an older id do nothing, which makes interruptions safe. It finishes on the end event of the element's longest transition or animation (from the computed style), on a timeout fallback, or immediately when the computed duration is zero. It ships no CSS; the README documents the classes.
- **Examples** (`examples/`): static pages that import the built `dist/` and need a static file server at the repository root (the README suggests `npx sirv-cli . --dev`), because ES modules don't load from `file://`. `examples/crossfade/` (a single page: views crossfade with CSS animations while the container animates to the new view's height) replaces the 1.x `/animations` entry. Examples aren't published to npm.
- `tsconfig.json` has `strict: false`, and the code relies on that (for example `= null` defaults on non-nullable parameters). Turning strict mode on is a real change, not a cleanup.

## Conventions

- Prettier settings are in `.prettierrc`. `src/`, `test/` and `vitest.config.mts` are checked.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`). Issue branches are named `issue/<number>-<slug>`.
- Breaking changes get a section in `UPGRADING.md` (one per major version, with before/after code). It ships with the package like the README.
- `npm run release` runs `release-it --only-version` and is allowed only on `main`, `release/*` and `next`. Before it starts, it runs lint and build. After the version bump it runs `npm i` and stages the lockfile. It commits `chore: Release v<version>`, tags, publishes to npm and opens the prefilled GitHub release form in the browser. Only run it when asked.
