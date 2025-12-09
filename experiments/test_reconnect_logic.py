#!/usr/bin/env python3
"""
Experiment to test the auto-reconnect logic issue.

The problem: In run_tunnel_loop (line 1541-1544), we check:
    if self.is_running and self.auto_reconnect:
        self.reconnect_attempts += 1

But run_single_tunnel sets self.is_running = False in the finally block (line 1717).
This means auto-reconnect will never trigger because is_running is False after disconnect!

Expected behavior:
- When connection drops, is_running should become False
- But the loop should continue if auto_reconnect is enabled
- The condition should be: if NOT is_running AND auto_reconnect
"""

class MockTunnel:
    def __init__(self):
        self.is_running = False
        self.auto_reconnect = True
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5

    def run_tunnel_loop_current(self):
        """Current (broken) implementation"""
        print("=== CURRENT IMPLEMENTATION ===")
        while (
            not self.is_running
            and self.reconnect_attempts < self.max_reconnect_attempts
        ):
            print(f"Attempt {self.reconnect_attempts + 1}: Running tunnel...")
            self.run_single_tunnel()

            # BUG: This condition will never be True!
            # is_running is False after disconnect, so auto-reconnect won't trigger
            if self.is_running and self.auto_reconnect:
                self.reconnect_attempts += 1
                print("🔌 Connection lost, attempting to reconnect...")
            else:
                print(f"Breaking: is_running={self.is_running}, auto_reconnect={self.auto_reconnect}")
                break

    def run_tunnel_loop_fixed(self):
        """Fixed implementation"""
        print("\n=== FIXED IMPLEMENTATION ===")
        self.is_running = False  # Reset
        self.reconnect_attempts = 0  # Reset

        while self.reconnect_attempts < self.max_reconnect_attempts:
            print(f"Attempt {self.reconnect_attempts + 1}: Running tunnel...")
            self.run_single_tunnel()

            # FIXED: Check if we should reconnect
            # If is_running is False (connection dropped) and auto_reconnect is enabled
            if not self.is_running and self.auto_reconnect:
                self.reconnect_attempts += 1
                print(f"🔌 Connection lost, attempting to reconnect... (attempt {self.reconnect_attempts}/{self.max_reconnect_attempts})")
                # Continue to next iteration
            else:
                # Either we're still running (shouldn't happen) or auto_reconnect is disabled
                print(f"Breaking: is_running={self.is_running}, auto_reconnect={self.auto_reconnect}")
                break

    def run_single_tunnel(self):
        """Simulates a tunnel that connects then disconnects"""
        self.is_running = True
        print(f"  Tunnel started (is_running={self.is_running})")

        # Simulate connection drop
        self.is_running = False
        print(f"  Tunnel stopped (is_running={self.is_running})")

# Test the current implementation
print("Testing CURRENT implementation (broken):")
tunnel1 = MockTunnel()
tunnel1.run_tunnel_loop_current()
print(f"Final attempts: {tunnel1.reconnect_attempts}/{tunnel1.max_reconnect_attempts}")

# Test the fixed implementation
print("\n\nTesting FIXED implementation:")
tunnel2 = MockTunnel()
tunnel2.run_tunnel_loop_fixed()
print(f"Final attempts: {tunnel2.reconnect_attempts}/{tunnel2.max_reconnect_attempts}")
