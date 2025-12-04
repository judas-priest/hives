# Bang Commands - Shell Execution System

## Overview

The Bang Commands system allows you to execute shell commands directly from the Modern CLI interactive session, inspired by Google Gemini CLI. This feature integrates shell command execution with AI interactions, making it easy to run system commands and share their output with the AI assistant.

## Features

- **Single Command Execution**: Execute individual shell commands with the `!` prefix
- **Persistent Shell Mode**: Toggle into a dedicated shell mode with `!`
- **Security Confirmations**: Automatic prompts for potentially dangerous commands
- **YOLO Mode**: Optional auto-approval for all commands
- **AI Integration**: Command outputs are automatically added to the AI conversation context
- **Command History**: Track all executed shell commands with timestamps

## Usage

### Single Command Execution

Execute any shell command by prefixing it with `!`:

```bash
You > !pwd
🔧 Executing: pwd
✓ Command completed successfully
────────────────────────────────────────────────────────────
/home/user/projects/myproject
────────────────────────────────────────────────────────────

You > !git status
🔧 Executing: git status
✓ Command completed successfully
────────────────────────────────────────────────────────────
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
────────────────────────────────────────────────────────────
```

### Persistent Shell Mode

Toggle into persistent shell mode where every line is executed as a shell command:

```bash
You > !
🐚 Entering Persistent Shell Mode
  Every line will be executed as a shell command
  Type ! again to exit shell mode

Shell > pwd
🔧 Executing: pwd
✓ Command completed successfully
────────────────────────────────────────────────────────────
/home/user/projects/myproject
────────────────────────────────────────────────────────────

Shell > ls -la
🔧 Executing: ls -la
✓ Command completed successfully
────────────────────────────────────────────────────────────
total 48
drwxr-xr-x  6 user user  4096 Dec  4 10:00 .
drwxr-xr-x 10 user user  4096 Dec  4 09:30 ..
drwxr-xr-x  8 user user  4096 Dec  4 10:00 .git
-rw-r--r--  1 user user   123 Dec  4 09:45 README.md
────────────────────────────────────────────────────────────

Shell > !
✓ Exited Persistent Shell Mode

You >
```

### Security Confirmations

By default, potentially dangerous commands require confirmation:

```bash
You > !rm important.txt

⚠️  Potentially dangerous command:
   rm important.txt
Execute this command? [y/N] y

🔧 Executing: rm important.txt
✓ Command completed successfully
```

**Dangerous commands that require confirmation:**
- File deletion: `rm`, `rmdir`, `del`, `delete`
- Permission changes: `chmod`, `chown`, `chgrp`
- File moving: `mv`, `move`
- Disk operations: `dd`, `format`, `mkfs`
- Process management: `kill`, `killall`, `pkill`
- System control: `shutdown`, `reboot`, `halt`, `poweroff`
- Privilege escalation: `sudo`, `su`
- Package managers: `apt`, `yum`, `dnf`, `pacman`, `brew`, `npm`, `pip`, `gem`
- Commands with wildcards: `*`
- Redirects and pipes: `>`, `|`

### YOLO Mode

Enable YOLO mode to auto-approve all commands (use with caution!):

```bash
You > /shell yolo
⚠️  Shell YOLO Mode: ENABLED (no confirmations)

You > !rm temp.txt
🔧 Executing: rm temp.txt
✓ Command completed successfully
```

## Shell Management Commands

Use `/shell` to manage shell command settings:

### View Status
```bash
You > /shell status

🐚 Shell Mode Status:

  Persistent Mode:         Inactive
  YOLO Mode:              Disabled
  Confirm Dangerous:      Yes
  Timeout:                30000ms
  Max Buffer:             5.0MB
  Command History:        5 commands
```

### View Command History
```bash
You > /shell history

📜 Shell Command History:

  10:30:45 $ pwd
  10:31:12 $ git status
  10:32:00 $ ls -la
  10:33:22 $ npm test
  10:35:01 $ echo "Hello World"
```

### Toggle YOLO Mode
```bash
You > /shell yolo
⚠️  Shell YOLO Mode: ENABLED (no confirmations)
```

### List Dangerous Commands
```bash
You > /shell dangerous

⚠️  Dangerous Commands List:

   1. rm
   2. rmdir
   3. del
   4. delete
   5. chmod
   ...

  These commands require confirmation unless YOLO mode is enabled
  Edit settings.json to customize this list
```

### Clear Shell History
```bash
You > /shell clear
✓ Shell command history cleared
```

## AI Integration

Command outputs are automatically added to the AI conversation context, allowing the AI to see and analyze the results:

```bash
You > !npm test

[Test output shown...]

You > Fix the failing test in the utils.test.js file

Assistant > I can see from the test output that the test is failing because...
[AI has access to the test output and can provide context-aware assistance]
```

## Configuration

Shell command settings are configured in your settings file (`~/.hives-cli/settings.json` or `.hives/settings.json`):

```json
{
  "shell": {
    "yoloMode": false,
    "confirmDangerous": true,
    "dangerousCommands": [
      "rm", "rmdir", "del", "delete",
      "chmod", "chown", "chgrp",
      "mv", "move",
      "dd", "format", "mkfs",
      "kill", "killall", "pkill",
      "shutdown", "reboot", "halt", "poweroff",
      "sudo", "su",
      "apt", "yum", "dnf", "pacman", "brew", "npm", "pip", "gem"
    ],
    "timeout": 30000,
    "maxBuffer": 5242880,
    "persistentMode": false
  }
}
```

### Configuration Options

- **yoloMode** (boolean): Auto-approve all commands without confirmation
- **confirmDangerous** (boolean): Ask for confirmation on dangerous commands
- **dangerousCommands** (array): List of command prefixes that require confirmation
- **timeout** (number): Maximum execution time in milliseconds (default: 30000)
- **maxBuffer** (number): Maximum output buffer size in bytes (default: 5MB)
- **persistentMode** (boolean): Start CLI in persistent shell mode (default: false)

## Error Handling

When a command fails, the CLI shows both stdout and stderr:

```bash
You > !node nonexistent.js

🔧 Executing: node nonexistent.js
✗ Command failed (exit code 1)

────────────────────────────────────────────────────────────
stderr:
node:internal/modules/cjs/loader:1089
  throw err;
  ^

Error: Cannot find module '/path/to/nonexistent.js'
────────────────────────────────────────────────────────────
```

## Best Practices

1. **Use Single Commands for One-Offs**: For occasional commands, use the `!command` syntax
2. **Use Persistent Mode for Multiple Commands**: If you need to run several commands in a row, toggle into shell mode with `!`
3. **Keep YOLO Mode Off by Default**: Only enable YOLO mode in safe environments or for trusted scripts
4. **Review Dangerous Commands List**: Customize the list in settings.json based on your security requirements
5. **Check Command Output**: Always review command output before asking the AI to analyze it
6. **Use Command History**: Review previous commands with `/shell history` to track what you've executed

## Comparison with Old System

### Before (YOLO mode only)
```bash
# Old system required YOLO mode enabled
You > /yolo
⚠️  YOLO Mode: ENABLED

You > How many files are in src?
Assistant > [Would need manual !command in prompt]
```

### After (Bang Commands)
```bash
# New system: direct shell execution with safety
You > !find src -type f | wc -l
✓ Command completed successfully
────────────────────────────────────────────────────────────
42
────────────────────────────────────────────────────────────

You > There are 42 files. Can you help me organize them?
Assistant > [AI has the context from the shell command]
```

## Advanced Usage

### Combining with File Includes
```bash
You > !cat package.json
[package.json content shown]

You > @package.json Review my dependencies and check for updates
```

### Interactive Workflow
```bash
# Enter shell mode
You > !

# Run multiple commands
Shell > git status
Shell > git diff
Shell > git log --oneline -5

# Exit shell mode
Shell > !

# Ask AI about the changes
You > Summarize the recent changes I just reviewed
```

## Troubleshooting

### Command Not Executing
- Check if you're using the correct syntax: `!command` (no space between ! and command)
- Ensure the command exists in your PATH
- Check timeout settings if command takes too long

### Confirmation Not Appearing
- Verify `confirmDangerous` is set to `true` in settings
- Check if YOLO mode is enabled (disable with `/shell yolo`)

### Command Output Truncated
- Increase `maxBuffer` in settings.json
- Redirect output to a file and read it with `@filename`

### Shell Mode Not Working
- Make sure you're typing exactly `!` to toggle
- Check for any keyboard input issues
- Restart the CLI if shell mode gets stuck

## Security Considerations

1. **Never Run Untrusted Commands**: Only execute commands you understand
2. **Be Careful with Wildcards**: Commands with `*` require confirmation for a reason
3. **Review YOLO Mode Usage**: YOLO mode bypasses all safety checks
4. **Audit Command History**: Use `/shell history` to review what's been executed
5. **Customize Dangerous List**: Add project-specific dangerous commands to settings

## Examples

### Development Workflow
```bash
You > !npm test
[Tests run, 2 failures shown]

You > Fix the failing tests in utils.test.js

Assistant > I can see two tests are failing:
1. The date formatting test expects...
2. The validation test is failing because...

[AI provides fixes based on test output]
```

### Git Operations
```bash
You > !
Shell > git status
Shell > git diff
Shell > git add .
Shell > git commit -m "Update feature X"
Shell > !

You > Check if my commit looks good
```

### System Diagnostics
```bash
You > !df -h
[Disk usage shown]

You > !free -h
[Memory usage shown]

You > Analyze my system resources and suggest optimizations
```

## See Also

- [Settings Documentation](./SETTINGS.md)
- [Custom Commands](./CUSTOM_COMMANDS.md)
- [Security Best Practices](./SECURITY.md)
