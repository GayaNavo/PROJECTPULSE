# PROJECTPULSE
ProjectPulse is a project management and executive monitoring platform built with Next.js, React, TypeScript, Firebase Authentication, Cloud Firestore, and Tailwind CSS. It supports multi-project management, task tracking, checklists, deadlines, risk monitoring, CEO comments, business support requests, and role-based user permissions.

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

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the Firebase Web App settings.
3. Start the development server with `npm run dev`.

Firebase Authentication and Firestore are initialized lazily by `src/lib/firebase/client.ts`. The initial Firestore and Storage rules deny access until project-specific authorization rules are added.

Useful scripts: `npm run lint`, `npm run typecheck`, `npm run build`.
