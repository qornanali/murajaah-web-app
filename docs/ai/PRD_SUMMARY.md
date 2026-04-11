# Murajaah PRD Summary

## Product Goal

Build a focused, low-friction Quran memorization app that improves retention through spaced repetition while remaining usable in unstable network conditions.

## Primary Users

- Learners memorizing Quran ayat regularly
- Users who want lightweight review sessions on mobile/desktop
- Users who need guest mode before account signup

## Core Problems Solved

- Inconsistent review schedules
- Friction in choosing what to review next
- Progress loss or blocked usage when offline

## Core Value Proposition

- Practice-first experience with SM-2 scheduling
- Offline-first progress capture and later sync
- Flexible review sources (all due, per surah, or package)

## Functional Scope (Current)

1. Authentication and access

- Supabase sign up/sign in/sign out
- Guest mode with local progress

2. Review and practice loop

- Due queue generation from ayah progress data
- Rating options: Again, Hard, Good, Easy
- Automatic schedule updates (SM-2)
- Auto-advance between ayat

3. Memorization content

- Ayah retrieval through internal Quran proxy routes
- Uthmani text rendering
- Audio playback support
- Progressive reveal by Waqf chunks

4. Track and package management

- Surah-based track selection
- Published memorization package listing
- Package enrollment status (start/resume/pause/complete)

5. Offline behavior

- Local IndexedDB storage for progress
- Sync queue that retries when connectivity returns
- Guest data remains local-only

6. UX and localization

- EN/ID language support
- Light and dark theme support
- Practice-oriented home dashboard and source picker

## Non-Functional Requirements

- Fast first interaction for daily review flow
- Safe handling of credentials (server-only secrets)
- Data integrity for progress updates and sync retries
- Mobile-friendly layouts for common device sizes

## Success Signals

- Users can complete a full review session without sign-in
- Ratings consistently produce expected next-review timing
- Offline sessions preserve progress and sync once online
- Users can resume active tracks/packages without manual recovery

## Out of Scope (Current)

- Social features
- Teacher/student collaboration
- Advanced analytics dashboards
- Native mobile app binaries

## Risks and Constraints

- Quran content API depends on valid OAuth credentials
- Supabase schema and RLS correctness depends on migrations being fully applied
- Offline sync conflict handling is best-effort and should be monitored as usage grows
