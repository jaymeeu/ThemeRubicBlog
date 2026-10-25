# ThemeRubicBlog

Editorial blog theme for LifeTech OCMS, powered by the **MdBlog** module. It covers the public journal and the author-side management screens.

## Requirements

- LifeTech OCMS
- MdBlog 2.0.0, installed and with posts published
- MdBlog routes published to the right roles. Visitors (Anonymous) need:
  `GET /blogs/filter/posts`, `GET /blogs/filter/categories`, `GET /blogs/posts/widget`,
  `GET /blogs/posts/{slug}/slug`, `POST /blogs/posts/view-update`,
  `POST /blogs/auth/signin`, `POST /blogs/auth/signup`.
  Signed-in users (Authenticated) need the account and management routes used below.

## Screens

| View | Route | Layout | API used |
| --- | --- | --- | --- |
| `Blog.html` | `/ThemeRubicBlog/Blog` | Default | `GET /blogs/filter/posts`, `GET /blogs/filter/categories` |
| `Post.html` | `/ThemeRubicBlog/Post?slug=` | Default | `GET /blogs/posts/{slug}/slug`, `GET /blogs/posts/widget`, `POST /blogs/posts/view-update` |
| `SignIn.html` | `/ThemeRubicBlog/SignIn` | Default | `POST /blogs/auth/signin` |
| `SignUp.html` | `/ThemeRubicBlog/SignUp` | Default | `POST /blogs/auth/signup` |
| `Profile.html` | `/ThemeRubicBlog/Profile` | AdminLayout | `GET /blogs/user/{id}/record`, `POST /blogs/user/update`, `POST /blogs/user/change-password`, `DELETE /blogs/user/{id}` |
| `Dashboard.html` | `/ThemeRubicBlog/Dashboard` | AdminLayout | `GET /blogs/admin/dashboard-metrics` |
| `ManagePosts.html` | `/ThemeRubicBlog/ManagePosts` | AdminLayout | `GET /blogs/posts`, `DELETE /blogs/posts/{id}` |
| `Category.html` | `/ThemeRubicBlog/Category?category=<id>` | Default | `GET /blogs/filter/posts`, `GET /blogs/filter/categories` |
| `Author.html` | `/ThemeRubicBlog/Author?id=<authorId>` | Default | `GET /blogs/filter/posts` (filtered by author in the page), `GET /blogs/posts/{slug}/slug` |
| `PostEditor.html` | `/ThemeRubicBlog/PostEditor[?slug=]` | AdminLayout | `GET /blogs/posts`, `GET /blogs/posts/{slug}/slug`, `POST /blogs/posts`, `POST /blogs/posts/{id}` (with `_method=PATCH`) |
| `ManageCategories.html` | `/ThemeRubicBlog/ManageCategories` | AdminLayout | `GET/POST /blogs/categories`, `PATCH/DELETE /blogs/categories/{id}`, `PATCH /blogs/categories/{id}/toggle-active` |
| `ManageTags.html` | `/ThemeRubicBlog/ManageTags` | AdminLayout | `GET/POST /blogs/tags`, `PATCH/DELETE /blogs/tags/{id}`, `PATCH /blogs/tags/{id}/toggle-active` |
| `ManageComments.html` | `/ThemeRubicBlog/ManageComments` | AdminLayout | `GET /blogs/comments`, `POST /blogs/comments/update-status`, `DELETE /blogs/comments/{id}` |
| `ManageReports.html` | `/ThemeRubicBlog/ManageReports` | AdminLayout | `GET /blogs/reports`, `POST /blogs/reports/update-status`, `DELETE /blogs/reports/{id}` |
| `ManageSettings.html` | `/ThemeRubicBlog/ManageSettings` | AdminLayout | `GET/POST /blogs/settings`, `PATCH/DELETE /blogs/settings/{id}`, `PATCH /blogs/settings/{id}/toggle-active` |

The article page (`Post.html`) also uses `POST /blogs/posts/react`, `POST /blogs/comments/create`, `POST /blogs/comments/like` and `POST /blogs/reports/create` for reactions, comments and reporting. Those need a signed-in user.

## Structure

- `Layouts/Default.html`: public pages (selected automatically).
- `Layouts/AdminLayout.html`: sidebar + top bar for management pages. Assigned through `Storage/Layouts/PendingLayouts.json`; check the assignments after syncing.
- `Components/`: `TopHeader`, `Header`, `Footer`, `Scripts` (config and script tags), `AdminSidebar`, `AdminTopbar`.
- `Assets/css/Style.css`: all styling, driven by CSS variables.
- `Assets/js/Script.js`: shared core (API client, authentication, toasts, dialogs, HTML sanitiser) and the reader pages.
- `Assets/js/Account.js`, `Admin.js`, `PostEditor.js`: sign-in/up/profile, dashboard/post list, and the editor.
- `Assets/js/vendor/`: Editor.js and its tools, bundled unmodified (see `LICENSE-EDITORJS.txt`).
- `Assets/js/Demo.js`, `Assets/img/demo-*.png`: sample backend for previewing. Remove before a release.

## Authentication

Sign-in stores the token in `localStorage` under the key the platform returns (`tokenName`), the same way MdBlog's own screens do, and sends it as `Authorization: Bearer <token>`. Management pages redirect to Sign in when there is no token. Menu or button visibility is not authorisation: the backend still decides.

## Previewing with sample data

Add `?demo=1` to any page, for example `/ThemeRubicBlog/Blog?demo=1`. The demo backend keeps its state in `sessionStorage`. Sign in with `demo` / `demo1234`.

## Installation notes

1. Install MdBlog, then install or create this theme package.
2. Run Sync Files, then publish the theme and set it as default (or assign it to pages).
3. Set **Is Theme Default = No** on every component; the layouts import them explicitly.
4. Confirm every management view (`Dashboard`, `ManagePosts`, `PostEditor`, `Profile`, `ManageCategories`, `ManageTags`, `ManageComments`, `ManageReports`, `ManageSettings`) uses `AdminLayout.html`.
5. Rename the auto-generated menu entries in the backend if you display OCMS menus.

## Known limits

- Public author pages are built from the published-posts list only. MdBlog's `GET /blogs/user/{id}/record` returns the author's email and unpublished drafts, so the theme uses it only for the signed-in user's own profile.
- MdBlog settings: only `blog_menu` is read by the module today.
- Commenting depends on MdBlog's `create()` saving the comment (see the MdBlog notes below).
- MdBlog cannot attach tags to posts (its post API has no tags field), so tags are a standalone list for now.
- MdBlog rejects a duplicate category/tag name only once two copies exist; the theme also checks the loaded list.
- The article endpoint does not return a post's status, featured flag or SEO fields, so the editor reads them from the author's post list; if MdBlog omits them, those fields are left alone unless changed.
- Uploaded editor images are sent as base64 and converted to files by MdBlog on save.

## MdBlog notes (package issues, not patched here)

- `TbBlogCommentService::create()` contains a stray `return $this->userId;` before the insert, so comments are never saved.
- `TbBlogPostService::dashboardMetrics()` groups by `DATE(published_at)` but selects/orders by `published_at`, which fails under `ONLY_FULL_GROUP_BY`.
- `tb_blog_post` has leftover `NOT NULL` columns `fileSize`, `originalName`, `filename` that block saving a post.
- Category, tag and setting duplicate checks use `count(...) > 1` instead of `> 0`.
- `userRecord` returns the author's email and all of their posts (including drafts) to any caller who can reach the route.

## License

See LICENSE. Editor.js and its tools keep their own licences (`Assets/js/vendor/LICENSE-EDITORJS.txt`).
