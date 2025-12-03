#!/usr/bin/env node

/**
 * TUI Loader - Loads the JSX-based TUI interface
 */

import { register } from 'esbuild-register/dist/node.js';

// Register esbuild to handle JSX files
register({
	target: 'node18',
	format: 'esm',
	jsx: 'automatic'
});

// Import and run the TUI
import('./index.jsx');
