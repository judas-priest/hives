import React from 'react';
import { Box, Text } from 'ink';
import { renderMarkdown, hasMarkdown } from '../lib/markdown-renderer.js';

/**
 * ChatView component - displays conversation history
 */
const ChatView = ({ messages, isProcessing, markdownEnabled }) => {
	return (
		<Box flexDirection="column" padding={1} flexGrow={1} overflow="hidden">
			{messages.length === 0 && !isProcessing && (
				<Box flexDirection="column" paddingY={2}>
					<Text color="gray" italic>
						💬 Start a conversation by typing a message below
					</Text>
					<Text color="gray" italic>
						Use @file.js to include files, !command for shell execution (YOLO mode)
					</Text>
					<Text color="gray" italic>
						Type /help or press Ctrl+K for available commands
					</Text>
				</Box>
			)}

			{messages.map((msg, index) => {
				const isUser = msg.role === 'user';
				const isSystem = msg.role === 'system';
				const isAssistant = msg.role === 'assistant';
				const isTool = msg.role === 'tool';

				if (isTool) {
					// Don't display raw tool responses in the chat
					return null;
				}

				// Determine color scheme
				let userColor = 'cyan';
				let backgroundColor = null;
				let prefix = '●';

				if (isUser) {
					userColor = 'cyan';
					prefix = '▶';
				} else if (isAssistant) {
					userColor = 'magenta';
					prefix = '◀';
				} else if (isSystem) {
					userColor = 'yellow';
					prefix = '⚠';
				}

				// Handle tool calls
				if (msg.tool_calls) {
					return (
						<Box key={index} marginBottom={1} flexDirection="column">
							<Box>
								<Text color="yellow">{prefix} </Text>
								<Text color="yellow" bold>Tool Execution:</Text>
							</Box>
							{msg.tool_calls.map((tc, i) => (
								<Box key={i} marginLeft={2}>
									<Text color="gray">→ </Text>
									<Text color="green">{tc.function.name}</Text>
								</Box>
							))}
						</Box>
					);
				}

				// Format message content
				let content = msg.content;
				if (typeof content === 'string') {
					// Truncate very long messages for display
					const maxLength = 2000;
					if (content.length > maxLength) {
						content = content.substring(0, maxLength) + '\n... (truncated)';
					}
				} else {
					content = JSON.stringify(content);
				}

				return (
					<Box key={index} marginBottom={1} flexDirection="column">
						<Box>
							<Text color={userColor} bold>
								{prefix} {isUser ? 'You' : isAssistant ? 'Assistant' : 'System'}
							</Text>
						</Box>
						<Box marginLeft={2} flexDirection="column">
							{isAssistant && markdownEnabled && hasMarkdown(content) ? (
								<Text>{renderMarkdown(content)}</Text>
							) : (
								<Text>{content}</Text>
							)}
						</Box>
					</Box>
				);
			})}

			{isProcessing && (
				<Box marginTop={1}>
					<Text color="magenta">◀ </Text>
					<Text color="magenta" bold>Assistant</Text>
					<Text color="gray" dimColor> is thinking...</Text>
				</Box>
			)}
		</Box>
	);
};

export default ChatView;
