# Onboarding Flow

Page for users to upload their resume document or enter resume details manually.

## Access & Redirect Logic

- After a user logs in, if they do not yet have a Resume, force redirect to the onboarding page. Eg: User creates account or logs in & redirected to `/onboarding`.
- User can not access any `/app/*` pages until onboarding has been completed and resume data exists in the DB for user.
- If user has a resume and tries to visit `/onboarding`, redirect to `/app`

## Page Layout

- Centered card with two tabs: "Upload Resume" / "Enter Manually". Upload resume selected by default.
- Upload Resume tab:
  - Drag and drop file upload supporting: PDF, DOCX, MD, TXT
  - Once user drops a document, file upload replaced with a card showing file upload & data extract progress (progress bar).
  - Once upload completed bar fills to 100% and user is redirected to dashboard at `/app/`
- Enter Manually tab:
  - Form with fields matching Resume type (src/lib/types/resume.ts).
  - For each array type field, allow the user to add multiple entries. Eg: Work experience, education, skills, etc.
  - On submit, resume data saved to DB and user is redirected to dashboard at `/app`

### Reference

Use the page layout and general UI logic from previous iteration. IMPORTANT: Only copy the UI layout, not the logic.

- `/Users/dylan/Workspace/projects/atspro/apps/web/src/app/onboarding/page.tsx`
- `/Users/dylan/Workspace/projects/atspro/apps/web/src/components/onboarding/**/*`
