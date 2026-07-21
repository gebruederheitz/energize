import {
    EEConstructor,
    EEConstructorArgs,
    EEStoreType,
    EnhancedElement,
} from './enhanced-element';
import { StoreType } from './store';

export function energize<
    T extends HTMLElement,
    Sx extends StoreType<any> | void = void,
    STx extends any = any,
    Ia extends unknown = undefined,
>(
    selector: string,
    searchRoot?: Element | Document
): EnhancedElement<T, Sx, STx, Ia> | null;

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
    Ia extends unknown = undefined,
>(
    selector: string,
    energizer: C | Element | Document,
    store: EEStoreType<E>,
    ...additionalArgs: EEConstructorArgs<C>
): E | EnhancedElement<T, Sx, STx, Ia> | null;

export function energize<
    T extends HTMLElement,
    C extends EEConstructor<T, any>,
    E extends EnhancedElement<T, any>,
    Sx extends StoreType<any> | void = void,
    STx extends any = any,
    Ia extends unknown = undefined,
>(
    selector: string,
    energizer: C | Element | Document = null,
    store: EEStoreType<E> = null,
    ...additionalArgs: EEConstructorArgs<C>
): E | EnhancedElement<T, Sx, STx, Ia> | null {
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
    Ia extends unknown = undefined,
>(
    selector: string,
    searchRoot?: Element | Document
): EnhancedElement<T, Sx, STx, Ia>[] | null;

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
    Ia extends unknown = undefined,
>(
    selector: string,
    energizer: C | Element | Document = null,
    store: EEStoreType<E> = null,
    ...additionalArgs: EEConstructorArgs<C>
): E[] | EnhancedElement<T, Sx, STx, Ia>[] | null {
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
