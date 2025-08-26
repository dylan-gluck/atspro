#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# ///

import json
import os
import sys
from pathlib import Path

# Add utils directory to path for SessionState import
sys.path.insert(0, str(Path(__file__).parent / 'utils'))

try:
    from session_state import SessionState
except ImportError:
    SessionState = None  # Graceful fallback if module not available

def main():
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)

        # Ensure log directory exists
        log_dir = Path.cwd() / '.claude/logs'
        log_dir.mkdir(parents=True, exist_ok=True)
        log_path = log_dir / 'post_tool_use.json'

        # Read existing log data or initialize empty list
        if log_path.exists():
            with open(log_path, 'r') as f:
                try:
                    log_data = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    log_data = []
        else:
            log_data = []

        # Append new data
        log_data.append(input_data)

        # Write back to file with formatting
        with open(log_path, 'w') as f:
            json.dump(log_data, f, indent=2)
        
        # Update session state for orchestration tracking
        if SessionState:
            try:
                session_id = input_data.get('session_id')
                tool_name = input_data.get('tool_name', '')
                tool_input = input_data.get('tool_input', {})
                tool_response = input_data.get('tool_response', {})
                
                if session_id:
                    state_manager = SessionState(session_id)
                    
                    # Track agent completions for Task tool
                    if tool_name == 'Task':
                        subagent_type = tool_input.get('subagent_type', '')
                        if subagent_type:
                            state_manager.update({"agents": {"remove": subagent_type}})
                    
                    # Track file changes
                    elif tool_name == 'Write':
                        file_path = tool_input.get('file_path', '')
                        if file_path:
                            state_manager.update({"files": {"new": file_path}})
                    
                    elif tool_name in ['Edit', 'MultiEdit']:
                        file_path = tool_input.get('file_path', '')
                        if file_path:
                            state_manager.update({"files": {"edited": file_path}})
                    
                    elif tool_name == 'Read':
                        file_path = tool_input.get('file_path', '')
                        if file_path:
                            state_manager.update({"files": {"read": file_path}})
            except Exception:
                pass  # Fail silently to not disrupt hook

        sys.exit(0)

    except json.JSONDecodeError:
        # Handle JSON decode errors gracefully
        sys.exit(0)
    except Exception:
        # Exit cleanly on any other error
        sys.exit(0)

if __name__ == '__main__':
    main()
