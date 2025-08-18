# Onboarding Updates

Currently users are required to upload a document with no option to enter resume info manually.

## Updates:

### Update 1: Onboard flow
- In the onboarding flow `/onboarding` Allow user to enter resume data manually with a textarea. UI should use tabs: Upload Document / Enter Manually. (ux-eng)
- API should be updated to accept two optional props either document or string. (fullstack-eng)

### Update 2: Resume Editor
- On the resume-edit page `/resume` allow a user to enter their resume data manually even if they do not have existing data. There should be a form that reflects the `Resume` interface including all sections. (ux-eng)
- Currently, not able to edit an existing resume. Contenteditable not working or its not clear how to enable editability. (ux-eng)
- Download as PDF not working (fullstack-eng)
