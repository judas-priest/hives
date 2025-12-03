import React from 'react';
import { Box, Text } from 'ink';

/**
 * StatusBar component - displays status information
 */
const StatusBar = ({ messageCount, lastUsage, yoloMode }) => {
	return (
		<Box borderStyle="round" borderColor="gray" paddingX={1}>
			<Box>
				<Text color="gray">Messages: </Text>
				<Text color="cyan" bold>{messageCount}</Text>
			</Box>

			{lastUsage && (
				<>
					<Box marginLeft={2}>
						<Text color="gray">Tokens: </Text>
						<Text color="green">{lastUsage.tokens}</Text>
					</Box>
					<Box marginLeft={2}>
						<Text color="gray">Cost: </Text>
						<Text color="yellow">{lastUsage.cost.toFixed(4)} RUB</Text>
					</Box>
				</>
			)}

			<Box marginLeft={2}>
				<Text color="gray">YOLO: </Text>
				<Text color={yoloMode ? 'green' : 'red'} bold>
					{yoloMode ? '✓' : '✗'}
				</Text>
			</Box>

			<Box marginLeft="auto">
				<Text color="gray" dimColor>Press Ctrl+K for help</Text>
			</Box>
		</Box>
	);
};

export default StatusBar;
