# ECSS Website Agent Guide

## Purpose

This repository is the University of Southampton Electronics and Computer Science Society website. It is a single Node.js application combining:

- Next.js 14 / React 18 frontend (`src/app`)
- Payload CMS 2 backed by MongoDB (`src/payload`)
- Custom Express server (`src/server.ts`)
- Azure AD OAuth login
- Election/STV, booking, membership-import, Wordle, and CMS features

Use this guide before broad exploration. Read only the files relevant to the requested domain.

## Quick orientation

| Area | Primary location |
| --- | --- |
| Server startup, redirects, scheduled-job recovery | `src/server.ts` |
| Payload configuration, collections, globals, plugins | `src/payload/payload.config.ts` |
| CMS schemas and business logic | `src/payload/collections/` |
| Global CMS content | `src/payload/globals/` |
| Next routes and server components | `src/app/(pages)/` |
| Client UI components | `src/app/_components/` |
| CMS page-block renderers | `src/app/_blocks/` |
| GraphQL query strings | `src/app/_graphql/` |
| GraphQL/REST fetch helpers | `src/app/_api/` |
| Generated Payload types | `src/payload/payload-types.ts` |
| Generated GraphQL schema | `src/payload/generated-schema.graphql` |
| Shared SCSS and CSS variables | `src/app/_css/` |

## Runtime and local setup

- Node, MongoDB, and Rust are required. Election counting also requires the `stv-rs` binary (`cargo install stv-rs`).
- Copy `.env.example` to `.env`; never commit `.env` or real credentials.
- The application reads `DATABASE_URI`, `PAYLOAD_SECRET`, `PAYLOAD_PUBLIC_SERVER_URL`, and `NEXT_PUBLIC_SERVER_URL`.
- `npm run dev` starts the custom Express/Payload server and Next development flow.
- `npm run seed` **drops the database**. Never run it against shared or production data.
- The README’s `mongorestore` dump path may not exist in every checkout; verify before relying on it.

## Commands

```bash
npm run dev
npm run lint
npm run prettier
npm run build
npm run generate:types
npm run generate:graphQLSchema
```

After changing any Payload collection/global/field schema:

1. Run both generation commands.
2. Commit changes to `src/payload/payload-types.ts` and `src/payload/generated-schema.graphql`.
3. Update frontend queries and consumers if the changed data is fetched through GraphQL.

Do not hand-edit generated files when the generation commands are available. If dependencies are unavailable, report that generation could not be run and keep any temporary generated-file edits minimal.

## Architecture and data flow

- `src/server.ts` initializes Payload, restores scheduled election jobs, then hands requests to Next.
- Server components usually fetch CMS data through `src/app/_api/` and query strings in `src/app/_graphql/`.
- Payload content changes trigger revalidation through the helpers in `src/payload/utilities/`.
- Collection fields, hooks, access functions, and custom endpoints are the source of truth. Client-side filters and `filterOptions` are convenience only, not security or integrity controls.
- Keep client-only browser APIs behind `'use client'`; Leaflet is dynamically imported for this reason.

## Domain map

### Elections

- Collections: `elections`, `positions`, `nominations`, `votes`, `electionResults`.
- STV tally code: `src/payload/collections/Elections/hooks/checkVotes.ts`.
- Election jobs are restored by `src/payload/utilities/restartJobs.ts`.
- Voting must enforce time windows and election/position/nomination consistency server-side.
- Avoid weakening vote uniqueness or result consistency. Database-level indexes/migrations require explicit production-data planning.
- Results are hidden from the public election UI unless the Election Result CMS checkbox `showOnMainPage` is enabled. New and existing results should remain hidden by default.

### Booking

- Collections: `booking-events`, `tables`, `ticket-holders`.
- Use the custom table endpoints rather than opening generic table writes.
- Capacity, membership, and seating are integrity-sensitive. Validate booking-open status, event membership, seat bounds, and duplicate seat assignments on the server.
- Avoid exposing guest names, join codes, or seat plans to non-members.

### Jumpstart

- Jumpstart is a homepage mode, not a separate route.
- Entry point: `src/app/page.tsx`; it activates when `settings.jumpstartEnabled` is true.
- Timeline and map components live in `src/app/_components/Jumpstart/`.
- Events use `isJumpstart`, `jumpstartCategory`, `sortOrder`, `latitude`, and `longitude`.
- Map pins use category colour and chronological numbering. Preserve numeric and non-colour cues for accessibility.
- Map popup data must be created with DOM APIs/`textContent`, not interpolated into HTML strings.
- `jumpstartAbout` is the CMS-managed “What is Jumpstart?” sidebar content.

## Security and correctness rules

- Treat every CMS string and custom URL as untrusted at render time.
- Custom external links must be HTTPS; reject `javascript:`, `data:`, and protocol-relative URLs.
- Login return paths must be same-origin, single-slash internal paths. Never accept `//host` redirects.
- Do not add `dangerouslySetInnerHTML` or Leaflet HTML-string interpolation for CMS data.
- Use `isSubmitting` for React Hook Form mutations; do not use `isLoading` as a submit lock.
- Client fetches need `res.ok` checks, network error handling, and a usable error state.
- Polling views should ignore stale responses or cancel in-flight requests.
- Prefer native buttons/links. Preserve `:focus-visible`, keyboard operation, and dialog focus behavior.
- Do not relax collection access, role checks, CSRF/CORS, or CSP without a specific, reviewed reason.
- Keep secrets only in deployment environment variables. Do not add sample production secrets to docs or source.

## Styling and frontend conventions

- Use TypeScript, React function components, and colocated `index.module.scss`.
- Shared colours and Jumpstart variables are in `src/app/_css/colors.scss`.
- Keep existing design tokens and breakpoints; avoid inline HTML/event-handler strings.
- Dynamic route components may be server or client components; check surrounding imports before adding hooks.
- Preserve accessible loading, empty, and failure states rather than silently rendering empty content.

## Validation expectations

Run, when dependencies are installed:

```bash
npm run prettier
npm run lint
npm run build
```

There is no established automated test suite. For election, booking, access-control, or concurrency changes, add focused tests or provide direct API/manual test cases. Test concurrent writes with parallel requests, not only browser clicks.

If local dependency installation fails because of Sharp/libvips permissions, do not modify dependency versions as a workaround. Report the environment failure and still run static diagnostics where possible.

## Change boundaries

- Do not run destructive seed/database commands unless explicitly asked.
- Do not make Mongo data migrations, provision deployment secrets, change OAuth settings, or modify hosting/network configuration without explicit authorization.
- Changes requiring a new secret, production index migration, scheduler/lock service, or deployment configuration must be called out as separate operational work.
- Keep changes scoped to the user request; do not fold unrelated audit recommendations into a feature change.
