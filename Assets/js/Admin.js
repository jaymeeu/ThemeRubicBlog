/* ThemeRubicBlog: management shell, dashboard and post list. Needs Script.js (window.RubicCore). */
(function () {
    'use strict';

    var core = window.RubicCore;
    if (!core || core.blocked) return;

    var el = core.el, $ = core.$, api = core.api, Auth = core.Auth, ROUTES = core.ROUTES;

    function number(value) { return new Intl.NumberFormat().format(Number(value) || 0); }

    function fail(status, error, fallback) {
        core.showStatus(status, error && error.message ? error.message : fallback);
        status.classList.add('rb-status--error');
    }

    /* ---------- shell: sidebar, signed-in user ---------- */

    function showUser(person) {
        var box = $('[data-rb-user]');
        if (!box) return;
        var name = (person && (person.fullname || person.username)) || '';
        if (!name) return;
        $('[data-rb-user-name]', box).textContent = name;
        $('[data-rb-user-initial]', box).textContent = name.charAt(0).toUpperCase();
        box.hidden = false;
    }

    core.refreshUser = function (person) {
        var stored = Auth.user() || {};
        if (person && (person.fullname || person.username)) {
            stored.fullname = person.fullname || stored.fullname;
            stored.username = person.username || stored.username;
            Auth.save(null, Auth.token(), stored);
        }
        showUser(stored);
    };

    function initShell() {
        var toggle = $('[data-rb-side-toggle]');
        var side = $('#rbAdminSide');
        if (toggle && side) {
            toggle.addEventListener('click', function () {
                var open = side.classList.toggle('is-open');
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        }

        var out = $('[data-rb-signout]');
        if (out) out.addEventListener('click', core.signOut);
        showUser(Auth.user());

        var current = window.location.pathname.replace(/\/+$/, '').split('/').pop().toLowerCase();
        [].forEach.call(document.querySelectorAll('[data-rb-side-nav] [data-rb-route]'), function (link) {
            if (link.getAttribute('data-rb-route').toLowerCase() === current) link.setAttribute('aria-current', 'page');
        });
    }

    /* ---------- dashboard ---------- */

    function initDashboard(root) {
        var status = $('[data-rb-status]', root);
        var wrap = $('[data-rb-dashboard]', root);

        api('/blogs/admin/dashboard-metrics', { auth: true }).then(function (data) {
            data = data || {};
            var cards = data.cards || {};
            var stats = $('[data-rb-stats]', root);
            [
                ['Total views', cards.totalViews],
                ['Articles', cards.totalArticles],
                ['Comments', cards.totalComments],
                ['Categories and tags', cards.totalTaxonomies]
            ].forEach(function (item) {
                stats.appendChild(el('div', { class: 'rb-stat' }, [
                    el('p', { class: 'rb-stat__label', text: item[0] }),
                    el('p', { class: 'rb-stat__value', text: number(item[1]) })
                ]));
            });

            var alert = $('[data-rb-alert]', root);
            var pendingComments = Number(cards.pendingComments) || 0;
            var pendingReports = Number(cards.pendingReports) || 0;
            if (pendingComments || pendingReports) {
                var demo = core.CFG.demo ? 1 : '';
                alert.textContent = 'Needs attention: ';
                alert.appendChild(el('a', { href: core.pageUrl(ROUTES.comments, { demo: demo }), text: pendingComments + ' comment' + (pendingComments === 1 ? '' : 's') + ' awaiting approval' }));
                alert.appendChild(document.createTextNode(' and '));
                alert.appendChild(el('a', { href: core.pageUrl(ROUTES.reports, { demo: demo }), text: pendingReports + ' report' + (pendingReports === 1 ? '' : 's') + ' to review' }));
                alert.appendChild(document.createTextNode('.'));
                alert.hidden = false;
            }

            var trend = Array.isArray(data.trend) ? data.trend : [];
            var bars = $('[data-rb-trend]', root);
            if (!trend.length) {
                bars.hidden = true;
                $('[data-rb-trend-empty]', root).hidden = false;
            } else {
                var top = Math.max.apply(null, trend.map(function (t) { return Number(t.views) || 0; }).concat(1));
                trend.forEach(function (point) {
                    var bar = el('div', { class: 'rb-bars__bar', title: (point.label || '') + ': ' + number(point.views) + ' views' });
                    bar.style.height = Math.max(6, Math.round(((Number(point.views) || 0) / top) * 100)) + '%';
                    bars.appendChild(el('div', { class: 'rb-bars__col' }, [bar, el('span', { class: 'rb-bars__label', text: point.label || '' })]));
                });
            }

            var categories = Array.isArray(data.topCategories) ? data.topCategories : [];
            var list = $('[data-rb-categories]', root);
            if (!categories.length) {
                list.hidden = true;
                $('[data-rb-categories-empty]', root).hidden = false;
            } else {
                var max = Math.max.apply(null, categories.map(function (c) { return Number(c.viewCount) || 0; }).concat(1));
                categories.forEach(function (category) {
                    var meter = el('div', { class: 'rb-meter__fill' });
                    meter.style.width = Math.round(((Number(category.viewCount) || 0) / max) * 100) + '%';
                    list.appendChild(el('li', {}, [
                        el('div', { class: 'rb-meter__head' }, [
                            el('span', { text: category.name || 'Untitled' }),
                            el('span', { class: 'rb-meter__value', text: number(category.viewCount) + ' views' })
                        ]),
                        el('div', { class: 'rb-meter' }, [meter])
                    ]));
                });
            }

            core.showStatus(status, '');
            wrap.hidden = false;
        }).catch(function (error) { fail(status, error, 'The dashboard could not be loaded.'); });
    }

    /* ---------- posts list ---------- */

    var STATUS_LABEL = { published: 'Published', draft: 'Draft', pending: 'Pending', scheduled: 'Scheduled', private: 'Private', archived: 'Archived' };
    var PAGE_SIZE = 15;

    function initPosts(root) {
        var status = $('[data-rb-status]', root);
        var wrap = $('[data-rb-tablewrap]', root);
        var rows = $('[data-rb-rows]', root);
        var pager = $('[data-rb-pager]', root);
        var search = $('[data-rb-search]', root);
        var statusFilter = $('[data-rb-status-filter]', root);
        var scope = $('[data-rb-scope]', root);

        var state = { posts: [], page: 1, term: '' };
        var categories = {};
        var me = Auth.user() || {};

        function visible() {
            var term = state.term.toLowerCase();
            return state.posts.filter(function (post) { return !term || String(post.title || '').toLowerCase().indexOf(term) !== -1; });
        }

        function badge(value) {
            return el('span', { class: 'rb-badge rb-badge--' + String(value || 'draft'), text: STATUS_LABEL[value] || value || 'Draft' });
        }

        function remove(post) {
            core.ask({ title: 'Delete this post?', message: '“' + (post.title || 'Untitled') + '” and its images will be removed permanently.', confirmText: 'Delete post', danger: true }).then(function (yes) {
                if (!yes) return;
                api('/blogs/posts/' + encodeURIComponent(post.ltId), { method: 'DELETE', auth: true }).then(function () {
                    state.posts = state.posts.filter(function (p) { return String(p.ltId) !== String(post.ltId); });
                    render();
                    core.toast('Post deleted.');
                }).catch(function (error) { core.toast(error.message || 'Post could not be deleted.', 'error'); });
            });
        }

        function pageNumbers(current, total) {
            var pages = [];
            for (var i = 1; i <= total; i++) {
                if (i === 1 || i === total || Math.abs(i - current) <= 1) pages.push(i);
                else if (pages[pages.length - 1] !== '…') pages.push('…');
            }
            return pages;
        }

        function renderPager(total) {
            pager.textContent = '';
            if (total <= 1) { pager.hidden = true; return; }
            function go(page) { state.page = page; render(); }
            var prev = el('button', { type: 'button', 'aria-label': 'Previous page', text: '←' });
            prev.disabled = state.page <= 1;
            prev.addEventListener('click', function () { go(state.page - 1); });
            pager.appendChild(prev);
            pageNumbers(state.page, total).forEach(function (page) {
                if (page === '…') { pager.appendChild(el('span', { class: 'rb-pager__gap', text: '…' })); return; }
                var button = el('button', { type: 'button', text: String(page), 'aria-label': 'Page ' + page, 'aria-current': page === state.page ? 'page' : false });
                button.addEventListener('click', function () { go(page); });
                pager.appendChild(button);
            });
            var next = el('button', { type: 'button', 'aria-label': 'Next page', text: '→' });
            next.disabled = state.page >= total;
            next.addEventListener('click', function () { go(state.page + 1); });
            pager.appendChild(next);
            pager.hidden = false;
        }

        function render() {
            var items = visible();
            var pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
            if (state.page > pages) state.page = pages;
            rows.textContent = '';

            if (!items.length) {
                wrap.hidden = true;
                pager.hidden = true;
                core.showStatus(status, state.posts.length ? 'No posts match your search.' : 'No posts yet. Write your first one with “New post”.');
                return;
            }
            core.showStatus(status, '');
            wrap.hidden = false;

            items.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE).forEach(function (post) {
                var editUrl = core.pageUrl(ROUTES.editor, { slug: post.slug, demo: core.CFG.demo ? 1 : '' });
                var actions = el('div', { class: 'rb-actions' }, [el('a', { class: 'rb-link', href: editUrl, text: 'Edit' })]);
                if (post.status === 'published') {
                    actions.appendChild(el('a', { class: 'rb-link', href: core.postLink(post), target: '_blank', rel: 'noopener', text: 'View' }));
                }
                var del = el('button', { type: 'button', class: 'rb-link rb-link--danger', text: 'Delete' });
                del.addEventListener('click', function () { remove(post); });
                actions.appendChild(del);

                rows.appendChild(el('tr', {}, [
                    el('td', { class: 'rb-table__title' }, [el('a', { href: editUrl, text: post.title || 'Untitled post' }), el('span', { class: 'rb-table__sub', text: '/' + (post.slug || '') })]),
                    el('td', { text: post.category || categories[String(post.categoryId)] || '—' }),
                    el('td', {}, [badge(post.status)]),
                    el('td', { class: 'rb-num', text: number(post.viewCount !== undefined ? post.viewCount : post.views) }),
                    el('td', { class: 'rb-num', text: number(post.commentCount !== undefined ? post.commentCount : post.comments) }),
                    el('td', {}, [actions])
                ]));
            });
            renderPager(pages);
        }

        function load() {
            core.showStatus(status, 'Loading…');
            wrap.hidden = true;
            pager.hidden = true;
            var request = '/blogs/posts?' + core.query({ status: statusFilter.value, id: scope.value === 'mine' ? (me.ltId || me.userId) : '' });
            api(request, { auth: true }).then(function (list) {
                state.posts = Array.isArray(list) ? list : [];
                state.page = 1;
                render();
            }).catch(function (error) {
                /* MdBlog answers an empty list with "No Post found" (code 101) */
                if (error.code === 101) { state.posts = []; render(); return; }
                fail(status, error, 'Posts could not be loaded.');
            });
        }

        api('/blogs/filter/categories').then(function (list) {
            (Array.isArray(list) ? list : []).forEach(function (c) { categories[String(c.ltId)] = c.categoryName; });
            if (state.posts.length) render();
        }).catch(function () { /* category names are optional here */ });

        search.addEventListener('input', core.debounce(function () { state.term = search.value.trim(); state.page = 1; render(); }, 200));
        statusFilter.addEventListener('change', load);
        scope.addEventListener('change', load);
        if (new URLSearchParams(window.location.search).get('saved')) core.toast('Post saved.');
        load();
    }

    /* ---------- boot ---------- */

    if ($('[data-rb-admin]')) initShell();
    var dashboard = $('[data-rb-page="admin-dashboard"]');
    var posts = $('[data-rb-page="admin-posts"]');
    if (dashboard) initDashboard(dashboard);
    if (posts) initPosts(posts);
})();
