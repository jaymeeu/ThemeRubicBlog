/* ThemeRubicBlog: sign in, sign up and profile screens. Needs Script.js (window.RubicCore). */
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

    function formValues(form) {
        var values = {};
        new FormData(form).forEach(function (value, key) { values[key] = typeof value === 'string' ? value.trim() : value; });
        return values;
    }

    /* only follow same-site relative paths from ?next= */
    function safeNext(value) {
        return value && /^\/(?!\/)/.test(value) ? value : '';
    }

    /* ---------- sign in ---------- */

    function initSignIn(root) {
        var form = $('[data-rb-form]', root);
        var status = $('[data-rb-status]', root);
        var submit = $('[data-rb-submit]', root);
        var params = new URLSearchParams(window.location.search);

        if (params.get('registered')) core.showStatus(status, 'Account created. Sign in to continue.');

        var reveal = $('[data-rb-reveal]', root);
        reveal.addEventListener('click', function () {
            var input = $('#rbPassword', root);
            var show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            reveal.textContent = show ? 'Hide' : 'Show';
            reveal.setAttribute('aria-pressed', show ? 'true' : 'false');
        });

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var values = formValues(form);
            if (!values.email || !values.password) {
                core.showStatus(status, 'Enter your email or username and your password.');
                status.classList.add('rb-status--error');
                return;
            }

            core.showStatus(status, '');
            setBusy(submit, true, 'Signing in…');
            api('/blogs/auth/signin', { method: 'POST', body: { email: values.email, password: values.password } }).then(function (data) {
                var tokenName = data && data.tokenName;
                var token = tokenName ? data[tokenName] : (data && data.token);
                if (!token) throw new Error('Signed in, but no access token was returned.');
                Auth.save(tokenName, token, { ltId: data.ltId || data.userId, username: data.username, email: data.email });
                var next = safeNext(params.get('next'));
                if (next) window.location.href = next;
                else core.go(ROUTES.dashboard);
            }).catch(function (error) {
                setBusy(submit, false);
                core.showStatus(status, error.message || 'Sign in failed.');
                status.classList.add('rb-status--error');
            });
        });
    }

    /* ---------- sign up ---------- */

    function initSignUp(root) {
        var form = $('[data-rb-form]', root);
        var status = $('[data-rb-status]', root);
        var submit = $('[data-rb-submit]', root);

        function fail(message) { core.showStatus(status, message); status.classList.add('rb-status--error'); }

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var v = formValues(form);
            core.showStatus(status, '');
            if (!v.name || !v.username || !v.email || !v.password) return fail('Please fill in every field.');
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return fail('Enter a valid email address.');
            if (v.password.length < 8) return fail('Password must be at least 8 characters.');
            if (v.password !== v.confirmPass) return fail('Passwords do not match.');

            setBusy(submit, true, 'Creating account…');
            api('/blogs/auth/signup', {
                method: 'POST',
                body: { name: v.name, username: v.username, email: v.email, password: v.password, confirmPass: v.confirmPass }
            }).then(function () {
                core.go(ROUTES.signin, { registered: 1 });
            }).catch(function (error) {
                setBusy(submit, false);
                fail(error.message || 'Could not create the account.');
            });
        });
    }

    /* ---------- profile ---------- */

    function initProfile(root) {
        var status = $('[data-rb-status]', root);
        var wrap = $('[data-rb-profile]', root);
        var stored = Auth.user() || {};
        var userId = stored.ltId || stored.userId;
        var record = null;

        if (!userId) {
            core.showStatus(status, 'Your session has no user details. Please sign in again.');
            status.classList.add('rb-status--error');
            return;
        }

        function fail(message) { core.toast(message, 'error'); }

        function renderAvatar(node, person) {
            node.textContent = '';
            if (person.avatar) node.appendChild(el('img', { src: core.assetUrl(person.avatar), alt: '' }));
            else node.textContent = String(person.fullname || person.username || '?').charAt(0).toUpperCase();
        }

        function fill(person) {
            record = person;
            $('[data-rb-fullname]', root).textContent = person.fullname || person.username || '';
            $('[data-rb-handle]', root).textContent = person.username ? '@' + person.username : '';
            $('[data-rb-email]', root).textContent = person.email || '';
            $('[data-rb-joined]', root).textContent = person.joined ? 'Member since ' + core.formatDateLong(person.joined) : '';
            renderAvatar($('[data-rb-avatar]', root), person);

            var form = $('[data-rb-details-form]', root);
            ['fullname', 'location', 'bio', 'facebook', 'twitter', 'linkedin'].forEach(function (name) {
                form.elements[name].value = person[name] || '';
            });
            core.refreshUser && core.refreshUser(person);
        }

        function load() {
            return api('/blogs/user/' + encodeURIComponent(userId) + '/record', { auth: true }).then(function (person) {
                fill(person);
                core.showStatus(status, '');
                wrap.hidden = false;
            });
        }

        load().catch(function (error) {
            core.showStatus(status, error.message || 'Your profile could not be loaded.');
            status.classList.add('rb-status--error');
        });

        $('[data-rb-details-form]', root).addEventListener('submit', function (event) {
            event.preventDefault();
            var form = event.currentTarget;
            var button = $('button[type="submit"]', form);
            var data = new FormData(form);
            var file = data.get('avatarFile');
            if (!file || !file.size) data.delete('avatarFile');
            data.append('ltId', userId);

            setBusy(button, true, 'Saving…');
            api('/blogs/user/update', { method: 'POST', body: data, auth: true }).then(function () {
                core.toast('Profile updated.');
                form.elements.avatarFile.value = '';
                return load();
            }).catch(function (error) { fail(error.message || 'Profile could not be updated.'); }).then(function () { setBusy(button, false); });
        });

        $('[data-rb-password-form]', root).addEventListener('submit', function (event) {
            event.preventDefault();
            var form = event.currentTarget;
            var v = formValues(form);
            if (!v.currentPassword || !v.newPassword) return fail('Enter your current and new password.');
            if (v.newPassword.length < 8) return fail('New password must be at least 8 characters.');
            if (v.newPassword !== v.confirmPassword) return fail('New password and confirmation do not match.');
            if (v.newPassword === v.currentPassword) return fail('New password must be different from the current one.');

            var button = $('button[type="submit"]', form);
            setBusy(button, true, 'Updating…');
            api('/blogs/user/change-password', {
                method: 'POST', auth: true,
                body: { userId: userId, currentPassword: v.currentPassword, newPassword: v.newPassword, confirmPassword: v.confirmPassword }
            }).then(function () {
                form.reset();
                core.toast('Password updated.');
            }).catch(function (error) { fail(error.message || 'Password could not be updated.'); }).then(function () { setBusy(button, false); });
        });

        $('[data-rb-delete-form]', root).addEventListener('submit', function (event) {
            event.preventDefault();
            var form = event.currentTarget;
            var typed = form.elements.confirmation.value.trim();
            if (!typed) return fail('Type your username to confirm.');
            if (record && typed !== record.username) return fail('That does not match your username.');

            core.ask({ title: 'Delete your account?', message: 'This cannot be undone.', confirmText: 'Delete account', danger: true }).then(function (yes) {
                if (!yes) return;
                api('/blogs/user/' + encodeURIComponent(userId), { method: 'DELETE', auth: true, body: { confirmation: typed } }).then(function () {
                    Auth.clear();
                    core.go(ROUTES.blog);
                }).catch(function (error) { fail(error.message || 'Account could not be deleted.'); });
            });
        });
    }

    var signin = $('[data-rb-page="signin"]');
    var signup = $('[data-rb-page="signup"]');
    var profile = $('[data-rb-page="admin-profile"]');
    if (signin) initSignIn(signin);
    if (signup) initSignUp(signup);
    if (profile) initProfile(profile);
})();
