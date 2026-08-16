# admin-web

Super Admin / District Admin console for the Vanigar Ani Bearer Platform —
post/jurisdiction/bearer management, event creation, and the collection
dashboard. See `../specs/001-bearer-hierarchy-register/` (and 002, 003) for
the specs this implements.

## Razorpay test-mode (feature 002)

admin-web never talks to Razorpay directly — it only creates/closes Events
and reads the collection dashboard, both plain backend API calls. The
Razorpay integration (Order creation, Checkout, webhook verification) is
entirely `backend`'s and mobile's concern; see `../backend/README.md` for
setting up a test-mode key pair, and `../mobile/README.md` for exercising
the actual Checkout flow. With the backend's default `PAYMENT_PROVIDER=mock`,
`EventDashboard.tsx` and `EventForm.tsx` work end-to-end against
locally-verified (self-signed webhook) Contributions with no Razorpay
account needed.

## News module (feature 003)

`pages/news/PostComposer.tsx` uses Tiptap (`@tiptap/react` + `starter-kit` +
`extension-link` + `extension-image`) for the rich-text body; `editor.getHTML()`
is sent to the backend as-is — sanitization happens server-side
(`backend/src/modules/news/sanitize.util.ts`) on every write, so the client
never needs its own allow-list logic. `?edit=<id>` in the URL loads an
existing `DRAFT` into the composer via `GET /news/:id/edit` (an admin-only
route distinct from the bearer-facing `GET /news/:id`, which 404s anything
not currently visible in a feed — a draft never is). Publishing is
fire-and-forget on the backend (`FanoutJob` isn't awaited), so "Published —
bearers in scope are being notified" appears immediately; there's no
in-app way to watch fan-out progress beyond the backend's own logs.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
