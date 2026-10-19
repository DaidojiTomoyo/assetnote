# Web Application Instructions

These rules apply to `apps/web` in addition to the repository instructions.

## Before editing

- Read `../../AGENTS.md` and `../../docs/architecture/overview.md`.
- Before writing Next.js code, read the relevant guide in `apps/web/node_modules/next/dist/docs/` from the repository root. Do not rely on remembered APIs or conventions.
- Keep route-local code close to its route. Introduce a feature directory only when code is reused or the feature has enough behavior to justify one.

## Responsibilities and structure

- `app/` owns routes, layouts, metadata, loading/error boundaries, and page-level composition.
- `features/<feature>/`, when introduced, owns product-specific UI behavior, feature components, and mapping between transport data and view models.
- `components/` owns app-wide composition components. Generic primitives belong in `@workspace/ui`.
- `lib/` owns web-delivery adapters such as the API client, session/auth UI integration, and validated configuration. Identity/session integration does not make the Web authoritative for authorization decisions.
- Prefer Server Components. Add `"use client"` only at the lowest boundary that needs browser state, effects, event handling, or browser-only APIs.

## Boundaries

- Never import from `apps/api`, API source paths, persistence code, or server-only internals.
- Access the backend through a centralized API client boundary; do not scatter base URLs, endpoint strings, or ad hoc response parsing through components.
- Obtain market data through the AssetNote API. Do not depend on `stock-sdk`, call provider endpoints directly, or expose vendor response types to components.
- When `@workspace/contracts` exists, use its public runtime schemas/types at the HTTP boundary and map them to UI-specific view models where needed.
- Do not access the database or reimplement API-owned business rules in Next.js route handlers, Server Actions, or components.
- Browser code may read only explicitly public environment variables. Keep secrets and privileged API calls server-side.

## UI quality

- Preserve semantic HTML, keyboard operation, focus behavior, labels, and useful loading/empty/error states.
- Keep product-specific styling and composition in the application; extend `@workspace/ui` only when the primitive is genuinely reusable.
- Treat `@workspace/ui` as a Web component package. Do not add React Native compatibility shims or weaken its DOM and accessibility semantics for the Mobile client.
- Avoid unnecessary client state and effects when the same result can be derived during rendering or on the server.

## Verification

- Run `pnpm --filter web lint` and `pnpm --filter web typecheck` for code changes.
- Run relevant tests when available and `pnpm --filter web build` for routing, rendering, configuration, or dependency changes.
- For a cross-boundary feature, also run the API/contract checks required by the root instructions.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
