# Auth Pages: Sign-in and Sign-up

Pages for users to sign-in or create an account.
- `/auth/sign-in`: Sign-in form
- `/auth/sign-up`: Sign-up form

## Access & Redirect Logic

- Before a user signs in they will be automatically redirected to `/auth/sign-in` if trying to access `/app/*` or `/onboarding` routes.
- If a user visits `/auth` or `/auth/invalid-path` redirect to `/auth/sign-in`
- If a user is signed-in and tries to visit `/auth/sign-in` or `/auth/sign-up` they should be redirected to `/app`.
- After a user successfully signs-in or signs-up, they should be redirected to `/app`

## Page Layout

Half-page split, sign-in/up form on the right side.

### Reference

Use the page layout and general UI logic from previous iteration. IMPORTANT: Only copy the UI layout, not the logic.

- `/Users/dylan/Workspace/projects/atspro/apps/web/src/app/sign-in/page.tsx`
- `/Users/dylan/Workspace/projects/atspro/apps/web/src/app/sign-up/page.tsx`
