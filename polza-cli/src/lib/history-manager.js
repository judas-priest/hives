/**
 * History Manager
 * Manages chat history and session persistence
 */

import fs from 'fs/promises';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import os from 'os';

export class HistoryManager {
  constructor() {
    // Use $HOME/.config/polza-cli for configuration and history
    this.configDir = path.join(os.homedir(), '.config', 'polza-cli');
    this.historyDir = path.join(this.configDir, 'history');
    this.logsDir = path.join(this.configDir, 'logs');
    this.sessionsDir = path.join(this.configDir, 'sessions');

    // Current session
    this.currentSessionId = this.generateSessionId();
    this.currentLogFile = path.join(this.logsDir, `${this.currentSessionId}.log`);

    // Initialize directories
    this.initializeDirs();
  }

  /**
   * Initialize required directories
   */
  initializeDirs() {
    try {
      if (!existsSync(this.configDir)) {
        mkdirSync(this.configDir, { recursive: true });
      }
      if (!existsSync(this.historyDir)) {
        mkdirSync(this.historyDir, { recursive: true });
      }
      if (!existsSync(this.logsDir)) {
        mkdirSync(this.logsDir, { recursive: true });
      }
      if (!existsSync(this.sessionsDir)) {
        mkdirSync(this.sessionsDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to initialize directories:', error.message);
    }
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId() {
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, '-');
    return `session-${timestamp}`;
  }

  /**
   * Save conversation history to disk
   */
  async saveHistory(history, sessionId = null) {
    try {
      const sid = sessionId || this.currentSessionId;
      const historyFile = path.join(this.historyDir, `${sid}.json`);
      await fs.writeFile(historyFile, JSON.stringify(history, null, 2), 'utf-8');
      return historyFile;
    } catch (error) {
      console.error('Failed to save history:', error.message);
      return null;
    }
  }

  /**
   * Load conversation history from disk
   */
  async loadHistory(sessionId) {
    try {
      const historyFile = path.join(this.historyDir, `${sessionId}.json`);
      if (!existsSync(historyFile)) {
        return null;
      }
      const data = await fs.readFile(historyFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load history:', error.message);
      return null;
    }
  }

  /**
   * List available sessions
   */
  async listSessions() {
    try {
      const files = await fs.readdir(this.historyDir);
      const sessions = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.historyDir, file);
          const stats = await fs.stat(filePath);
          sessions.push({
            id: file.replace('.json', ''),
            file: file,
            date: stats.mtime,
            size: stats.size
          });
        }
      }

      // Sort by date (newest first)
      sessions.sort((a, b) => b.date - a.date);
      return sessions;
    } catch (error) {
      console.error('Failed to list sessions:', error.message);
      return [];
    }
  }

  /**
   * Log message to file
   */
  async log(message, level = 'info') {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
      await fs.appendFile(this.currentLogFile, logEntry, 'utf-8');
    } catch (error) {
      // Silent fail for logging errors
    }
  }

  /**
   * Log chat interaction
   */
  async logChat(role, content, metadata = {}) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        sessionId: this.currentSessionId,
        role,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        metadata
      };

      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.currentLogFile, logLine, 'utf-8');
    } catch (error) {
      // Silent fail for logging errors
    }
  }

  /**
   * Save current session
   */
  async saveSession(history, metadata = {}) {
    try {
      const sessionFile = path.join(this.sessionsDir, `${this.currentSessionId}.json`);
      const sessionData = {
        id: this.currentSessionId,
        created: new Date().toISOString(),
        history,
        metadata
      };
      await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2), 'utf-8');
      return sessionFile;
    } catch (error) {
      console.error('Failed to save session:', error.message);
      return null;
    }
  }

  /**
   * Load a session
   */
  async loadSession(sessionId) {
    try {
      const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);
      if (!existsSync(sessionFile)) {
        return null;
      }
      const data = await fs.readFile(sessionFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load session:', error.message);
      return null;
    }
  }

  /**
   * Clean up old logs (older than specified days)
   */
  async cleanupLogs(daysToKeep = 30) {
    try {
      const files = await fs.readdir(this.logsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      let deletedCount = 0;
      for (const file of files) {
        const filePath = path.join(this.logsDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup logs:', error.message);
      return 0;
    }
  }

  /**
   * Get config directory path
   */
  getConfigDir() {
    return this.configDir;
  }

  /**
   * Get current session ID
   */
  getSessionId() {
    return this.currentSessionId;
  }
}
