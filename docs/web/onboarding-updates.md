# Onboarding Updates

Currently users are required to upload a document with no option to enter resume info manually.

## Updates:

### Update 1: Onboard flow
- In the onboarding flow `/onboarding` Allow user to enter resume data manually with a textarea. UI should use tabs: Upload Document / Enter Manually. (ux-eng)
- API should be updated to accept two optional props either document or string. (fullstack-eng)

### Update 2: Resume Editor
- On the resume-edit page `/resume` we need to add the functionality to edit the resume & add/remove/reorder entires. There should be a form with fields that match the Resume interface.
- Keep the existing resume view as-is for previewing current resume, and add tabs to swap between "Preview Resume" / "Edit Resume"
- Download as PDF not working, lets remove this button for now.

## Steps:
1. Deploy parallel fullstack-eng agents to analyze current implementation of Onboarding flor and Resume editor across both web and api apps.
2. Use their findings to create a implementation plan for the two updates that can be split across multiple sub agents in parallel.
3. Spawn parallel agents with specific assignments and access to integration plan as a whole.
4. Once all changes have been completed, use the e2e-tester to confirm working as expected.
