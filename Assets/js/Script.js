/* ThemeRubicBlog: talks to the MdBlog API and renders the Blog and Post views.
   Config comes from window.RubicBlog (printed by Components/Footer.html). */
(function () {
    'use strict';

    var CFG = window.RubicBlog || {};
    var PAGE_SIZE = 12;
    var ROUTES = {
        blog: '/Blog', post: '/Post',
        signin: '/SignIn', signup: '/SignUp', profile: '/Profile',
        dashboard: '/Dashboard', posts: '/ManagePosts', editor: '/PostEditor',
        categories: '/ManageCategories', tags: '/ManageTags',
        category: '/Category', author: '/Author',
        comments: '/ManageComments', reports: '/ManageReports', settings: '/ManageSettings'
    };

    /* ---------- helpers ---------- */

    function el(tag, attrs, children) {
        var node = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (key) {
            var value = attrs[key];
            if (value === false || value === null || value === undefined) return;
            if (key === 'class') node.className = value;
            else if (key === 'text') node.textContent = value;
            else node.setAttribute(key, value === true ? '' : value);
        });
        [].concat(children || []).forEach(function (child) {
            if (child === null || child === undefined || child === false) return;
            node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
        });
        return node;
    }

    function $(selector, root) { return (root || document).querySelector(selector); }

    function trimSlash(value) { return String(value || '').replace(/\/+$/, ''); }

    function pageUrl(route, params) {
        var url = trimSlash(CFG.pageBase) + route;
        var query = new URLSearchParams();
        Object.keys(params || {}).forEach(function (key) {
            if (params[key] !== '' && params[key] !== null && params[key] !== undefined) query.set(key, params[key]);
        });
        var qs = query.toString();
        return qs ? url + '?' + qs : url;
    }

    function isAbsolute(url) { return /^((https?:)?\/\/|blob:|data:image\/)/i.test(url); }

    function assetUrl(path) {
        if (!path) return '';
        if (isAbsolute(path)) return path;
        return trimSlash(CFG.site) + '/' + String(path).replace(/^\/+/, '');
    }

    /* MySQL "YYYY-MM-DD HH:MM:SS" -> Date */
    function parseDate(value) {
        var date = new Date(String(value || '').replace(' ', 'T'));
        return isNaN(date.getTime()) ? null : date;
    }

    function formatDate(value) {
        var date = parseDate(value);
        return date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    }

    function formatDateLong(value) {
        var date = parseDate(value);
        return date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    }

    function slugify(text) {
        return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
    }

    function debounce(fn, wait) {
        var timer;
        return function () {
            var args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(null, args); }, wait);
        };
    }

    /* ---------- API ---------- */

    /* ---------- authentication (token kept in localStorage, as MdBlog does) ---------- */

    function storage(action, key, value) {
        try {
            if (action === 'get') return window.localStorage.getItem(key);
            if (action === 'set') window.localStorage.setItem(key, value);
            if (action === 'remove') window.localStorage.removeItem(key);
        } catch (e) { /* storage unavailable (private mode): treated as signed out */ }
        return null;
    }

    var TOKEN_NAME_KEY = 'rubicblog_token_name';

    var Auth = {
        /* the platform's key when printed by PHP, else the name returned at sign-in */
        tokenKey: function () { return CFG.tokenName || storage('get', TOKEN_NAME_KEY) || 'rubicblog_token'; },
        /* same derivation as MdBlog's Sign-in view so both stay in step */
        userKey: function () { return Auth.tokenKey().split('_').slice(1).join('_') + '_userDetails'; },
        token: function () { return storage('get', Auth.tokenKey()) || ''; },
        user: function () {
            try { return JSON.parse(storage('get', Auth.userKey()) || 'null'); } catch (e) { return null; }
        },
        isSignedIn: function () { return !!Auth.token(); },
        save: function (tokenName, token, user) {
            if (tokenName) { CFG.tokenName = tokenName; storage('set', TOKEN_NAME_KEY, tokenName); }
            storage('set', Auth.tokenKey(), token);
            storage('set', Auth.userKey(), JSON.stringify(user || {}));
        },
        clear: function () {
            storage('remove', Auth.tokenKey());
            storage('remove', Auth.userKey());
        }
    };

    function apiError(message, extra) {
        var error = new Error(message);
        Object.keys(extra || {}).forEach(function (key) { error[key] = extra[key]; });
        return error;
    }

    /* options: method, body (object -> JSON, FormData as-is), auth (send Bearer token), signal */
    function api(path, options) {
        options = options || {};
        if (CFG.demo && window.RubicDemo) {
            return Promise.resolve().then(function () { return window.RubicDemo.handle(path, options); });
        }
        var init = { method: options.method || 'GET', headers: { Accept: 'application/json' } };
        if (options.signal) init.signal = options.signal;
        if (options.auth) {
            var token = Auth.token();
            if (!token) return Promise.reject(apiError('Please sign in to continue.', { auth: true }));
            init.headers.Authorization = 'Bearer ' + token;
        }
        if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
            init.body = options.body;
        } else if (options.body) {
            init.headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(options.body);
        }
        return fetch(trimSlash(CFG.api) + path, init).then(function (response) {
            var denied = response.status === 401 || response.status === 403;
            return response.json().catch(function () { return null; }).then(function (json) {
                if (!json) throw apiError('The blog service did not return data (HTTP ' + response.status + ').', { auth: denied });
                /* responseCategory arrives as both "200" and 200 */
                if (Number(json.responseCategory) !== 200) {
                    var message = json.responseResult || 'Request failed.';
                    throw apiError(message, {
                        code: Number(json.responseCode) || 0,
                        auth: denied || /token|unauthori[sz]ed|not published to this route|sign ?in|log ?in/i.test(message)
                    });
                }
                return json.responseData;
            });
        });
    }

    function query(params) {
        var q = new URLSearchParams();
        Object.keys(params).forEach(function (key) {
            if (params[key] !== '' && params[key] !== null && params[key] !== undefined) q.set(key, params[key]);
        });
        return q.toString();
    }

    /* ---------- safe HTML for post bodies (allow-list) ---------- */

    var ALLOWED = ['P', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'STRONG', 'B', 'EM', 'I', 'U', 'S',
        'A', 'BR', 'HR', 'IMG', 'FIGURE', 'FIGCAPTION', 'PRE', 'CODE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
        'SPAN', 'DIV', 'SUB', 'SUP', 'MARK', 'CITE', 'SMALL'];
    var DROPPED = ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT',
        'SVG', 'MATH', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META', 'BASE', 'AUDIO', 'VIDEO'];

    function safeLink(href) {
        try {
            var url = new URL(href, window.location.href);
            return ['http:', 'https:', 'mailto:'].indexOf(url.protocol) !== -1 ? url.href : '';
        } catch (e) { return ''; }
    }

    function sanitizeNode(node) {
        [].slice.call(node.childNodes).forEach(function (child) {
            if (child.nodeType === 3) return;
            if (child.nodeType !== 1) { node.removeChild(child); return; }

            var tag = child.tagName.toUpperCase(); /* SVG/MathML elements report lowercase names */
            if (DROPPED.indexOf(tag) !== -1) { node.removeChild(child); return; }

            sanitizeNode(child);

            if (tag === 'H1') {
                var h2 = document.createElement('h2');
                while (child.firstChild) h2.appendChild(child.firstChild);
                node.replaceChild(h2, child);
                return;
            }
            if (ALLOWED.indexOf(tag) === -1) {
                while (child.firstChild) node.insertBefore(child.firstChild, child);
                node.removeChild(child);
                return;
            }

            var keep = {};
            if (tag === 'A') {
                var href = safeLink(child.getAttribute('href') || '');
                if (href) { keep.href = href; keep.rel = 'noopener noreferrer'; if (/^https?:/i.test(href) && href.indexOf(window.location.origin) !== 0) keep.target = '_blank'; }
            } else if (tag === 'IMG') {
                var src = child.getAttribute('src') || '';
                if (!/^(https?:)?\/\//i.test(src) && !/^[a-z][a-z0-9+.-]*:/i.test(src)) src = assetUrl(src);
                else if (!/^(https?:)?\/\//i.test(src)) src = '';
                if (!src) { node.removeChild(child); return; }
                keep.src = src; keep.alt = child.getAttribute('alt') || ''; keep.loading = 'lazy';
            } else if (tag === 'TD' || tag === 'TH') {
                ['colspan', 'rowspan'].forEach(function (name) { if (/^\d+$/.test(child.getAttribute(name) || '')) keep[name] = child.getAttribute(name); });
            }
            [].slice.call(child.attributes).forEach(function (attr) { child.removeAttribute(attr.name); });
            Object.keys(keep).forEach(function (name) { child.setAttribute(name, keep[name]); });
        });
    }

    function sanitizeHtml(html) {
        var doc = new DOMParser().parseFromString('<body>' + String(html || '') + '</body>', 'text/html');
        sanitizeNode(doc.body);
        return doc.body;
    }

    /* ---------- shared UI ---------- */

    function firstImage(post) {
        var media = Array.isArray(post.media) ? post.media : [];
        for (var i = 0; i < media.length; i++) {
            var item = media[i];
            if (item && item.storagePath && (!item.mimeType || /^image\//.test(item.mimeType))) return item;
        }
        return null;
    }

    function postLink(post) { return pageUrl(ROUTES.post, { slug: post.slug, demo: CFG.demo ? 1 : '' }); }

    function metaLine(post) {
        return [post.category, formatDate(post.date)].filter(Boolean).join(' • ');
    }

    function categoryLink(post) {
        return pageUrl(ROUTES.category, { category: post.categoryId, demo: CFG.demo ? 1 : '' });
    }

    /* "Category • date" with the category linking to its archive */
    function metaNode(post, className) {
        var parts = [];
        if (post.category && post.categoryId) parts.push(el('a', { class: 'rb-meta-link', href: categoryLink(post), text: post.category }));
        else if (post.category) parts.push(post.category);
        var date = formatDate(post.date);
        if (date) { if (parts.length) parts.push(' • '); parts.push(date); }
        return el('p', { class: className }, parts);
    }

    function coverImage(post, className) {
        var image = firstImage(post);
        if (!image) return null;
        return el('img', { src: assetUrl(image.storagePath), alt: image.altText || '', loading: 'lazy', decoding: 'async', class: className });
    }

    function card(post) {
        var img = coverImage(post);
        var title = post.title || 'Untitled post';
        return el('article', { class: 'rb-card' }, [
            el('a', { class: 'rb-card__media', href: postLink(post), tabindex: '-1', 'aria-hidden': 'true' }, [img]),
            metaNode(post, 'rb-card__meta'),
            el('h2', { class: 'rb-card__title' }, [el('a', { href: postLink(post), text: title })]),
            post.excerpt ? el('p', { class: 'rb-card__excerpt', text: post.excerpt }) : null,
            el('a', { class: 'rb-more', href: postLink(post) }, ['Read more'])
        ]);
    }

    function skeletonCard() {
        return el('div', { class: 'rb-card rb-card--skeleton', 'aria-hidden': 'true' }, [
            el('div', { class: 'rb-card__media' }),
            el('div', { class: 'rb-skel-line rb-skel-line--short' }),
            el('div', { class: 'rb-skel-line' })
        ]);
    }

    function showStatus(node, message, retry) {
        node.textContent = '';
        node.classList.toggle('rb-status--error', !!retry);
        if (!message) return;
        node.appendChild(document.createTextNode(message));
        if (retry) node.appendChild(el('button', { type: 'button', text: 'Try again' })).addEventListener('click', retry);
    }

    /* transient message; type: 'success' | 'error' */
    function toast(message, type) {
        var region = $('.rb-toasts');
        if (!region) {
            region = el('div', { class: 'rb-toasts', role: 'status', 'aria-live': 'polite' });
            document.body.appendChild(region);
        }
        var item = el('div', { class: 'rb-toast rb-toast--' + (type || 'success'), text: message });
        region.appendChild(item);
        setTimeout(function () { if (item.parentNode) item.parentNode.removeChild(item); }, type === 'error' ? 6000 : 3500);
    }

    /* confirmation dialog -> Promise<boolean>. options: title, message, confirmText, danger */
    function ask(options) {
        return new Promise(function (resolve) {
            var overlay = el('div', { class: 'rb-dialog-overlay' });
            var confirmBtn = el('button', { type: 'button', class: 'rb-btn ' + (options.danger ? 'rb-btn--danger' : 'rb-btn--primary'), text: options.confirmText || 'Confirm' });
            var cancelBtn = el('button', { type: 'button', class: 'rb-btn rb-btn--ghost', text: 'Cancel' });
            var dialog = el('div', { class: 'rb-dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'rbDialogTitle' }, [
                el('h2', { class: 'rb-dialog__title', id: 'rbDialogTitle', text: options.title || 'Are you sure?' }),
                options.message ? el('p', { class: 'rb-dialog__text', text: options.message }) : null,
                el('div', { class: 'rb-dialog__actions' }, [cancelBtn, confirmBtn])
            ]);
            overlay.appendChild(dialog);
            var previous = document.activeElement;

            function close(result) {
                document.removeEventListener('keydown', onKey);
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if (previous && previous.focus) previous.focus();
                resolve(result);
            }
            function onKey(event) { if (event.key === 'Escape') close(false); }
            confirmBtn.addEventListener('click', function () { close(true); });
            cancelBtn.addEventListener('click', function () { close(false); });
            overlay.addEventListener('click', function (event) { if (event.target === overlay) close(false); });
            document.addEventListener('keydown', onKey);
            document.body.appendChild(overlay);
            (options.danger ? cancelBtn : confirmBtn).focus();
        });
    }

    function go(route, params) { window.location.href = pageUrl(route, Object.assign({ demo: CFG.demo ? 1 : '' }, params || {})); }

    function signOut() {
        Auth.clear();
        go(ROUTES.blog);
    }

    /* ---------- header ---------- */

    function initHeader() {
        var toggle = $('[data-rb-nav-toggle]');
        var nav = $('#rbNav');
        if (toggle && nav) {
            toggle.addEventListener('click', function () {
                var open = nav.classList.toggle('is-open');
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        }

        var account = $('[data-rb-account]');
        if (!account) return;
        account.textContent = '';
        if (Auth.isSignedIn()) {
            var out = el('button', { type: 'button', class: 'rb-nav__link', text: 'Sign out' });
            out.addEventListener('click', signOut);
            account.appendChild(el('a', { href: pageUrl(ROUTES.dashboard, { demo: CFG.demo ? 1 : '' }), text: 'Dashboard' }));
            account.appendChild(out);
        } else {
            account.appendChild(el('a', { href: pageUrl(ROUTES.signin, { demo: CFG.demo ? 1 : '' }), text: 'Sign in' }));
        }
    }

    /* shared with Account.js, Admin.js and PostEditor.js */
    window.RubicCore = {
        CFG: CFG, ROUTES: ROUTES, Auth: Auth, api: api, el: el, $: $, query: query, pageUrl: pageUrl, go: go,
        assetUrl: assetUrl, firstImage: firstImage, formatDate: formatDate, formatDateLong: formatDateLong,
        slugify: slugify, debounce: debounce, showStatus: showStatus, sanitizeHtml: sanitizeHtml,
        toast: toast, ask: ask, signOut: signOut, postLink: postLink,
        card: card, skeletonCard: skeletonCard, coverImage: coverImage, categoryLink: categoryLink, metaNode: metaNode
    };

    /* ---------- listing ---------- */

    function initBlog(root) {
        var grid = $('[data-rb-grid]', root);
        var heroSlot = $('[data-rb-hero]', root);
        var chips = $('[data-rb-chips]', root);
        var pager = $('[data-rb-pager]', root);
        var status = $('[data-rb-status]', root);
        var searchForm = $('[data-rb-search-form]', root);
        var search = $('[data-rb-search]', root);

        var params = new URLSearchParams(window.location.search);
        var state = {
            page: Math.max(1, parseInt(params.get('page'), 10) || 1),
            category: params.get('category') || '',
            q: params.get('q') || ''
        };
        var controller = null;
        var categoryMode = root.getAttribute('data-rb-mode') === 'category';
        search.value = state.q;

        function syncUrl() {
            var qs = query({ category: state.category, q: state.q, page: state.page > 1 ? state.page : '', demo: CFG.demo ? 1 : '' });
            window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
        }

        function renderChips(categories) {
            chips.textContent = '';
            var all = [{ ltId: '', categoryName: 'All posts' }].concat(categories);
            all.forEach(function (category) {
                var id = category.ltId === '' ? '' : String(category.ltId);
                var chip = el('button', { type: 'button', class: 'rb-chip', 'aria-pressed': id === state.category ? 'true' : 'false', text: category.categoryName });
                chip.addEventListener('click', function () {
                    state.category = id; state.page = 1; load();
                    [].forEach.call(chips.children, function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
                });
                chips.appendChild(chip);
            });
        }

        function renderHero(post) {
            heroSlot.textContent = '';
            if (!post) { heroSlot.hidden = true; return; }
            var img = coverImage(post);
            heroSlot.appendChild(el('article', { class: 'rb-hero' }, [
                el('div', { class: 'rb-hero__body' }, [
                    metaNode(post, 'rb-hero__meta'),
                    el('h2', { class: 'rb-hero__title' }, [el('a', { href: postLink(post), text: post.title || 'Untitled post' })]),
                    post.excerpt ? el('p', { class: 'rb-hero__excerpt', text: post.excerpt }) : null,
                    el('a', { class: 'rb-more', href: postLink(post) }, ['Read more'])
                ]),
                img ? el('div', { class: 'rb-hero__media' }, [img]) : null
            ]));
            heroSlot.hidden = false;
        }

        function pageNumbers(current, total) {
            var pages = [];
            for (var i = 1; i <= total; i++) {
                if (i === 1 || i === total || Math.abs(i - current) <= 1) pages.push(i);
                else if (pages[pages.length - 1] !== '…') pages.push('…');
            }
            return pages;
        }

        function renderPager(info) {
            pager.textContent = '';
            var total = info && Number(info.totalPages) || 1;
            if (total <= 1) { pager.hidden = true; return; }
            var current = Number(info.currentPage) || state.page;

            function go(page) { state.page = page; load(true); }
            var prev = el('button', { type: 'button', 'aria-label': 'Previous page', text: '←' });
            prev.disabled = current <= 1;
            prev.addEventListener('click', function () { go(current - 1); });
            pager.appendChild(prev);

            pageNumbers(current, total).forEach(function (page) {
                if (page === '…') { pager.appendChild(el('span', { class: 'rb-pager__gap', text: '…' })); return; }
                var button = el('button', { type: 'button', text: String(page), 'aria-label': 'Page ' + page, 'aria-current': page === current ? 'page' : false });
                button.addEventListener('click', function () { go(page); });
                pager.appendChild(button);
            });

            var next = el('button', { type: 'button', 'aria-label': 'Next page', text: '→' });
            next.disabled = current >= total;
            next.addEventListener('click', function () { go(current + 1); });
            pager.appendChild(next);
            pager.hidden = false;
        }

        function load(scroll) {
            if (controller) controller.abort();
            controller = window.AbortController ? new AbortController() : null;
            var mine = controller;

            if (categoryMode && !state.category) {
                grid.textContent = ''; grid.setAttribute('aria-busy', 'false'); pager.hidden = true;
                showStatus(status, 'Choose a category from the journal.');
                return;
            }

            grid.setAttribute('aria-busy', 'true');
            grid.textContent = '';
            for (var i = 0; i < 6; i++) grid.appendChild(skeletonCard());
            showStatus(status, '');
            syncUrl();

            var unfiltered = state.page === 1 && !state.category && !state.q;
            var request = '/blogs/filter/posts?' + query({ page: state.page, limit: PAGE_SIZE, category: state.category, q: state.q });

            api(request, { signal: mine && mine.signal }).then(function (data) {
                if (mine !== controller) return;
                var posts = data && Array.isArray(data.data) ? data.data : [];
                var hero = null;
                if (unfiltered && posts.length) {
                    hero = posts.filter(function (p) { return Number(p.isFeatured) === 1; })[0] || posts[0];
                    posts = posts.filter(function (p) { return p !== hero; });
                }
                renderHero(hero);
                grid.textContent = '';
                posts.forEach(function (post) { grid.appendChild(card(post)); });
                grid.setAttribute('aria-busy', 'false');
                renderPager(data && data.pagination);
                if (!posts.length && !hero) showStatus(status, state.q || state.category ? 'No posts match your search.' : 'No posts have been published yet.');
                if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
            }).catch(function (error) {
                if (error && error.name === 'AbortError') return;
                if (mine !== controller) return;
                grid.textContent = '';
                grid.setAttribute('aria-busy', 'false');
                renderHero(null);
                pager.hidden = true;
                showStatus(status, error.message || 'Posts could not be loaded.', function () { load(); });
            });
        }

        searchForm.addEventListener('submit', function (event) { event.preventDefault(); });
        search.addEventListener('input', debounce(function () {
            state.q = search.value.trim(); state.page = 1; load();
        }, 350));

        api('/blogs/filter/categories?status=isActive').then(function (categories) {
            categories = Array.isArray(categories) ? categories : [];
            if (!categoryMode) { renderChips(categories); return; }
            if (!state.category) return;   /* "choose a category" is already showing */
            var current = categories.filter(function (c) { return String(c.ltId) === state.category; })[0];
            var heading = $('[data-rb-title]', root);
            if (current) {
                heading.textContent = current.categoryName;
                document.title = current.categoryName + (CFG.siteName ? ' — ' + CFG.siteName : '');
            } else {
                heading.textContent = 'Category not found';
                grid.textContent = '';
                showStatus(status, 'That category does not exist or is no longer available.');
            }
        }).catch(function () { if (!categoryMode) renderChips([]); });

        load();
    }

    /* ---------- article ---------- */

    function initPost(root) {
        var status = $('[data-rb-status]', root);
        var article = $('[data-rb-article]', root);
        var params = new URLSearchParams(window.location.search);
        var slug = params.get('slug') || '';
        var listUrl = pageUrl(ROUTES.blog, { demo: CFG.demo ? 1 : '' });

        [].forEach.call(root.querySelectorAll('[data-rb-back], [data-rb-all]'), function (a) { a.setAttribute('href', listUrl); });

        if (!slug) {
            showStatus(status, 'This article could not be found.');
            return;
        }

        api('/blogs/posts/' + encodeURIComponent(slug) + '/slug').then(function (post) {
            if (!post || !post.title) throw new Error('This article could not be found.');
            renderPost(post);
        }).catch(function (error) {
            showStatus(status, error.message || 'This article could not be loaded.');
        });

        function setText(selector, value) { $(selector, root).textContent = value || ''; }

        function renderPost(post) {
            document.title = post.title + (CFG.siteName ? ' — ' + CFG.siteName : '');
            var description = $('meta[name="description"]') || document.head.appendChild(el('meta', { name: 'description' }));
            description.setAttribute('content', post.excerpt || '');

            setText('[data-rb-title]', post.title);
            var authorNode = $('[data-rb-author]', root);
            authorNode.textContent = '';
            if (post.authorId) authorNode.appendChild(el('a', { class: 'rb-meta-link', href: pageUrl(ROUTES.author, { id: post.authorId, demo: CFG.demo ? 1 : '' }), text: post.author || 'Author' }));
            else authorNode.textContent = post.author || '';
            setText('[data-rb-date]', formatDateLong(post.date));
            setText('[data-rb-reading]', post.readingTime ? post.readingTime + ' minutes' : '');
            var categoryNode = $('[data-rb-category]', root);
            categoryNode.textContent = '';
            if (post.category && post.categoryId) categoryNode.appendChild(el('a', { class: 'rb-meta-link', href: categoryLink(post), text: post.category }));
            else categoryNode.textContent = post.category || '';

            var image = firstImage(post);
            if (image) {
                var hero = $('[data-rb-hero-img]', root);
                hero.src = assetUrl(image.storagePath);
                hero.alt = image.altText || '';
                setText('[data-rb-hero-caption]', image.altText);
                $('[data-rb-hero]', root).hidden = false;
            }

            var body = $('[data-rb-content]', root);
            body.textContent = '';
            [].slice.call(sanitizeHtml(post.content).childNodes).forEach(function (node) { body.appendChild(node); });

            buildToc(body);
            buildShare(post);

            showStatus(status, '');
            article.hidden = false;

            countView(slug);
            loadRelated(post);
            /* later scripts (Reader.js) may load after this runs, so keep the post as well as announcing it */
            window.RubicCore.currentPost = post;
            document.dispatchEvent(new CustomEvent('rb:post', { detail: post }));
        }

        function buildToc(body) {
            var headings = [].slice.call(body.querySelectorAll('h2, h3'));
            if (headings.length < 2) return;
            var used = {};
            var list = $('[data-rb-toc]', root);
            var links = [];
            headings.forEach(function (heading) {
                var base = slugify(heading.textContent), id = base, n = 2;
                while (used[id]) id = base + '-' + n++;
                used[id] = true;
                heading.id = id;
                var link = el('a', { href: '#' + id, text: heading.textContent });
                list.appendChild(el('li', {}, [link]));
                links.push({ id: id, link: link, heading: heading });
            });
            $('[data-rb-toc-block]', root).hidden = false;

            if (!('IntersectionObserver' in window)) return;
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    links.forEach(function (item) {
                        if (item.heading === entry.target) item.link.setAttribute('aria-current', 'true');
                        else item.link.removeAttribute('aria-current');
                    });
                });
            }, { rootMargin: '-15% 0px -75% 0px' });
            links.forEach(function (item) { observer.observe(item.heading); });
        }

        function buildShare(post) {
            var list = $('[data-rb-share]', root);
            var url = window.location.href.split('#')[0];
            var title = post.title;

            var copy = el('button', { type: 'button', text: 'Copy link' });
            copy.addEventListener('click', function () {
                var done = function () { copy.textContent = 'Link copied'; setTimeout(function () { copy.textContent = 'Copy link'; }, 2000); };
                if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () {});
                else { var tmp = el('textarea', { readonly: true }); tmp.value = url; document.body.appendChild(tmp); tmp.select(); try { document.execCommand('copy'); done(); } catch (e) {} document.body.removeChild(tmp); }
            });
            list.appendChild(el('li', {}, [copy]));

            [
                ['LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url)],
                ['X', 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title)],
                ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url)]
            ].forEach(function (item) {
                list.appendChild(el('li', {}, [el('a', { href: item[1], target: '_blank', rel: 'noopener noreferrer', text: item[0] })]));
            });
        }

        function countView(currentSlug) {
            if (CFG.demo) return;
            var key = 'rb-viewed-' + currentSlug;
            try { if (window.sessionStorage.getItem(key)) return; window.sessionStorage.setItem(key, '1'); } catch (e) { /* storage unavailable: count anyway */ }
            api('/blogs/posts/view-update', { method: 'POST', body: { slug: currentSlug } }).catch(function () {});
        }

        function loadRelated(post) {
            var request = '/blogs/posts/widget?' + query({ type: 'related', limit: 3, postId: post.ltId, categoryId: post.categoryId });
            api(request).then(function (items) {
                var related = (Array.isArray(items) ? items : []).filter(function (p) { return p.slug !== post.slug; }).slice(0, 3);
                if (!related.length) return;
                var grid = $('[data-rb-related-grid]', root);
                related.forEach(function (item) { grid.appendChild(card(item)); });
                $('[data-rb-related]', root).hidden = false;
            }).catch(function () { /* related posts are optional */ });
        }
    }

    /* ---------- boot ---------- */

    initHeader();

    /* management pages need a signed-in user; later modules check RubicCore.blocked */
    if ($('[data-rb-page^="admin-"]') && !Auth.isSignedIn()) {
        window.RubicCore.blocked = true;
        go(ROUTES.signin, { next: window.location.pathname + window.location.search });
    }

    var blog = $('[data-rb-page="blog"]');
    var post = $('[data-rb-page="post"]');
    if (blog) initBlog(blog);
    if (post) initPost(post);
})();
