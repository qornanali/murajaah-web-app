# Coding Best Practices for AI Agents

## Purpose

This guide helps AI agents implement changes in Murajaah safely and consistently.

## Tech Boundaries

- Use TypeScript for all app logic and UI changes.
- Keep Next.js App Router conventions under src/app.
- Reuse existing libraries (Zustand, Dexie, Supabase client, Tailwind) instead of adding new dependencies unless justified.

## Architecture Rules

- Treat src/lib as source of truth for domain logic.
- Keep UI components presentation-focused; avoid embedding data access directly in deeply nested components.
- Use existing helpers for Quran verse keys and package selectors to avoid duplicate logic.

## State and Data Handling

- Prefer existing store actions/selectors from src/store over ad hoc state duplication.
- Preserve offline-first behavior: local write first, then queue sync where applicable.
- Guest user behavior must remain local-only and must not attempt remote sync.

## API and Security

- Never place secrets in client code.
- Keep QF client secret usage server-only.
- Validate external data and handle incomplete API payloads defensively.
- Do not weaken Supabase RLS assumptions from migrations.

## Error Handling

- Use friendly, user-safe errors in UI.
- Avoid exposing raw backend internals in messages.
- Preserve existing retry/failure patterns for sync queue processing.

## Styling and UX

- Follow existing Tailwind design language.
- Keep mobile-first responsiveness intact.
- Preserve accessibility basics: labels, button states, semantic elements.

## Localization and Theming

- Route user-facing strings through the i18n layer.
- Ensure visual changes remain compatible with both light and dark themes.

## Documentation and Change Hygiene

- Update README/SETUP/docs when behavior or config changes.
- Keep changes minimal and scoped to the requested task.
- Do not modify unrelated files.

## Testing and Verification Checklist

1. Run lint: npm run lint
2. Run build: npm run build
3. Verify key flows manually:

- Home loads and source picker works
- Practice session fetches ayah and rating updates queue
- Login flow works when auth screen is enabled
- Offline queue still records and later syncs
