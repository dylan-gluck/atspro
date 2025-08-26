#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

class SessionState:
    """Manages session state for multi-agent orchestration."""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.state_dir = Path(".claude/sessions") / session_id
        self.state_file = self.state_dir / "state.json"
        self.messages_file = self.state_dir / "messages.json"
        
    def initialize(self, source: str = "unknown") -> Dict[str, Any]:
        """Initialize session state files."""
        self.state_dir.mkdir(parents=True, exist_ok=True)
        
        now = datetime.utcnow().isoformat() + "Z"
        
        # Initialize state
        state = {
            "session_id": self.session_id,
            "created_at": now,
            "updated_at": now,
            "source": source,
            "orchestration": False,
            "workflow": "",
            "agents": [],  # Currently active agents
            "agents_history": [],  # All agents that have run
            "files": {
                "new": [],
                "edited": [],
                "read": []
            },
            "tools_used": {},  # Tool usage counts
            "errors": []
        }
        
        with open(self.state_file, 'w') as f:
            json.dump(state, f, indent=2)
            
        # Initialize messages
        messages = {"messages": []}
        with open(self.messages_file, 'w') as f:
            json.dump(messages, f, indent=2)
            
        return state
    
    def load(self) -> Optional[Dict[str, Any]]:
        """Load existing session state."""
        if not self.state_file.exists():
            return None
        try:
            with open(self.state_file, 'r') as f:
                return json.load(f)
        except Exception:
            return None
    
    def update(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update session state with atomic write."""
        state = self.load()
        if not state:
            state = self.initialize()
            
        # Apply updates
        for key, value in updates.items():
            if key == "agents" and isinstance(value, dict):
                # Handle agent operations
                if "add" in value:
                    if value["add"] not in state["agents"]:
                        state["agents"].append(value["add"])
                        state["agents_history"].append({
                            "name": value["add"],
                            "started_at": datetime.utcnow().isoformat() + "Z"
                        })
                elif "remove" in value:
                    if value["remove"] in state["agents"]:
                        state["agents"].remove(value["remove"])
            elif key == "files" and isinstance(value, dict):
                # Handle file operations
                for op, path in value.items():
                    if op in state["files"] and path not in state["files"][op]:
                        state["files"][op].append(path)
            elif key == "tools_used" and isinstance(value, str):
                # Track tool usage
                state["tools_used"][value] = state["tools_used"].get(value, 0) + 1
            else:
                state[key] = value
                
        state["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        # Atomic write with temp file
        temp_file = self.state_file.with_suffix('.tmp')
        with open(temp_file, 'w') as f:
            json.dump(state, f, indent=2)
        temp_file.replace(self.state_file)
        
        return state
    
    def add_message(self, message: Dict[str, Any]) -> None:
        """Add message to session messages log."""
        if not self.messages_file.exists():
            messages = {"messages": []}
        else:
            with open(self.messages_file, 'r') as f:
                messages = json.load(f)
                
        messages["messages"].append({
            **message,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
        
        with open(self.messages_file, 'w') as f:
            json.dump(messages, f, indent=2)

def get_current_session_id():
    """Get the current session ID from hook input or environment."""
    import sys
    import json
    
    try:
        # Try to read from stdin (hook input)
        input_data = json.load(sys.stdin)
        return input_data.get('session_id')
    except:
        # Fallback to environment or other method
        import os
        return os.environ.get('CLAUDE_SESSION_ID')