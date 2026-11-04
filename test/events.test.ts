import { describe, expect, it, vi } from 'vitest';
import { Energizable, spark } from '../src/index';

class Emitter extends Energizable<HTMLElement> {
    public fire(eventName: string, data: unknown): void {
        this.emit(eventName, data);
    }
}

describe('events', () => {
    it('on() adds a listener to the element', () => {
        const enhanced = spark('div');
        const listener = vi.fn();

        enhanced.on('click', listener);
        enhanced.getElement().click();

        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('on() returns a function that removes the listener again', () => {
        const enhanced = spark('div');
        const listener = vi.fn();

        const off = enhanced.on('click', listener);
        off();
        enhanced.getElement().click();

        expect(listener).not.toHaveBeenCalled();
    });

    it('on() passes the options to both adding and removing the listener', () => {
        const enhanced = spark('div');
        const listener = vi.fn();

        // A capturing listener is only removed when `capture` matches.
        const off = enhanced.on('click', listener, { capture: true });
        off();
        enhanced.getElement().click();

        expect(listener).not.toHaveBeenCalled();
    });

    it('on() honours listener options such as once', () => {
        const enhanced = spark('div');
        const listener = vi.fn();

        enhanced.on('click', listener, { once: true });
        enhanced.getElement().click();
        enhanced.getElement().click();

        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('emit() dispatches a CustomEvent with the data as detail', () => {
        const enhanced = new Emitter(document.createElement('div'));
        const listener = vi.fn();

        enhanced.getElement().addEventListener('ping', listener);
        enhanced.fire('ping', { answer: 42 });

        expect(listener).toHaveBeenCalledTimes(1);
        const event = listener.mock.calls[0][0];
        expect(event).toBeInstanceOf(CustomEvent);
        expect(event.detail).toEqual({ answer: 42 });
    });
});
