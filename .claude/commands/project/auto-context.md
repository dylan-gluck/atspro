---
allowed-tools: Task
description: Automatically analyze project structure with optional search scope using parallel research agents
argument-hint: "[scope: all|data-models|api|frontend|backend|tests|docs|config|<directory-path>]"
---

# Auto-Context Project Analysis

Spawn parallel research-project agents to comprehensively analyze the codebase structure, identify key files, and extract relevant context based on the specified scope.

## Scope Interpretation

**$ARGUMENTS** (defaults to "all" if not specified)

### Scope Types

- **all**: Full project analysis across all directories and file types
- **data-models**: Focus on database schemas, data structures, and model definitions
- **api**: Analyze API endpoints, routes, controllers, and service layers
- **frontend**: Examine UI components, views, styling, and client-side logic
- **backend**: Focus on server-side logic, business logic, and infrastructure
- **tests**: Analyze test suites, test utilities, and testing patterns
- **docs**: Extract documentation, README files, and inline comments
- **config**: Focus on configuration files, build scripts, and environment setup
- **<directory-path>**: Analyze specific directory or file pattern (e.g., "src/components", "apps/web")

## Research Agent Instructions

Deploy parallel research-project agents with the following specialized analysis tasks:

### Agent 1: Project Structure & Architecture
**Task**: Analyze overall project structure, identify technology stack, and map architectural patterns.

**Instructions**:
- Use LS and Glob tools to map directory structure up to 3 levels deep
- Identify project type through package managers and configuration files
- Determine primary programming languages, frameworks, and build tools
- Look for architectural patterns (monorepo, microservices, MVC, etc.)
- Find entry points and main application files
- Scope filtering: For specific scopes, focus only on relevant directories

### Agent 2: Dependencies & Configuration
**Task**: Extract dependency information, build configuration, and development setup details.

**Instructions**:
- Locate and analyze package management files (package.json, requirements.txt, etc.)
- Extract major dependencies and development tools
- Identify build scripts, CI/CD configurations, and deployment settings
- Find environment configuration and setup requirements
- Scope filtering: For "config" scope, focus exclusively on configuration files

### Agent 3: Code Organization & Patterns
**Task**: Analyze code structure, naming conventions, and implementation patterns.

**Instructions**:
- Use Grep to identify common patterns, class structures, and function signatures
- Analyze import/export patterns and module organization
- Identify coding conventions and style patterns
- Look for utility functions, shared components, and reusable modules
- Scope filtering: Apply search patterns based on scope (e.g., "data-models" searches for schema/model files)

### Agent 4: Documentation & Context
**Task**: Extract existing documentation, comments, and contextual information.

**Instructions**:
- Read README files, documentation directories, and inline comments
- Identify TODO comments, known issues, and development notes
- Extract API documentation, usage examples, and setup guides
- Look for changelog, contribution guidelines, and project history
- Scope filtering: For "docs" scope, focus exclusively on documentation files

## Specialized Scope Instructions

### Data Models Scope
- Search for: `*.model.*, *Schema*, *Entity*, migrations/*, database/*`
- Focus on: Database schemas, ORM models, data validation, relationships
- Extract: Table structures, field definitions, constraints, relationships

### API Scope
- Search for: `*route*, *controller*, *api*, *endpoint*, *service*`
- Focus on: REST endpoints, GraphQL schemas, API documentation, middleware
- Extract: Route definitions, request/response schemas, authentication

### Frontend Scope
- Search for: `*component*, *view*, *page*, *.css, *.scss, *styles*`
- Focus on: UI components, styling, state management, routing
- Extract: Component hierarchy, styling patterns, user interactions

### Backend Scope
- Search for: `*service*, *business*, *logic*, *worker*, *job*`
- Focus on: Business logic, data processing, background jobs, integrations
- Extract: Service architectures, data flow, external integrations

### Tests Scope
- Search for: `*test*, *spec*, __tests__/*, cypress/*, playwright/*`
- Focus on: Test suites, test utilities, mocking, coverage
- Extract: Testing strategies, test patterns, coverage areas

## Output Requirements

Each research agent should provide:

1. **Scope Summary**: What was analyzed within the specified scope
2. **Key Findings**: Most important discoveries relevant to the scope
3. **File Inventory**: Critical files identified within scope
4. **Patterns & Conventions**: Code patterns and naming conventions found
5. **Dependencies**: Relevant dependencies and tools for the scope
6. **Recommendations**: Next steps for deeper analysis within scope

## Execution Pattern

```
Task: research-project - "Project Structure Analysis for scope: [SCOPE]"
Task: research-project - "Dependencies Analysis for scope: [SCOPE]"
Task: research-project - "Code Patterns Analysis for scope: [SCOPE]"
Task: research-project - "Documentation Analysis for scope: [SCOPE]"
```

After all agents complete, synthesize findings into a coherent context summary focused on the requested scope.
