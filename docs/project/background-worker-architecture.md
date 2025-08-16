# Background-worker & Message Queue Architecture

One feature of ATSPro is that long-running tasks should run in the background.

Current setup is synchronous, meaning that the backend waits for the task to complete before returning a response to the frontend.

**Example:**
- Uploading a resume document fires a backend task to parse resume data
- User can see pending task in front-end
- On complete, the DB is updated and the front-end is notified to hydrate

**Example 2:**
- User can create a new `Job` by pasting job description or link to job posting.
- Background task is started to extract job data, DB is updated once complete
- Job detail page hydrates once background tasks completes.
- User kicks off additional job-related tasks eg: Company Research, Interview Prep etc.
- Pending tasks linked to `Job` are displayed on the Job details page.

---

## Questions

- What considerations for front-end / back-end architecture to implement simple background tasks?
- How should message queues, workers be configured?
- Where should DB writes happen?
- Data model considerations

## Expectations:
- This is for a simple micro-sass application. Do not overly-complicate. Does not need to be enterprise grade.
- Provide detailed analysis of existing codebase & expected lift to implement. Backend exists but would need to be modified, front-end is new.
- Do not write code. Result should be a strategic integration plan.
