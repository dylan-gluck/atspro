# Resume: Start & end dates broken

Start & End date fields are currently broken on the resume editor.

**Actual**

- Entering `Jan 2020` in the input displays `Invalid Date` on the resume
- Entering `2019` in the input displays `Dec 2018` on the resume
- Entering `2019-02` in the input displays `Jan 2019` on the resume

**Expected**

- Entering `Jan 2020` in the input displays `Jan 2020` on the resume
- Entering `2019` in the input displays `2019` on the resume
- Entering `2019-02` in the input displays `Feb 2019` on the resume
