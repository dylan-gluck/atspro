# Onboarding Error

There is an error in the onboarding flow, it appears to be a full-stack issue effecting the api and web apps.

Uploading a document (`.test-data/resume.pdf`) stalls at 10% and returns the following error: "Failed to get task status"

<error>
    1/1
    Next.js 15.4.5 (stale)Turbopack
    Console Error
    Failed to get task status
    Call Stack 1
    handleFileUpload
    .next/static/chunks/app_src_4e3d6b41._.js (986:23)
</error>

## Assignment

- Analyze docker logs
- Use language-server-py and langauge-server-ts to analyze codebase. Check workers/task spawning. Make sure front-end and back-end are expecting the same values.
- Spawn parallel agents as needed to handle specific implementation tasks. (fullstack-engineer, docker-logs-watcher, e2e-test-runner).
- Use test data in `.test-data/user-data.json` for e2e tests.
