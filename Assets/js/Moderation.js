/* ThemeRubicBlog: comment and report moderation. Needs Script.js (window.RubicCore). */
(function () {
    'use strict';

    var core = window.RubicCore;
    if (!core || core.blocked) return;

    var root = core.$('[data-rb-page="admin-moderation"]');
    if (!root) return;

    var el = core.el, $ = core.$, api = core.api;

    var BATCH = 25;

    function flatten(list, out) {
        out = out || [];
        (list || []).forEach(function (item) {
            var copy = Object.assign({}, item);
            delete copy.replies;
            out.push(copy);
            flatten(item.replies, out);
        });
        return out;
    }

    function excerpt(text, max) {
        text = String(text || '').replace(/\s+/g, ' ').trim();
        return text.length > max ? text.slice(0, max - 1) + '…' : text;
    }

    var KINDS = {
        comments: {
            singular: 'comment', plural: 'comments',
            list: '/blogs/comments', update: '/blogs/comments/update-status', remove: function (id) { return '/blogs/comments/' + encodeURIComponent(id); },
            statuses: [['pending', 'Pending'], ['approved', 'Approved'], ['spam', 'Spam'], ['deleted', 'Deleted']],
            columns: ['Comment', 'Reader', 'Status', 'Likes', 'Date'],
            search: function (row) { return [row.body, row.commentedBy, row.title].join(' '); },
            cells: function (row) {
                var onPost = row.postSlug
                    ? el('a', { href: core.pageUrl(core.ROUTES.post, { slug: row.postSlug, demo: core.CFG.demo ? 1 : '' }), target: '_blank', rel: 'noopener', text: row.title || row.postSlug })
                    : document.createTextNode(row.title || '');
                return {
                    lead: el('td', { class: 'rb-table__title rb-table__title--wrap' }, [
                        el('span', { class: 'rb-table__name rb-table__name--wrap', text: (row.parentId ? '↳ ' : '') + excerpt(row.body, 160) }),
                        el('span', { class: 'rb-table__sub rb-table__sub--wrap' }, [document.createTextNode('on '), onPost])
                    ]),
                    rest: [
                        el('td', { class: 'rb-nowrap', text: row.commentedBy || '—' })
                    ],
                    tail: [
                        el('td', { class: 'rb-num', text: String(Number(row.likes) || 0) }),
                        el('td', { class: 'rb-nowrap', text: core.formatDate(row.createdAt) })
                    ]
                };
            }
        },
        reports: {
            singular: 'report', plural: 'reports',
            list: '/blogs/reports', update: '/blogs/reports/update-status', remove: function (id) { return '/blogs/reports/' + encodeURIComponent(id); },
            statuses: [['pending', 'Pending'], ['reviewed', 'Reviewed'], ['dismissed', 'Dismissed'], ['action_taken', 'Action taken']],
            columns: ['Article', 'Reason', 'Reported by', 'Status', 'Date'],
            search: function (row) { return [row.title, row.reason, row.comments, row.reportedBy, row.postAuthor].join(' '); },
            cells: function (row) {
                var link = row.postSlug
                    ? el('a', { href: core.pageUrl(core.ROUTES.post, { slug: row.postSlug, demo: core.CFG.demo ? 1 : '' }), target: '_blank', rel: 'noopener', text: row.title || row.postSlug })
                    : document.createTextNode(row.title || 'Article');
                var reason = String(row.reason || '').replace(/_/g, ' ');
                return {
                    lead: el('td', { class: 'rb-table__title rb-table__title--wrap' }, [
                        el('span', { class: 'rb-table__name rb-table__name--wrap' }, [link]),
                        row.comments ? el('span', { class: 'rb-table__sub rb-table__sub--wrap', text: excerpt(row.comments, 160) }) : null
                    ]),
                    rest: [
                        el('td', { class: 'rb-cap', text: reason ? reason.charAt(0).toUpperCase() + reason.slice(1) : '—' }),
                        el('td', { class: 'rb-nowrap', text: row.reportedBy || '—' })
                    ],
                    tail: [el('td', { class: 'rb-nowrap', text: core.formatDate(row.createdAt) })]
                };
            }
        }
    };

    var kind = KINDS[root.getAttribute('data-rb-kind')];
    if (!kind) return;

    var status = $('[data-rb-status]', root);
    var wrap = $('[data-rb-tablewrap]', root);
    var head = $('[data-rb-head]', root);
    var rows = $('[data-rb-rows]', root);
    var search = $('[data-rb-search]', root);
    var statusFilter = $('[data-rb-status-filter]', root);
    var countLabel = $('[data-rb-count]', root);

    var items = [];
    var shown = BATCH;
    var more = el('button', { type: 'button', class: 'rb-btn rb-btn--ghost rb-more-btn', text: 'Show more' });
    more.hidden = true;
    wrap.parentNode.insertBefore(more, wrap.nextSibling);

    function statusLabel(value) {
        var found = kind.statuses.filter(function (s) { return s[0] === value; })[0];
        return found ? found[1] : (value || 'Unknown');
    }

    function visible() {
        var term = search.value.trim().toLowerCase();
        var wanted = statusFilter.value;
        return items.filter(function (row) {
            if (wanted && row.status !== wanted) return false;
            return !term || kind.search(row).toLowerCase().indexOf(term) !== -1;
        });
    }

    function renderHead() {
        var tr = el('tr');
        kind.columns.forEach(function (label) { tr.appendChild(el('th', { scope: 'col', class: label === 'Likes' ? 'rb-num' : false, text: label })); });
        tr.appendChild(el('th', { scope: 'col' }, [el('span', { class: 'rb-sr', text: 'Actions' })]));
        head.appendChild(tr);
    }

    function statusSelect(row) {
        var select = el('select', { class: 'rb-input rb-input--inline', 'aria-label': 'Status of this ' + kind.singular },
            kind.statuses.map(function (s) { return el('option', { value: s[0], text: s[1] }); }));
        select.value = row.status;
        select.className += ' rb-status-select rb-status-select--' + row.status;
        select.addEventListener('change', function () {
            var previous = row.status;
            var next = select.value;
            select.disabled = true;
            api(kind.update, { method: 'POST', auth: true, body: { ltId: row.ltId, status: next } }).then(function () {
                row.status = next;
                select.className = 'rb-input rb-input--inline rb-status-select rb-status-select--' + next;
                core.toast('Marked as ' + statusLabel(next).toLowerCase() + '.');
                if (statusFilter.value) render();
            }).catch(function (error) {
                select.value = previous;
                core.toast(error.message || 'The status could not be changed.', 'error');
            }).then(function () { select.disabled = false; });
        });
        return select;
    }

    function removeRow(row) {
        core.ask({ title: 'Delete this ' + kind.singular + '?', message: 'It will be removed permanently.', confirmText: 'Delete ' + kind.singular, danger: true }).then(function (yes) {
            if (!yes) return;
            api(kind.remove(row.ltId), { method: 'DELETE', auth: true }).then(function () {
                items = items.filter(function (r) { return String(r.ltId) !== String(row.ltId); });
                render();
                core.toast(kind.singular.charAt(0).toUpperCase() + kind.singular.slice(1) + ' deleted.');
            }).catch(function (error) { core.toast(error.message || 'It could not be deleted.', 'error'); });
        });
    }

    function render() {
        rows.textContent = '';
        var list = visible();
        countLabel.textContent = items.length ? list.length + ' of ' + items.length + ' ' + kind.plural : '';
        if (!list.length) {
            wrap.hidden = true;
            more.hidden = true;
            core.showStatus(status, items.length ? 'Nothing matches your filters.' : 'No ' + kind.plural + ' yet.');
            return;
        }
        core.showStatus(status, '');
        wrap.hidden = false;

        list.slice(0, shown).forEach(function (row) {
            var parts = kind.cells(row);
            var del = el('button', { type: 'button', class: 'rb-link rb-link--danger', text: 'Delete' });
            del.addEventListener('click', function () { removeRow(row); });
            var cells = [parts.lead].concat(parts.rest, [el('td', {}, [statusSelect(row)])], parts.tail, [el('td', {}, [el('div', { class: 'rb-actions' }, [del])])]);
            rows.appendChild(el('tr', {}, cells));
        });
        more.hidden = list.length <= shown;
    }

    function load() {
        core.showStatus(status, 'Loading…');
        wrap.hidden = true;
        api(kind.list, { auth: true }).then(function (data) {
            items = kind.plural === 'comments' ? flatten(Array.isArray(data) ? data : []) : (Array.isArray(data) ? data : []);
            render();
        }).catch(function (error) {
            if (error.code === 101) { items = []; render(); return; }
            core.showStatus(status, error.message || 'The ' + kind.plural + ' could not be loaded.');
            status.classList.add('rb-status--error');
        });
    }

    renderHead();
    more.addEventListener('click', function () { shown += BATCH; render(); });
    search.addEventListener('input', core.debounce(function () { shown = BATCH; render(); }, 200));
    statusFilter.addEventListener('change', function () { shown = BATCH; render(); });
    load();
})();
