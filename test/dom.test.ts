import { beforeEach, describe, expect, it } from 'vitest';
import { Energizable, spark } from '../src/index';
import { Counter, Widget } from './support/components';
import { createTestStore } from './support/store';

function wrap(id: string): Energizable<HTMLElement> {
    return new Energizable(document.getElementById(id));
}

describe('content', () => {
    it('content() sets the text of the element and chains', () => {
        const enhanced = spark('div');

        expect(enhanced.content('Hello')).toBe(enhanced);
        expect(enhanced.getElement().innerText).toBe('Hello');
    });

    it('content() sets text, not markup', () => {
        const element = spark('div').content('<b>bold</b>').getElement();

        expect(element.children).toHaveLength(0);
        expect(element.innerText).toBe('<b>bold</b>');
    });

    it('content() leaves the element untouched when the text is unchanged', () => {
        document.body.innerHTML = '<p id="p"><b>same</b></p>';
        const bold = document.querySelector('b');

        wrap('p').content('same');

        expect(bold.parentElement).toBe(document.getElementById('p'));
    });

    it('getContent() reads the text of the element', () => {
        document.body.innerHTML = '<p id="p">Hello</p>';

        expect(wrap('p').getContent()).toBe('Hello');
    });

    it('contentOrHide() sets the content when given text', () => {
        const element = spark('div').contentOrHide('Hello').getElement();

        expect(element.innerText).toBe('Hello');
        expect(element.classList.contains('hidden')).toBe(false);
    });

    it('contentOrHide() leaves a hidden element hidden', () => {
        const element = spark({ classNames: ['hidden'] })
            .contentOrHide('Hello')
            .getElement();

        expect(element.innerText).toBe('Hello');
        expect(element.classList.contains('hidden')).toBe(true);
    });

    it('toggleWithContent() sets the content and shows a hidden element', () => {
        const enhanced = spark({ classNames: ['hidden'] });
        const element = enhanced.getElement();

        expect(enhanced.toggleWithContent('Hello')).toBe(enhanced);
        expect(element.innerText).toBe('Hello');
        expect(element.classList.contains('hidden')).toBe(false);
        expect(element.getAttribute('aria-hidden')).toBe('false');
    });

    it.each([[''], [null], [undefined]])(
        'toggleWithContent(%j) hides the element and keeps its content',
        (text) => {
            const element = spark({ content: 'Hello' })
                .toggleWithContent(text)
                .getElement();

            expect(element.classList.contains('hidden')).toBe(true);
            expect(element.getAttribute('aria-hidden')).toBe('true');
            expect(element.innerText).toBe('Hello');
        }
    );

    it.each([[''], [null], [undefined]])(
        'contentOrHide(%j) hides the element and keeps its content',
        (text) => {
            const element = spark({ content: 'Hello' })
                .contentOrHide(text)
                .getElement();

            expect(element.classList.contains('hidden')).toBe(true);
            expect(element.innerText).toBe('Hello');
        }
    );
});

describe('classes and attributes', () => {
    it('addClass() and removeClass() take several classes and chain', () => {
        const enhanced = spark('div');
        const element = enhanced.getElement();

        expect(enhanced.addClass('a', 'b', 'c')).toBe(enhanced);
        expect(Array.from(element.classList)).toEqual(['a', 'b', 'c']);

        expect(enhanced.removeClass('a', 'c')).toBe(enhanced);
        expect(Array.from(element.classList)).toEqual(['b']);
    });

    it('setAttribute() sets the attribute and chains', () => {
        const enhanced = spark('div');

        expect(enhanced.setAttribute('role', 'tab')).toBe(enhanced);
        expect(enhanced.getElement().getAttribute('role')).toBe('tab');
    });

    it('getAttribute() reads the attribute of the element', () => {
        document.body.innerHTML = '<div id="d" role="tab"></div>';

        expect(wrap('d').getAttribute('role')).toBe('tab');
    });

    it('getAttribute() returns null for a missing attribute', () => {
        document.body.innerHTML = '<div id="d"></div>';

        expect(wrap('d').getAttribute('role')).toBeNull();
    });

    it('dataset is the element dataset', () => {
        document.body.innerHTML = '<div id="d" data-user-id="7"></div>';
        const enhanced = wrap('d');

        expect(enhanced.dataset.userId).toBe('7');

        enhanced.dataset.state = 'open';

        expect(enhanced.getElement().getAttribute('data-state')).toBe('open');
    });
});

describe('data', () => {
    it('setData() stores a value that getData() returns, and chains', () => {
        const enhanced = spark('div');
        const value = { nested: true };

        expect(enhanced.setData('key', value)).toBe(enhanced);
        expect(enhanced.getData('key')).toBe(value);
    });

    it('keeps data on the instance, not in the DOM', () => {
        const enhanced = spark('div').setData('key', 'value');
        const other = new Energizable(enhanced.getElement());

        expect(enhanced.getElement().attributes).toHaveLength(0);
        expect(other.getData('key')).toBeUndefined();
    });

    it('getData() returns undefined for an unknown key', () => {
        expect(spark('div').getData('missing')).toBeUndefined();
    });
});

describe('placement', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <ul id="list"><li id="one"></li><li id="two"></li></ul>
        `;
    });

    it('appendTo() appends to an element and chains', () => {
        const list = document.getElementById('list');
        const item = spark('li');

        expect(item.appendTo(list)).toBe(item);
        expect(list.lastElementChild).toBe(item.getElement());
    });

    it('appendTo() appends to an Energizable', () => {
        const item = spark('li');

        item.appendTo(wrap('list'));

        expect(document.getElementById('list').lastElementChild).toBe(
            item.getElement()
        );
    });

    it('insertAfter() inserts before the next sibling', () => {
        const item = spark('li');

        expect(item.insertAfter(document.getElementById('one'))).toBe(item);

        expect(item.getElement().previousElementSibling.id).toBe('one');
        expect(item.getElement().nextElementSibling.id).toBe('two');
    });

    it('insertAfter() appends after the last child', () => {
        const item = spark('li');

        item.insertAfter(wrap('two'));

        expect(document.getElementById('list').lastElementChild).toBe(
            item.getElement()
        );
    });
});

describe('parent', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div class="box" id="outer">
                <div class="box" id="inner">
                    <p><span id="leaf"></span></p>
                </div>
            </div>
        `;
    });

    it('returns the parent element without a selector', () => {
        expect(wrap('leaf').parent().tagName).toBe('P');
    });

    it('returns the closest ancestor that matches the selector', () => {
        expect(wrap('leaf').parent('.box').id).toBe('inner');
    });

    it('returns null when no ancestor below body matches', () => {
        expect(wrap('leaf').parent('.missing')).toBeNull();
    });

    it('finds a matching ancestor of a detached element', () => {
        const detached = document.createElement('section');
        detached.innerHTML = '<p><span></span></p>';
        const leaf = new Energizable(detached.querySelector('span'));

        expect(leaf.parent('section')).toBe(detached);
    });

    it('returns null for a detached element without a matching ancestor', () => {
        const detached = document.createElement('section');
        detached.innerHTML = '<p><span></span></p>';
        const leaf = new Energizable(detached.querySelector('span'));

        expect(leaf.parent('.missing')).toBeNull();
    });

    it('never matches body or html', () => {
        expect(wrap('leaf').parent('body')).toBeNull();
        expect(wrap('leaf').parent('html')).toBeNull();
    });
});

describe('finding descendants', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="root">
                <span class="item" id="a"></span>
                <span class="item" id="b"></span>
            </div>
        `;
    });

    it('find() returns the first match or null', () => {
        const root = wrap('root');

        expect(root.find('.item').id).toBe('a');
        expect(root.find('.missing')).toBeNull();
    });

    it('findAll() returns a NodeList by default and an array on request', () => {
        const root = wrap('root');

        expect(root.findAll('.item')).toBeInstanceOf(NodeList);
        expect(root.findAll('.item')).toHaveLength(2);

        const items = root.findAll('.item', true);
        expect(Array.isArray(items)).toBe(true);
        expect(items.map((e) => e.id)).toEqual(['a', 'b']);

        expect(root.findAll('.missing', true)).toEqual([]);
    });

    it('findAndWrap() wraps the first match or returns null', () => {
        const root = wrap('root');

        expect(root.findAndWrap('.item').getElement().id).toBe('a');
        expect(root.findAndWrap('.missing')).toBeNull();
    });

    it('findAndWrapAll() wraps every match and connects the store', () => {
        const store = createTestStore<number>();
        const items = wrap('root').findAndWrapAll('.item', store);

        expect(items.map((e) => e.getElement().id)).toEqual(['a', 'b']);
        expect(store.subscriberCount).toBe(2);
        expect(wrap('root').findAndWrapAll('.missing')).toEqual([]);
    });

    it('findAndWrapInto() instantiates the subclass with store and extra arguments', () => {
        const store = createTestStore<number>();
        const counter = wrap('root').findAndWrapInto(
            '.item',
            Counter,
            store,
            'custom'
        );

        store.set(1);

        expect(counter).toBeInstanceOf(Counter);
        expect(counter.getElement().id).toBe('a');
        expect(counter.label).toBe('custom');
        expect(counter.states).toEqual([1]);
    });

    it('findAndWrapInto() returns null when nothing matches', () => {
        expect(wrap('root').findAndWrapInto('.missing', Widget)).toBeNull();
    });

    it('findAndWrapAllInto() instantiates the subclass for every match', () => {
        const store = createTestStore<number>();
        const counters = wrap('root').findAndWrapAllInto(
            '.item',
            Counter,
            store,
            'custom'
        );

        store.set(1);

        expect(counters).toHaveLength(2);
        counters.forEach((counter) => {
            expect(counter).toBeInstanceOf(Counter);
            expect(counter.label).toBe('custom');
            expect(counter.states).toEqual([1]);
        });
        expect(wrap('root').findAndWrapAllInto('.missing', Widget)).toEqual([]);
    });
});

describe('cloning', () => {
    beforeEach(() => {
        document.body.innerHTML =
            '<div id="original" class="hidden"><span>child</span></div>';
    });

    it('clone() wraps a detached deep copy of the element', () => {
        const original = wrap('original');
        const clone = original.clone();

        expect(clone).toBeInstanceOf(Energizable);
        expect(clone.getElement()).not.toBe(original.getElement());
        expect(clone.getElement().parentNode).toBeNull();
        expect(clone.getElement().outerHTML).toBe(
            original.getElement().outerHTML
        );
    });

    it('clone() carries over the hidden state', () => {
        expect(wrap('original').clone().isVisible()).toBe(false);
    });

    it('cloneInto() wraps the copy in the subclass with extra arguments', () => {
        const original = wrap('original');
        const widget = original.cloneInto(Widget, 'custom');

        expect(widget).toBeInstanceOf(Widget);
        expect(widget.label).toBe('custom');
        expect(widget.getElement()).not.toBe(original.getElement());
        expect(widget.getElement().querySelector('span').textContent).toBe(
            'child'
        );
    });
});
