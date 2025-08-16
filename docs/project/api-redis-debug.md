# Debug API & Redis container connection

The API container is having trouble connecting to Redis.

## Step 1: Identify Issues & Plan Fix

- Use docker mcp to watch logs
- Analyze api in `apps/api/`. Take a critical look at the architecture and identify where the issues are stemming from. Use language-server-py to find and update symbols.

## Step 2: Fix issue

- Utilize one or more fullstack-engineer agents in parallel, each with a very specific task
- Rebuild/restart docker services as needed, check logs
- Ensure API is connected to Redis instance and all endpoints are working as expected.

## Step 3: End-to-End test

- Spawn a e2e-test-runner agent with strict testing instructions. Test user able to upload resume, edit, create a job.
- Test data can be found in `.test-data/user-data.json`
- Have agent watch docker logs
- Spawn Fullstack-engineer agents as needed to fix bugs in either the front-end or api. Give specific tasks and divide the work across multiple agents in parallel.

---

# Remember

- Start with Step 1, complete and then move onto Step 2, complete and then move onto Step 3
- Use sub agents with specific tasks
- Requirements: API container running with no errors, End-to-end test passing.
