# ThemeRubicBlog

An editorial blog theme for [LifeTech OCMS](https://www.lifetech.host/hubs/docs), built on the **MdBlog** module. It covers the public journal (listing, articles, categories, authors, reactions and comments) and the author-side management screens (dashboard, posts, a block editor, categories, tags, moderation and settings).

**Version:** 1.1.0 · **Package:** `ThemeRubicBlog` · **Requires:** MdBlog 2.0.3

## Features

**Public journal**
- Featured-post hero, category filter, search and pagination on the journal home.
- Article pages with a table of contents, share links, related articles, reactions, comments (with replies and likes) and a report option.
- Category archives and author pages.
- Responsive layout, keyboard-friendly, with a skip link and reduced-motion support.
- Article bodies are passed through an allow-list HTML sanitiser before display.

**Management** (signed-in users)
- Dashboard with views, article counts, a views-over-time chart and top categories.
- Posts: list, search, status filter, delete.
- Post editor built on [Editor.js](https://editorjs.io/) (headings, lists, quotes, images, code, dividers) with category, excerpt, SEO fields, featured flag, comment setting and image gallery.
- Categories, tags and MdBlog settings: add, edit, enable/disable, delete.
- Comment and report moderation.
- Profile: details, avatar, password and account deletion.

## Requirements

- LifeTech OCMS
- MdBlog 2.0.3, installed, with at least one published post
- Role access to MdBlog's routes (see [Permissions](#permissions))

## Installation

1. Install **MdBlog** from the Marketplace or *Packages → Modules*.
2. Install this theme (*Packages → Themes Development → Install Theme*), or copy the folder to `packages/themes/ThemeRubicBlog/` and run **Sync Files**.
3. Open the theme and check that every component has **Is Theme Default = No**. The layouts import the components explicitly, and leaving them on makes OCMS render each one twice.
4. Check that these views use `AdminLayout.html`: `Dashboard`, `ManagePosts`, `PostEditor`, `Profile`, `ManageCategories`, `ManageTags`, `ManageComments`, `ManageReports`, `ManageSettings`. The mappings are listed in `Storage/Layouts/PendingLayouts.json` and the platform applies them when it processes pending layouts.
5. **Publish** the theme, then set it as the default theme or assign it to pages.
6. Rename the auto-generated menu entries (`Blog.html`, and so on) in the backend if you show OCMS menus.

> `?preview_theme=ThemeRubicBlog` shows the theme's files one after another rather than a rendered page. To see the design, open the real pages (for example `/ThemeRubicBlog/Blog`).

## Pages

| View | Route | Layout |
| --- | --- | --- |
| `Blog.html` | `/ThemeRubicBlog/Blog` | Default |
| `Post.html` | `/ThemeRubicBlog/Post?slug=<slug>` | Default |
| `Category.html` | `/ThemeRubicBlog/Category?category=<id>` | Default |
| `Author.html` | `/ThemeRubicBlog/Author?id=<authorId>` | Default |
| `SignIn.html` | `/ThemeRubicBlog/SignIn` | Default |
| `SignUp.html` | `/ThemeRubicBlog/SignUp` | Default |
| `Dashboard.html` | `/ThemeRubicBlog/Dashboard` | AdminLayout |
| `ManagePosts.html` | `/ThemeRubicBlog/ManagePosts` | AdminLayout |
| `PostEditor.html` | `/ThemeRubicBlog/PostEditor[?slug=<slug>]` | AdminLayout |
| `ManageCategories.html` | `/ThemeRubicBlog/ManageCategories` | AdminLayout |
| `ManageTags.html` | `/ThemeRubicBlog/ManageTags` | AdminLayout |
| `ManageComments.html` | `/ThemeRubicBlog/ManageComments` | AdminLayout |
| `ManageReports.html` | `/ThemeRubicBlog/ManageReports` | AdminLayout |
| `ManageSettings.html` | `/ThemeRubicBlog/ManageSettings` | AdminLayout |
| `Profile.html` | `/ThemeRubicBlog/Profile` | AdminLayout |

## Permissions

OCMS only lets a role call a route once the route is published to it (in the backend's page/route access settings). MdBlog routes start out Developer-only.

**Anonymous visitors** need:

- `GET /blogs/filter/posts`, `GET /blogs/filter/categories`, `GET /blogs/posts/widget`, `GET /blogs/posts/{slug}/slug`
- `POST /blogs/posts/view-update`
- `POST /blogs/auth/signin`, `POST /blogs/auth/signup`

and the `Blog`, `Post`, `Category`, `Author`, `SignIn` and `SignUp` pages published to the Anonymous role.

**Signed-in users** need the routes behind the screens they use:

| Screen | Routes |
| --- | --- |
| Article reactions, comments, reports | `POST /blogs/posts/react`, `POST /blogs/comments/create`, `POST /blogs/comments/like`, `POST /blogs/reports/create` |
| Profile | `GET /blogs/user/{id}/record`, `POST /blogs/user/update`, `POST /blogs/user/change-password`, `DELETE /blogs/user/{id}` |
| Dashboard | `GET /blogs/admin/dashboard-metrics` |
| Posts and editor | `GET /blogs/posts`, `POST /blogs/posts`, `POST /blogs/posts/{id}` (sent with `_method=PATCH`), `DELETE /blogs/posts/{id}` |
| Categories | `GET/POST /blogs/categories`, `PATCH/DELETE /blogs/categories/{id}`, `PATCH /blogs/categories/{id}/toggle-active` |
| Tags | `GET/POST /blogs/tags`, `PATCH/DELETE /blogs/tags/{id}`, `PATCH /blogs/tags/{id}/toggle-active` |
| Comments | `GET /blogs/comments`, `POST /blogs/comments/update-status`, `DELETE /blogs/comments/{id}` |
| Reports | `GET /blogs/reports`, `POST /blogs/reports/update-status`, `DELETE /blogs/reports/{id}` |
| Settings | `GET/POST /blogs/settings`, `PATCH/DELETE /blogs/settings/{id}`, `PATCH /blogs/settings/{id}/toggle-active` |

The management routes change or delete content, so give them only to the roles that should manage the blog. Hiding a button in the theme is not authorisation: the backend decides.

## Authentication

Sign-in stores the token in `localStorage` under the key the platform returns (`tokenName`), the same way MdBlog's own screens do, and sends it as `Authorization: Bearer <token>`. Management pages redirect to Sign in when there is no token.

## Customising

- **Colours, type and spacing:** the variables at the top of `Assets/css/Style.css`.
- **Fonts:** Archivo, Manrope and Newsreader are loaded from Google Fonts in `Components/TopHeader.html`. Remove that link (or self-host the fonts) if you cannot make third-party requests.
- **Journal heading:** the title on the journal home is set in `Views/Blog.html`.
- **Site name, logo, contact details, social links and copyright** come from the site settings in the backend and appear in the header and footer.
- **Page titles** come from OCMS (`ltPageTitle()`); article pages set their own title from the post.

## Structure

```
Layouts/       Default.html (public)  ·  AdminLayout.html (management)
Components/    TopHeader · Header · Footer · Scripts · AdminSidebar · AdminTopbar
Views/         the pages listed above
Assets/css/    Style.css
Assets/js/     Script.js      core: API client, authentication, toasts, dialogs, sanitiser, journal and article pages
               Reader.js      author page, reactions, comments, reporting
               Account.js     sign-in, sign-up, profile
               Admin.js       management shell, dashboard, post list
               PostEditor.js  Editor.js integration and body conversion
               Taxonomy.js    categories, tags, settings
               Moderation.js  comments, reports
               vendor/        Editor.js and its tools, bundled unmodified
               Demo.js        sample backend (see below)
Storage/Layouts/  layout mappings processed by the platform
```

Stylesheet and script URLs carry a version taken from the file's modified time, so browsers pick up changes without clearing their cache.
