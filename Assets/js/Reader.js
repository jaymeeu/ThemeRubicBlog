/* ThemeRubicBlog: reader extras. The author page, and reactions, reporting and comments on an article.
   Needs Script.js (window.RubicCore). */
(function () {
    'use strict';

    var core = window.RubicCore;
    if (!core || core.blocked) return;

    var el = core.el, $ = core.$, api = core.api, Auth = core.Auth, CFG = core.CFG, ROUTES = core.ROUTES;

    function setBusy(button, busy, label) {
        if (!button) return;
        if (busy) { button.dataset.label = button.textContent; button.textContent = label || 'Please wait…'; }
        else if (button.dataset.label) button.textContent = button.dataset.label;
        button.disabled = !!busy;
    }

    function signInUrl() {
        return core.pageUrl(ROUTES.signin, { next: window.location.pathname + window.location.search, demo: CFG.demo ? 1 : '' });
    }

    /* ---------- author page (public endpoints only) ---------- */

    function socialLink(kind, value) {
        value = String(value || '').trim();
        if (!value) return null;
        if (/^https?:\/\//i.test(value)) return value;
        var handle = value.replace(/^@/, '');
        if (!/^[A-Za-z0-9._-]+$/.test(handle)) return null;
        return { linkedin: 'https://www.linkedin.com/in/', twitter: 'https://x.com/', facebook: 'https://www.facebook.com/' }[kind] + handle;
    }

    function collectAuthorPosts(authorId) {
        var found = [];
        function next(page) {
            return api('/blogs/filter/posts?' + core.query({ page: page, limit: 50 })).then(function (data) {
                var batch = data && Array.isArray(data.data) ? data.data : [];
                batch.forEach(function (post) { if (String(post.authorId) === String(authorId)) found.push(post); });
                var more = data && data.pagination && data.pagination.hasMore;
                return more && page < 10 ? next(page + 1) : found;
            });
        }
        return next(1);
    }

    function initAuthor(root) {
        var status = $('[data-rb-status]', root);
        var head = $('[data-rb-author-head]', root);
        var grid = $('[data-rb-grid]', root);
        var id = new URLSearchParams(window.location.search).get('id') || '';

        if (!id) { core.showStatus(status, 'This author could not be found.'); return; }

        collectAuthorPosts(id).then(function (posts) {
            if (!posts.length) { core.showStatus(status, 'This author has no published articles yet.'); return null; }
            var first = posts[0];

            var name = first.author || 'Author';
            $('[data-rb-name]', root).textContent = name;
            var avatar = $('[data-rb-avatar]', root);
            if (first.avatar) avatar.appendChild(el('img', { src: core.assetUrl(first.avatar), alt: '' }));
            else avatar.textContent = name.charAt(0).toUpperCase();
            document.title = name + (CFG.siteName ? ' — ' + CFG.siteName : '');

            posts.forEach(function (post) { grid.appendChild(core.card(post)); });
            $('[data-rb-posts-title]', root).hidden = false;
            head.hidden = false;
            core.showStatus(status, '');

            /* bio and social links come with any one of the author's articles */
            return api('/blogs/posts/' + encodeURIComponent(first.slug) + '/slug').then(function (full) {
                $('[data-rb-bio]', root).textContent = (full && full.bio) || '';
                var list = $('[data-rb-links]', root);
                [['linkedin', 'LinkedIn'], ['twitter', 'X'], ['facebook', 'Facebook']].forEach(function (pair) {
                    var url = socialLink(pair[0], full && full[pair[0]]);
                    if (url) list.appendChild(el('li', {}, [el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: pair[1] })]));
                });
            }).catch(function () { /* the profile details are optional */ });
        }).catch(function (error) {
            core.showStatus(status, error.message || 'The author could not be loaded.');
            status.classList.add('rb-status--error');
        });
    }

    /* ---------- article: reactions, report, comments ---------- */

    var REACTIONS = [
        ['like', '👍', 'Like'], ['love', '❤️', 'Love'], ['laugh', '😄', 'Funny'],
        ['wow', '😮', 'Wow'], ['sad', '😢', 'Sad'], ['celebrate', '🎉', 'Celebrate']
    ];
    var REPORT_REASONS = [
        ['spam', 'Spam or promotion'], ['harassment', 'Harassment'], ['hate_speech', 'Hate speech'],
        ['copyright', 'Copyright'], ['other', 'Something else']
    ];

    function countComments(list) {
        return (list || []).reduce(function (n, c) { return n + 1 + countComments(c.replies); }, 0);
    }

    function initResponses(root, post) {
        var block = $('[data-rb-responses]', root);
        if (!block) return;
        block.hidden = false;

        var slug = post.slug;
        var signedIn = Auth.isSignedIn();
        var reactionsRow = $('[data-rb-reactions]', root);
        var reactionNote = $('[data-rb-reaction-note]', root);
        var commentStatus = $('[data-rb-comment-status]', root);
        var commentList = $('[data-rb-comment-list]', root);
        var form = $('[data-rb-comment-form]', root);
        var signinNote = $('[data-rb-comment-signin]', root);
        var comments = Array.isArray(post.comments) ? post.comments : [];
        var current = post.userReaction || '';

        $('[data-rb-signin-link]', root).setAttribute('href', signInUrl());
        form.hidden = !signedIn;
        signinNote.hidden = signedIn;

        /* reactions */
        function paintReactions() {
            reactionsRow.textContent = '';
            REACTIONS.forEach(function (reaction) {
                var button = el('button', {
                    type: 'button', class: 'rb-reaction', 'aria-pressed': current === reaction[0] ? 'true' : 'false', title: reaction[2]
                }, [el('span', { 'aria-hidden': 'true', text: reaction[1] }), el('span', { class: 'rb-sr', text: reaction[2] })]);
                button.addEventListener('click', function () { react(reaction[0]); });
                reactionsRow.appendChild(button);
            });
        }

        function react(type) {
            if (!Auth.isSignedIn()) { reactionNote.textContent = ''; reactionNote.appendChild(el('a', { href: signInUrl(), text: 'Sign in' })); reactionNote.appendChild(document.createTextNode(' to react to this article.')); return; }
            if (current === type) return;
            api('/blogs/posts/react', { method: 'POST', auth: true, body: { postSlug: slug, reaction: type } }).then(function () {
                current = type;
                paintReactions();
                reactionNote.textContent = 'Thanks for letting the author know.';
            }).catch(function (error) { reactionNote.textContent = error.message || 'Your reaction could not be saved.'; });
        }
        paintReactions();

        /* report */
        $('[data-rb-report]', root).addEventListener('click', function () {
            if (!Auth.isSignedIn()) { window.location.href = signInUrl(); return; }
            openReport();
        });

        function openReport() {
            var previous = document.activeElement;
            var reason = el('select', { class: 'rb-input', id: 'rbReportReason', name: 'reason' }, REPORT_REASONS.map(function (r) { return el('option', { value: r[0], text: r[1] }); }));
            var details = el('textarea', { class: 'rb-input', id: 'rbReportDetails', name: 'comments', rows: '4', maxlength: '1000', placeholder: 'Tell us what is wrong (optional)' });
            var message = el('p', { class: 'rb-status rb-status--error', role: 'alert' });
            var cancel = el('button', { type: 'button', class: 'rb-btn rb-btn--ghost', text: 'Cancel' });
            var submit = el('button', { type: 'submit', class: 'rb-btn rb-btn--primary', text: 'Send report' });
            var form2 = el('form', { class: 'rb-form', novalidate: true }, [
                el('div', { class: 'rb-field' }, [el('label', { for: 'rbReportReason', text: 'Reason' }), reason]),
                el('div', { class: 'rb-field' }, [el('label', { for: 'rbReportDetails', text: 'Details' }), details]),
                message,
                el('div', { class: 'rb-dialog__actions' }, [cancel, submit])
            ]);
            var overlay = el('div', { class: 'rb-dialog-overlay' }, [
                el('div', { class: 'rb-dialog rb-dialog--form', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'rbReportTitle' }, [
                    el('h2', { class: 'rb-dialog__title', id: 'rbReportTitle', text: 'Report this article' }), form2
                ])
            ]);
            function close() {
                document.removeEventListener('keydown', onKey);
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if (previous && previous.focus) previous.focus();
            }
            function onKey(event) { if (event.key === 'Escape') close(); }
            cancel.addEventListener('click', close);
            form2.addEventListener('submit', function (event) {
                event.preventDefault();
                setBusy(submit, true, 'Sending…');
                api('/blogs/reports/create', { method: 'POST', auth: true, body: { postSlug: slug, reason: reason.value, comments: details.value.trim() } }).then(function () {
                    close();
                    core.toast('Thank you. We will take a look.');
                }).catch(function (error) {
                    setBusy(submit, false);
                    message.textContent = error.message || 'The report could not be sent.';
                });
            });
            document.addEventListener('keydown', onKey);
            document.body.appendChild(overlay);
            reason.focus();
        }

        /* comments */
        function setCommentStatus(message, isError) {
            core.showStatus(commentStatus, message);
            if (isError) commentStatus.classList.add('rb-status--error');
        }

        function commentNode(comment, depth) {
            var name = comment.author || 'Reader';
            var avatar = el('span', { class: 'rb-avatar rb-avatar--sm', 'aria-hidden': 'true' });
            if (comment.avatar) avatar.appendChild(el('img', { src: core.assetUrl(comment.avatar), alt: '' }));
            else avatar.textContent = name.charAt(0).toUpperCase();

            var likeCount = Number(comment.likes) || 0;
            var liked = Number(comment.isLikedByUser) === 1;
            var like = el('button', { type: 'button', class: 'rb-link rb-comment__like', 'aria-pressed': liked ? 'true' : 'false' });
            function paintLike() { like.textContent = (liked ? 'Liked' : 'Like') + (likeCount ? ' · ' + likeCount : ''); like.setAttribute('aria-pressed', liked ? 'true' : 'false'); }
            paintLike();
            like.addEventListener('click', function () {
                if (!Auth.isSignedIn()) { window.location.href = signInUrl(); return; }
                api('/blogs/comments/like', { method: 'POST', auth: true, body: { commentId: comment.ltId } }).then(function (result) {
                    liked = result === 'liked';
                    likeCount = Math.max(0, likeCount + (liked ? 1 : -1));
                    paintLike();
                }).catch(function (error) { core.toast(error.message || 'Could not update your like.', 'error'); });
            });

            var reply = el('button', { type: 'button', class: 'rb-link', text: 'Reply' });
            var holder = el('div', { class: 'rb-comment__reply' });
            reply.addEventListener('click', function () {
                if (!Auth.isSignedIn()) { window.location.href = signInUrl(); return; }
                if (holder.firstChild) { holder.textContent = ''; return; }
                holder.appendChild(replyForm(comment, holder));
            });

            var item = el('li', { class: 'rb-comment', id: 'comment-' + comment.ltId }, [
                avatar,
                el('div', { class: 'rb-comment__main' }, [
                    el('p', { class: 'rb-comment__head' }, [el('strong', { text: name }), el('span', { class: 'rb-comment__date', text: core.formatDateLong(comment.createdAt) })]),
                    el('p', { class: 'rb-comment__body', text: comment.body || '' }),
                    el('div', { class: 'rb-comment__actions' }, [like, reply]),
                    holder
                ])
            ]);
            if (Array.isArray(comment.replies) && comment.replies.length) {
                item.querySelector('.rb-comment__main').appendChild(el('ul', { class: 'rb-comment-list rb-comment-list--nested' }, comment.replies.map(function (r) { return commentNode(r, depth + 1); })));
            }
            return item;
        }

        function replyForm(parent, holder) {
            var text = el('textarea', { class: 'rb-input', rows: '2', maxlength: '2000', 'aria-label': 'Reply to ' + (parent.author || 'comment'), placeholder: 'Write a reply' });
            var send = el('button', { type: 'submit', class: 'rb-btn rb-btn--primary rb-btn--sm', text: 'Reply' });
            var cancel = el('button', { type: 'button', class: 'rb-btn rb-btn--ghost rb-btn--sm', text: 'Cancel' });
            var f = el('form', { class: 'rb-form rb-reply-form', novalidate: true }, [text, el('div', { class: 'rb-form__actions' }, [cancel, send])]);
            cancel.addEventListener('click', function () { holder.textContent = ''; });
            f.addEventListener('submit', function (event) {
                event.preventDefault();
                if (!text.value.trim()) { text.focus(); return; }
                setBusy(send, true, 'Posting…');
                submitComment(text.value.trim(), parent.ltId).catch(function () { setBusy(send, false); });
            });
            setTimeout(function () { text.focus(); }, 0);
            return f;
        }

        function renderComments() {
            commentList.textContent = '';
            $('[data-rb-comment-count]', root).textContent = comments.length ? '(' + countComments(comments) + ')' : '';
            if (!comments.length) { setCommentStatus('No comments yet. Be the first to share a thought.'); return; }
            setCommentStatus('');
            comments.forEach(function (comment) { commentList.appendChild(commentNode(comment, 0)); });
        }

        function refresh() {
            return api('/blogs/posts/' + encodeURIComponent(slug) + '/slug').then(function (fresh) {
                comments = Array.isArray(fresh && fresh.comments) ? fresh.comments : [];
                renderComments();
            });
        }

        function submitComment(body, parentId) {
            return api('/blogs/comments/create', { method: 'POST', auth: true, body: { postSlug: slug, body: body, parentId: parentId || '' } }).then(function () {
                core.toast('Comment posted.');
                return refresh();
            }).catch(function (error) {
                setCommentStatus(error.message || 'Your comment could not be saved.', true);
                core.toast(error.message || 'Your comment could not be saved.', 'error');
                throw error;
            });
        }

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var textarea = form.elements.body;
            var body = textarea.value.trim();
            if (!body) { textarea.focus(); return; }
            var button = $('button[type="submit"]', form);
            setBusy(button, true, 'Posting…');
            submitComment(body, '').then(function () { textarea.value = ''; }).catch(function () { /* message already shown */ }).then(function () { setBusy(button, false); });
        });

        renderComments();
    }

    /* ---------- boot ---------- */

    var author = $('[data-rb-page="author"]');
    if (author) initAuthor(author);

    var postPage = $('[data-rb-page="post"]');
    if (postPage) {
        /* the article may already be loaded (Script.js resolves it before this file runs) */
        if (core.currentPost) initResponses(postPage, core.currentPost);
        else document.addEventListener('rb:post', function (event) { initResponses(postPage, event.detail); }, { once: true });
    }
})();
