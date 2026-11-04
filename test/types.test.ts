import { describe, expectTypeOf, it } from 'vitest';
import {
    Energizable,
    energize,
    energizeAll,
    spark,
    type StoreType,
} from '../src/index';

/*
 * Type-level tests: `npm run lint` type-checks this file, so every
 * @ts-expect-error must be an error and every expectTypeOf must hold. The
 * calls sit in functions that never run.
 */

/** A writable store, such as a nanostores atom. */
interface Atom<T> extends StoreType<T> {
    get(): T;
    set(value: T): void;
}
/** A read-only store from another library, such as a Svelte readable. */
interface Readable<T> {
    subscribe(run: (value: T) => void, invalidate?: () => void): () => void;
}
declare const count: Atom<number>;
declare const label: Atom<string>;
declare const readableCount: Readable<number>;

/** Without state. */
class Panel extends Energizable<HTMLDivElement> {}

/** Only reads its state, so any store of numbers will do. */
class Display extends Energizable<HTMLDivElement, number> {
    protected onStateUpdate(state: number): void {
        this.content(String(state));
    }
}

/** Also writes to its store, so it narrows the store type. */
class Counter extends Energizable<HTMLDivElement, number, Atom<number>> {
    public increment(): void {
        this.store?.set(this.store.get() + 1);
    }
}

/** With constructor arguments, one of them optional. */
class Toggle extends Energizable<HTMLButtonElement, number> {
    constructor(
        element: HTMLButtonElement,
        public target: number,
        public label?: string
    ) {
        super(element);
    }
}

/** Without state, with a required constructor argument. */
class Tabs extends Energizable<HTMLDivElement> {
    constructor(
        element: HTMLDivElement,
        public initial: number
    ) {
        super(element);
    }
}

describe('types', () => {
    it('infer the component instance from energize() and energizeAll()', () => {
        expectTypeOf(() =>
            energize('.panel', Panel)
        ).returns.toEqualTypeOf<Panel | null>();
        expectTypeOf(() =>
            energize('.counter', Counter, count)
        ).returns.toEqualTypeOf<Counter | null>();
        expectTypeOf(() =>
            energizeAll('.toggle', Toggle, count, 1)
        ).returns.toEqualTypeOf<Toggle[]>();
    });

    it('infer plain Energizables without a component', () => {
        expectTypeOf(() =>
            energize('.x')
        ).returns.toEqualTypeOf<Energizable<HTMLElement> | null>();
        expectTypeOf(() =>
            energizeAll<HTMLInputElement>('input')
        ).returns.toEqualTypeOf<Energizable<HTMLInputElement>[]>();
        expectTypeOf(() => spark('button')).returns.toEqualTypeOf<
            Energizable<HTMLButtonElement>
        >();
        expectTypeOf(() => spark({ type: 'a' })).returns.toEqualTypeOf<
            Energizable<HTMLAnchorElement>
        >();
        expectTypeOf(() => spark({ content: 'Hi' })).returns.toEqualTypeOf<
            Energizable<HTMLDivElement>
        >();
    });

    it('keep the element type of a component', () => {
        expectTypeOf<
            ReturnType<Panel['getElement']>
        >().toEqualTypeOf<HTMLDivElement>();
        expectTypeOf(() => spark('div', Panel)).returns.toEqualTypeOf<Panel>();
    });

    it('accept any store of the state unless the store type is narrowed', () => {
        () => energize('.display', Display, count);
        () => energize('.display', Display, readableCount);
        () => energize('.counter', Counter, count);

        // @ts-expect-error Counter needs a store with get() and set()
        () => energize('.counter', Counter, readableCount);
        // @ts-expect-error the store holds strings, Display needs numbers
        () => energize('.display', Display, label);
    });

    it('reject a store for components without state', () => {
        // @ts-expect-error Panel has no state
        () => energize('.panel', Panel, count);
        // @ts-expect-error a plain Energizable has no state
        () => spark('div').connect(count);
        () =>
            new Energizable<HTMLDivElement, number>(
                document.createElement('div')
            ).connect(count);
    });

    it('check overrides of onStateUpdate against the state', () => {
        class WrongState extends Energizable<HTMLDivElement, number> {
            // @ts-expect-error the state is a number, not a string
            protected onStateUpdate(state: string): void {}
        }
    });

    it('infer state and store of plain wrappers from the store', () => {
        const panel = new Panel(document.createElement('div'));

        expectTypeOf(() =>
            panel.findAndWrapAll('li', count)
        ).returns.toEqualTypeOf<
            Energizable<HTMLElement, number, Atom<number>>[]
        >();
        expectTypeOf(() =>
            panel.findAndWrap('li')
        ).returns.toEqualTypeOf<Energizable<HTMLElement> | null>();
    });

    it('check constructor arguments', () => {
        const panel = new Panel(document.createElement('div'));

        () => energize('.toggle', Toggle, count, 1);
        () => energize('.toggle', Toggle, null, 1, 'Open');
        () => panel.findAndWrapInto('.toggle', Toggle, readableCount, 3);
        () => panel.findAndWrapAllInto('.toggle', Toggle, null, 4);
        () => spark('button', Toggle, count, 5);
        // A placeholder for the store works without state, too.
        () => energize('.tabs', Tabs, null, 1);
        () => energize('.tabs', Tabs, undefined, 1);

        // @ts-expect-error the required argument is missing
        () => energize('.toggle', Toggle, count);
        // @ts-expect-error the argument has the wrong type
        () => energize('.toggle', Toggle, count, 'one');
        // @ts-expect-error too many arguments
        () => energize('.toggle', Toggle, count, 1, 'Open', true);
        // @ts-expect-error Panel takes no arguments
        () => energize('.panel', Panel, null, 1);
    });

    it('check that a component accepts the element it gets', () => {
        const panel = new Panel(document.createElement('div'));

        expectTypeOf(() =>
            panel.cloneInto(Panel)
        ).returns.toEqualTypeOf<Panel>();

        // @ts-expect-error Toggle needs a button, Panel wraps a div
        () => panel.cloneInto(Toggle, 1);
        // @ts-expect-error Toggle needs a button, not a div
        () => spark('div', Toggle, null, 1);
        // @ts-expect-error not an Energizable
        () => energize('.x', HTMLElement);
    });
});
