import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

/**
 * CommandPalette component - shows available commands in a modal overlay
 */
const CommandPalette = ({ onClose, commandLoader }) => {
	const [selectedIndex, setSelectedIndex] = useState(0);

	// Built-in commands
	const builtInCommands = [
		{ name: '/help', description: 'Show this command palette' },
		{ name: '/clear', description: 'Clear conversation history' },
		{ name: '/yolo', description: 'Toggle YOLO mode (shell execution)' },
		{ name: '/markdown', description: 'Toggle markdown rendering' },
		{ name: '/save', description: 'Save current session' },
		{ name: '/memory', description: 'Manage persistent memory' },
		{ name: '/settings', description: 'View/modify settings' },
		{ name: '/tools', description: 'List available AI tools' },
		{ name: '/history', description: 'Show conversation history' },
		{ name: '/exit', description: 'Save and exit' }
	];

	// Get custom commands
	const customCommands = commandLoader.getAllCommands().map(cmd => ({
		name: `/${cmd.name}`,
		description: cmd.description,
		isCustom: true
	}));

	const allCommands = [...builtInCommands, ...customCommands];

	// Handle keyboard navigation
	useInput((input, key) => {
		if (key.upArrow) {
			setSelectedIndex(Math.max(0, selectedIndex - 1));
		} else if (key.downArrow) {
			setSelectedIndex(Math.min(allCommands.length - 1, selectedIndex + 1));
		} else if (key.return) {
			// Could execute command here, for now just close
			onClose();
		} else if (key.escape) {
			onClose();
		}
	});

	return (
		<Box
			position="absolute"
			top={5}
			left={5}
			right={5}
			bottom={5}
			flexDirection="column"
			borderStyle="bold"
			borderColor="cyan"
			padding={1}
			backgroundColor="black"
		>
			<Box marginBottom={1}>
				<Text color="cyan" bold>⌨ Command Palette</Text>
				<Box marginLeft="auto">
					<Text color="gray">Press ESC to close</Text>
				</Box>
			</Box>

			<Box borderStyle="single" borderColor="gray" flexDirection="column" flexGrow={1}>
				<Box paddingX={1} borderColor="cyan" borderStyle="single">
					<Text color="yellow" bold>Built-in Commands</Text>
				</Box>

				{builtInCommands.map((cmd, index) => {
					const isSelected = index === selectedIndex;
					return (
						<Box
							key={cmd.name}
							paddingX={1}
							backgroundColor={isSelected ? 'blue' : undefined}
						>
							<Text color={isSelected ? 'white' : 'cyan'} bold>
								{cmd.name}
							</Text>
							<Text color={isSelected ? 'white' : 'gray'}> - {cmd.description}</Text>
						</Box>
					);
				})}

				{customCommands.length > 0 && (
					<>
						<Box marginTop={1} paddingX={1} borderColor="green" borderStyle="single">
							<Text color="green" bold>Custom Commands</Text>
						</Box>
						{customCommands.map((cmd, index) => {
							const globalIndex = builtInCommands.length + index;
							const isSelected = globalIndex === selectedIndex;
							return (
								<Box
									key={cmd.name}
									paddingX={1}
									backgroundColor={isSelected ? 'blue' : undefined}
								>
									<Text color={isSelected ? 'white' : 'green'} bold>
										{cmd.name}
									</Text>
									<Text color={isSelected ? 'white' : 'gray'}> - {cmd.description}</Text>
								</Box>
							);
						})}
					</>
				)}
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text color="yellow" bold>Special Syntax:</Text>
				<Text color="gray">  @file.js - Include file content in prompt</Text>
				<Text color="gray">  !command - Execute shell command (YOLO mode)</Text>
			</Box>
		</Box>
	);
};

export default CommandPalette;
