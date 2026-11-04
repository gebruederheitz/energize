import { Energizable } from '../../src/index';
import type { TestStore } from './store';

/** A subclass with an extra constructor argument. */
export class Widget extends Energizable<HTMLElement> {
    constructor(
        element: HTMLElement,
        public label: string = 'default'
    ) {
        super(element);
    }
}

/** A store-connected subclass that records the states it receives. */
export class Counter extends Energizable<
    HTMLElement,
    number,
    TestStore<number>
> {
    public states: number[] = [];

    constructor(
        element: HTMLElement,
        public label: string = 'default'
    ) {
        super(element);
    }

    protected onStateUpdate(state: number): void {
        this.states.push(state);
    }
}
