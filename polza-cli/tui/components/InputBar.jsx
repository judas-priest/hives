import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

/**
 * InputBar component - handles user input
 */
const InputBar = ({ value, onChange, onSubmit, isProcessing }) => {
	const [input, setInput] = useState('');
	const [cursorPosition, setCursorPosition] = useState(0);

	useInput((char, key) => {
		if (isProcessing) return;

		if (key.return) {
			// Submit on Enter
			if (input.trim()) {
				onSubmit(input);
				setInput('');
				setCursorPosition(0);
			}
		} else if (key.backspace || key.delete) {
			// Handle backspace
			if (cursorPosition > 0) {
				const newInput = input.slice(0, cursorPosition - 1) + input.slice(cursorPosition);
				setInput(newInput);
				setCursorPosition(cursorPosition - 1);
			}
		} else if (key.leftArrow) {
			// Move cursor left
			setCursorPosition(Math.max(0, cursorPosition - 1));
		} else if (key.rightArrow) {
			// Move cursor right
			setCursorPosition(Math.min(input.length, cursorPosition + 1));
		} else if (!key.ctrl && !key.meta && char) {
			// Add character at cursor position
			const newInput = input.slice(0, cursorPosition) + char + input.slice(cursorPosition);
			setInput(newInput);
			setCursorPosition(cursorPosition + 1);
		}
	});

	// Create display with cursor
	const displayInput = input.slice(0, cursorPosition) + '█' + input.slice(cursorPosition);

	return (
		<Box borderStyle="round" borderColor="gray" padding={1} flexDirection="column">
			<Box>
				<Text color="cyan" bold>You &gt; </Text>
				<Text>{displayInput}</Text>
			</Box>
			{input.startsWith('@') && (
				<Box marginTop={0}>
					<Text color="gray" dimColor>💡 File inclusion syntax detected</Text>
				</Box>
			)}
			{input.startsWith('!') && (
				<Box marginTop={0}>
					<Text color={isProcessing ? 'gray' : 'yellow'} dimColor>
						⚡ Shell command syntax detected{!isProcessing && ' (requires YOLO mode)'}
					</Text>
				</Box>
			)}
			{input.startsWith('/') && (
				<Box marginTop={0}>
					<Text color="gray" dimColor>⌨ Command detected - Press Ctrl+K for command palette</Text>
				</Box>
			)}
		</Box>
	);
};

export default InputBar;
