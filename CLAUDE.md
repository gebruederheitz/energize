# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@gebruederheitz/energize` is a small FOSS library (GPL-3.0-only, published to npm). It wraps pre-rendered static HTML, such as a Webflow site, in `EnhancedElement` subclasses and connects them to any store with a `subscribe(callback)` method that returns an unsubscribe function (such as a Svelte store). The README covers the public API from a user's point of view.

## Commands

The Node version is pinned in `.tool-versions` (asdf); it is the only pin. The Taskfile wraps the npm scripts with `asdf exec` and reinstalls dependencies when `package.json`/`package-lock.json` change:

- `task dev`: watch JS (rollup) and SCSS (gulp) in parallel (`npm run watch` + `npm run watch:styles`)
- `task build`: `npm run build`, then `npm run build:styles`
- `task lint` (alias `task test`): `npm run lint`, which runs `prettier:check` and `tscheck` (`tsc --noEmit`)
- `npm run prettier:fix`: format `src/`

There is no test suite. `npm test` fails on purpose, and lint is the only check. Don't run `build:styles` before `build`: the `prebuild` hook deletes all of `dist/`, including the compiled CSS.

## Build pipeline

- `rollup.config.mjs`: `hybridBuild(entry, dir, emitTypes)` runs a CJS pass into `<dir>` and an ESM pass into `<dir>/esm` for each of the two entry points, `src/index.ts` → `dist/` and `src/animations/index.ts` → `dist/animations/`. Only the ESM pass overrides `module`/`moduleResolution`. The CJS pass inherits `tsconfig.json`.
- Declarations are emitted only by the core build. Because `tsconfig.json` includes all of `src/`, they still cover the animations entry (`dist/types/animations/`).
- `src/store.d.ts` is a hand-written declaration file that tsc does not emit, so `postbuild` copies it into `dist/types/`. The other modules import it as `./store`.
- `Gulpfile.mjs` compiles `src/**/*.scss` into `dist/` and keeps the paths (`src/animations/styles.scss` → `dist/animations/styles.css`). cssnano runs only outside watch mode.
- The public surface is the `exports` map plus `typesVersions` in `package.json` (`.`, `./animations`, `./animations.css`). A new entry point needs changes in `rollup.config.mjs`, `exports` and `typesVersions`.
- `dist/` is gitignored. `.npmignore` replaces `.gitignore` for npm, so any new repo-only file must be added there or it ends up in the published package.

## Architecture

- **`EnhancedElement<ET, S, STATE, InitOptionsArg>`** (`src/enhanced-element.ts`) wraps one element. Its type parameters are the element type, the store type (`StoreType<STATE>` or `void`), the state and the init options. The helper types `EEConstructor`, `EEConstructorArgs`, `EEStoreType` and `EEElementType` read these back from a subclass, so that the factories (`enhance*`, `findAndWrap*Into`, `cloneInto`, `energize*`) can type-check extra constructor arguments and pass them through. New factories should follow the same pattern.
- **Lifecycle:** the base constructor syncs visibility and then calls `onInit()` with no arguments. This happens inside `super()`, before the subclass's field initializers run, so inside `onInit` class fields (including arrow-function handlers) are still `undefined`. `connect(store)` subscribes `onStateUpdate` and then calls `onAfterConnect()`. By default, `onStateUpdate` dispatches a `state-update` CustomEvent. `destroy()` removes the element, unsubscribes and then calls `onDestroyed()`.
- **Visibility:** the hidden class from the overridable `getClassNames()` and `aria-hidden` are kept in sync. The constructor takes the initial `visible` state from whichever of the two is set. `show()`/`hide()` are no-ops when the state doesn't change, and otherwise fire `onShown()`/`onHidden()`.
- **Stores:** the core depends only on the `StoreType` shape (`subscribe(cb) → unsubscribe`) and has no runtime dependency on nanostores.
- **`energize`/`energizeAll`** (`src/energize.ts`) dispatch on the second argument. A constructor goes to `EnhancedElement.enhance`/`enhanceAll`, which query `document` and connect the store if one is given. An `Element`/`Document` or nothing goes to `fromSelector`/`fromSelectorAll`, which return plain `EnhancedElement`s.
- **Animations entry** (`src/animations/`): `EnhancedTransitionElement` overrides `show`/`hide` to toggle the `entering`/`exiting` classes and finishes on `animationend`. It publishes the entering element to a static nanostores atom, and `TransitionsContainer` uses it to set `--min-height` on `.energize-transitions`. Importing this entry has a side effect: when the module is evaluated it runs `energize('.energize-transitions', TransitionsContainer)`, which enhances only the first container already in the DOM. This entry is the only reason nanostores is a runtime dependency. Its CSS ships separately as `animations.css`, with transition variants set through the `.crossfade`/`.blinds`/`.zoom` modifier classes and `--energize-transition-*` custom properties.
- `tsconfig.json` has `strict: false`, and the code relies on that (for example `= null` defaults on non-nullable parameters). Turning strict mode on is a real change, not a cleanup.

## Conventions

- Prettier settings are in `.prettierrc`. Only `src/` is checked.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`). Issue branches are named `issue/<number>-<slug>`.
- `npm run release` runs `release-it --only-version` and is allowed only on `main`, `release/*` and `next`. Before it starts, it runs lint, build and build:styles. After the version bump it runs `npm i` and stages the lockfile. It commits `chore: Release v<version>`, tags, publishes to npm and opens the prefilled GitHub release form in the browser. Only run it when asked.
