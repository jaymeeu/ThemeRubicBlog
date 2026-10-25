/* ThemeRubicBlog: create / edit a post with Editor.js. Needs Script.js (window.RubicCore).
   MdBlog stores the post body as HTML, so blocks are converted to HTML on save and back to blocks on load. */
(function () {
    'use strict';

    var core = window.RubicCore;
    if (!core || core.blocked) return;

    var root = core.$('[data-rb-page="admin-editor"]');
    if (!root) return;

    var el = core.el, $ = core.$, api = core.api, Auth = core.Auth, CFG = core.CFG, ROUTES = core.ROUTES;
    var status = $('[data-rb-status]', root);
    var form = $('[data-rb-form]', root);

    /* ---------- body conversion ---------- */

    function inline(html) { return core.sanitizeHtml(html).innerHTML; }

    function safeImageSrc(url) {
        url = String(url || '');
        if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+\/=]+$/i.test(url)) return url;
        if (/^https?:\/\//i.test(url)) return url;
        if (/^\/(?!\/)/.test(url) || /^[\w-]+\//.test(url)) return core.assetUrl(url);
        return '';
    }

    function blocksToHtml(blocks) {
        var out = document.createElement('div');
        (blocks || []).forEach(function (block) {
            var data = block.data || {};
            var node = null;
            switch (block.type) {
                case 'paragraph':
                    if (String(data.text || '').replace(/<br\s*\/?>|&nbsp;|\s/gi, '') === '') return;
                    node = document.createElement('p');
                    node.innerHTML = inline(data.text);
                    break;
                case 'header':
                    node = document.createElement('h' + Math.min(6, Math.max(2, Number(data.level) || 2)));
                    node.innerHTML = inline(data.text);
                    break;
                case 'list':
                    node = document.createElement(data.style === 'ordered' ? 'ol' : 'ul');
                    (data.items || []).forEach(function (item) {
                        var li = document.createElement('li');
                        li.innerHTML = inline(typeof item === 'string' ? item : (item && item.content) || '');
                        node.appendChild(li);
                    });
                    break;
                case 'quote':
                    node = document.createElement('blockquote');
                    var p = document.createElement('p');
                    p.innerHTML = inline(data.text);
                    node.appendChild(p);
                    if (data.caption) { var cite = document.createElement('cite'); cite.innerHTML = inline(data.caption); node.appendChild(cite); }
                    break;
                case 'delimiter':
                    node = document.createElement('hr');
                    break;
                case 'code':
                    node = document.createElement('pre');
                    var code = document.createElement('code');
                    code.textContent = data.code || '';
                    node.appendChild(code);
                    break;
                case 'image':
                    var src = safeImageSrc(data.file && data.file.url);
                    if (!src) return;
                    node = document.createElement('figure');
                    var img = document.createElement('img');
                    img.setAttribute('src', src);
                    img.setAttribute('alt', String(data.caption || '').replace(/<[^>]*>/g, ''));
                    node.appendChild(img);
                    if (data.caption) { var cap = document.createElement('figcaption'); cap.innerHTML = inline(data.caption); node.appendChild(cap); }
                    break;
                default:
                    return;
            }
            out.appendChild(node);
        });
        return out.innerHTML;
    }

    function isBlank(html) { return String(html || '').replace(/<br\s*\/?>|&nbsp;|\s/gi, '') === ''; }

    function htmlToBlocks(html) {
        var blocks = [];
        function paragraph(text) { if (!isBlank(text)) blocks.push({ type: 'paragraph', data: { text: text } }); }

        function walk(parent) {
            [].forEach.call(parent.childNodes, function (node) {
                if (node.nodeType === 3) { paragraph(node.textContent.trim()); return; }
                if (node.nodeType !== 1) return;
                var tag = node.tagName.toUpperCase();

                if (tag === 'P') paragraph(node.innerHTML);
                else if (/^H[1-6]$/.test(tag)) blocks.push({ type: 'header', data: { text: node.innerHTML, level: Math.min(4, Math.max(2, Number(tag.charAt(1)))) } });
                else if (tag === 'UL' || tag === 'OL') {
                    var items = [].map.call(node.querySelectorAll(':scope > li'), function (li) {
                        var copy = li.cloneNode(true);
                        [].forEach.call(copy.querySelectorAll('ul, ol'), function (nested) { nested.parentNode.removeChild(nested); });
                        return copy.innerHTML;
                    }).filter(function (item) { return !isBlank(item); });
                    if (items.length) blocks.push({ type: 'list', data: { style: tag === 'OL' ? 'ordered' : 'unordered', items: items } });
                } else if (tag === 'BLOCKQUOTE') {
                    var cite = node.querySelector('cite');
                    var caption = cite ? cite.innerHTML : '';
                    if (cite) cite.parentNode.removeChild(cite);
                    var inner = node.querySelector('p');
                    blocks.push({ type: 'quote', data: { text: inner ? inner.innerHTML : node.innerHTML, caption: caption, alignment: 'left' } });
                } else if (tag === 'FIGURE' || tag === 'IMG') {
                    var image = tag === 'IMG' ? node : node.querySelector('img');
                    var figcaption = tag === 'FIGURE' ? node.querySelector('figcaption') : null;
                    if (image) blocks.push({ type: 'image', data: { file: { url: image.getAttribute('src') }, caption: figcaption ? figcaption.innerHTML : (image.getAttribute('alt') || ''), withBorder: false, stretched: false, withBackground: false } });
                    else paragraph(node.innerHTML);
                } else if (tag === 'HR') blocks.push({ type: 'delimiter', data: {} });
                else if (tag === 'PRE') blocks.push({ type: 'code', data: { code: node.textContent } });
                else if (tag === 'DIV') walk(node);
                else if (tag === 'TABLE') paragraph(core.el('span', { text: node.textContent.trim() }).innerHTML);
                else paragraph(node.outerHTML);
            });
        }

        walk(core.sanitizeHtml(html));
        return blocks;
    }

    function plainText(html) { return (new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim(); }

    /* ---------- editor ---------- */

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var tag = el('script', { src: src });
            tag.onload = resolve;
            tag.onerror = function () { reject(new Error('Could not load ' + src)); };
            document.head.appendChild(tag);
        });
    }

    function readAsDataUrl(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = function () { reject(reader.error); };
            reader.readAsDataURL(file);
        });
    }

    var editor = null;      /* Editor.js instance, or null when the plain fallback is used */
    var fallback = null;    /* textarea used when Editor.js cannot load */

    function startEditor(blocks, onChange) {
        var holder = $('#rbEditor', root);
        return loadScript(CFG.assets + '/js/vendor/editorjs.bundle.js' + (CFG.editorVersion ? '?v=' + CFG.editorVersion : '')).then(function () {
            holder.textContent = '';
            editor = new window.EditorJS({
                holder: holder,
                placeholder: 'Tell your story…',
                data: { blocks: blocks },
                onChange: onChange,
                tools: {
                    header: { class: window.Header, inlineToolbar: true, config: { levels: [2, 3, 4], defaultLevel: 2 } },
                    list: { class: window.List, inlineToolbar: true },
                    quote: { class: window.Quote, inlineToolbar: true, config: { quotePlaceholder: 'Quote', captionPlaceholder: 'Source' } },
                    image: {
                        class: window.ImageTool,
                        config: {
                            captionPlaceholder: 'Caption',
                            uploader: {
                                uploadByFile: function (file) { return readAsDataUrl(file).then(function (url) { return { success: 1, file: { url: url } }; }); },
                                uploadByUrl: function (url) { return Promise.resolve({ success: 1, file: { url: url } }); }
                            }
                        }
                    },
                    delimiter: window.Delimiter,
                    code: window.CodeTool,
                    inlineCode: window.InlineCode,
                    marker: window.Marker
                }
            });
            return editor.isReady;
        });
    }

    function startFallback(blocks, onChange) {
        var holder = $('#rbEditor', root);
        holder.textContent = '';
        fallback = el('textarea', { class: 'rb-input rb-editor__fallback', rows: '16', 'aria-labelledby': 'rbBodyLabel' });
        fallback.value = blocksToHtml(blocks);
        fallback.addEventListener('input', onChange);
        holder.appendChild(el('p', { class: 'rb-hint', text: 'The visual editor could not be loaded, so you can edit the HTML directly.' }));
        holder.appendChild(fallback);
    }

    function readBody() {
        if (fallback) return Promise.resolve(inline(fallback.value));
        if (!editor) return Promise.resolve('');
        return editor.save().then(function (output) { return blocksToHtml(output.blocks); });
    }

    /* ---------- state ---------- */

    var params = new URLSearchParams(window.location.search);
    var slugParam = params.get('slug') || '';
    var editing = !!slugParam;
    var post = null;                 /* loaded post (edit mode) */
    var dirty = false;
    var slugTouched = editing;
    var readingTouched = false;
    var extras = {};                 /* fields the API may not return: track whether we know their value */
    var loadedPublishedAt = '';      /* MdBlog never fills published_at itself, so the editor sets it when a post goes live */
    var media = { existing: [], added: [], deleted: [] };
    var mediaList = $('[data-rb-media]', root);

    function markDirty() { dirty = true; }
    window.addEventListener('beforeunload', function (event) {
        if (!dirty) return;
        event.preventDefault();
        event.returnValue = '';
    });

    function setStatus(message, isError) {
        core.showStatus(status, message);
        if (isError) status.classList.add('rb-status--error');
    }

    /* ---------- media ---------- */

    function renderMedia() {
        mediaList.textContent = '';
        function item(src, label, onRemove) {
            var remove = el('button', { type: 'button', class: 'rb-link rb-link--danger', text: 'Remove', 'aria-label': 'Remove ' + label });
            remove.addEventListener('click', onRemove);
            return el('li', { class: 'rb-media__item' }, [
                el('img', { src: src, alt: '' }),
                el('span', { class: 'rb-media__name', text: label }),
                remove
            ]);
        }
        media.existing.forEach(function (m) {
            mediaList.appendChild(item(core.assetUrl(m.storagePath), m.originalName || m.filename || 'Image', function () {
                media.deleted.push(m.mediaId);
                media.existing = media.existing.filter(function (x) { return x !== m; });
                markDirty(); renderMedia();
            }));
        });
        media.added.forEach(function (m) {
            mediaList.appendChild(item(m.url, m.file.name, function () {
                URL.revokeObjectURL(m.url);
                media.added = media.added.filter(function (x) { return x !== m; });
                markDirty(); renderMedia();
            }));
        });
    }

    $('[data-rb-files]', root).addEventListener('change', function (event) {
        [].forEach.call(event.target.files, function (file) {
            if (/^image\//.test(file.type)) media.added.push({ file: file, url: URL.createObjectURL(file) });
        });
        event.target.value = '';
        markDirty(); renderMedia();
    });

    /* ---------- form fields ---------- */

    function field(name) { return form.elements[name]; }

    function fillCategories() {
        return api('/blogs/filter/categories?status=isActive').then(function (list) {
            var select = field('categoryId');
            (Array.isArray(list) ? list : []).forEach(function (c) {
                select.appendChild(el('option', { value: String(c.ltId), text: c.categoryName }));
            });
        }).catch(function () { /* categories are optional */ });
    }

    function pick(record, names) {
        for (var i = 0; i < names.length; i++) if (record && record[names[i]] !== undefined && record[names[i]] !== null) return record[names[i]];
        return undefined;
    }

    function fillForm(data, record) {
        field('title').value = data.title || '';
        field('slug').value = data.slug || '';
        field('excerpt').value = data.excerpt || '';
        field('categoryId').value = data.categoryId ? String(data.categoryId) : '';
        field('readingTime').value = data.readingTime || 1;
        readingTouched = true;

        loadedPublishedAt = pick(record, ['publishedAt', 'published_at']) || '';
        var knownStatus = pick(record, ['status']);
        extras.status = knownStatus !== undefined;
        if (extras.status) {
            field('status').value = knownStatus;
        } else {
            /* the API did not return a status: leave it alone unless the author picks one */
            field('status').insertBefore(el('option', { value: '', text: 'Keep current status' }), field('status').firstChild);
            field('status').value = '';
        }

        var featured = pick(record, ['isFeatured', 'is_featured']);
        extras.isFeatured = featured !== undefined;
        field('isFeatured').checked = Number(featured) === 1;

        var comments = pick(record, ['allowedComments', 'allowComments', 'allowedComment', 'allow_comments']);
        field('allowedComment').checked = comments === undefined ? true : (comments === true || comments === 'on' || Number(comments) === 1);

        var seoTitle = pick(record, ['seoTitle', 'seo_title']);
        var seoDescription = pick(record, ['seoDescription', 'seo_description']);
        extras.seoTitle = seoTitle !== undefined;
        extras.seoDescription = seoDescription !== undefined;
        field('seoTitle').value = seoTitle || '';
        field('seoDescription').value = seoDescription || '';

        media.existing = (Array.isArray(data.media) ? data.media : []).filter(function (m) { return m && m.storagePath; });
        renderMedia();

        $('[data-rb-heading]', root).textContent = 'Edit post';
        if (field('status').value === 'published') {
            var preview = $('[data-rb-preview]', root);
            preview.href = core.postLink({ slug: data.slug });
            preview.hidden = false;
        }
    }

    /* ---------- loading an existing post ---------- */

    function findRecord(slug) {
        var me = Auth.user() || {};
        function search(id) {
            return api('/blogs/posts?' + core.query({ id: id }), { auth: true }).then(function (rows) {
                return (Array.isArray(rows) ? rows : []).filter(function (row) { return row.slug === slug; })[0] || null;
            }).catch(function (error) { if (error.code === 101) return null; throw error; });
        }
        return search(me.ltId || me.userId).then(function (own) { return own || search(''); }).catch(function () { return null; });
    }

    function loadPost(slug) {
        return Promise.all([
            api('/blogs/posts/' + encodeURIComponent(slug) + '/slug', { auth: true }),
            findRecord(slug)
        ]).then(function (results) {
            if (!results[0] || !results[0].ltId) throw new Error('That post could not be found.');
            return results;
        });
    }

    /* ---------- saving ---------- */

    function buildFormData(html, excerpt, readingTime) {
        var fd = new FormData();
        fd.set('title', field('title').value.trim());
        fd.set('slug', field('slug').value.trim());
        fd.set('content', html);
        fd.set('excerpt', excerpt);
        fd.set('readingTime', String(readingTime));
        if (field('categoryId').value) fd.set('categoryId', field('categoryId').value);
        var chosen = field('status').value || (editing && extras.status ? '' : 'draft');
        if (!editing || extras.status !== false || field('status').value) fd.set('status', chosen || 'draft');
        if (chosen === 'published' && !loadedPublishedAt) fd.set('publishedAt', mysqlNow());
        if (!editing || extras.isFeatured !== false || field('isFeatured').checked) fd.set('isFeatured', field('isFeatured').checked ? '1' : '0');
        if (!editing || extras.seoTitle !== false || field('seoTitle').value) fd.set('seoTitle', field('seoTitle').value.trim());
        if (!editing || extras.seoDescription !== false || field('seoDescription').value) fd.set('seoDescription', field('seoDescription').value.trim());
        /* MdBlog's update() turns comments off whenever this is missing, so it is always sent when allowed */
        if (field('allowedComment').checked) fd.set('allowedComment', 'on');
        fd.set('coAuthors', '[]');
        media.added.forEach(function (m) { fd.append('additionalMedia[]', m.file); });
        if (media.deleted.length) fd.set('deletedMedia', JSON.stringify(media.deleted));
        return fd;
    }

    function mysqlNow() {
        var d = new Date();
        function two(n) { return String(n).padStart(2, '0'); }
        return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) + ' ' + two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds());
    }

    function save(event) {
        event.preventDefault();
        var button = $('[data-rb-save]', root);

        var title = field('title').value.trim();
        var slug = field('slug').value.trim();
        if (!title) { core.toast('Give the post a title.', 'error'); field('title').focus(); return; }
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { core.toast('The slug may only contain lowercase letters, numbers and hyphens.', 'error'); field('slug').focus(); return; }

        button.disabled = true;
        var label = button.textContent;
        button.textContent = 'Saving…';

        readBody().then(function (html) {
            if (isBlank(plainText(html)) && html.indexOf('<img') === -1) throw new Error('Write something in the body first.');

            var words = plainText(html).split(' ').filter(Boolean).length;
            var readingTime = readingTouched ? (Number(field('readingTime').value) || 1) : Math.max(1, Math.ceil(words / 200));
            var excerpt = field('excerpt').value.trim() || (plainText(html).slice(0, 160) + (plainText(html).length > 160 ? '…' : ''));
            var data = buildFormData(html, excerpt, readingTime);

            if (editing) {
                data.set('_method', 'PATCH');
                data.set('ltId', post.ltId);
                return api('/blogs/posts/' + encodeURIComponent(post.ltId), { method: 'POST', body: data, auth: true });
            }
            return api('/blogs/posts', { method: 'POST', body: data, auth: true });
        }).then(function () {
            dirty = false;
            core.toast(editing ? 'Post updated.' : 'Post created.');
            core.go(ROUTES.posts, { saved: 1 });
        }).catch(function (error) {
            core.toast(error.message || 'The post could not be saved.', 'error');
            button.disabled = false;
            button.textContent = label;
        });
    }

    /* ---------- boot ---------- */

    function init() {
        var start = editing ? loadPost(slugParam) : Promise.resolve(null);
        var categories = fillCategories();

        return Promise.all([start, categories]).then(function (results) {
            var loaded = results[0];
            var blocks = [];
            if (loaded) {
                post = loaded[0];
                fillForm(post, loaded[1]);
                blocks = htmlToBlocks(post.content || '');
            }
            form.hidden = false;
            core.showStatus(status, '');

            return startEditor(blocks, markDirty).catch(function () {
                startFallback(blocks, markDirty);
            });
        });
    }

    form.addEventListener('submit', save);
    form.addEventListener('input', function (event) {
        markDirty();
        if (event.target === field('title') && !slugTouched) field('slug').value = field('title').value.trim() ? core.slugify(field('title').value) : '';
        if (event.target === field('slug')) slugTouched = true;
        if (event.target === field('readingTime')) readingTouched = true;
    });
    form.addEventListener('change', markDirty);

    init().catch(function (error) {
        setStatus(error.message || 'The editor could not be opened.', true);
    });

    core.editorTools = { blocksToHtml: blocksToHtml, htmlToBlocks: htmlToBlocks };
})();
