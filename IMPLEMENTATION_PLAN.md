# ProjectPulse Implementation Plan

## Existing foundation
The repository already has Next.js, TypeScript, Tailwind, Firebase Authentication, and Cloud Firestore configured. Preserve Firebase as the backend; do not migrate to Supabase. Keep `.env.local` private and preserve the current Firebase project configuration.

## Stages and current status
1. **Secure foundation — implemented.** Email/password login, password reset, auth/session state, protected routes, minimal user profiles, least-privilege defaults, and scoped Firestore rules. Public self-registration stays disabled; provision the initial Super Admin through Firebase Console/IAM.
2. **Core project workflow — implemented.** Live authorized-project dashboard/list, filters/sorting/pagination/CSV export, project CRUD, Super Admin project membership assignment, task CRUD, checklist edit/reorder, project activity, and discussions.
3. **Executive/project workflows — partial.** Project-scoped milestones, blockers/risks, support requests, and comments are available. Notifications, mentions/replies, support-owner routing, and full escalation behavior remain.
4. **Administration and reporting — partial.** Super Admin can manage existing profile roles/active status and see project counts; role changes are audited. User invitations remain in Firebase Authentication; custom roles/permission matrices, full audit UI, and broader reports remain.
5. **Hardening — partial.** Typecheck, lint, production build, and unauthenticated route smoke checks pass. Firestore Emulator authorization tests have not been run; the current local Java 8 runtime is below the emulator's supported Java version.

## Authorization/data principles
- Firestore rules, not UI visibility, are the security boundary; all project reads and writes must check role and project membership.
- Users cannot grant themselves elevated roles. Seed or change privileged roles only through a trusted administrator workflow.
- Preserve project history and avoid cascading destructive deletion of business records.
- Keep each project workspace's tasks and related records attached to that project.

## Next recommended work
Add emulator-based allow/deny tests for every role and cross-project access, then implement notifications, replies/mentions, support-owner assignment, custom permission configuration, and complete reports/audit views.
