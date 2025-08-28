#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "httpx>=0.27.0",
# ]
# ///
"""
Check if a dev server is running on the specified port.

This script attempts to connect to http://localhost:<port>/ and reports
whether the development server is running or not.

Usage:
    uv run check-dev-server.py        # checks port 3000
    uv run check-dev-server.py 5173   # checks port 5173
    # or if executable:
    ./check-dev-server.py 8080        # checks port 8080
"""

import sys
import httpx


def check_server_status(port: int = 3000, timeout: float = 2.0) -> bool:
    """
    Check if the dev server is responding.

    Args:
        port: The port to check (default: 3000)
        timeout: Connection timeout in seconds

    Returns:
        True if server is running, False otherwise
    """
    url = f"http://localhost:{port}/"
    try:
        # Use a short timeout to avoid hanging
        response = httpx.get(url, timeout=timeout, follow_redirects=True)
        # Any successful response (2xx, 3xx, even 4xx) means the server is running
        # Only network errors or timeouts mean it's not running
        return True
    except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError):
        # Server is not reachable
        return False
    except Exception:
        # Any other unexpected error means server is likely not running
        return False


def main() -> int:
    """Main execution function."""
    # Get port from command line argument if provided
    port = 3000  # default
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
            if port < 1 or port > 65535:
                print(f"Error: Port {port} is out of valid range (1-65535)", file=sys.stderr)
                return 1
        except ValueError:
            print(f"Error: '{sys.argv[1]}' is not a valid port number", file=sys.stderr)
            return 1
    
    is_running = check_server_status(port)

    if is_running:
        print("running")
    else:
        print("not-running")

    return 0


if __name__ == "__main__":
    sys.exit(main())
