---
description: Execute git commit workflow with comprehensive checks
allowedTools: Bash, Read, Write, Edit, TodoWrite, mcp__memory__*
---

# Git Commit Workflow

Execute git commit for: $ARGUMENTS

## Pre-commit Workflow

Execute comprehensive checks before committing:

```bash
# 1. Check git status and stage changes
git status
git add .

# 2. Run all quality checks
pnpm format      # Format all code
pnpm lint        # Lint all code  
pnpm check-types # Type check all code
pnpm test        # Run all tests
pnpm build       # Build all apps

# 3. Review changes
git diff --staged

# 4. Create commit with semantic message
git commit -m "$(cat <<'EOF'
feat: add new feature implementation

- Detailed description of changes
- Any breaking changes noted
- Related issue references
EOF
)"
```

## Commit Message Standards

Follow semantic commit format:
- `feat:` - New features
- `fix:` - Bug fixes  
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Build/tool changes

## Quality Gates

All checks must pass before commit:
- [ ] Code formatted (no formatting errors)
- [ ] Linting passes (no lint errors)
- [ ] Type checking passes (no type errors)
- [ ] All tests pass (100% success rate)
- [ ] Build succeeds (no build errors)
- [ ] Git diff reviewed (changes verified)

## Output

Provide commit summary including:
- Files changed
- Tests run and results
- Build status
- Commit hash and message