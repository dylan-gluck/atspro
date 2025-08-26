# Claude Code Hooks

This directory contains hooks that execute automatically in response to Claude Code events. These hooks provide extensible automation, logging, and workflow enhancements throughout the development process.

## Overview

Claude Code hooks are Python scripts that execute at specific points in the interaction lifecycle. They receive structured JSON input via stdin and can optionally provide output to modify behavior or add context. All hooks fail gracefully to ensure Claude Code remains functional even if individual hooks encounter errors.

## Available Hooks

### Core Event Hooks

**`session_start.py`** - Session Initialization
- **Triggered by**: New session startup, session resume, or session clear
- **Purpose**: Initialize development context, load project information, and optionally announce session start
- **Command line options**:
  - `--load-context`: Load development context from project files (CONTEXT.md, TODO.md, GitHub issues)
  - `--announce`: Use TTS to announce session start
- **Features**:
  - Git status integration (current branch, uncommitted changes)
  - Context file loading (.claude/CONTEXT.md, TODO.md)
  - GitHub issues integration via `gh` CLI
  - Session state management

**`user_prompt_submit.py`** - Prompt Processing
- **Triggered by**: User submitting a prompt to Claude
- **Purpose**: Log prompts, validate input, manage session data, and optionally generate agent names
- **Command line options**:
  - `--validate`: Enable prompt validation for security patterns
  - `--log-only`: Log prompts without validation
  - `--store-last-prompt`: Store prompt for status display
  - `--name-agent`: Generate agent name for the session using LLM
- **Features**:
  - Session data management in JSON format
  - Prompt validation and blocking capabilities
  - Agent name generation via Anthropic or Ollama

**`pre_tool_use.py`** - Tool Execution Safety
- **Triggered by**: Before each tool execution
- **Purpose**: Log tool usage and provide safety validation
- **Security features** (currently commented out for flexibility):
  - Dangerous `rm -rf` command detection
  - `.env` file access protection
  - Comprehensive pattern matching for unsafe operations
- **Logging**: Records all tool calls with session context

**`post_tool_use.py`** - Tool Execution Tracking
- **Triggered by**: After each tool execution completes
- **Purpose**: Log tool results and track execution patterns
- **Data captured**: Tool responses, execution timing, and session context

**`pre_compact.py`** - Conversation Management
- **Triggered by**: Before conversation history compaction (manual or automatic)
- **Purpose**: Backup transcripts and log compaction events
- **Command line options**:
  - `--backup`: Create timestamped backup of transcript before compaction
  - `--verbose`: Display detailed compaction information
- **Features**:
  - Automatic transcript backups to `logs/transcript_backups/`
  - Compaction trigger tracking (manual vs automatic)
  - Custom instruction preservation

### Completion Hooks

**`stop.py`** - Main Session Completion
- **Triggered by**: End of main Claude session
- **Purpose**: Announce completion, archive transcripts, and generate completion messages
- **Command line options**:
  - `--chat`: Convert transcript to chat.json format
  - `--notify`: Enable TTS completion announcement
- **Features**:
  - Intelligent TTS service selection (ElevenLabs > OpenAI > pyttsx3)
  - LLM-generated completion messages with personalization
  - Transcript archival to `logs/chat.json`

**`subagent_stop.py`** - Subagent Completion
- **Triggered by**: End of subagent execution
- **Purpose**: Track subagent completion and provide audio feedback
- **Command line options**:
  - `--chat`: Archive subagent transcript
  - `--notify`: Announce subagent completion
- **Features**: Specialized handling for orchestrated subagent workflows

**`notification.py`** - User Input Alerts
- **Triggered by**: When Claude needs user input
- **Purpose**: Provide audio notifications when user attention is required
- **Command line options**:
  - `--notify`: Enable TTS notifications
- **Features**:
  - Engineer name personalization (30% chance to include name)
  - Intelligent TTS service selection
  - Contextual notification filtering

## Utility Framework

### Text-to-Speech Services (`utils/tts/`)

**Priority-based TTS selection**:
1. **ElevenLabs** (`elevenlabs_tts.py`) - Highest quality, requires API key
2. **OpenAI** (`openai_tts.py`) - High quality, requires API key  
3. **pyttsx3** (`pyttsx3_tts.py`) - Local fallback, no API key required

All TTS scripts accept text as command-line arguments and use UV for dependency management.

### LLM Integration (`utils/llm/`)

**`anth.py`** - Anthropic Integration
- Fast Claude 3.5 Haiku model for completion messages and agent names
- Generates personalized completion messages
- Creates unique agent names for sessions
- Command line interface: `--completion`, `--agent-name`

**`oai.py`** - OpenAI Integration
- GPT-based completion message generation
- Secondary option for LLM-powered features

**`ollama.py`** - Local LLM Integration
- Local model support for offline development
- Preferred for agent name generation (faster, no API costs)

## Configuration

### Environment Variables

```bash
# TTS Services (optional)
ELEVENLABS_API_KEY=your_elevenlabs_key
OPENAI_API_KEY=your_openai_key

# LLM Services (optional)
ANTHROPIC_API_KEY=your_anthropic_key

# Personalization (optional)
ENGINEER_NAME=your_name
```

### Hook Activation

Hooks are automatically executed by Claude Code based on events. Command-line options control specific behaviors:

```bash
# Example hook configurations in Claude Code settings
session_start.py --load-context --announce
user_prompt_submit.py --name-agent --store-last-prompt
pre_compact.py --backup --verbose
stop.py --chat --notify
```

## Logging and Data Management

### Log Directory Structure

```
logs/
├── session_start.json       # Session initialization events
├── user_prompt_submit.json  # User prompts and validation
├── pre_tool_use.json       # Tool execution requests
├── post_tool_use.json      # Tool execution results
├── pre_compact.json        # Compaction events
├── stop.json               # Session completions
├── subagent_stop.json      # Subagent completions
├── notification.json       # User notification events
├── chat.json               # Archived conversation transcripts
└── transcript_backups/     # Pre-compaction transcript backups
```

### Session Data Storage

```
.claude/data/sessions/
└── {session_id}.json       # Session-specific data with prompts and agent names
```

## Integration Examples

### Development Workflow Enhancement

1. **Session Start**: Load project context, announce readiness via TTS
2. **Prompt Processing**: Generate agent name, validate input, log interaction
3. **Tool Safety**: Monitor dangerous operations, log all tool usage
4. **Compaction Safety**: Backup transcripts before context compression
5. **Completion**: Generate personalized completion message, archive session

### Team Orchestration Support

- Subagent completion tracking for multi-agent workflows
- Session data management for agent identity persistence
- Comprehensive logging for debugging complex orchestrations

### Security and Safety

- Dangerous command detection (configurable)
- Environment file protection
- Comprehensive audit logging
- Graceful error handling to prevent workflow interruption

## Extension Patterns

### Adding New Hooks

1. Create Python script with UV shebang and dependencies
2. Accept JSON input via stdin
3. Use command-line arguments for configuration
4. Log events to `logs/{hook_name}.json`
5. Fail gracefully with appropriate exit codes
6. Follow existing naming and structure conventions

### Custom TTS/LLM Integration

1. Add new service script to appropriate `utils/` subdirectory
2. Follow priority-based selection pattern
3. Include fallback mechanisms
4. Support command-line testing interface

### Workflow Customization

Hooks support project-specific customization through:
- Environment variable configuration
- Command-line argument variations
- Context file integration
- External tool integration (git, gh, etc.)

This hooks system provides a comprehensive foundation for automating and enhancing Claude Code workflows while maintaining flexibility and reliability.