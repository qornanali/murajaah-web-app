# AI Agent Workflow for Murajaah

## 1) Before Editing

- Read README.md and SETUP.md.
- Read docs/ai/PRD_SUMMARY.md.
- Identify impacted files and verify whether changes affect auth, review scheduling, packages, or offline sync.

## 2) While Implementing

- Keep patches focused and small.
- Reuse existing utilities in src/lib before creating new helpers.
- Preserve guest mode and offline-first guarantees.
- Keep server-only concerns inside server code paths.

## 3) After Implementing

- Run lint and build when possible.
- Re-check changed behavior in UI flow.
- Update docs if env vars, flows, or setup changed.

## High-Risk Areas

- src/lib/offline/sync.ts (sync retries and status transitions)
- src/store/reviewStore.ts (queue logic and progress writes)
- src/lib/qf/contentApi.ts and src/app/api/quran/\* (content API auth and proxy behavior)
- supabase/migrations/\* (schema and policy assumptions)

## Preferred Commit Scope

- One commit per coherent intent (docs, feature, fix, refactor).
- Keep migration changes separate from UI-only changes.
