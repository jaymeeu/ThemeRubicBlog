/* ThemeRubicBlog: Categories and Tags management. One generic screen driven by a small config per kind.
   Needs Script.js (window.RubicCore). */
(function () {
    'use strict';

    var core = window.RubicCore;
    if (!core || core.blocked) return;

    var root = core.$('[data-rb-page="admin-taxonomy"]');
    if (!root) return;

    var el = core.el, $ = core.$, api = core.api;

    var KINDS = {
        categories: {
            endpoint: '/blogs/categories',
            singular: 'category', plural: 'categories',
            nameKey: 'categoryName',
            fields: [
                { name: 'categoryName', label: 'Name', type: 'text', required: true, max: 120 },
                { name: 'categoryDescription', label: 'Description', type: 'textarea', hint: 'Optional. Shown in the admin only.' },
                { name: 'showOnMenu', label: 'Show in the site menu', type: 'checkbox', defaultValue: 1 }
            ],
            columns: ['Name', 'Menu', 'Status'],
            cells: function (item) {
                return [
                    el('td', { class: 'rb-table__title' }, [el('span', { class: 'rb-table__name', text: item.categoryName || 'Untitled' }), item.categoryDescription ? el('span', { class: 'rb-table__sub', text: item.categoryDescription }) : null]),
                    el('td', { text: Number(item.showOnMenu) === 1 ? 'Shown' : 'Hidden' })
                ];
            }
        },
        tags: {
            endpoint: '/blogs/tags',
            singular: 'tag', plural: 'tags',
            nameKey: 'tagName',
            fields: [
                { name: 'tagName', label: 'Name', type: 'text', required: true, max: 80 },
                { name: 'tagSlug', label: 'Slug', type: 'text', slugFrom: 'tagName', hint: 'Lowercase letters, numbers and hyphens. Filled in from the name.' },
                { name: 'tagColor', label: 'Colour', type: 'color', defaultValue: '#777777' },
                { name: 'tagDescription', label: 'Description', type: 'textarea', hint: 'Optional.' }
            ],
            columns: ['Name', 'Slug', 'Status'],
            cells: function (item) {
                var swatch = el('span', { class: 'rb-swatch', 'aria-hidden': 'true' });
                if (/^#[0-9a-f]{3,8}$/i.test(item.tagColor || '')) swatch.style.background = item.tagColor;
                return [
                    el('td', { class: 'rb-table__title' }, [el('span', { class: 'rb-table__name' }, [swatch, document.createTextNode(item.tagName || 'Untitled')]), item.tagDescription ? el('span', { class: 'rb-table__sub', text: item.tagDescription }) : null]),
                    el('td', { text: item.tagSlug ? item.tagSlug : '—' })
                ];
            }
        }
    };

    KINDS.settings = {
        endpoint: '/blogs/settings',
        singular: 'setting', plural: 'settings',
        nameKey: 'settingKey', nameField: 'settingName',
        fields: [
            { name: 'settingName', source: 'settingKey', label: 'Key', type: 'text', required: true, max: 100, createOnly: true, pattern: /^[A-Za-z0-9_.-]+$/, patternMessage: 'The key may only contain letters, numbers, underscores, dots and hyphens.', hint: 'Cannot be changed after it is created.' },
            { name: 'settingValue', label: 'Value', type: 'textarea' }
        ],
        columns: ['Key', 'Value', 'Status'],
        cells: function (item) {
            return [
                el('td', { class: 'rb-table__title' }, [el('span', { class: 'rb-table__name rb-mono', text: item.settingKey || '' })]),
                el('td', { class: 'rb-table__value', text: item.settingValue === null || item.settingValue === undefined ? '' : String(item.settingValue) })
            ];
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

    var items = [];

    function isActive(item) { return item.status !== 'isNotActive'; }
    function idOf(item) { return String(item.ltId); }

    function fail(message) { core.toast(message, 'error'); }

    /* ---------- list ---------- */

    function visible() {
        var term = search.value.trim().toLowerCase();
        var wanted = statusFilter.value;
        return items.filter(function (item) {
            if (wanted === 'isActive' && !isActive(item)) return false;
            if (wanted === 'isNotActive' && isActive(item)) return false;
            if (!term) return true;
            return [item[kind.nameKey], item.categoryDescription, item.tagDescription, item.tagSlug, item.settingValue].join(' ').toLowerCase().indexOf(term) !== -1;
        });
    }

    function renderHead() {
        head.textContent = '';
        var tr = el('tr');
        kind.columns.forEach(function (label) { tr.appendChild(el('th', { scope: 'col', text: label })); });
        tr.appendChild(el('th', { scope: 'col' }, [el('span', { class: 'rb-sr', text: 'Actions' })]));
        head.appendChild(tr);
    }

    function render() {
        rows.textContent = '';
        var list = visible();
        if (!list.length) {
            wrap.hidden = true;
            core.showStatus(status, items.length ? 'Nothing matches your search.' : 'No ' + kind.plural + ' yet. Add your first one with “New ' + kind.singular + '”.');
            return;
        }
        core.showStatus(status, '');
        wrap.hidden = false;

        list.forEach(function (item) {
            var active = isActive(item);
            var edit = el('button', { type: 'button', class: 'rb-link', text: 'Edit' });
            var toggle = el('button', { type: 'button', class: 'rb-link', text: active ? 'Disable' : 'Enable' });
            var del = el('button', { type: 'button', class: 'rb-link rb-link--danger', text: 'Delete' });
            edit.addEventListener('click', function () { openForm(item); });
            toggle.addEventListener('click', function () { toggleItem(item); });
            del.addEventListener('click', function () { removeItem(item); });

            var cells = kind.cells(item);
            cells.push(el('td', {}, [el('span', { class: 'rb-badge ' + (active ? 'rb-badge--published' : 'rb-badge--archived'), text: active ? 'Active' : 'Inactive' })]));
            cells.push(el('td', {}, [el('div', { class: 'rb-actions' }, [edit, toggle, del])]));
            rows.appendChild(el('tr', {}, cells));
        });
    }

    function load() {
        core.showStatus(status, 'Loading…');
        wrap.hidden = true;
        return api(kind.endpoint, { auth: true }).then(function (list) {
            items = Array.isArray(list) ? list : [];
            render();
        }).catch(function (error) {
            if (error.code === 101) { items = []; render(); return; }
            core.showStatus(status, error.message || 'The ' + kind.plural + ' could not be loaded.');
            status.classList.add('rb-status--error');
        });
    }

    /* ---------- actions ---------- */

    function toggleItem(item) {
        var turningOff = isActive(item);
        api(kind.endpoint + '/' + encodeURIComponent(idOf(item)) + '/toggle-active', { method: 'PATCH', auth: true }).then(function () {
            core.toast('“' + item[kind.nameKey] + '” ' + (turningOff ? 'disabled.' : 'enabled.'));
            return load();
        }).catch(function (error) { fail(error.message || 'The status could not be changed.'); });
    }

    function removeItem(item) {
        var warning = kind.singular === 'category'
            ? 'Posts in this category will be left without one.'
            : (kind.singular === 'setting' ? 'MdBlog falls back to its default if it reads this key.' : 'This cannot be undone.');
        core.ask({ title: 'Delete “' + item[kind.nameKey] + '”?', message: warning, confirmText: 'Delete ' + kind.singular, danger: true }).then(function (yes) {
            if (!yes) return;
            api(kind.endpoint + '/' + encodeURIComponent(idOf(item)), { method: 'DELETE', auth: true }).then(function () {
                core.toast(kind.singular.charAt(0).toUpperCase() + kind.singular.slice(1) + ' deleted.');
                return load();
            }).catch(function (error) { fail(error.message || 'It could not be deleted.'); });
        });
    }

    /* ---------- add / edit form ---------- */

    function openForm(item) {
        var editing = !!item;
        var previous = document.activeElement;
        var slugTouched = editing;
        var controls = {};

        var form = el('form', { class: 'rb-form', novalidate: true });
        kind.fields.forEach(function (field) {
            var id = 'rbTax_' + field.name;
            var value = editing ? item[field.source || field.name] : field.defaultValue;
            var input;
            if (field.type === 'textarea') {
                input = el('textarea', { class: 'rb-input', id: id, name: field.name, rows: '3' });
                input.value = value || '';
            } else if (field.type === 'checkbox') {
                input = el('input', { type: 'checkbox', id: id, name: field.name });
                input.checked = Number(value) === 1 || value === true;
                controls[field.name] = input;
                form.appendChild(el('label', { class: 'rb-check', for: id }, [input, el('span', { text: field.label })]));
                return;
            } else if (field.type === 'color') {
                input = el('input', { type: 'color', class: 'rb-input rb-input--color', id: id, name: field.name });
                input.value = /^#[0-9a-f]{6}$/i.test(value || '') ? value : (field.defaultValue || '#777777');
            } else {
                input = el('input', { type: 'text', class: 'rb-input', id: id, name: field.name, maxlength: field.max ? String(field.max) : false, readonly: editing && field.createOnly });
                input.value = value || '';
            }
            controls[field.name] = input;
            form.appendChild(el('div', { class: 'rb-field' }, [
                el('label', { for: id, text: field.label + (field.required ? ' *' : '') }),
                input,
                field.hint ? el('p', { class: 'rb-hint', text: field.hint }) : null
            ]));
        });

        var message = el('p', { class: 'rb-status rb-status--error', role: 'alert' });
        var cancel = el('button', { type: 'button', class: 'rb-btn rb-btn--ghost', text: 'Cancel' });
        var submit = el('button', { type: 'submit', class: 'rb-btn rb-btn--primary', text: editing ? 'Save changes' : 'Add ' + kind.singular });
        form.appendChild(message);
        form.appendChild(el('div', { class: 'rb-dialog__actions' }, [cancel, submit]));

        var titleId = 'rbTaxTitle';
        var dialog = el('div', { class: 'rb-dialog rb-dialog--form', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, [
            el('h2', { class: 'rb-dialog__title', id: titleId, text: (editing ? 'Edit ' : 'New ') + kind.singular }),
            form
        ]);
        var overlay = el('div', { class: 'rb-dialog-overlay' }, [dialog]);

        function close() {
            document.removeEventListener('keydown', onKey);
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (previous && previous.focus) previous.focus();
        }
        function onKey(event) { if (event.key === 'Escape') close(); }

        kind.fields.forEach(function (field) {
            if (!field.slugFrom) return;
            controls[field.slugFrom].addEventListener('input', function () {
                if (!slugTouched) controls[field.name].value = controls[field.slugFrom].value.trim() ? core.slugify(controls[field.slugFrom].value) : '';
            });
            controls[field.name].addEventListener('input', function () { slugTouched = true; });
        });

        function fieldError(text) { message.textContent = text; }

        cancel.addEventListener('click', close);
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            fieldError('');

            var nameField = kind.nameField || kind.nameKey;
            var values = {};
            kind.fields.forEach(function (field) {
                if (editing && field.createOnly) return;
                var input = controls[field.name];
                values[field.name] = field.type === 'checkbox' ? (input.checked ? 1 : 0) : input.value.trim();
            });

            var name = values[nameField];
            if (name !== undefined) {
                if (!name) { fieldError('Enter a ' + (nameField === 'settingName' ? 'key' : 'name') + '.'); controls[nameField].focus(); return; }
                var nameDef = kind.fields.filter(function (f) { return f.name === nameField; })[0];
                if (nameDef && nameDef.pattern && !nameDef.pattern.test(name)) { fieldError(nameDef.patternMessage); controls[nameField].focus(); return; }
                /* MdBlog only rejects a duplicate once two copies exist, so the check is repeated here */
                var duplicate = items.some(function (other) {
                    return (!editing || idOf(other) !== idOf(item)) && String(other[kind.nameKey] || '').trim().toLowerCase() === name.toLowerCase();
                });
                if (duplicate) { fieldError('A ' + kind.singular + ' named “' + name + '” already exists.'); controls[nameField].focus(); return; }
            }
            if (values.tagSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.tagSlug)) { fieldError('The slug may only contain lowercase letters, numbers and hyphens.'); controls.tagSlug.focus(); return; }

            var request;
            if (editing) {
                request = api(kind.endpoint + '/' + encodeURIComponent(idOf(item)), { method: 'PATCH', auth: true, body: Object.assign({ ltId: idOf(item) }, values) });
            } else {
                var body = new FormData();
                Object.keys(values).forEach(function (key) { body.set(key, String(values[key])); });
                request = api(kind.endpoint, { method: 'POST', auth: true, body: body });
            }

            submit.disabled = true;
            var label = submit.textContent;
            submit.textContent = 'Saving…';
            request.then(function () {
                close();
                core.toast(kind.singular.charAt(0).toUpperCase() + kind.singular.slice(1) + (editing ? ' updated.' : ' added.'));
                return load();
            }).catch(function (error) {
                submit.disabled = false;
                submit.textContent = label;
                fieldError(error.message || 'It could not be saved.');
            });
        });

        document.addEventListener('keydown', onKey);
        document.body.appendChild(overlay);
        (editing && kind.fields[0].createOnly ? controls[kind.fields[1].name] : controls[kind.nameField || kind.nameKey]).focus();
    }

    /* ---------- boot ---------- */

    renderHead();
    $('[data-rb-new]', root).addEventListener('click', function () { openForm(null); });
    search.addEventListener('input', core.debounce(render, 150));
    statusFilter.addEventListener('change', render);
    load();
})();
