---
description: [Brief description of what this workflow accomplishes]
argument-hint: [options]
---

# [Workflow Title]

[Extended description of the workflow's purpose, what it orchestrates, and the expected outcome]

## Initial Context

- Project root: [project_root_path]
- Key documentation: [relevant_docs_paths]
- Related specifications: [spec_file_paths]
- Prerequisites: [any_required_setup]

## Todo Setup

Initialize progress tracking for implementation phases:

<TodoWrite>
# [Workflow Name] Progress

## Phase 1: [Phase Name]
- [ ] [Task description]
- [ ] [Task description]
- [ ] [Add more tasks as needed]

## Phase 2: [Phase Name]
- [ ] [Task description]
- [ ] [Task description]
- [ ] [Add more tasks as needed]

[Add more phases as needed for the workflow]

## Final Phase: [Completion/Review/Validation]
- [ ] [Final task]
- [ ] [Verification task]
- [ ] [Sign-off task]
</TodoWrite>

## Phase 1: [Phase Name]

[Phase description and objectives]

### 1.1 [Sub-task Name]

[Description of what this sub-task accomplishes]

<Task>
You are [agent-name]. Your task is to [specific task description].

Start by:
cd [project_root_path]

[Instructions specific to this task]:
1. [Step description]
2. [Step description]
[Add more steps as needed]

[Expected deliverables]:
- [Deliverable 1]
- [Deliverable 2]
[Add more as needed]

Output format: [Specify output format and location]

After completion, update the todo item "[corresponding todo item]" as complete.
</Task>

### 1.2 [Sub-task Name]

[Description of what this sub-task accomplishes]

[Note: This sub-task might not use an agent - could be direct instructions]

Steps to complete:
1. [Manual step or direct command]
2. [Manual step or direct command]
[Add more steps as needed]

Expected outcome: [Description of success criteria]

[Add more sub-tasks as needed for this phase]

## Phase 2: [Phase Name] (Parallel Execution)

[Phase description - note when tasks can run in parallel]

### 2.1 [Sub-task Name]

<Task>
You are [agent-name]. Your task is to [specific implementation task].

Start by:
cd [project_root_path]

Read the specifications from:
- [spec_file] ([relevant sections])
[Add more references as needed]

Create/Update these [components]:

1. **[Component name]**
   - [Requirement/feature]
   - [Requirement/feature]
   [Add more as needed]

2. **[Component name]**
   - [Requirement/feature]
   - [Requirement/feature]
   [Add more as needed]

[Add more components as needed]

Quality requirements:
- [Quality standard]
- [Quality standard]
[Add more as needed]

After completion, update the todo item "[corresponding todo item]" as complete.
</Task>

### 2.2 [Sub-task Name]

[Direct instructions without agent delegation]

Execute these commands:
```bash
[command 1]
[command 2]
```

Verify: [What to check for success]

[Add more sub-tasks as needed]

## Phase 3: [Phase Name]

[Phase description]

### 3.1 [Sub-task Name]

<Task>
You are [agent-name]. Your task is to [task description].

[Flexible task instructions based on workflow needs]

Deliverables:
- [Expected output]
[Add more as needed]

After completion, update the todo item "[corresponding todo item]" as complete.
</Task>

[Add more sub-tasks as needed]

[Add more phases as needed for the complete workflow]

## Final Phase: [Validation/Review/Completion]

### [Final task number].1 [Review/Test/Validate]

<Task>
You are [agent-name]. Conduct a comprehensive [review/test/validation] of [what was built].

Review these components:
1. [Component to review]
2. [Component to review]
[Add more as needed]

Validate:
- [Validation criteria]
- [Validation criteria]
[Add more as needed]

Create final report at: [report_path]

Include:
- [Report section]
- [Report section]
[Add more as needed]

After review, update the todo item "[corresponding todo item]" as complete.
</Task>

[Add more final tasks as needed]

## Success Criteria

The [workflow name] is complete when:

1. ✅ [Success criterion]
2. ✅ [Success criterion]
3. ✅ [Success criterion]
[Add more criteria as needed]

## Error Handling

If any phase fails:
1. [Error handling step]
2. [Error handling step]
3. [Escalation procedure]
[Add more as needed]

## Completion

Upon successful completion:
1. [Final state description]
2. [What has been achieved]
3. [Next steps or handoff]
[Add more as needed]

The system will provide a final summary report consolidating all phase outcomes.

---

## Template Usage Notes

This template is designed to be flexible:

- **Phases**: Add as many phases as needed for your workflow
- **Sub-tasks**: Each phase can have any number of sub-tasks
- **Agent Tasks**: Use `<Task>` blocks when delegating to agents
- **Direct Instructions**: Not every sub-task needs an agent - some can be direct instructions
- **Parallel Execution**: Mark phases that can run tasks in parallel
- **Dynamic Content**: All bracketed items `[like this]` should be replaced with actual content
- **Extensibility**: Add or remove sections based on workflow complexity

Remember:
- Keep task descriptions specific and actionable
- Include clear success criteria
- Specify output locations and formats
- Update todos as tasks complete
- Consider dependencies between phases
