import { afterEach } from 'vitest';

// happy-dom's `document` is not an instance of the global `Document` class, as
// it is in browsers (https://github.com/capricorn86/happy-dom/issues/1781).
// energize() relies on that check, so restore the browser behaviour.
Object.defineProperty(Document, Symbol.hasInstance, {
    value: (value: unknown) =>
        value instanceof Node && value.nodeType === Node.DOCUMENT_NODE,
});

afterEach(() => {
    document.body.innerHTML = '';
});
