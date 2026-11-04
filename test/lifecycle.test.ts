import { describe, expect, it } from 'vitest';
import { Energizable } from '../src/index';

describe('lifecycle', () => {
    it('wraps the element it is given', () => {
        const element = document.createElement('div');

        expect(new Energizable(element).getElement()).toBe(element);
    });

    it('calls onInit once during construction, after the visibility sync', () => {
        const visibleInInit: boolean[] = [];

        class Probe extends Energizable<HTMLElement> {
            protected onInit(): void {
                visibleInInit.push(this.isVisible());
            }
        }

        const element = document.createElement('div');
        element.classList.add('hidden');
        new Probe(element);

        expect(visibleInInit).toEqual([false]);
    });

    it('runs onInit before the subclass field initializers', () => {
        // A JavaScript fact rather than an energize choice: super() returns
        // before the subclass fields are assigned, so handlers defined as
        // arrow-function fields cannot be registered in onInit.
        let handlerInInit: unknown = 'not called';

        class Probe extends Energizable<HTMLElement> {
            protected onInit(): void {
                handlerInInit = this.onClick;
            }

            private onClick = () => {};
        }

        new Probe(document.createElement('div'));

        expect(handlerInInit).toBeUndefined();
    });

    describe('destroy', () => {
        it('removes the element from the DOM and hides it', () => {
            document.body.innerHTML = '<div id="d"></div>';
            const element = document.getElementById('d');

            new Energizable(element).destroy();

            expect(element.isConnected).toBe(false);
            expect(element.classList.contains('hidden')).toBe(true);
        });

        it('calls onDestroyed without a connected store', () => {
            let destroyedCalls = 0;

            class Probe extends Energizable<HTMLElement> {
                protected onDestroyed(): void {
                    destroyedCalls++;
                }
            }

            const probe = new Probe(document.createElement('div'));

            expect(() => probe.destroy()).not.toThrow();
            expect(destroyedCalls).toBe(1);
        });
    });
});
