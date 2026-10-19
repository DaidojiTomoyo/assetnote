# AssetNote Architecture

- Status: baseline v3
- Last updated: 2026-10-13

## Purpose

This document defines AssetNote's durable system boundaries. It is intentionally small enough to guide everyday development while the product is young. Root and workspace `AGENTS.md` files translate these decisions into execution rules for coding agents.

The baseline favors explicit ownership, one-way dependencies, and runtime-validated boundaries. It does not require empty abstraction layers or speculative shared packages.

## Current system context

AssetNote currently contains three deployable applications:

- `apps/web`: the Next.js user experience and web delivery layer.
- `apps/api`: the NestJS backend and authority for business rules and persistent product data.
- `apps/mobile`: the Expo and React Native application for iOS and Android.

Shared packages provide reusable libraries and tooling to applications. They are not independently deployable runtimes or alternate application layers. `packages/contracts` now supplies runtime HTTP schemas for Web/API authentication.

```text
Browser
   |
   v
apps/web -----------------------> packages/ui
   |
   | HTTP
   v
apps/api
   ^
   | HTTP
apps/mobile
   ^
   |
Native device

apps/* ------------------------> packages/*
packages/* ---------X----------> apps/*
apps/* ------------X-----------> another app's source
```

The HTTP arrows describe the only permitted runtime boundary between client applications and the API. Web now consumes authentication over HTTP; Mobile remains an unauthenticated shell.

## Accepted next boundary

The next accepted but unimplemented capability is `market-data`: an API-owned feature whose first provider adapter is planned to use `stock-sdk`.

`packages/contracts` was introduced with the first Web/API authentication contract. In the target diagram, `[planned]` marks a feature or dependency that does not exist yet.

```text
apps/api
  `-- src/modules/market-data [planned]
        `-- stock-sdk adapter [planned]
              `-- external market-data sources

apps/web --------\
apps/mobile [future consumer] ---> packages/contracts
apps/api --------/

apps/* ------------------------> packages/*
packages/* ---------X----------> apps/*
apps/* ------------X-----------> another app's source
```

## Workspace ownership

| Current workspace            | Owns                                                                               | Must not own                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/web`                   | Routes, presentation, interaction, web orchestration, API/session adapters         | Persistence, API business invariants, authorization policy, API implementation     |
| `apps/api`                   | Use cases, business rules, authorization policy, persistence, backend integrations | Client UI or delivery-framework concerns                                           |
| `apps/mobile`                | Native routes, presentation, interaction, device integration, API/session adapters | Persistence, API business invariants, Web UI, backend integrations                 |
| `packages/ui`                | Reusable Web React/DOM primitives, CSS, and browser styling foundations            | Native UI, product workflows, API access, auth policy, domain assumptions          |
| `packages/contracts`         | Framework-independent runtime HTTP schemas and inferred transport types            | Domain entities, ORM models, API clients, credential storage, authorization policy |
| `packages/eslint-config`     | Shared static-analysis policy                                                      | Application behavior                                                               |
| `packages/typescript-config` | Shared compiler defaults                                                           | Application behavior                                                               |

The accepted target introduces these ownership boundaries only when their implementation is created:

| Planned workspace or feature       | Owns                                                                            | Must not own                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `apps/api/src/modules/market-data` | Provider-neutral market-data use cases, policy, ports, and third-party adapters | Client rendering, vendor-shaped HTTP contracts, unrestricted upstream proxying |

## Architecture invariants

1. Applications communicate through protocols, not source-code imports.
2. Applications may consume packages; packages never consume applications.
3. A workspace's internal source is private. Runtime/library packages expose public package exports; tooling packages expose documented configuration entrypoints.
4. The API is the authority for persistent product data and business invariants.
5. Every untrusted boundary is validated at runtime; TypeScript types do not replace validation.
6. Transport models, domain models, persistence models, and view models may resemble one another but are not the same ownership boundary.
7. Shared code is extracted for a stable boundary or real multi-consumer reuse, not anticipated reuse.
8. Client applications obtain external market data through the API; provider networking and provider policy remain backend integrations.
9. UI reuse must respect the runtime platform. A Web component package is not a React Native package merely because both use React.

## Web baseline

The web application follows the Next.js App Router model.

- `app/` is the delivery and composition layer: routes, layouts, metadata, loading/error boundaries, and server-side page orchestration.
- Server Components are the default. Client Components are narrow interactive leaves.
- Product behavior may be grouped under `features/<feature>` when a feature becomes larger than route-local code.
- `lib/` contains technical boundaries such as a centralized API client, auth integration, and validated configuration.
- Generic Web UI primitives live in `@workspace/ui`; product-specific components remain in the Web application.
- The web layer may orchestrate a user interaction, but it does not duplicate API-owned business decisions or access product persistence directly.

Backend calls pass through a centralized client boundary. That boundary owns base URL configuration, request policy, runtime response validation, and normalized errors. Components must not each invent those concerns.

## Mobile baseline

ADR 0003 is implemented by the `apps/mobile` workspace. The current implementation is an unauthenticated Expo Router shell; it does not yet consume an API feature or create a shared transport contract.

- The workspace uses Expo SDK 57, React Native, TypeScript, and Expo Router for an iOS and Android application.
- `src/app` contains route and layout files only. Product behavior belongs under `src/features`; application-local Native components belong under `src/components`; API, authentication, and configuration adapters belong under `src/lib` when those responsibilities appear.
- When an API feature is integrated, Mobile communicates through a centralized HTTP client boundary and does not import another application's source or access persistence and third-party market providers directly.
- `@workspace/ui` remains Web-only. Native components stay inside Mobile until demonstrated Native reuse creates a stable package boundary.
- An empty scaffold does not justify `packages/contracts`. The first real client/API transport boundary does.
- Expo SDK compatibility controls React Native and related dependency versions. The SDK-selected React version may differ from Web. Expo's automatic pnpm monorepo support is the default; custom Metro resolution and custom native builds are added only after a concrete requirement.
- Public Mobile configuration may contain an API base URL but never secrets or privileged provider configuration.

See [ADR 0003: Expo mobile application boundary](./decisions/0003-expo-mobile-application-boundary.md).

## API baseline

The API is organized by product feature as real capabilities are added:

```text
src/
  modules/
    <feature>/
      presentation/    HTTP controllers and boundary DTO mapping
      application/     use cases, orchestration, ports
      domain/          business rules and domain models
      infrastructure/  persistence and third-party adapters
  common/              truly cross-cutting technical concerns
  app.module.ts        composition root
  main.ts              process/bootstrap configuration
```

Small features may begin with fewer directories. The responsibility and dependency direction still applies:

```text
presentation -> application -> domain
infrastructure -> application/domain ports
domain -> no NestJS, HTTP, ORM, or infrastructure dependency
```

Controllers remain thin, application providers coordinate use cases, domain code expresses business rules, and infrastructure implements outward-facing details. Feature-to-feature calls use an exported provider or explicit facade rather than deep imports.

Third-party integrations remain behind application- or domain-owned ports. Their concrete SDKs, response types, errors, and configuration do not cross into controllers, transport contracts, or domain models.

## Authentication baseline

The API implements browser-oriented email/password authentication, and Web now consumes login, current-session and logout endpoints through its centralized HTTP client. The API owns identity, password verification, platform authorization, and server-side sessions; Web only carries the session cookie and presents the authenticated experience.

- Public registration is disabled. A controlled bootstrap operation creates the first super administrator, and invitation-based account creation will be added separately.
- Platform roles are `SUPER_ADMIN`, `ADMIN`, and `USER`. Invitation and administrative capabilities use explicit policy; future portfolio ownership or collaboration permissions remain resource-level concerns rather than additional platform roles.
- Passwords are stored only as Argon2id hashes behind an application-owned port.
- Authentication uses opaque, database-backed sessions with a fixed 24-hour lifetime. The browser receives the raw random token only through a protected cookie, while PostgreSQL stores only its hash.
- Authenticated requests resolve the current session and active user so logout, account disabling, and role changes take effect immediately.
- Prisma records remain infrastructure details. Password hashes and session credentials remain API-internal authentication details; none of them become domain entities or transport contracts.

The first account is created through the controlled [initial super administrator bootstrap operation](../operations/bootstrap-super-admin.md).

See [ADR 0002: Email/password authentication and server-side sessions](./decisions/0002-email-password-authentication-and-server-sessions.md) for the security, role, and session decisions.

The accepted Mobile boundary does not change this browser credential model. Protected Mobile features remain blocked until a separate credential-transport decision defines creation, transport, device storage, expiration, revocation, and logout semantics. Agents must not relax the Web origin, cookie, CORS, or CSRF controls to make Mobile authentication work.

## Shared contracts

`packages/contracts` now exposes `@workspace/contracts/auth`, with Zod 4.4.3 runtime schemas and inferred types for login requests, session responses, roles and error responses. Its invariants are:

- contain framework-independent runtime schemas and types derived from them;
- describe transport payloads, not internal domain or persistence structures;
- be consumed through declared package exports by the API and each applicable client;
- avoid imports from NestJS, Next.js, Expo, React, database libraries, provider SDKs, or application source;
- keep API clients, credential transport, navigation, and view models in their owning applications;
- require compatible API implementation and client consumption changes in the same pull request.

The private package remains version `0.0.0` and is not independently published. Contract changes update API and client consumption together and require end-to-end coverage. CommonJS build output plus TypeScript declarations support both existing consumers without changing their framework module settings. Mobile is not a consumer yet. See [ADR 0005](./decisions/0005-web-authentication-contract.md).

## Accepted market-data target

ADR 0004 accepts an API-owned market-data integration, but neither the feature nor `stock-sdk` is present in the current baseline.

- The capability will live under `apps/api/src/modules/market-data`.
- Application code will own a provider-neutral port and AssetNote models; a `stock-sdk` infrastructure adapter will implement the port.
- Only the infrastructure adapter may import the SDK networking surface. Controllers and use cases expose narrow product operations and never proxy arbitrary provider methods or URLs.
- Provider responses and errors will be mapped before crossing the application port or HTTP boundary. Source and freshness semantics remain explicit.
- The initial boundary will require runtime input validation, bounded batches and date ranges, explicit timeouts, error normalization, and safe observability. Any later retry, rate-limit, circuit-breaker, cache, request-coalescing, or fallback policy remains API-owned and is added only when a concrete reliability or scale requirement justifies it.
- External market data will not be persisted in PostgreSQL by default. Durable snapshots, historical ingestion, alerts, and auditing require explicit retention, provenance, licensing, and query decisions.
- Deterministic verification will use fakes, fixtures, or an injected network implementation. Real upstream smoke tests remain explicit and opt-in.

See [ADR 0004: Stock market data provider boundary](./decisions/0004-stock-market-data-provider-boundary.md).

## Persistence baseline

PostgreSQL is the product relational database, and Prisma ORM 7 is the API-owned persistence toolkit. Prisma configuration, schema, migrations, generated client, database lifecycle code, and persistence adapters remain in `apps/api`. Application and domain code do not depend on Prisma runtime types.

See [ADR 0001: PostgreSQL and Prisma ORM 7](./decisions/0001-postgresql-and-prisma-7.md) for the decision and operating constraints.

PostgreSQL-backed repository tests require the separately provisioned connection described in [Dedicated PostgreSQL test database](../operations/test-database.md). They never fall back to the development connection.

## When to add a boundary

- Add an application only for an independently deployable runtime with distinct ownership.
- Add a package only when it represents a stable boundary or serves multiple workspaces.
- Add an API feature module for a cohesive product capability, not one module per technical class.
- Add a cross-cutting abstraction only after at least one concrete use makes its interface clear.
- Document the rationale before changing dependency direction, data ownership, authentication strategy, persistence technology, or the responsibility of a shared package. Durable architecture changes require an ADR under `docs/architecture/decisions`; update this overview in the same change when the system baseline or boundaries change.

## Enforcement roadmap

Declarative guardrails are converted into executable controls incrementally.

The Web application and UI package self-references now resolve `@workspace/ui` through package exports. The UI stylesheet explicitly scans only UI-owned source; Tailwind's Web build context scans application source. `apps/web/components.json` deliberately points to the UI stylesheet as shadcn monorepo generator metadata, not as a runtime import or permission to consume other package internals.

Workspace dependency enforcement is now executable. `pnpm boundaries:check` first validates that every non-root pnpm workspace is directly under `apps/` or `packages/`, has a local `turbo.json` with `"extends": ["//"]`, and carries exactly the tag required by its layer. Application workspaces must also be private and expose non-empty `lint`, `typecheck`, and `build` scripts so the root verification graph cannot silently skip them. Application-specific dependency checks reject Web UI from API/Mobile and reject `stock-sdk` from client manifests. It then runs Turbo Boundaries: `layer-app` workspace dependencies may target only `layer-package`, while `layer-package` workspace dependencies may not target `layer-app`. `pnpm verify` includes this check. CI enforcement is intentionally deferred by the current project decision.

| Concern                     | Declarative control now                     | Executable control / status                                                                                                                                                             |
| --------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace dependency flow   | Architecture plus layered `AGENTS.md`       | Implemented: `pnpm boundaries:check` validates workspace layout/tags, allows `layer-app` dependencies only on `layer-package`, and prevents `layer-package` dependencies on `layer-app` |
| Framework-local conventions | Workspace `AGENTS.md`                       | Implemented: `pnpm verify` runs all available lint, typecheck, tests, and builds                                                                                                        |
| Formatting                  | Agent workflow                              | Implemented: `pnpm format:check`                                                                                                                                                        |
| API behavior                | API instructions and existing Jest suites   | Implemented: root unit and uncached e2e tests through `pnpm verify`                                                                                                                     |
| Client platform isolation   | Overview, ADR 0003, and layered `AGENTS.md` | Implemented: workspace checks reject forbidden client dependencies; Mobile lint blocks cross-app, Web UI, and provider imports; root gates run lint, typecheck, and native export       |
| Market-provider isolation   | Overview, ADR 0004, and API `AGENTS.md`     | Declarative until the SDK is introduced; integration work must restrict SDK imports to the owning infrastructure adapter                                                                |
| Merge quality               | Local verification guidance                 | Local gate implemented through `pnpm verify`; CI enforcement intentionally deferred                                                                                                     |

An architecture rule is not considered fully enforced merely because it is documented. Until its executable control is added, agents must report manual compliance explicitly.

## Changing this architecture

An intentional exception or architecture change must be visible. Update this document when system boundaries or baselines change, update affected `AGENTS.md` files only when execution rules change, and explain the tradeoff in the change handoff. Durable architecture changes require an Architecture Decision Record under `docs/architecture/decisions`. Do not silently route around a boundary to finish a feature.
