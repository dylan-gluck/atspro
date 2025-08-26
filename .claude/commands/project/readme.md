---
allowed-tools: Task, TodoWrite, Glob, LS
argument-hint: [scope]
description: Spawn parallel engineering-writer agents to analyze project and update all README documents
---

# Project README Update

Recursively analyze the project and update all README documents with accurate information.

## Scope: $ARGUMENTS

### Execution Strategy

This command coordinates multiple engineering-writer agents to:

1. Discover all README files in the project (or specified scope)
2. Analyze corresponding code directories
3. Update each README with accurate, current information
4. Maintain consistency across documentation

### Task Coordination

#### Phase 1: Discovery

First, identify all README files that need updating:

```bash
# Find all README files in scope
if [ -z "$ARGUMENTS" ]; then
  SCOPE="."
else
  SCOPE="$ARGUMENTS"
fi
```

#### Phase 2: Parallel Analysis & Updates

Spawn engineering-writer agents for each discovered README location:

```task
For each README location found:
- Analyze the directory structure and code
- Identify key components, modules, and features
- Update the README with:
  - Accurate project/module description
  - Current file structure
  - Dependencies and requirements
  - Usage examples based on actual code
  - API documentation (if applicable)
  - Configuration options
  - Testing information
```

### Agent Delegation Pattern

```python
def update_project_readmes(scope=None):
    # 1. Discovery phase
    readme_locations = find_readme_files(scope or ".")

    # 2. Create todo list for tracking
    todos = [
        {"id": str(i), "content": f"Update {loc}", "status": "pending"}
        for i, loc in enumerate(readme_locations)
    ]

    # 3. Parallel execution
    tasks = []
    for location in readme_locations:
        task = spawn_meta_readme_agent(
            location=location,
            instructions="Analyze directory and update README with current information"
        )
        tasks.append(task)

    # 4. Wait for completion
    results = await_all(tasks)

    # 5. Summary report
    return compile_update_report(results)
```

### Specific Instructions for Meta-README Agents

Each spawned agent should:

1. **Analyze Directory Structure**
   - Map out file organization
   - Identify main entry points
   - Document important directories

2. **Extract Code Information**
   - Parse source files for functions/classes
   - Identify exported APIs
   - Document configuration options

3. **Update README Sections**
   - Project overview and purpose
   - Installation instructions
   - Usage examples (from actual code)
   - API reference (if applicable)
   - Configuration documentation
   - Testing instructions
   - Contributing guidelines

4. **Maintain Consistency**
   - Use consistent formatting
   - Preserve custom sections
   - Update outdated information
   - Add missing standard sections

### Examples

```bash
# Update all READMEs in project
/project:readme

# Update READMEs in specific directory
/project:readme src/routes/**/*

# Update READMEs in multiple directories
/project:readme "src tests docs"
```

### Quality Checks

Each engineering-writer agent should ensure:

- ✅ All code references are accurate
- ✅ File paths are correct
- ✅ Dependencies are current
- ✅ Examples actually work
- ✅ No broken links
- ✅ Consistent formatting
- ✅ Clear and concise language

### Deliverables

- Updated README.md files throughout the project
- Consistent documentation style
- Accurate technical information
- Working code examples
- Complete API documentation
- Summary report of all updates made
