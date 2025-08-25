# App Routes

This folder `(app)` separates the app routes from the marketing site & API. The layout in `src/routes/(app)/+layout.svelte` is loaded for every route within this folder.

## App Layout

- This +layout.svelte file will have the global header & main content area (`children()`).
- Header will have Logo, App Navigation, & User dropdown menu.
- App Navigation has links to:
  - Dashboard `/app`
  - Edit Resume `/app/resume`
- User dropdown has links to:
  - Settings, `/app/settings`
  - Subscription `/app/subscription`
  - Sign-out `/auth/sign-out`
