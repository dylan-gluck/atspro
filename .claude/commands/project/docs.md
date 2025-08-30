---
allowed-tools: Task, TodoWrite, Glob, LS, Bash, Write
argument-hint: [scope]
description: Three-phase documentation update: analyze changes, update docs in parallel, review and commit
---

# Project Documentation Update

Comprehensive three-phase approach to analyze project changes and update all documentation.

## Scope: $ARGUMENTS

### Execution Strategy

This command orchestrates a three-phase documentation update process:

1. **Phase 1: Analysis** - Parallel analysis of git history and project structure
2. **Phase 2: Documentation Updates** - Parallel doc-writer agents update specific docs
3. **Phase 3: Review & Commit** - Review changes, write summary report, and commit

### Phase 1: Analysis (Parallel)

Launch two parallel analysis agents to gather comprehensive project information:

```task
# Parallel Analysis Tasks
Task 1: meta-commit agent
- Analyze git commit history
- Prepare condensed list of changed files grouped by feature/purpose
- Identify recent features, fixes, and modifications

Task 2: codebase-locator agent  
- Find all project documentation (README.md, docs/*.md, etc.)
- Prepare condensed list of doc file paths organized by feature/purpose
- Map documentation to corresponding code areas
```

### Phase 2: Documentation Updates (Parallel)

Based on Phase 1 analysis, spawn parallel doc-writer agents with specific instructions:

```task
For each documentation area identified:
- Spawn doc-writer agent with:
  - Specific scope (e.g., "Update API documentation")
  - Files to reference (from git analysis)
  - Docs to update (from codebase-locator)
  - Instructions:
    - Update with recent changes from commits
    - Remove outdated information
    - Add missing sections
    - Ensure technical accuracy
    - Maintain consistent formatting
```

### Phase 3: Review & Commit

After all documentation updates complete:

```task
1. Review all changes made by subagents
2. Write comprehensive summary report
3. Save report to: thoughts/shared/reports/docs-update-[timestamp].md
4. Run quality checks:
   - bun run lint
   - bun run format
5. Commit changes with semantic message
6. Push to remote repository
```

### Implementation Pattern

```python
def update_project_docs(scope=None):
    # Phase 1: Parallel Analysis
    analysis_tasks = [
        spawn_agent("meta-commit", 
            prompt="Analyze git history, return condensed list of changes by feature"),
        spawn_agent("codebase-locator",
            prompt="Find all docs, return organized list by feature/purpose")
    ]
    
    git_analysis, doc_locations = await_parallel(analysis_tasks)
    
    # Phase 2: Parallel Documentation Updates
    update_tasks = []
    for area in merge_analysis_results(git_analysis, doc_locations):
        task = spawn_agent("doc-writer",
            scope=area.scope,
            files_to_reference=area.changed_files,
            docs_to_update=area.doc_paths,
            instructions=area.specific_instructions
        )
        update_tasks.append(task)
    
    update_results = await_parallel(update_tasks)
    
    # Phase 3: Review & Commit
    summary = compile_summary(update_results)
    save_report(summary, "thoughts/shared/reports/")
    run_quality_checks()
    commit_and_push(summary)
```

### Specific Instructions for Doc-Writer Agents

Each spawned doc-writer agent receives:

1. **Scope Definition**
   - Specific documentation area to update
   - Clear boundaries of responsibility
   - Expected deliverables

2. **Reference Materials**
   - List of changed files from git analysis
   - Related code files to examine
   - Existing documentation to update

3. **Update Requirements**
   - Incorporate recent changes
   - Remove outdated information
   - Add missing standard sections
   - Ensure technical accuracy
   - Maintain consistent formatting

4. **Documentation Standards**
   - Use precise technical language
   - Include file:line references
   - Provide working examples
   - Follow project conventions

### Examples

```bash
# Update all project documentation
/project:docs

# Update documentation in specific scope
/project:docs src/routes

# Update multiple documentation areas
/project:docs "src/lib tests/e2e"
```

### Quality Assurance

The command ensures:

- ✅ Git history analysis captures all recent changes
- ✅ Documentation mapping is comprehensive
- ✅ Updates reflect current codebase state
- ✅ All changes are reviewed before commit
- ✅ Code quality checks pass (lint, format)
- ✅ Summary report documents all modifications
- ✅ Changes are properly committed and pushed

### Deliverables

1. **Phase 1 Outputs**
   - Condensed list of changes by feature (meta-commit)
   - Organized documentation map (codebase-locator)

2. **Phase 2 Outputs**
   - Updated documentation files
   - Consistent formatting across all docs
   - Accurate technical information

3. **Phase 3 Outputs**
   - Summary report in `thoughts/shared/reports/`
   - Quality-checked codebase
   - Committed and pushed changes
