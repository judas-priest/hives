export const enUS = {
    help: {
      basics: 'Basics:',
      addContext: 'Add context',
      addContextDescription:
        'Use {at} to specify files for context (e.g., {example}) to target specific files or folders',
      shellMode: 'Shell mode',
      shellModeDescription:
        'Execute shell commands via {exclamation} (e.g., {example}) or use natural language (e.g. {naturalLanguage})',
      shellModeNaturalLanguageExample: 'start server',
      commands: 'Commands:',
      shellCommand: 'shell command',
      shortcuts: 'Keyboard Shortcuts:',
      jumpWords: 'Jump through words in the input',
      quitApp: 'Quit application',
      newLine: 'New line',
      newLineLinux: 'New line (Alt+Enter works for certain linux distros)',
      clearScreen: 'Clear the screen',
      openEditor: 'Open input in external editor',
      toggleYolo: 'Toggle YOLO mode',
      sendMessage: 'Send message',
      cancelOperation: 'Cancel operation',
      autoAcceptEdits: 'Toggle auto-accepting edits',
      cycleHistory: 'Cycle through your prompt history',
      fullList: 'For a full list of shortcuts, see {file}',
    },
    commandMessages: {
      docs: {
        openingInBrowser: 'Opening documentation in your browser: {url}',
        openInBrowserMessage: `Please open the following URL in your browser to view the documentation:
{url}

If the browser does not open automatically, please copy and paste this link to access the documentation: {url}`,
      },
      init: {
        configNotAvailable: 'Configuration not available.',
        fileAlreadyExists: 'A KODA.md file already exists in this directory. No changes were made.',
        fileCreated: 'Empty KODA.md created. Now analyzing the project to populate it.',
      },
      ide: {
        notSupported:
          'IDE integration is not supported in your current environment. To use this feature, run Koda CLI in one of these supported IDEs: {supportedList}',
        noInstaller:
          "No installer is available for {ideName}. Please install the '{extensionName}' extension manually from the marketplace.",
        installing: 'Installing IDE companion...',
        connected: 'Connected to {ideName}',
        connecting: 'Connecting...',
        disconnected: 'Disconnected',
        disconnectedWithDetails: 'Disconnected: {details}',
        openFilesTitle: 'Open files:',
        fileLimitNote:
          '(Note: The file list is limited to a number of recently accessed files within your workspace and only includes local files on disk)',
        openingBrowser: 'Opening browser to install IDE companion: {url}',
        browserOpened:
          'Browser opened successfully. Please follow the installation instructions on the website.',
        openUrlError: 'Could not open URL in browser: ',
      },
      vim: {
        enteredMode: 'Entered Vim mode. Run /vim again to exit.',
        exitedMode: 'Exited Vim mode.',
      },
    },
    statsDisplay: {
      sessionStats: 'Session Stats',
      interactionSummary: 'Interaction Summary',
      sessionId: 'Session ID:',
      toolCalls: 'Tool Calls:',
      successRate: 'Success Rate:',
      userAgreement: 'User Agreement:',
      userAgreementReviewed: '({count} reviewed)',
      performance: 'Performance',
      wallTime: 'Wall Time:',
      agentActive: 'Agent Active:',
      apiTime: 'API Time:',
      toolTime: 'Tool Time:',
      modelUsage: 'Model Usage',
      requests: 'Reqs',
      inputTokens: 'Input Tokens',
      outputTokens: 'Output Tokens',
      savingsHighlight: 'Savings Highlight:',
      savingsDetail:
        '{tokens} ({percent}%) of input tokens were served from the cache, reducing costs.',
      tipFullStats: 'Tip: For a full token breakdown, run {command}.',
    },
    sessionSummary: { poweringDown: 'Agent powering down. Goodbye!' },
    settings: {
      theme: { label: 'Theme', description: 'The color theme for the UI.' },
      customThemes: { label: 'Custom Themes', description: 'Custom theme definitions.' },
      hideWindowTitle: { label: 'Hide Window Title', description: 'Hide the window title bar' },
      hideTips: { label: 'Hide Tips', description: 'Hide helpful tips in the UI' },
      hideBanner: { label: 'Hide Banner', description: 'Hide the application banner' },
      showMemoryUsage: {
        label: 'Show Memory Usage',
        description: 'Display memory usage information in the UI',
      },
      usageStatisticsEnabled: {
        label: 'Enable Usage Statistics',
        description: 'Enable collection of usage statistics',
      },
      autoConfigureMaxOldSpaceSize: {
        label: 'Auto Configure Max Old Space Size',
        description: 'Automatically configure Node.js memory limits',
      },
      preferredEditor: {
        label: 'Preferred Editor',
        description: 'The preferred editor to open files in.',
      },
      maxSessionTurns: {
        label: 'Max Session Turns',
        description: 'Maximum number of user/model/tool turns to keep in a session.',
      },
      memoryImportFormat: {
        label: 'Memory Import Format',
        description: 'The format to use when importing memory.',
      },
      memoryDiscoveryMaxDirs: {
        label: 'Memory Discovery Max Dirs',
        description: 'Maximum number of directories to search for memory.',
      },
      contextFileName: { label: 'Context File Name', description: 'The name of the context file.' },
      vimMode: { label: 'Vim Mode', description: 'Enable Vim keybindings' },
      ideMode: { label: 'IDE Mode', description: 'Enable IDE integration mode' },
      accessibility: {
        label: 'Accessibility',
        description: 'Accessibility settings.',
        disableLoadingPhrases: {
          label: 'Disable Loading Phrases',
          description: 'Disable loading phrases for accessibility',
        },
      },
      checkpointing: {
        label: 'Checkpointing',
        description: 'Session checkpointing settings.',
        enabled: {
          label: 'Enable Checkpointing',
          description: 'Enable session checkpointing for recovery',
        },
      },
      fileFiltering: {
        label: 'File Filtering',
        description: 'Settings for git-aware file filtering.',
        respectGitIgnore: {
          label: 'Respect .gitignore',
          description: 'Respect .gitignore files when searching',
        },
        respectGeminiIgnore: {
          label: 'Respect .kodaiignore',
          description: 'Respect .kodaignore files when searching',
        },
        enableRecursiveFileSearch: {
          label: 'Enable Recursive File Search',
          description: 'Enable recursive file search functionality',
        },
      },
      disableAutoUpdate: { label: 'Disable Auto Update', description: 'Disable automatic updates' },
      selectedAuthType: {
        label: 'Selected Auth Type',
        description: 'The currently selected authentication type.',
      },
      useExternalAuth: {
        label: 'Use External Auth',
        description: 'Whether to use an external authentication flow.',
      },
      sandbox: {
        label: 'Sandbox',
        description: 'Sandbox execution environment (can be a boolean or a path string).',
      },
      coreTools: { label: 'Core Tools', description: 'Paths to core tool definitions.' },
      excludeTools: {
        label: 'Exclude Tools',
        description: 'Tool names to exclude from discovery.',
      },
      toolDiscoveryCommand: {
        label: 'Tool Discovery Command',
        description: 'Command to run for tool discovery.',
      },
      toolCallCommand: {
        label: 'Tool Call Command',
        description: 'Command to run for tool calls.',
      },
      mcpServerCommand: {
        label: 'MCP Server Command',
        description: 'Command to start an MCP server.',
      },
      mcpServers: { label: 'MCP Servers', description: 'Configuration for MCP servers.' },
      allowMCPServers: {
        label: 'Allow MCP Servers',
        description: 'A whitelist of MCP servers to allow.',
      },
      excludeMCPServers: {
        label: 'Exclude MCP Servers',
        description: 'A blacklist of MCP servers to exclude.',
      },
      telemetry: { label: 'Telemetry', description: 'Telemetry configuration.' },
      bugCommand: {
        label: 'Bug Command',
        description: 'Configuration for the bug report command.',
      },
      summarizeToolOutput: {
        label: 'Summarize Tool Output',
        description: 'Settings for summarizing tool output.',
      },
      dnsResolutionOrder: {
        label: 'DNS Resolution Order',
        description: 'The DNS resolution order.',
      },
      excludedProjectEnvVars: {
        label: 'Excluded Project Environment Variables',
        description: 'Environment variables to exclude from project context.',
      },
      disableUpdateNag: {
        label: 'Disable Update Nag',
        description: 'Disable update notification prompts.',
      },
      includeDirectories: {
        label: 'Include Directories',
        description: 'Additional directories to include in the workspace context.',
      },
      loadMemoryFromIncludeDirectories: {
        label: 'Load Memory From Include Directories',
        description: 'Whether to load memory files from include directories.',
      },
      model: { label: 'Model', description: 'The Koda model to use for conversations.' },
      hasSeenIdeIntegrationNudge: {
        label: 'Has Seen IDE Integration Nudge',
        description: 'Whether the user has seen the IDE integration nudge.',
      },
      folderTrustFeature: {
        label: 'Folder Trust Feature',
        description: 'Enable folder trust feature for enhanced security.',
      },
      folderTrust: {
        label: 'Folder Trust',
        description: 'Setting to track whether Folder trust is enabled.',
      },
      chatCompression: { label: 'Chat Compression', description: 'Chat compression settings.' },
      showLineNumbers: {
        label: 'Show Line Numbers',
        description: 'Show line numbers in the chat.',
      },
      language: { label: 'Language', description: 'The language for the user interface.' },
    },
    languageSetting: {
      selectLanguage: 'Select Language:',
      english: 'English',
      russian: 'Russian',
      pressToSelect: 'Press {key} to select',
      pressEscToCancel: 'Press ESC to cancel',
      pressEnterToChange: 'Press Enter to change',
    },
    authDialog: {
      loginWithGithub: 'Login with GitHub',
      continueWithoutAuth: 'Continue without authentication',
      getTitle: 'Get started',
      authQuestion: 'How would you like to authenticate for this project?',
      useEnterToSelect: '(Use Enter to select)',
      existingApiKeyDetected: 'Existing API key detected (KODA_API_KEY)',
      authenticateLater: 'You can authenticate later through the menu.',
      termsOfService: 'Terms of Services and Privacy Notice for Koda CLI',
    },
    authInProgress: {
      waitingMessage: 'Waiting for auth... (Press ESC or CTRL+C to cancel)',
      openUrlMessage: 'Open: ',
      codeMessage: 'Code: ',
      timeoutMessage: 'Authentication timed out. Please try again.',
    },
    contextSummary: {
      using: 'Using:',
      openFile: 'open file',
      openFiles: 'open files',
      contextFile: 'context file',
      contextFiles: 'context files',
      mcpServer: 'MCP server',
      mcpServers: 'MCP servers',
      blockedMcpServer: 'Blocked MCP server',
      blockedMcpServers: 'Blocked MCP servers',
      viewOpenFiles: 'ctrl+g to view',
      viewMcp: 'ctrl+t to view',
      toggleMcp: 'ctrl+t to toggle',
    },
    loading: {
      activity: {
        processingResponse: 'AI is generating a response...',
        awaitingUserConfirmation: 'Awaiting your confirmation...',
        executing: {
          withDescription: 'Running {tool} - {description}',
          withoutDescription: 'Running {tool}',
        },
        validating: {
          withDescription: 'Validating {tool} - {description}',
          withoutDescription: 'Validating {tool}',
        },
        scheduled: {
          withDescription: 'Preparing {tool} - {description}',
          withoutDescription: 'Preparing {tool}',
        },
        awaitingApproval: {
          withDescription: 'Awaiting confirmation for {tool} - {description}',
          withoutDescription: 'Awaiting confirmation for {tool}',
        },
        success: {
          withDescription: 'Finished {tool} - {description}',
          withoutDescription: 'Finished {tool}',
        },
        error: {
          withDescription: 'Error in {tool} - {description}',
          withoutDescription: 'Error in {tool}',
        },
        cancelled: {
          withDescription: 'Cancelled {tool} - {description}',
          withoutDescription: 'Cancelled {tool}',
        },
        tool: {
          read_file: {
            executing: {
              withDescription: 'Reading file {description}',
              withoutDescription: 'Reading file',
            },
            success: {
              withDescription: 'Read file {description}',
              withoutDescription: 'Read file',
            },
          },
          read_many_files: {
            executing: {
              withDescription: 'Reading multiple files - {description}',
              withoutDescription: 'Reading multiple files',
            },
            success: {
              withDescription: 'Read multiple files - {description}',
              withoutDescription: 'Read multiple files',
            },
          },
          write_file: {
            awaiting_approval: {
              withDescription: 'Awaiting confirmation to write file {description}',
              withoutDescription: 'Awaiting confirmation to write file',
            },
            executing: {
              withDescription: 'Writing file {description}',
              withoutDescription: 'Writing file',
            },
            success: {
              withDescription: 'Wrote file {description}',
              withoutDescription: 'Wrote file',
            },
          },
          replace: {
            awaiting_approval: {
              withDescription: 'Awaiting confirmation to update {description}',
              withoutDescription: 'Awaiting confirmation to update file',
            },
            executing: {
              withDescription: 'Updating {description}',
              withoutDescription: 'Updating file',
            },
            success: {
              withDescription: 'Updated {description}',
              withoutDescription: 'Updated file',
            },
          },
          edit: {
            awaiting_approval: {
              withDescription: 'Awaiting confirmation to edit {description}',
              withoutDescription: 'Awaiting confirmation to edit file',
            },
            executing: {
              withDescription: 'Editing {description}',
              withoutDescription: 'Editing file',
            },
            success: { withDescription: 'Edited {description}', withoutDescription: 'Edited file' },
          },
        },
      },
      cancelAndTimer: '(esc to cancel, {time})',
    },
    commandDescriptions: {
      auth: 'Change the auth method',
      about: 'Show version info',
      chat: 'Manage conversation history',
      chatList: 'List saved conversation checkpoints',
      chatSave: 'Save the current conversation as a checkpoint. Usage: /chat save <tag>',
      chatResume: 'Resume a conversation checkpoint. Usage: /chat resume <tag>',
      chatDelete: 'Delete a conversation checkpoint. Usage: /chat delete <tag>',
      clear: 'Clear the screen and conversation history',
      compress: 'Compresses the context by replacing it with a summary',
      alreadyCompressing: 'Already compressing, wait for previous request to complete',
      copy: 'Copy the last result or code snippet to clipboard',
      corgi: 'Toggles corgi mode',
      directory: 'Manage workspace directories',
      directoryAdd: 'Add directories to the workspace. Use comma to separate multiple paths',
      directoryShow: 'Show all directories in the workspace',
      docs: 'Open documentation in browser',
      editor: 'Set external editor preference',
      extensions: 'List active extensions',
      help: 'For help on koda-cli',
      ide: 'Manage IDE integration',
      ideStatus: 'Check status of IDE integration',
      ideInstall: 'Install required IDE companion for {ideName}',
      ideEnable: 'Enable IDE integration',
      ideDisable: 'Disable IDE integration',
      init: 'Analyzes the project and creates a tailored KODA.md file',
      memory: 'Commands for interacting with memory',
      memoryShow: 'Show the current memory contents',
      memoryAdd: 'Add content to the memory',
      memoryRefresh: 'Refresh the memory from the source',
      mcp: 'List configured MCP servers and tools',
      mcpAuth: 'Authenticate with an OAuth-enabled MCP server',
      mcpRefresh: 'Refresh the list of MCP servers and tools',
      mcpConfigNotLoaded: 'Config not loaded.',
      mcpToolRegistryError: 'Could not retrieve tool registry.',
      mcpNoServersConfigured: 'No MCP servers configured.',
      mcpServersStarting: 'MCP servers are starting up ({count} initializing)...',
      mcpServersStartingNote:
        'Note: First startup may take longer. Tool availability will update automatically.',
      mcpConfiguredServersTitle: 'Configured MCP servers:',
      mcpStatusStarting: 'Starting... (first startup may take longer)',
      mcpStatusDisconnected: 'Disconnected',
      mcpStatusReady: 'Ready',
      mcpAuthExpired: '(OAuth token expired)',
      mcpAuthAuthenticated: '(OAuth authenticated)',
      mcpAuthNotAuthenticated: '(OAuth not authenticated)',
      mcpToolSingular: 'tool',
      mcpToolPlural: 'tools',
      mcpPromptSingular: 'prompt',
      mcpPromptPlural: 'prompts',
      mcpZeroTools: '(0 tools)',
      mcpToolsLoading: '(tools and prompts will appear when ready)',
      mcpToolsCached: '({count} tools cached)',
      mcpToolsTitle: 'Tools:',
      mcpParametersTitle: 'Parameters:',
      mcpPromptsTitle: 'Prompts:',
      mcpNoToolsOrPrompts: 'No tools or prompts available',
      mcpNoToolsAvailable: 'No tools available',
      mcpAuthHint: '(type: "/mcp auth {serverName}" to authenticate this server)',
      mcpStatusBlocked: 'Blocked',
      mcpTipsTitle: '\u{1F4A1} Tips:',
      mcpTipsDesc: '  • Use {command} to show server and tool descriptions',
      mcpTipsSchema: '  • Use {command} to show tool parameter schemas',
      mcpTipsNoDesc: '  • Use {command} to hide descriptions',
      mcpTipsAuth: '  • Use {command} to authenticate with OAuth-enabled servers',
      mcpTipsToggle: '  • Press {command} to toggle tool descriptions on/off',
      mcpNoOauthServers: 'No MCP servers configured with OAuth authentication.',
      mcpOAuthServersList: `MCP servers with OAuth authentication:
{serverList}

Use /mcp auth <server-name> to authenticate.`,
      mcpServerNotFound: "MCP server '{serverName}' not found.",
      mcpAuthStarting: "Starting OAuth authentication for MCP server '{serverName}'...",
      mcpAuthSuccess: "✅ Successfully authenticated with MCP server '{serverName}'!",
      mcpAuthRediscovering: "Re-discovering tools from '{serverName}'...",
      mcpAuthRefreshSuccess: "Successfully authenticated and refreshed tools for '{serverName}'.",
      mcpAuthFailure: "Failed to authenticate with MCP server '{serverName}': {error}",
      mcpRefreshing: 'Refreshing MCP servers and tools...',
      privacy: 'Display the privacy notice',
      quit: 'Exit the cli',
      restore: 'Restore a previous version of a file. Usage: /restore <file_path>',
      restoreCommand: {
        noCheckpointDir: 'Could not determine the .kodacli directory path.',
        noRestorableCalls: 'No restorable tool calls found.',
        availableCalls: 'Available tool calls to restore:\\n\\n{fileList}',
        fileNotFound: 'File not found: {fileName}',
        loadHistoryNotAvailable: 'loadHistory function is not available.',
        projectRestored: 'Restored project to the state before the tool call.',
        readError: 'Could not read restorable tool calls. This is the error: {error}',
      },
      settings: 'View and edit Koda CLI settings',
      setupGithub: 'Set up GitHub Actions',
      stats: 'Check session stats. Usage: /stats [model|tools]',
      statsModel: 'Show model-specific usage statistics',
      statsTools: 'Show tool-specific usage statistics',
      theme: 'Change the theme',
      tools: 'List available Koda CLI tools',
      vim: 'Toggle vim mode on/off',
      model: 'Select model',
      terminalSetup: 'Set up terminal integration',
      bug: 'Report a bug or issue',
    },
    bugCommand: {
      browserInstruction: `Opening bug report in your default browser...
`,
      bugReportDetails: 'Bug Report Details:',
      openUrlError: 'Could not open URL in browser: ',
      telegramCommunity: 'Telegram Community:',
    },
    commandPrompts: {
      init: `
You are an AI agent that brings the power of Koda directly into the terminal. Your task is to analyze the current directory and generate a comprehensive KODA.md file to be used as instructional context for future interactions.

**Analysis Process:**

1.  **Initial Exploration:**
    *   Start by listing the files and directories to get a high-level overview of the structure.
    *   Read the README file (e.g., \`README.md\`, \`README.txt\`) if it exists. This is often the best place to start.

2.  **Iterative Deep Dive (up to 10 files):**
    *   Based on your initial findings, select a few files that seem most important (e.g., configuration files, main source files, documentation).
    *   Read them. As you learn more, refine your understanding and decide which files to read next. You don't need to decide all 10 files at once. Let your discoveries guide your exploration.

3.  **Identify Project Type:**
    *   **Code Project:** Look for clues like \`package.json\`, \`requirements.txt\`, \`pom.xml\`, \`go.mod\`, \`Cargo.toml\`, \`build.gradle\`, or a \`src\` directory. If you find them, this is likely a software project.
    *   **Non-Code Project:** If you don't find code-related files, this might be a directory for documentation, research papers, notes, or something else.

**KODA.md Content Generation:**

**For a Code Project:**

*   **Project Overview:** Write a clear and concise summary of the project's purpose, main technologies, and architecture.
*   **Building and Running:** Document the key commands for building, running, and testing the project. Infer these from the files you've read (e.g., \`scripts\` in \`package.json\`, \`Makefile\`, etc.). If you can't find explicit commands, provide a placeholder with a TODO.
*   **Development Conventions:** Describe any coding styles, testing practices, or contribution guidelines you can infer from the codebase.

**For a Non-Code Project:**

*   **Directory Overview:** Describe the purpose and contents of the directory. What is it for? What kind of information does it hold?
*   **Key Files:** List the most important files and briefly explain what they contain.
*   **Usage:** Explain how the contents of this directory are intended to be used.

**Final Output:**

Write the complete content to the \`KODA.md\` file. The output must be well-formatted Markdown.
`,
    },
    toolDescriptions: {
      search_file_content:
        'Searches for a regular expression pattern within the content of files in a specified directory (or current working directory). Can filter files by a glob pattern. Returns the lines containing matches, along with their file paths and line numbers.',
      list_directory:
        'Lists the names of files and subdirectories directly within a specified directory path. Can optionally ignore entries matching provided glob patterns.',
      glob: 'Efficiently finds files matching specific glob patterns (e.g., `src/**/*.ts`, `**/*.md`), returning absolute paths sorted by modification time (newest first). Ideal for quickly locating files based on their name or path structure, especially in large codebases.',
      google_web_search:
        'Performs a web search using the Serper-backed API and returns the top organic results.',
      save_memory: `Saves a specific piece of information or fact to your long-term memory.

Use this tool:

- When the user explicitly asks you to remember something (e.g., "Remember that I like pineapple on pizza", "Please save this: my cat's name is Whiskers").
- When the user states a clear, concise fact about themselves, their preferences, or their environment that seems important for you to retain for future interactions to provide a more personalized and effective assistance.

Do NOT use this tool:

- To remember conversational context that is only relevant for the current session.
- To save long, complex, or rambling pieces of text. The fact should be relatively short and to the point.
- If you are unsure whether the information is a fact worth remembering long-term. If in doubt, you can ask the user, "Should I remember that for you?"

## Parameters

- \`fact\` (string, required): The specific fact or piece of information to remember. This should be a clear, self-contained statement. For example, if the user says "My favorite color is blue", the fact would be "My favorite color is blue".`,
      run_shell_command:
        'This tool executes a given shell command as `bash -c <command>`. Command can start background processes using `&`. Command is executed as a subprocess that leads its own process group. Command process group can be terminated as `kill -- -PGID` or signaled as `kill -s SIGNAL -- -PGID`.\n\n      The following information is returned:\n\n      Command: Executed command.\n      Directory: Directory (relative to project root) where command was executed, or `(root)`.\n      Stdout: Output on stdout stream. Can be `(empty)` or partial on error and for any unwaited background processes.\n      Stderr: Output on stderr stream. Can be `(empty)` or partial on error and for any unwaited background processes.',
    },
    tips: {
      title: 'Tips for getting started:',
      tip1: '1. Ask questions, edit files, or run commands',
      tip2: '2. Be specific for the best results',
      tip3: '3. Create {fileName} files to customize your interactions with Koda',
      tip4: '4. {command} for more information',
      tip3noFile: '3. {command} for more information',
    },
    startupWarnings: {
      homeDirectory: {
        message:
          'You are running Koda CLI in your home directory. It is recommended to run in a project-specific directory.',
      },
      rootDirectory: {
        message:
          'Warning: You are running Koda CLI in the root directory. Your entire folder structure will be used for context. It is strongly recommended to run in a project-specific directory.',
      },
      fileSystemError: {
        message: 'Could not verify the current directory due to a file system error.',
      },
    },
    app: {
      context: { contextLeft: '{percentLeft}% context left' },
      toolConfirmation: {
        modifyInProgress: 'Modify in progress: ',
        saveAndCloseExternalEditor: 'Save and close external editor to continue',
        applyThisChange: 'Apply this change?',
        yesAllowOnce: 'Yes, allow once',
        yesAllowAlways: 'Yes, allow always',
        noEsc: 'No (esc)',
        modifyWithExternalEditor: 'Modify with external editor',
        noSuggestChanges: 'No, suggest changes (esc)',
        allowExecutionOf: "Allow execution of: '{command}'?",
        doYouWantToProceed: 'Do you want to proceed?',
        urlsToFetch: 'URLs to fetch:',
        allowExecutionOfMcpTool:
          'Allow execution of MCP tool "{toolName}" from server "{serverName}"?',
        yesAlwaysAllowToolFromServer:
          'Yes, always allow tool "{toolName}" from server "{serverName}"',
        yesAlwaysAllowAllToolsFromServer: 'Yes, always allow all tools from server "{serverName}"',
      },
      requestCancelled: 'Request cancelled.',
      docs: { seeDocs: 'see /docs' },
      settings: {
        title: 'Settings',
        applyTo: 'Apply To',
        enterSelectTabFocus: '(Use Enter to select, Tab to change focus)',
        restartRequired:
          'To see changes, Koda CLI must be restarted. Press r to exit and apply changes now.',
      },
      memory: {
        refreshing: 'Refreshing hierarchical memory (KODA.md or other context files)...',
        refreshSuccess:
          'Memory refreshed successfully. Loaded {charCount} characters from {fileCount} file(s).',
        refreshSuccessEmpty: 'Memory refreshed successfully. No memory content found.',
        refreshError: 'Error refreshing memory: {error}',
        empty: 'Memory is currently empty.',
        usage: 'Usage: /memory add <text to remember>',
        saving: 'Attempting to save to memory: "{text}"',
        refreshingFromSourceFiles: 'Refreshing memory from source files...',
        refreshSuccessFromSourceFiles:
          'Memory refreshed successfully. Loaded {characters} characters from {files} file(s).',
        showContent:
          'Current memory content from {fileCount} file(s):\\n\\n---\\n{memoryContent}\\n---',
        save: 'Save Memory',
        saveSuccess: `Okay, I've remembered that: "{fact}"`,
        saveModifiedSuccess: "Okay, I've updated the memory file with your modifications.",
        saveError: 'Error saving memory: {error}',
        validationNonEmpty: 'Parameter "fact" must be a non-empty string.',
      },
      flashFallback: {
        proQuotaExceeded: `⚡ Switching from {currentModel} to {fallbackModel} for the remainder of this session because the current model is temporarily unavailable.
⚡ Use /auth to configure another access token if you prefer a different model.`,
        freeQuotaExceeded: `⚡ Switching from {currentModel} to {fallbackModel} for the remainder of this session because the current model is temporarily unavailable.
⚡ Use /auth to configure another access token if you prefer a different model.`,
        proGenericQuota: `⚡ Switching from {currentModel} to {fallbackModel} for the remainder of this session because the current model is temporarily unavailable.
⚡ Use /auth to configure another access token if you prefer a different model.`,
        freeGenericQuota: `⚡ Switching from {currentModel} to {fallbackModel} for the remainder of this session because the current model is temporarily unavailable.
⚡ Use /auth to configure another access token if you prefer a different model.`,
        proDefault: `⚡ Switching from {currentModel} to {fallbackModel} for the remainder of this session because the current model is temporarily unavailable.
⚡ Use /auth to configure another access token if you prefer a different model.`,
        freeDefault: `⚡ Switching from {currentModel} to {fallbackModel} for the remainder of this session because the current model is temporarily unavailable.
⚡ Use /auth to configure another access token if you prefer a different model.`,
      },
      trial: {
        footerLabel: 'trial requests {used}{limitPart}',
        limitReached: `⚡ You have used all available Koda trial requests.
⚡ Further requests are paused until the trial resets.
⚡ Configure permanent access with /auth or visit https://kodacode.ru .`,
      },
      auth: {
        reauthRequired: 'Reauthentication required',
        timeout: 'Authentication timed out. Please try again.',
      },
      prompts: {
        pressCtrlCAgain: 'Press Ctrl+C again to exit.',
        pressCtrlDAgain: 'Press Ctrl+D again to exit.',
        pressEscAgain: 'Press Esc again to clear.',
      },
      placeholders: {
        vim: "  Press 'i' for INSERT mode and 'Esc' for NORMAL mode.",
        default: '  Type your message or @path/to/file',
      },
      confirmation: { yes: 'Yes', no: 'No' },
      compression: {
        compressing: 'Compressing chat history',
        compressed: 'Chat history compressed from {original} to {new} tokens.',
      },
      chat: {
        noCheckpoints: 'No saved conversation checkpoints found.',
        listTitle: 'List of saved conversations:',
        savedOn: 'saved on',
        noteNewestLast: 'Note: Newest last, oldest first',
        missingTag: 'Missing tag. Usage: /chat save <tag>',
        conversationSaved: 'Conversation checkpoint saved with tag: {tag}.',
        noConversation: 'No conversation found to save.',
        noCheckpoint: 'No saved checkpoint found with tag: {tag}.',
        overwritePrompt:
          'A checkpoint with the tag {tag} already exists. Do you want to overwrite it?',
      },
      copy: {
        noOutput: 'No output in history',
        copied: 'Last output copied to the clipboard',
        failed: 'Failed to copy to the clipboard.',
        noText: 'Last AI output contains no text to copy.',
      },
      directory: {
        configNotAvailable: 'Configuration is not available.',
        providePath: 'Please provide at least one path to add.',
        notSupported:
          'The /directory add command is not supported in restrictive sandbox profiles. Please use --include-directories when starting the session instead.',
        successfullyAddedFiles: `Successfully added KODA.md files from the following directories if there are:
- {directories}`,
        successfullyAdded: `Successfully added directories:
- {directories}`,
        currentDirectories: `Current workspace directories:
{directories}`,
      },
      tools: {
        noRegistry: 'Could not retrieve tool registry.',
        available: `Available Koda CLI tools:

`,
        noTools: `  No tools available
`,
      },
      editorSettings: {
        title: 'Select Editor',
        applyTo: 'Apply To',
        enterSelectTabFocus: '(Use Enter to select, Tab to change focus)',
        supportedEditors:
          'These editors are currently supported. Please note that some editors cannot be used in sandbox mode.',
        preferredEditor: 'Your preferred editor is: ',
        none: 'None',
      },
      theme: {
        title: 'Select Theme',
        applyTo: 'Apply To',
        preview: 'Preview',
        enterSelectTabFocus: '(Use Enter to select, Tab to change focus)',
      },
      stats: {
        modelStats: 'Model Stats For Nerds',
        toolStats: 'Tool Stats For Nerds',
        metric: 'Metric',
        api: 'API',
        requests: 'Requests',
        errors: 'Errors',
        avgLatency: 'Avg Latency',
        tokens: 'Tokens',
        total: 'Total',
        prompt: 'Prompt',
        cached: 'Cached',
        thoughts: 'Thoughts',
        tool: 'Tool',
        toolName: 'Tool Name',
        output: 'Output',
        calls: 'Calls',
        successRate: 'Success Rate',
        avgDuration: 'Avg Duration',
        userDecisionSummary: 'User Decision Summary',
        totalReviewed: 'Total Reviewed Suggestions',
        accepted: 'Accepted',
        rejected: 'Rejected',
        modified: 'Modified',
        overallAgreementRate: 'Overall Agreement Rate',
        noApiCalls: 'No API calls have been made in this session.',
        noToolCalls: 'No tool calls have been made in this session.',
      },
      about: {
        title: 'About Koda CLI',
        cliVersion: 'CLI Version',
        gitCommit: 'Git Commit',
        model: 'Model',
        sandbox: 'Sandbox',
        os: 'OS',
        authMethod: 'Auth Method',
        gcpProject: 'GCP Project',
      },
      init: {
        error: 'Initialization Error: {error}',
        checkConfig: 'Please check API key and configuration.',
      },
      extensions: { noActive: 'No active extensions.', activeTitle: 'Active extensions:' },
    },
  };