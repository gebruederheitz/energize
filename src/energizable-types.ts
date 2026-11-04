import type { Energizable } from './energizable.js';
import type { StoreType } from './store.js';

/** Any Energizable, whatever its element, state and store types. */
export type SomeEnergizable = Energizable<
    HTMLElement,
    unknown,
    StoreType<unknown>
>;

/**
 * The store an Energizable with STATE connects to by default: any store of
 * that state, or none (`never`) without state.
 */
export type DefaultStore<STATE> = [STATE] extends [never]
    ? never
    : StoreType<STATE>;

/** The element type of an Energizable or subclass instance. */
export type EnergizableElementType<E extends SomeEnergizable> =
    E extends Energizable<
        infer ET extends HTMLElement,
        unknown,
        StoreType<unknown>
    >
        ? ET
        : never;

/** The store type of an Energizable or subclass instance. */
export type EnergizableStoreType<E extends SomeEnergizable> =
    E extends Energizable<
        HTMLElement,
        unknown,
        infer STORE extends StoreType<unknown>
    >
        ? STORE
        : never;

/**
 * The store argument of the factories: E's store, or `null`/`undefined` as a
 * placeholder before constructor arguments. Energizables without state take
 * only the placeholder. (A plain `EnergizableStoreType<E> | null` would be
 * `never` for them when strictNullChecks is off, rejecting the placeholder.)
 */
export type EnergizableStoreArgument<E extends SomeEnergizable> = [
    EnergizableStoreType<E>,
] extends [never]
    ? null | undefined
    : EnergizableStoreType<E> | null | undefined;

/**
 * A constructor of E (Energizable or a subclass): it takes E's element type,
 * followed by ARGS.
 */
export type EnergizableConstructor<
    E extends SomeEnergizable,
    ARGS extends unknown[] = [],
> = new (element: EnergizableElementType<E>, ...args: ARGS) => E;
