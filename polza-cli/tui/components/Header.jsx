import React from 'react';
import { Box, Text } from 'ink';

/**
 * Header component - displays app title and key info
 */
const Header = ({ model, sessionId, yoloMode, customCommandsCount, polzaMdLoaded }) => {
	return (
		<Box borderStyle="round" borderColor="cyan" padding={1} flexDirection="column">
			<Box>
				<Text color="green" bold>⚡ Polza CLI</Text>
				<Text color="gray"> - Modern TUI Edition</Text>
			</Box>
			<Box marginTop={1} flexDirection="column">
				<Box>
					<Text color="yellow">Model:</Text>
					<Text> {model}</Text>
				</Box>
				<Box>
					<Text color="yellow">Session:</Text>
					<Text> {sessionId.substring(0, 16)}...</Text>
				</Box>
				<Box>
					<Text color="yellow">YOLO Mode:</Text>
					<Text color={yoloMode ? 'green' : 'red'}> {yoloMode ? '✓ ON' : '✗ OFF'}</Text>
				</Box>
				{customCommandsCount > 0 && (
					<Box>
						<Text color="yellow">Custom Commands:</Text>
						<Text> {customCommandsCount} loaded</Text>
					</Box>
				)}
				{polzaMdLoaded && (
					<Box>
						<Text color="yellow">Custom Instructions:</Text>
						<Text color="green"> ✓ Loaded</Text>
					</Box>
				)}
			</Box>
			<Box marginTop={1}>
				<Text color="gray">Press </Text>
				<Text color="cyan" bold>Ctrl+K</Text>
				<Text color="gray"> for commands, </Text>
				<Text color="cyan" bold>Ctrl+L</Text>
				<Text color="gray"> to clear, </Text>
				<Text color="cyan" bold>Ctrl+C</Text>
				<Text color="gray"> to exit</Text>
			</Box>
		</Box>
	);
};

export default Header;
