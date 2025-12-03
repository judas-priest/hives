#!/usr/bin/env node

/**
 * Polza CLI - Modern TUI Edition
 * A beautiful terminal user interface powered by Ink
 */

import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { PolzaClient } from '../shared/lib/polza-client.js';
import { fileSystemTools, executeFileSystemTool } from '../shared/tools/filesystem.js';
import { advancedTools, executeAdvancedTool } from '../shared/tools/advanced.js';
import { HistoryManager } from '../shared/lib/history-manager.js';
import { CommandLoader } from '../shared/lib/command-loader.js';
import { MemoryManager } from '../shared/lib/memory-manager.js';
import { SettingsManager } from '../shared/lib/settings-manager.js';
import { PolzaMdLoader } from '../shared/lib/polza-md-loader.js';
import { processPrompt, hasSpecialSyntax } from '../shared/lib/prompt-processor.js';

// Import TUI components
import Header from './components/Header.jsx';
import ChatView from './components/ChatView.jsx';
import InputBar from './components/InputBar.jsx';
import StatusBar from './components/StatusBar.jsx';
import CommandPalette from './components/CommandPalette.jsx';

/**
 * Main Polza TUI Application
 */
const PolzaTUI = ({ yolomode, model: cliModel, outputFormat }) => {
	const { exit } = useApp();
	const [initialized, setInitialized] = useState(false);
	const [error, setError] = useState(null);

	// Application state
	const [client, setClient] = useState(null);
	const [conversationHistory, setConversationHistory] = useState([]);
	const [currentInput, setCurrentInput] = useState('');
	const [isProcessing, setIsProcessing] = useState(false);
	const [showCommandPalette, setShowCommandPalette] = useState(false);
	const [yoloMode, setYoloMode] = useState(yolomode || false);

	// Managers
	const [historyManager] = useState(new HistoryManager());
	const [commandLoader] = useState(new CommandLoader());
	const [memoryManager] = useState(new MemoryManager());
	const [settingsManager] = useState(new SettingsManager());
	const [polzaMdLoader] = useState(new PolzaMdLoader());

	const [customInstructions, setCustomInstructions] = useState('');
	const [model, setModel] = useState(cliModel || null);
	const [markdownEnabled, setMarkdownEnabled] = useState(true);

	// Status info
	const [sessionId, setSessionId] = useState('');
	const [lastUsage, setLastUsage] = useState(null);

	/**
	 * Initialize application
	 */
	useEffect(() => {
		const init = async () => {
			try {
				// Initialize managers
				await memoryManager.initialize();
				await settingsManager.initialize();
				await commandLoader.loadCommands();

				// Load custom instructions
				const instructions = await polzaMdLoader.load();
				setCustomInstructions(instructions);

				// Apply settings
				const savedModel = settingsManager.get('model');
				const savedMarkdown = settingsManager.get('markdownEnabled');
				setModel(cliModel || savedModel);
				setMarkdownEnabled(savedMarkdown);

				// Initialize Polza client
				const polzaClient = new PolzaClient({
					model: cliModel || savedModel
				});
				setClient(polzaClient);

				// Get session ID
				setSessionId(historyManager.getSessionId());

				setInitialized(true);
			} catch (err) {
				setError(err.message);
			}
		};

		init();
	}, []);

	/**
	 * Handle user input submission
	 */
	const handleSubmit = useCallback(async (input) => {
		if (!input.trim() || isProcessing) return;

		const trimmedInput = input.trim();

		// Handle commands
		if (trimmedInput.startsWith('/')) {
			await handleCommand(trimmedInput);
			return;
		}

		// Process user message
		await processMessage(trimmedInput);
	}, [isProcessing, client, conversationHistory]);

	/**
	 * Process user message with AI
	 */
	const processMessage = async (userInput) => {
		setIsProcessing(true);

		try {
			// Process prompt for @file and !shell syntax
			let processedInput = userInput;
			let metadata = { filesIncluded: [], shellCommands: [], errors: [] };

			if (hasSpecialSyntax(userInput)) {
				const result = await processPrompt(userInput, yoloMode);
				processedInput = result.prompt;
				metadata = result.metadata;
			}

			// Add user message to history
			const newHistory = [
				...conversationHistory,
				{ role: 'user', content: processedInput }
			];
			setConversationHistory(newHistory);

			// Log user input
			await historyManager.logChat('user', userInput);

			// Prepend custom instructions if first message
			let messagesWithInstructions = newHistory;
			if (customInstructions && newHistory.filter(m => m.role === 'user').length === 1) {
				const systemMessage = polzaMdLoader.createSystemMessage();
				if (systemMessage) {
					messagesWithInstructions = [systemMessage, ...newHistory];
				}
			}

			// Combine all tools
			const allTools = [...fileSystemTools, ...advancedTools];

			// Make API call with tools
			let response = await client.chat(messagesWithInstructions, {
				tools: allTools,
				tool_choice: 'auto'
			});

			// Handle tool calls
			let iterationCount = 0;
			const maxIterations = 10;
			let workingHistory = [...newHistory];

			while (response.choices[0].finish_reason === 'tool_calls' && iterationCount < maxIterations) {
				iterationCount++;
				const assistantMessage = response.choices[0].message;
				workingHistory.push(assistantMessage);

				// Execute each tool call
				for (const toolCall of assistantMessage.tool_calls) {
					const toolArgs = JSON.parse(toolCall.function.arguments);
					let toolResult;

					if (fileSystemTools.some(t => t.function.name === toolCall.function.name)) {
						toolResult = await executeFileSystemTool(toolCall.function.name, toolArgs);
					} else if (advancedTools.some(t => t.function.name === toolCall.function.name)) {
						toolResult = await executeAdvancedTool(toolCall.function.name, toolArgs, yoloMode);
					} else {
						toolResult = { error: true, message: `Unknown tool: ${toolCall.function.name}` };
					}

					// Add tool response to history
					workingHistory.push({
						role: 'tool',
						tool_call_id: toolCall.id,
						name: toolCall.function.name,
						content: JSON.stringify(toolResult)
					});
				}

				// Get next response
				response = await client.chat(workingHistory, {
					tools: allTools,
					tool_choice: 'auto'
				});
			}

			// Add final assistant message
			const finalMessage = response.choices[0].message;
			workingHistory.push(finalMessage);
			setConversationHistory(workingHistory);

			// Log the interaction
			await historyManager.logChat('assistant', finalMessage.content, {
				tokens: response.usage?.total_tokens,
				cost: response.usage?.cost
			});

			// Update usage info
			if (response.usage) {
				setLastUsage({
					tokens: response.usage.total_tokens,
					cost: response.usage.cost || 0
				});
			}

			// Auto-save history
			await historyManager.saveHistory(workingHistory);

		} catch (err) {
			setConversationHistory([
				...conversationHistory,
				{
					role: 'system',
					content: `Error: ${err.message}`
				}
			]);
			await historyManager.log(`Error: ${err.message}`, 'error');
		} finally {
			setIsProcessing(false);
		}
	};

	/**
	 * Handle special commands
	 */
	const handleCommand = async (command) => {
		const parts = command.toLowerCase().split(' ');
		const cmd = parts[0];
		const args = parts.slice(1).join(' ');

		switch (cmd) {
			case '/help':
				setShowCommandPalette(true);
				break;

			case '/clear':
				setConversationHistory([]);
				await historyManager.log('Conversation history cleared');
				break;

			case '/yolo':
				setYoloMode(!yoloMode);
				await historyManager.log(`YOLO mode ${!yoloMode ? 'enabled' : 'disabled'}`);
				break;

			case '/markdown':
				const newMarkdown = !markdownEnabled;
				setMarkdownEnabled(newMarkdown);
				await settingsManager.set('markdownEnabled', newMarkdown);
				break;

			case '/save':
				if (conversationHistory.length > 0) {
					const metadata = {
						messageCount: conversationHistory.length,
						model: model,
						savedAt: new Date().toISOString()
					};
					await historyManager.saveSession(conversationHistory, metadata);
					setConversationHistory([
						...conversationHistory,
						{ role: 'system', content: '✅ Session saved successfully' }
					]);
				}
				break;

			case '/exit':
				if (conversationHistory.length > 0) {
					await historyManager.saveSession(conversationHistory, {
						messageCount: conversationHistory.length,
						model: model,
						savedAt: new Date().toISOString()
					});
				}
				exit();
				break;

			default:
				setConversationHistory([
					...conversationHistory,
					{
						role: 'system',
						content: `Unknown command: ${command}. Type /help for available commands.`
					}
				]);
		}
	};

	/**
	 * Handle keyboard shortcuts
	 */
	useInput((input, key) => {
		// Ctrl+C to exit
		if (key.ctrl && input === 'c') {
			exit();
		}

		// Ctrl+K to open command palette
		if (key.ctrl && input === 'k') {
			setShowCommandPalette(!showCommandPalette);
		}

		// Ctrl+L to clear screen
		if (key.ctrl && input === 'l') {
			setConversationHistory([]);
		}

		// Escape to close command palette
		if (key.escape) {
			setShowCommandPalette(false);
		}
	});

	// Show error screen if initialization failed
	if (error) {
		return (
			<Box flexDirection="column" padding={1}>
				<Box borderStyle="bold" borderColor="red" padding={1}>
					<Text color="red" bold>❌ Error: {error}</Text>
				</Box>
				<Box marginTop={1} flexDirection="column">
					<Text color="yellow" bold>Setup Instructions:</Text>
					<Text>1. Get your API key from https://polza.ai</Text>
					<Text>2. Set the environment variable: export POLZA_API_KEY=ak_your_key_here</Text>
					<Text>3. Run the CLI again</Text>
				</Box>
			</Box>
		);
	}

	// Show loading screen while initializing
	if (!initialized || !client) {
		return (
			<Box padding={1} justifyContent="center" alignItems="center">
				<Text color="cyan">🔄 Initializing Polza CLI...</Text>
			</Box>
		);
	}

	// Main TUI interface
	return (
		<Box flexDirection="column" height="100%">
			{/* Header */}
			<Header
				model={model}
				sessionId={sessionId}
				yoloMode={yoloMode}
				customCommandsCount={commandLoader.getAllCommands().length}
				polzaMdLoaded={polzaMdLoader.hasInstructions()}
			/>

			{/* Command Palette (overlay) */}
			{showCommandPalette && (
				<CommandPalette
					onClose={() => setShowCommandPalette(false)}
					commandLoader={commandLoader}
				/>
			)}

			{/* Chat view */}
			<ChatView
				messages={conversationHistory}
				isProcessing={isProcessing}
				markdownEnabled={markdownEnabled}
			/>

			{/* Input bar */}
			<InputBar
				value={currentInput}
				onChange={setCurrentInput}
				onSubmit={handleSubmit}
				isProcessing={isProcessing}
			/>

			{/* Status bar */}
			<StatusBar
				messageCount={conversationHistory.length}
				lastUsage={lastUsage}
				yoloMode={yoloMode}
			/>
		</Box>
	);
};

// Parse command-line arguments
const argv = yargs(hideBin(process.argv))
	.scriptName('polza-cli')
	.usage('Usage: $0 [options]')
	.option('model', {
		alias: 'm',
		type: 'string',
		description: 'Select the AI model to use'
	})
	.option('yolomode', {
		alias: 'yolo',
		type: 'boolean',
		default: false,
		description: 'Enable YOLO mode (auto-approve shell commands)'
	})
	.option('output-format', {
		alias: 'o',
		type: 'string',
		choices: ['text', 'json'],
		default: 'text',
		description: 'Output format'
	})
	.help()
	.alias('help', 'h')
	.version()
	.alias('version', 'v')
	.parseSync();

// Render the TUI
render(<PolzaTUI {...argv} />);
