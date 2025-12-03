/**
 * Session Management - Save and restore conversation sessions
 * Inspired by Gemini CLI's checkpointing feature
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';

const SESSION_DIR = join(homedir(), '.hives-cli', 'sessions');

/**
 * Ensure session directory exists
 */
function ensureSessionDir() {
  if (!existsSync(SESSION_DIR)) {
    mkdirSync(SESSION_DIR, { recursive: true });
  }
}

/**
 * Generate session filename from name or use timestamp
 */
function getSessionPath(name) {
  ensureSessionDir();
  const filename = name ? `${name}.json` : `session-${Date.now()}.json`;
  return join(SESSION_DIR, filename);
}

/**
 * Save current session to file
 */
export function saveSession(name, data) {
  try {
    const sessionPath = getSessionPath(name);
    const sessionData = {
      savedAt: new Date().toISOString(),
      model: data.model,
      conversationHistory: data.conversationHistory || [],
      metadata: {
        messageCount: (data.conversationHistory || []).length,
        yoloMode: data.yoloMode || false,
      },
    };

    writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8');
    console.log(chalk.green(`✓ Session saved: ${basename(sessionPath)}`));
    return sessionPath;
  } catch (error) {
    console.error(chalk.red('✗ Failed to save session:'), error.message);
    return null;
  }
}

/**
 * Load session from file
 */
export function loadSession(name) {
  try {
    const sessionPath = getSessionPath(name);

    if (!existsSync(sessionPath)) {
      console.error(chalk.red(`✗ Session not found: ${name}`));
      return null;
    }

    const content = readFileSync(sessionPath, 'utf-8');
    const sessionData = JSON.parse(content);

    console.log(chalk.green(`✓ Session loaded: ${basename(sessionPath)}`));
    console.log(chalk.gray(`  Saved at: ${sessionData.savedAt}`));
    console.log(chalk.gray(`  Messages: ${sessionData.metadata.messageCount}`));
    console.log(chalk.gray(`  Model: ${sessionData.model}`));

    return sessionData;
  } catch (error) {
    console.error(chalk.red('✗ Failed to load session:'), error.message);
    return null;
  }
}

/**
 * List all saved sessions
 */
export function listSessions() {
  try {
    ensureSessionDir();
    const files = readdirSync(SESSION_DIR).filter(f => f.endsWith('.json'));

    if (files.length === 0) {
      console.log(chalk.yellow('No saved sessions found.'));
      return [];
    }

    console.log(chalk.cyan('\n📁 Saved Sessions:\n'));

    const sessions = files.map(file => {
      const path = join(SESSION_DIR, file);
      try {
        const content = readFileSync(path, 'utf-8');
        const data = JSON.parse(content);
        return {
          name: basename(file, '.json'),
          savedAt: data.savedAt,
          messageCount: data.metadata.messageCount,
          model: data.model,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    sessions.forEach(session => {
      console.log(chalk.white(`  ${session.name}`));
      console.log(chalk.gray(`    Saved: ${new Date(session.savedAt).toLocaleString()}`));
      console.log(chalk.gray(`    Messages: ${session.messageCount} | Model: ${session.model}`));
      console.log();
    });

    return sessions;
  } catch (error) {
    console.error(chalk.red('✗ Failed to list sessions:'), error.message);
    return [];
  }
}

/**
 * Delete a session
 */
export function deleteSession(name) {
  try {
    const sessionPath = getSessionPath(name);

    if (!existsSync(sessionPath)) {
      console.error(chalk.red(`✗ Session not found: ${name}`));
      return false;
    }

    unlinkSync(sessionPath);
    console.log(chalk.green(`✓ Session deleted: ${name}`));
    return true;
  } catch (error) {
    console.error(chalk.red('✗ Failed to delete session:'), error.message);
    return false;
  }
}

/**
 * Auto-save session (background save)
 */
export function autoSaveSession(client, config) {
  try {
    const autoSaveName = 'autosave';
    const data = {
      model: config.model,
      conversationHistory: client.getHistory(),
      yoloMode: config.yoloMode,
    };
    saveSession(autoSaveName, data);
  } catch (error) {
    // Silent fail for auto-save
  }
}
