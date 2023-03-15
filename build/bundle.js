
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.56.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const musicList = writable([    
        {
            image:"Blessed By Jah (feat. Doney Tello & Sebtheleb).jpeg",
            audio:"Blessed By Jah (feat. Doney Tello & Sebtheleb).mp3",
            name:"Blessed By Jah (feat. Doney Tello & Sebtheleb)",
            artist:"Lit.Nuel"
        },
        {
            image:"Rise (feat. V.O.D).jpeg",
            audio:"Rise (feat. V.O.D).mp3",
            name:"Rise (feat. V.O.D)",
            artist:"Wamzy"
        },
        {
            image:"Groovy.jpg",
            audio:"Groovy.mp3",
            name:"Groovy",
            artist:"Uknown"
        },
        {
            image:"Swing.jpg",
            audio:"Swing.mp3",
            name:"Swing",
            artist:"Uknown"
        },
        {
            image:"Ghetto Love (feat. Wamzy).jpg",
            audio:"Ghetto Love (feat. Wamzy).mp3",
            name:"Ghetto Love (feat. Wamzy)",
            artist:"Donney Tello"
        },
    ]);

    /* src\App.svelte generated by Svelte v3.56.0 */
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (232:24) {:else}
    function create_else_block(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fa fa-play svelte-1as5fat");
    			add_location(i, file, 232, 28, 4369);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(232:24) {:else}",
    		ctx
    	});

    	return block;
    }

    // (230:24) {#if playerState == "play"}
    function create_if_block(ctx) {
    	let i;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", "fa fa-pause svelte-1as5fat");
    			add_location(i, file, 230, 28, 4281);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(230:24) {#if playerState == \\\"play\\\"}",
    		ctx
    	});

    	return block;
    }

    // (243:12) {#each $musicList as music, i}
    function create_each_block(ctx) {
    	let div2;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let h2;
    	let t1_value = /*music*/ ctx[13].name + "";
    	let t1;
    	let t2;
    	let p;
    	let t3_value = /*music*/ ctx[13].artist + "";
    	let t3;
    	let t4;
    	let div2_class_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[10](/*i*/ ctx[15]);
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			h2 = element("h2");
    			t1 = text(t1_value);
    			t2 = space();
    			p = element("p");
    			t3 = text(t3_value);
    			t4 = space();
    			if (!src_url_equal(img.src, img_src_value = "./files/image/" + /*music*/ ctx[13].image)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-1as5fat");
    			add_location(img, file, 250, 24, 5069);
    			attr_dev(div0, "class", "avatar svelte-1as5fat");
    			add_location(div0, file, 249, 20, 5024);
    			attr_dev(h2, "class", "svelte-1as5fat");
    			add_location(h2, file, 253, 24, 5215);
    			attr_dev(p, "class", "svelte-1as5fat");
    			add_location(p, file, 254, 24, 5261);
    			attr_dev(div1, "class", "song-details svelte-1as5fat");
    			add_location(div1, file, 252, 20, 5164);

    			attr_dev(div2, "class", div2_class_value = "" + (null_to_empty(/*i*/ ctx[15] == /*currentSongIndex*/ ctx[0]
    			? "active"
    			: "") + " svelte-1as5fat"));

    			add_location(div2, file, 245, 16, 4868);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, img);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, h2);
    			append_dev(h2, t1);
    			append_dev(div1, t2);
    			append_dev(div1, p);
    			append_dev(p, t3);
    			append_dev(div2, t4);

    			if (!mounted) {
    				dispose = listen_dev(div2, "click", click_handler, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*$musicList*/ 16 && !src_url_equal(img.src, img_src_value = "./files/image/" + /*music*/ ctx[13].image)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*$musicList*/ 16 && t1_value !== (t1_value = /*music*/ ctx[13].name + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*$musicList*/ 16 && t3_value !== (t3_value = /*music*/ ctx[13].artist + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*currentSongIndex*/ 1 && div2_class_value !== (div2_class_value = "" + (null_to_empty(/*i*/ ctx[15] == /*currentSongIndex*/ ctx[0]
    			? "active"
    			: "") + " svelte-1as5fat"))) {
    				attr_dev(div2, "class", div2_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(243:12) {#each $musicList as music, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let header;
    	let h1;
    	let t1;
    	let p;
    	let t3;
    	let main;
    	let audio;
    	let audio_src_value;
    	let t4;
    	let div5;
    	let div3;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t5;
    	let div2;
    	let h2;
    	let t6_value = /*$musicList*/ ctx[4][/*currentSongIndex*/ ctx[0]].name + "";
    	let t6;
    	let t7;
    	let div1;
    	let button0;
    	let i0;
    	let t8;
    	let button1;
    	let t9;
    	let button2;
    	let i1;
    	let t10;
    	let div4;
    	let t11;
    	let footer;
    	let t12;
    	let a0;
    	let t14;
    	let img1;
    	let img1_src_value;
    	let t15;
    	let a1;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*playerState*/ ctx[1] == "play") return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);
    	let each_value = /*$musicList*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "DOSU";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Music Player";
    			t3 = space();
    			main = element("main");
    			audio = element("audio");
    			t4 = space();
    			div5 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t5 = space();
    			div2 = element("div");
    			h2 = element("h2");
    			t6 = text(t6_value);
    			t7 = space();
    			div1 = element("div");
    			button0 = element("button");
    			i0 = element("i");
    			t8 = space();
    			button1 = element("button");
    			if_block.c();
    			t9 = space();
    			button2 = element("button");
    			i1 = element("i");
    			t10 = space();
    			div4 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t11 = space();
    			footer = element("footer");
    			t12 = text("Made with ");
    			a0 = element("a");
    			a0.textContent = "Svelte.js";
    			t14 = space();
    			img1 = element("img");
    			t15 = text(" by ");
    			a1 = element("a");
    			a1.textContent = "Emmanuel Oladosu";
    			attr_dev(h1, "class", "svelte-1as5fat");
    			add_location(h1, file, 205, 4, 3401);
    			attr_dev(p, "class", "svelte-1as5fat");
    			add_location(p, file, 206, 4, 3419);
    			attr_dev(header, "class", "svelte-1as5fat");
    			add_location(header, file, 204, 0, 3388);
    			if (!src_url_equal(audio.src, audio_src_value = "./files/audio/" + /*$musicList*/ ctx[4][/*currentSongIndex*/ ctx[0]].audio)) attr_dev(audio, "src", audio_src_value);
    			audio.autoplay = "false";
    			add_location(audio, file, 209, 4, 3486);
    			if (!src_url_equal(img0.src, img0_src_value = "./files/image/" + /*$musicList*/ ctx[4][/*currentSongIndex*/ ctx[0]].image)) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			attr_dev(img0, "class", "svelte-1as5fat");
    			add_location(img0, file, 218, 16, 3753);
    			attr_dev(div0, "class", "avatar svelte-1as5fat");
    			add_location(div0, file, 217, 12, 3716);
    			attr_dev(h2, "class", "svelte-1as5fat");
    			add_location(h2, file, 221, 16, 3899);
    			attr_dev(i0, "class", "fa fa-backward svelte-1as5fat");
    			add_location(i0, file, 226, 24, 4090);
    			attr_dev(button0, "class", "svelte-1as5fat");
    			add_location(button0, file, 225, 20, 4041);
    			attr_dev(button1, "class", "svelte-1as5fat");
    			add_location(button1, file, 228, 20, 4171);
    			attr_dev(i1, "class", "fa fa-forward svelte-1as5fat");
    			add_location(i1, file, 236, 24, 4525);
    			attr_dev(button2, "class", "svelte-1as5fat");
    			add_location(button2, file, 235, 20, 4476);
    			attr_dev(div1, "class", "controls svelte-1as5fat");
    			add_location(div1, file, 224, 16, 3998);
    			attr_dev(div2, "class", "song-controls svelte-1as5fat");
    			add_location(div2, file, 220, 12, 3855);
    			attr_dev(div3, "class", "current-song svelte-1as5fat");
    			add_location(div3, file, 216, 8, 3677);
    			attr_dev(div4, "class", "song-list svelte-1as5fat");
    			add_location(div4, file, 241, 8, 4653);
    			attr_dev(div5, "class", "player svelte-1as5fat");
    			add_location(div5, file, 215, 4, 3648);
    			add_location(main, file, 208, 0, 3451);
    			attr_dev(a0, "href", "https://svelte.dev/");
    			attr_dev(a0, "class", "svelte-1as5fat");
    			add_location(a0, file, 264, 14, 5432);
    			attr_dev(img1, "width", "25px");
    			if (!src_url_equal(img1.src, img1_src_value = "https://th.bing.com/th/id/R.02f9ec2d33cc2727b182b07e53a35773?rik=sB8nh4ElbxLn7g&pid=ImgRaw&r=0")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file, 264, 58, 5476);
    			attr_dev(a1, "href", "https://emmanueloladosu.com/");
    			attr_dev(a1, "class", "svelte-1as5fat");
    			add_location(a1, file, 264, 188, 5606);
    			attr_dev(footer, "class", "footer svelte-1as5fat");
    			add_location(footer, file, 263, 0, 5394);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, h1);
    			append_dev(header, t1);
    			append_dev(header, p);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, audio);
    			/*audio_binding*/ ctx[9](audio);
    			append_dev(main, t4);
    			append_dev(main, div5);
    			append_dev(div5, div3);
    			append_dev(div3, div0);
    			append_dev(div0, img0);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, h2);
    			append_dev(h2, t6);
    			append_dev(div2, t7);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(button0, i0);
    			append_dev(div1, t8);
    			append_dev(div1, button1);
    			if_block.m(button1, null);
    			append_dev(div1, t9);
    			append_dev(div1, button2);
    			append_dev(button2, i1);
    			append_dev(div5, t10);
    			append_dev(div5, div4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div4, null);
    				}
    			}

    			/*main_binding*/ ctx[11](main);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, t12);
    			append_dev(footer, a0);
    			append_dev(footer, t14);
    			append_dev(footer, img1);
    			append_dev(footer, t15);
    			append_dev(footer, a1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*prev*/ ctx[5], false, false, false, false),
    					listen_dev(button1, "click", /*playpause*/ ctx[6], false, false, false, false),
    					listen_dev(button2, "click", /*next*/ ctx[7], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$musicList, currentSongIndex*/ 17 && !src_url_equal(audio.src, audio_src_value = "./files/audio/" + /*$musicList*/ ctx[4][/*currentSongIndex*/ ctx[0]].audio)) {
    				attr_dev(audio, "src", audio_src_value);
    			}

    			if (dirty & /*$musicList, currentSongIndex*/ 17 && !src_url_equal(img0.src, img0_src_value = "./files/image/" + /*$musicList*/ ctx[4][/*currentSongIndex*/ ctx[0]].image)) {
    				attr_dev(img0, "src", img0_src_value);
    			}

    			if (dirty & /*$musicList, currentSongIndex*/ 17 && t6_value !== (t6_value = /*$musicList*/ ctx[4][/*currentSongIndex*/ ctx[0]].name + "")) set_data_dev(t6, t6_value);

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(button1, null);
    				}
    			}

    			if (dirty & /*currentSongIndex, setSong, $musicList*/ 273) {
    				each_value = /*$musicList*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div4, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(main);
    			/*audio_binding*/ ctx[9](null);
    			if_block.d();
    			destroy_each(each_blocks, detaching);
    			/*main_binding*/ ctx[11](null);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(footer);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $musicList;
    	validate_store(musicList, 'musicList');
    	component_subscribe($$self, musicList, $$value => $$invalidate(4, $musicList = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let currentSongIndex = 0;
    	let playerState = "play";
    	let audioElement;
    	let mainElement;

    	function setBackground() {
    		let background = `
            linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.5)),
            url(./files/image/${$musicList[currentSongIndex].image}) center no-repeat
        `;

    		$$invalidate(3, mainElement.style.background = background, mainElement);
    		$$invalidate(3, mainElement.style.backgroundSize = "cover", mainElement);
    	}

    	onMount(function () {
    		setBackground();
    	});

    	function prev() {
    		if (currentSongIndex == 0) {
    			$$invalidate(0, currentSongIndex = $musicList.length - 1);
    		} else {
    			$$invalidate(0, currentSongIndex = (currentSongIndex - 1) % $musicList.length);
    		}

    		$$invalidate(1, playerState = "play");
    		setBackground();
    	}

    	function playpause() {
    		if (playerState == "play") {
    			$$invalidate(1, playerState = "pause");
    			audioElement.pause();
    		} else {
    			$$invalidate(1, playerState = "play");
    			audioElement.play();
    		}
    	}

    	function next() {
    		$$invalidate(0, currentSongIndex = (currentSongIndex + 1) % $musicList.length);
    		$$invalidate(1, playerState = "play");
    		setBackground();
    	}

    	function setSong(i) {
    		$$invalidate(0, currentSongIndex = i);
    		$$invalidate(1, playerState = "play");
    		setBackground();
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function audio_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			audioElement = $$value;
    			$$invalidate(2, audioElement);
    		});
    	}

    	const click_handler = i => setSong(i);

    	function main_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			mainElement = $$value;
    			$$invalidate(3, mainElement);
    		});
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		musicList,
    		currentSongIndex,
    		playerState,
    		audioElement,
    		mainElement,
    		setBackground,
    		prev,
    		playpause,
    		next,
    		setSong,
    		$musicList
    	});

    	$$self.$inject_state = $$props => {
    		if ('currentSongIndex' in $$props) $$invalidate(0, currentSongIndex = $$props.currentSongIndex);
    		if ('playerState' in $$props) $$invalidate(1, playerState = $$props.playerState);
    		if ('audioElement' in $$props) $$invalidate(2, audioElement = $$props.audioElement);
    		if ('mainElement' in $$props) $$invalidate(3, mainElement = $$props.mainElement);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		currentSongIndex,
    		playerState,
    		audioElement,
    		mainElement,
    		$musicList,
    		prev,
    		playpause,
    		next,
    		setSong,
    		audio_binding,
    		click_handler,
    		main_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
