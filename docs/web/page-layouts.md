# Global

Design is simple and professional but with a little more aesthetic. Think modern ai company or design agency design, but for a simple product.

Current theme is Vintage Paper from tweakcn (Check global.css)

Layout should be clean, grid / card based. Nice typeography spacing and alignment.

# Dashboard (Logged in) `/`

This is the main dashboard the user will interact with. They should be able to quickly see important stats across their Jobs, helpful info, notifications as well as a list of their active jobs.

They should be able to create a new job by entering a URL or dropping a document with a job description. Doing so creates a new Job and posts the data to the API to parse.

The top row of cards should feature:
1. Profile info card
2. Stats card (active job data)
3. Notifications

The list of jobs can be displayed as a table or as cards. Show the most recent 10 by default. There should be info like Title, Company, Status, Maybe the score? Buttons to show all / active / archive. Paginated 10 at a time. (Customizable in settings, 10-20-50)

# Job Details

This is the page for a single job posting. Once data is available the page should hydrate with job details. User can set status of their application: Awaiting Reply, Interview, Accepted, Rejected.

Once job details available actions become available: Optimize resume, Score, Company Research, Interview prep. Clicking an action fires a background job via API, once document is available it will be lsited with all Documents related to this job.

**Note:**
Documents are stored as markdown in the database. There must be a feature in the NextJs app to convert the markdown to a PDF (front-end). Clicking a document that is attached to a Job will fire the function to convert to pdf and download the file to the user's computer.
