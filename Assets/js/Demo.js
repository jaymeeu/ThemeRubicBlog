/* Development-only sample backend. Loaded when a page is opened with ?demo=1, so the whole
   theme (reading, sign-in, management, editor) can be previewed without MdBlog content.
   State lives in sessionStorage. Remove this file and Assets/img/demo-*.png before release. */
(function () {
    'use strict';

    var CFG = window.RubicBlog || {};
    var STORE_KEY = 'rb-demo-state';
    var img = function (n) { return CFG.assets + '/img/demo-' + n + '.png'; };

    var DEFAULT_CATEGORIES = [
        { ltId: '1', categoryName: 'Build', categoryDescription: 'New builds and construction notes.', status: 'isActive', showOnMenu: 1 },
        { ltId: '2', categoryName: 'Live', categoryDescription: 'Living spaces and everyday use.', status: 'isActive', showOnMenu: 1 },
        { ltId: '3', categoryName: 'Remodel', categoryDescription: '', status: 'isActive', showOnMenu: 1 },
        { ltId: '4', categoryName: 'Nourish', categoryDescription: 'Kitchens and gathering places.', status: 'isActive', showOnMenu: 0 }
    ];
    var DEFAULT_TAGS = [
        { ltId: '101', tagName: 'Timber', tagSlug: 'timber', tagColor: '#8b5a2b', tagDescription: 'Wood in every form.', status: 'isActive' },
        { ltId: '102', tagName: 'Natural light', tagSlug: 'natural-light', tagColor: '#d9a400', tagDescription: '', status: 'isActive' },
        { ltId: '103', tagName: 'Small spaces', tagSlug: 'small-spaces', tagColor: '#3b7ea1', tagDescription: 'Making more of less.', status: 'isActive' },
        { ltId: '104', tagName: 'Archive', tagSlug: 'archive', tagColor: '#777777', tagDescription: '', status: 'isNotActive' }
    ];

    var ARTICLE = [
        '<p>There is a particular calm that comes from a room built of <em>honest things</em> — timber that carries its grain, stone that keeps its weight, plaster that holds the light rather than reflecting it.</p>',
        '<p>We begin nearly every project not with a mood board but with a table of samples: a length of oak, an offcut of travertine, a swatch of undyed linen. Long before a single wall is drawn, we want to know how a space will feel under the hand and in changing light.</p>',
        '<p>Natural materials share a quality that synthetic ones rarely manage — they improve with use. A brass handle dulls to a soft glow. An oak floor deepens where feet fall most often.</p>',
        '<blockquote><p>A good material does not ask to be noticed. It simply makes the room feel true.</p><cite>— Demo Author, Founder</cite></blockquote>',
        '<h2>Warmth without excess</h2>',
        '<p>Warmth in an interior is often mistaken for abundance — more textiles, more objects, more colour. We find the opposite is true. Warmth comes from restraint: a limited palette of materials, repeated with care, allowed to breathe.</p>',
        '<p>Stone grounds a space; timber softens it; linen and wool bring the human scale back in. Held in balance, these three do almost all the work.</p>',
        '<figure><img src="' + img(2) + '" alt="Oak, travertine and lime plaster in the main living area"><figcaption>Oak, travertine and lime plaster in the main living area</figcaption></figure>',
        '<h2>Materials that age well</h2>',
        '<p>The most sustainable interior is the one nobody wants to replace. When materials are chosen for how gracefully they age, a space stays relevant for decades rather than seasons.</p>',
        '<h3>Choosing a palette</h3>',
        '<p>Start with the floor, then the largest wall surface, then everything that can be touched. Three honest materials are usually enough.</p>',
        '<ul><li>Pick one timber and use it everywhere</li><li>Keep metals to a single finish</li><li>Let one surface be the quiet star</li></ul>'
    ].join('');

    var TITLES = [
        ['Inside architect Ben Allen’s modernist ‘cottage in the sky’', 1, 1],
        ['Use of Natural Materials and Neutral Colors', 2, 2],
        ['Comparing Modern Design to Other Design Styles', 1, 3],
        ['A vibrant, mix-and-match approach with a free-spirited vibe', 3, 1],
        ['Gaining popularity in the 1980s, this style embraces a soft, vintage aesthetic', 2, 4],
        ['Why simplicity creates better spaces', 1, 2],
        ['Five quiet interiors shaped by restraint', 4, 3],
        ['Understanding natural timber', 3, 4],
        ['Light, shadow and the long afternoon', 2, 1],
        ['What a small kitchen can teach a large house', 4, 2],
        ['Building slowly: notes from a two-year renovation', 3, 3],
        ['The case for a single material palette', 1, 4],
        ['Stone floors, warm feet', 2, 1]
    ];

    function seed() {
        var posts = TITLES.map(function (t, i) {
            var category = DEFAULT_CATEGORIES[t[1] - 1];
            return {
                ltId: String(1000 + i), authorId: '1', title: t[0], slug: 'demo-post-' + (i + 1),
                excerpt: 'How do you create compelling presentations that wow your colleagues and impress your managers?',
                content: ARTICLE, readingTime: 4 + (i % 5), categoryId: category.ltId, category: category.categoryName,
                date: '2025-01-' + String(28 - i).padStart(2, '0') + ' 10:00:00', author: 'Demo Author',
                status: i === 4 ? 'draft' : (i === 7 ? 'scheduled' : 'published'),
                isFeatured: i === 0 ? 1 : 0, allowedComments: 1, seoTitle: '', seoDescription: '',
                viewCount: 1200 - i * 73, likeCount: 40 - i, commentCount: i % 4,
                media: [{ mediaId: String(5000 + i), mediaCategory: 'gallery', mimeType: 'image/png', originalName: 'cover-' + (i + 1) + '.png', storagePath: img(t[2]), altText: 'Interior, ' + category.categoryName.toLowerCase() }]
            };
        });
        /* a second author with two extra articles */
        [['maya-notes-1', 'Quiet corners and how to find them', 2, 3], ['maya-notes-2', 'Working with lime plaster', 3, 1]].forEach(function (t, k) {
            var category = DEFAULT_CATEGORIES[t[2] - 1];
            posts.push({
                ltId: String(1013 + k), authorId: '2', title: t[1], slug: t[0],
                excerpt: 'Notes from the studio on slowing a room down.', content: ARTICLE, readingTime: 5, categoryId: category.ltId, category: category.categoryName,
                date: '2025-01-' + String(10 - k).padStart(2, '0') + ' 09:00:00', author: 'Maya Okafor', status: 'published',
                isFeatured: 0, allowedComments: 1, seoTitle: '', seoDescription: '', viewCount: 300 - k * 40, likeCount: 6, commentCount: 0,
                media: [{ mediaId: String(5100 + k), mediaCategory: 'gallery', mimeType: 'image/png', originalName: 'maya-' + (k + 1) + '.png', storagePath: img(t[3]), altText: 'Studio detail' }]
            });
        });
        var firstPost = posts[0];
        return {
            nextId: 2000,
            posts: posts,
            comments: [
                { ltId: '3001', postId: firstPost.ltId, postSlug: firstPost.slug, title: firstPost.title, userId: '2', parentId: null, body: 'This is exactly the calm I want in my own home. The note about honest materials really landed.', status: 'approved', likes: 3, createdAt: '2025-01-29 08:10:00', commentedBy: 'Maya Okafor', likedBy: [] },
                { ltId: '3002', postId: firstPost.ltId, postSlug: firstPost.slug, title: firstPost.title, userId: '1', parentId: '3001', body: 'Thank you Maya, that means a lot.', status: 'approved', likes: 1, createdAt: '2025-01-29 09:00:00', commentedBy: 'Demo Author', likedBy: [] },
                { ltId: '3003', postId: firstPost.ltId, postSlug: firstPost.slug, title: firstPost.title, userId: '2', parentId: null, body: 'Could you share the oak finish you used on the floor?', status: 'pending', likes: 0, createdAt: '2025-01-30 11:30:00', commentedBy: 'Maya Okafor', likedBy: [] },
                { ltId: '3004', postId: firstPost.ltId, postSlug: firstPost.slug, title: firstPost.title, userId: '2', parentId: null, body: 'Cheap watches at great prices, click here!!!', status: 'spam', likes: 0, createdAt: '2025-01-30 12:00:00', commentedBy: 'Maya Okafor', likedBy: [] }
            ],
            reports: [
                { ltId: '4001', postId: firstPost.ltId, postSlug: firstPost.slug, title: firstPost.title, userId: '2', reason: 'copyright', comments: 'The second photo looks like it was taken from another website.', status: 'pending', createdAt: '2025-01-30 14:00:00', reportedBy: 'Maya Okafor', postAuthor: 'Demo Author' },
                { ltId: '4002', postId: posts[1].ltId, postSlug: posts[1].slug, title: posts[1].title, userId: '2', reason: 'spam', comments: '', status: 'dismissed', createdAt: '2025-01-28 10:00:00', reportedBy: 'Maya Okafor', postAuthor: 'Demo Author' }
            ],
            settings: [
                { ltId: '5001', settingKey: 'blog_menu', settingValue: 'Journal', status: 'isActive' },
                { ltId: '5002', settingKey: 'posts_per_page', settingValue: '12', status: 'isActive' }
            ],
            reactions: {},
            categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
            tags: JSON.parse(JSON.stringify(DEFAULT_TAGS)),
            users: [{ ltId: '1', username: 'demo', email: 'demo@example.com', password: 'demo1234', fullname: 'Demo Author', bio: 'Writes about quiet interiors.', location: 'Lagos, Nigeria', facebook: '', twitter: '', linkedin: '', avatar: '', joined: '2025-01-02 09:00:00' },
                { ltId: '2', username: 'maya', email: 'maya@example.com', password: 'maya1234', fullname: 'Maya Okafor', bio: 'Interior designer. Writes about plaster, timber and slow rooms.', location: 'Abuja, Nigeria', facebook: 'mayaokafor', twitter: '@mayaokafor', linkedin: 'https://www.linkedin.com/in/mayaokafor', avatar: '', joined: '2025-01-03 09:00:00' }]
        };
    }

    var state;
    try { state = JSON.parse(window.sessionStorage.getItem(STORE_KEY)); } catch (e) { state = null; }
    if (!state || !state.posts || !state.categories || !state.tags || !state.comments || !state.reports || !state.settings) state = seed();
    function persist() { try { window.sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* demo only */ } }

    function fail(message, code) {
        var error = new Error(message);
        error.code = code || 3004;
        throw error;
    }

    function me() {
        try { return JSON.parse(window.localStorage.getItem(window.RubicCore.Auth.userKey()) || 'null') || {}; } catch (e) { return {}; }
    }

    function commentTree(rows, userId) {
        var byId = {};
        var nodes = rows.map(function (c) {
            var user = state.users.filter(function (u) { return u.ltId === c.userId; })[0] || {};
            var node = { ltId: c.ltId, postId: c.postId, userId: c.userId, parentId: c.parentId, body: c.body, status: c.status, likes: c.likes, createdAt: c.createdAt,
                author: c.commentedBy, commentedBy: c.commentedBy, avatar: user.avatar || '', isLikedByUser: (c.likedBy || []).indexOf(userId) !== -1 ? 1 : 0,
                postSlug: c.postSlug, title: c.title, replies: [] };
            byId[c.ltId] = node;
            return node;
        });
        var roots = [];
        nodes.forEach(function (n) { if (n.parentId && byId[n.parentId]) byId[n.parentId].replies.push(n); else if (!n.parentId) roots.push(n); });
        return roots;
    }

    function requireAuth(options) {
        if (!options.auth) return;
        var tokenName = (window.RubicCore && window.RubicCore.Auth.tokenKey()) || '';
        var token = window.localStorage.getItem(tokenName);
        if (!token) { var e = new Error('Please sign in to continue.'); e.auth = true; throw e; }
    }

    function field(body, name) {
        if (typeof FormData !== 'undefined' && body instanceof FormData) return body.get(name);
        return body ? body[name] : undefined;
    }

    function publicUser(user) {
        var copy = Object.assign({}, user);
        delete copy.password;
        copy.posts = state.posts.filter(function (p) { return p.authorId === user.ltId; }).map(function (p) { return { ltId: p.ltId, title: p.title, slug: p.slug, media: p.media }; });
        copy.comments = [];
        return copy;
    }

    function respond(path, options) {
        options = options || {};
        var method = (options.method || 'GET').toUpperCase();
        var url = new URL(path, 'http://demo.local');
        var q = url.searchParams;
        var body = options.body;
        var match;

        /* ----- public reading ----- */
        if (method === 'GET' && url.pathname === '/blogs/filter/categories') {
            return state.categories.filter(function (c) { return c.status !== 'isNotActive'; }).map(function (c) { return { ltId: c.ltId, categoryName: c.categoryName }; });
        }

        if (method === 'GET' && url.pathname === '/blogs/filter/posts') {
            var page = Math.max(1, parseInt(q.get('page'), 10) || 1);
            var limit = parseInt(q.get('limit'), 10) || 12;
            var term = (q.get('q') || '').toLowerCase();
            var category = q.get('category') || '';
            var list = state.posts.filter(function (p) {
                return p.status === 'published' && (!category || p.categoryId === category) && (!term || (p.title + ' ' + p.excerpt).toLowerCase().indexOf(term) !== -1);
            });
            var pages = Math.max(1, Math.ceil(list.length / limit));
            return {
                data: list.slice((page - 1) * limit, page * limit),
                pagination: { totalItems: list.length, totalPages: pages, currentPage: page, itemsPerPage: limit, hasMore: page < pages }
            };
        }

        if (method === 'GET' && url.pathname === '/blogs/posts/widget') {
            var categoryId = q.get('categoryId');
            return state.posts.filter(function (p) { return p.status === 'published' && p.ltId !== q.get('postId') && (!categoryId || p.categoryId === categoryId); })
                .slice(0, parseInt(q.get('limit'), 10) || 3);
        }

        if (method === 'POST' && url.pathname === '/blogs/posts/view-update') return { ltId: '0', viewCount: 1 };

        match = url.pathname.match(/^\/blogs\/posts\/([^/]+)\/slug$/);
        if (method === 'GET' && match) {
            var slug = decodeURIComponent(match[1]);
            var found = state.posts.filter(function (p) { return p.slug === slug; })[0];
            if (!found) fail('No post found', 101);
            var viewer = me().ltId || '';
            var writer = state.users.filter(function (u) { return u.ltId === found.authorId; })[0] || {};
            var approved = state.comments.filter(function (c) { return c.postId === found.ltId && c.status === 'approved'; });
            return Object.assign({}, found, {
                bio: writer.bio || '', linkedin: writer.linkedin || '', twitter: writer.twitter || '', facebook: writer.facebook || '', avatar: writer.avatar || '',
                userReaction: (state.reactions[found.slug] || {})[viewer] || null, comments: commentTree(approved, viewer)
            });
        }

        /* ----- accounts ----- */
        if (method === 'POST' && url.pathname === '/blogs/auth/signin') {
            var login = String(field(body, 'email') || '').toLowerCase();
            var user = state.users.filter(function (u) { return u.email.toLowerCase() === login || u.username.toLowerCase() === login; })[0];
            if (!user || user.password !== field(body, 'password')) fail('No User Found, check your login credentials', 3018);
            return { tokenName: 'ltapp_token', ltapp_token: 'demo-token-' + user.ltId, ltId: user.ltId, username: user.username, email: user.email };
        }

        if (method === 'POST' && url.pathname === '/blogs/auth/signup') {
            if (field(body, 'password') !== field(body, 'confirmPass')) fail('Passwords do not match!', 3014);
            if (String(field(body, 'password')).length < 8) fail('Password must be at least 8 characters!', 3016);
            var taken = state.users.some(function (u) { return u.username === field(body, 'username') || u.email === field(body, 'email'); });
            if (taken) fail('User record already exist', 3017);
            var created = { ltId: String(state.nextId++), username: field(body, 'username'), email: field(body, 'email'), password: field(body, 'password'), fullname: field(body, 'name'), bio: '', location: '', facebook: '', twitter: '', linkedin: '', avatar: '', joined: '2025-01-28 09:00:00' };
            state.users.push(created); persist();
            return { ltId: created.ltId, userId: created.ltId, username: created.username, email: created.email, fullname: created.fullname };
        }

        requireAuth(options);

        match = url.pathname.match(/^\/blogs\/user\/([^/]+)\/record$/);
        if (method === 'GET' && match) {
            var who = state.users.filter(function (u) { return u.ltId === decodeURIComponent(match[1]); })[0];
            if (!who) fail('User not found', 3004);
            return publicUser(who);
        }

        if (method === 'POST' && url.pathname === '/blogs/user/update') {
            var target = state.users.filter(function (u) { return u.ltId === String(field(body, 'ltId')); })[0];
            if (!target) fail('User not found', 3004);
            ['fullname', 'bio', 'location', 'facebook', 'twitter', 'linkedin'].forEach(function (key) {
                var value = field(body, key); if (value !== null && value !== undefined) target[key] = String(value);
            });
            var avatar = field(body, 'avatarFile');
            if (avatar && avatar.size) target.avatar = URL.createObjectURL(avatar);
            persist();
            return { ltId: target.ltId, fullname: target.fullname };
        }

        if (method === 'POST' && url.pathname === '/blogs/user/change-password') {
            var owner = state.users.filter(function (u) { return u.ltId === String(field(body, 'userId')); })[0];
            if (!owner || owner.password !== field(body, 'currentPassword')) fail('Current Password is incorrect', 3008);
            owner.password = field(body, 'newPassword'); persist();
            return null;
        }

        match = url.pathname.match(/^\/blogs\/user\/([^/]+)$/);
        if (method === 'DELETE' && match) {
            var doomed = state.users.filter(function (u) { return u.ltId === decodeURIComponent(match[1]); })[0];
            if (!doomed || (field(body, 'confirmation') !== doomed.username && field(body, 'confirmation') !== 'DELETE')) fail('Invalid confirmation text. Deletion rejected.', 422);
            state.users = state.users.filter(function (u) { return u !== doomed; }); persist();
            return null;
        }



        /* ----- reader actions ----- */
        if (method === 'POST' && url.pathname === '/blogs/posts/react') {
            var reacted = state.posts.filter(function (p) { return p.slug === field(body, 'postSlug'); })[0];
            if (!reacted) fail('Post not found', 3004);
            (state.reactions[reacted.slug] = state.reactions[reacted.slug] || {})[me().ltId] = field(body, 'reaction'); persist();
            return null;
        }
        if (method === 'POST' && url.pathname === '/blogs/comments/create') {
            var target2 = state.posts.filter(function (p) { return p.slug === field(body, 'postSlug'); })[0];
            if (!target2) fail('Post not found', 3004);
            if (!String(field(body, 'body') || '').trim()) fail('Comment is required', 3004);
            var who = state.users.filter(function (u) { return u.ltId === me().ltId; })[0] || {};
            var created = { ltId: String(state.nextId++), postId: target2.ltId, postSlug: target2.slug, title: target2.title, userId: who.ltId || '1', parentId: field(body, 'parentId') || null,
                body: String(field(body, 'body')).trim(), status: 'approved', likes: 0, createdAt: '2025-02-01 10:00:00', commentedBy: who.fullname || who.username || 'Reader', likedBy: [] };
            state.comments.push(created); persist();
            return { ltId: created.ltId, postSlug: created.postSlug, author: created.commentedBy };
        }
        if (method === 'POST' && url.pathname === '/blogs/comments/like') {
            var liked = state.comments.filter(function (c) { return c.ltId === String(field(body, 'commentId')); })[0];
            if (!liked) fail('Comment not found', 3004);
            var uid = me().ltId, at = liked.likedBy.indexOf(uid);
            if (at === -1) { liked.likedBy.push(uid); liked.likes += 1; persist(); return 'liked'; }
            liked.likedBy.splice(at, 1); liked.likes = Math.max(0, liked.likes - 1); persist(); return 'unliked';
        }
        if (method === 'POST' && url.pathname === '/blogs/reports/create') {
            var flagged = state.posts.filter(function (p) { return p.slug === field(body, 'postSlug'); })[0];
            if (!flagged) fail('Post not found', 3004);
            var reporter = state.users.filter(function (u) { return u.ltId === me().ltId; })[0] || {};
            state.reports.unshift({ ltId: String(state.nextId++), postId: flagged.ltId, postSlug: flagged.slug, title: flagged.title, userId: reporter.ltId, reason: field(body, 'reason'), comments: field(body, 'comments') || '',
                status: 'pending', createdAt: '2025-02-01 10:30:00', reportedBy: reporter.fullname || reporter.username, postAuthor: flagged.author }); persist();
            return null;
        }

        /* ----- moderation ----- */
        if (method === 'GET' && url.pathname === '/blogs/comments') {
            if (!state.comments.length) fail('No Comments Found', 101);
            return commentTree(state.comments.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; }), '');
        }
        if (method === 'POST' && url.pathname === '/blogs/comments/update-status') {
            var moderated = state.comments.filter(function (c) { return c.ltId === String(field(body, 'ltId')); })[0];
            if (!moderated) fail('Comment not found', 3004);
            if (['pending', 'approved', 'spam', 'deleted'].indexOf(field(body, 'status')) === -1) fail('Invalid status', 3004);
            moderated.status = field(body, 'status'); persist();
            return { ltId: moderated.ltId, status: moderated.status };
        }
        match = url.pathname.match(/^\/blogs\/comments\/([^/]+)$/);
        if (method === 'DELETE' && match) {
            var gone = state.comments.filter(function (c) { return c.ltId === decodeURIComponent(match[1]); })[0];
            if (!gone) fail('Comment not found', 3004);
            state.comments = state.comments.filter(function (c) { return c !== gone && c.parentId !== gone.ltId; }); persist();
            return null;
        }
        if (method === 'GET' && url.pathname === '/blogs/reports') {
            if (!state.reports.length) fail('No Reports Found', 101);
            return state.reports;
        }
        if (method === 'POST' && url.pathname === '/blogs/reports/update-status') {
            var report = state.reports.filter(function (r) { return r.ltId === String(field(body, 'ltId')); })[0];
            if (!report) fail('Report not found', 3004);
            if (['pending', 'reviewed', 'dismissed', 'action_taken'].indexOf(field(body, 'status')) === -1) fail('Invalid status', 3004);
            report.status = field(body, 'status'); persist();
            return { ltId: report.ltId, status: report.status };
        }
        match = url.pathname.match(/^\/blogs\/reports\/([^/]+)$/);
        if (method === 'DELETE' && match) {
            var before2 = state.reports.length;
            state.reports = state.reports.filter(function (r) { return r.ltId !== decodeURIComponent(match[1]); });
            if (state.reports.length === before2) fail('Report not found', 3004);
            persist();
            return null;
        }

        /* ----- categories and tags (mirrors MdBlog, including its off-by-one duplicate check) ----- */
        var kinds = {
            '/blogs/categories': { list: 'categories', name: 'categoryName', label: 'Category', fields: ['categoryName', 'categoryDescription', 'showOnMenu'] },
            '/blogs/tags': { list: 'tags', name: 'tagName', label: 'Tag', fields: ['tagName', 'tagSlug', 'tagDescription', 'tagColor'] },
            '/blogs/settings': { list: 'settings', name: 'settingName', label: 'Setting', fields: ['settingName', 'settingValue'] }
        };
        var base = Object.keys(kinds).filter(function (b) { return url.pathname === b || url.pathname.indexOf(b + '/') === 0; })[0];
        if (base) {
            var kindInfo = kinds[base], bucket = state[kindInfo.list];
            var rest = url.pathname.slice(base.length).split('/').filter(Boolean);
            if (!rest.length && method === 'GET') {
                var wantedStatus = q.get('status');
                return bucket.filter(function (row) { return !wantedStatus || row.status === wantedStatus; });
            }
            if (!rest.length && method === 'POST') {
                var newName = String(field(body, kindInfo.name) || '').trim();
                if (!newName) fail(kindInfo.label + ' name and code is required', 3004);
                if (bucket.filter(function (row) { return (row[kindInfo.name] || row.settingKey) === newName; }).length > 1) fail(kindInfo.label + ' already exist', 3004);
                var row = { ltId: String(state.nextId++), status: 'isActive' };
                kindInfo.fields.forEach(function (key) { var v = field(body, key); row[key === 'settingName' ? 'settingKey' : key] = key === 'showOnMenu' ? Number(v) : (v === null || v === undefined ? '' : String(v)); });
                bucket.push(row); persist();
                return row;
            }
            var target = bucket.filter(function (row) { return row.ltId === decodeURIComponent(rest[0] || ''); })[0];
            if (!target) fail(kindInfo.label + ' not found', 3004);
            if (rest.length === 2 && rest[1] === 'toggle-active' && method === 'PATCH') {
                target.status = target.status === 'isNotActive' ? 'isActive' : 'isNotActive'; persist();
                return { ltId: target.ltId, isActive: target.status };
            }
            if (rest.length === 1 && method === 'PATCH') {
                kindInfo.fields.forEach(function (key) { if (key === 'settingName') return; var v = field(body, key); if (v !== null && v !== undefined) target[key] = key === 'showOnMenu' ? Number(v) : String(v); });
                persist();
                return target;
            }
            if (rest.length === 1 && method === 'DELETE') {
                state[kindInfo.list] = bucket.filter(function (row) { return row !== target; }); persist();
                return null;
            }
        }

        /* ----- management ----- */
        if (method === 'GET' && url.pathname === '/blogs/admin/dashboard-metrics') {
            var published = state.posts.filter(function (p) { return p.status === 'published'; });
            var byCategory = {};
            state.posts.forEach(function (p) { byCategory[p.category] = (byCategory[p.category] || 0) + p.viewCount; });
            return {
                cards: {
                    totalViews: state.posts.reduce(function (n, p) { return n + p.viewCount; }, 0),
                    totalArticles: published.length,
                    totalComments: state.posts.reduce(function (n, p) { return n + p.commentCount; }, 0),
                    totalTaxonomies: state.categories.length + state.tags.length,
                    pendingComments: 3, pendingReports: 1
                },
                topCategories: Object.keys(byCategory).map(function (name) { return { name: name, viewCount: byCategory[name] }; })
                    .sort(function (a, b) { return b.viewCount - a.viewCount; }).slice(0, 5),
                trend: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (label, i) { return { label: label, views: [320, 410, 380, 520, 610, 450, 380][i] }; })
            };
        }

        if (method === 'GET' && url.pathname === '/blogs/posts') {
            var mine = q.get('id'), wanted = q.get('status');
            var rows = state.posts.filter(function (p) { return (!mine || p.authorId === mine) && (!wanted || p.status === wanted); });
            if (!rows.length) fail('No Post found', 101);
            return rows;
        }

        if (method === 'POST' && url.pathname === '/blogs/posts') {
            var slugValue = String(field(body, 'slug') || '');
            if (!String(field(body, 'title') || '').trim()) fail('Post Title is required', 3004);
            if (state.posts.some(function (p) { return p.slug === slugValue; })) fail('Post already exists', 3004);
            var categoryOf = state.categories.filter(function (c) { return c.ltId === String(field(body, 'categoryId')); })[0];
            var id = String(state.nextId++);
            var files = body.getAll ? body.getAll('additionalMedia[]') : [];
            var post = {
                ltId: id, authorId: (JSON.parse(window.localStorage.getItem(window.RubicCore.Auth.userKey()) || '{}').ltId) || '1',
                title: field(body, 'title'), slug: slugValue, excerpt: field(body, 'excerpt') || '', content: field(body, 'content') || '',
                readingTime: Number(field(body, 'readingTime')) || 1, categoryId: categoryOf ? categoryOf.ltId : '', category: categoryOf ? categoryOf.categoryName : '',
                date: '2025-01-28 12:00:00', author: 'Demo Author', status: field(body, 'status') || 'draft',
                isFeatured: Number(field(body, 'isFeatured')) || 0, allowedComments: field(body, 'allowedComment') === 'on' ? 1 : 0,
                seoTitle: field(body, 'seoTitle') || '', seoDescription: field(body, 'seoDescription') || '',
                viewCount: 0, likeCount: 0, commentCount: 0,
                media: files.filter(function (f) { return f && f.size; }).map(function (f, i) { return { mediaId: id + '-' + i, mimeType: f.type, originalName: f.name, storagePath: URL.createObjectURL(f), altText: '' }; })
            };
            state.posts.unshift(post); persist();
            return { ltId: id, title: post.title, slug: post.slug, status: post.status };
        }

        match = url.pathname.match(/^\/blogs\/posts\/([^/]+)$/);
        if (match && method === 'POST' && field(body, '_method') === 'PATCH') {
            var existing = state.posts.filter(function (p) { return p.ltId === decodeURIComponent(match[1]); })[0];
            if (!existing) fail('Post not found', 3004);
            if (state.posts.some(function (p) { return p !== existing && p.slug === field(body, 'slug'); })) fail('Post already exists', 3004);
            ['title', 'slug', 'excerpt', 'content', 'seoTitle', 'seoDescription', 'status'].forEach(function (key) {
                var value = field(body, key); if (value !== null && value !== undefined) existing[key] = value;
            });
            if (field(body, 'readingTime')) existing.readingTime = Number(field(body, 'readingTime'));
            if (field(body, 'isFeatured') !== null && field(body, 'isFeatured') !== undefined) existing.isFeatured = Number(field(body, 'isFeatured'));
            existing.allowedComments = field(body, 'allowedComment') === 'on' ? 1 : 0;   /* mirrors MdBlog's update() */
            var cat = state.categories.filter(function (c) { return c.ltId === String(field(body, 'categoryId')); })[0];
            if (cat) { existing.categoryId = cat.ltId; existing.category = cat.categoryName; }
            var removed = JSON.parse(field(body, 'deletedMedia') || '[]').map(String);
            existing.media = existing.media.filter(function (m) { return removed.indexOf(String(m.mediaId)) === -1; });
            (body.getAll('additionalMedia[]') || []).filter(function (f) { return f && f.size; }).forEach(function (f, i) {
                existing.media.push({ mediaId: existing.ltId + '-n' + i, mimeType: f.type, originalName: f.name, storagePath: URL.createObjectURL(f), altText: '' });
            });
            persist();
            return { ltId: existing.ltId, title: existing.title, slug: existing.slug };
        }

        if (match && method === 'DELETE') {
            var before = state.posts.length;
            state.posts = state.posts.filter(function (p) { return p.ltId !== decodeURIComponent(match[1]); });
            if (state.posts.length === before) fail('Post not found', 3004);
            persist();
            return null;
        }

        fail('The demo backend does not implement ' + method + ' ' + url.pathname, 404);
    }

    window.RubicDemo = { handle: respond, reset: function () { state = seed(); persist(); } };
})();
