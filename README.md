# PROJECTPULSE
ProjectPulse is an internal project-management workspace built with Next.js, TypeScript, Tailwind CSS, Firebase Authentication, and Cloud Firestore. Firebase is retained as the existing backend rather than replacing it with a second database/auth provider.

## Current functionality

- Email/password sign-in and password-reset request; public self-registration is intentionally disabled.
- Session-aware protected dashboard and project routes.
- Live portfolio dashboard and project list with status/priority/manager/date filters, sorting, pagination, CSV export, and role-gated project creation.
- Project workspace with editable project details, immutable original target date plus reasoned forecast changes, Super Admin membership management, task CRUD, checklists, milestones, blockers/risks, business-support requests, project discussion, and activity history.
- Super Admin user screen for existing profile roles and active status; authentication account invitation remains in Firebase Authentication.
- Firestore rules scope data to active authenticated project members, prevent client-side role escalation, protect Super Admin accounts from client deactivation, and keep audit/activity records immutable.

The implementation plan and later stages (milestones, support requests, advanced roles, notifications, reports, and audit administration) are tracked in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Project structure

```text
src/
	app/                 Next.js App Router pages and API routes
	components/          Shared layout and UI components
	config/              Application configuration
	features/
		auth/              Authentication components, hooks, services, and types
		projects/          Project components, Firestore services, and types
	hooks/               Shared React hooks
	lib/
		firebase/          Firebase client initialization
		utils/             Shared utilities
	types/               Shared TypeScript types
firebase/              Firestore and Storage security rules
```

## Getting started

1. Use Node.js 22 or newer and install dependencies with `npm install`.
2. `.env.local` contains this Firebase project's public web-app configuration. For another environment, copy `.env.example` to `.env.local` and enter the Firebase Web App settings. Never put Firebase Admin/service-account credentials in `NEXT_PUBLIC_*` variables.
3. In Firebase Console, enable **Authentication → Email/Password** and create the Firestore database.
4. Deploy the Firestore rules to the configured project with `npx firebase-tools deploy --only firestore:rules` (sign in with `npx firebase-tools login` first if needed). The rules deny access unless the user is active and has project membership or an allowed executive/admin role.
5. Create the initial administrator in Firebase Authentication, then create `users/{AUTH_UID}` in Firestore with `uid`, `displayName`, `email`, `role: "super_admin"`, and `active: true`. Include `createdAt` and `updatedAt` timestamps. Assign elevated roles only through a trusted administrator process (Firebase Console/IAM for the initial setup); the client cannot grant roles.
6. Create invited accounts in Firebase Authentication. On first sign-in, a missing profile is provisioned as a least-privilege `team_member`. A project manager needs an administrator-provisioned profile with `role: "project_manager"` before creating projects.
7. Start the development server with `npm run dev`.

Project data is read from Firestore; no sample project statistics are hard-coded. Projects are archived instead of physically deleted. Storage remains deny-by-default until attachment requirements and rules are implemented.

Useful scripts: `npm run lint`, `npm run typecheck`, `npm run build`.
