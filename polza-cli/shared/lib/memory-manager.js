/**
 * Memory Manager
 * Persistent memory system for storing information across sessions
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';

export class MemoryManager {
  constructor() {
    this.homeDir = os.homedir();
    this.configDir = path.join(this.homeDir, '.config', 'polza-cli');
    this.memoryFile = path.join(this.configDir, 'memory.json');
    this.memory = {};
  }

  /**
   * Initialize memory system
   */
  async initialize() {
    // Ensure config directory exists
    if (!existsSync(this.configDir)) {
      await fs.mkdir(this.configDir, { recursive: true });
    }

    // Load existing memory
    if (existsSync(this.memoryFile)) {
      try {
        const data = await fs.readFile(this.memoryFile, 'utf-8');
        this.memory = JSON.parse(data);
      } catch (error) {
        console.error('Failed to load memory:', error.message);
        this.memory = {};
      }
    }
  }

  /**
   * Save memory to disk
   */
  async save() {
    try {
      await fs.writeFile(
        this.memoryFile,
        JSON.stringify(this.memory, null, 2),
        'utf-8'
      );
      return true;
    } catch (error) {
      console.error('Failed to save memory:', error.message);
      return false;
    }
  }

  /**
   * Add or update a memory entry
   */
  async set(key, value) {
    this.memory[key] = {
      value: value,
      timestamp: new Date().toISOString(),
      type: typeof value
    };
    await this.save();
    return true;
  }

  /**
   * Get a memory entry
   */
  get(key) {
    const entry = this.memory[key];
    return entry ? entry.value : null;
  }

  /**
   * Delete a memory entry
   */
  async delete(key) {
    if (this.memory[key]) {
      delete this.memory[key];
      await this.save();
      return true;
    }
    return false;
  }

  /**
   * List all memory entries
   */
  list() {
    return Object.entries(this.memory).map(([key, entry]) => ({
      key,
      value: entry.value,
      timestamp: entry.timestamp,
      type: entry.type
    }));
  }

  /**
   * Clear all memory
   */
  async clear() {
    this.memory = {};
    await this.save();
    return true;
  }

  /**
   * Search memory entries
   */
  search(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const [key, entry] of Object.entries(this.memory)) {
      if (
        key.toLowerCase().includes(lowerQuery) ||
        String(entry.value).toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          key,
          value: entry.value,
          timestamp: entry.timestamp
        });
      }
    }

    return results;
  }

  /**
   * Get memory summary
   */
  getSummary() {
    const entries = Object.keys(this.memory).length;
    const types = {};

    for (const entry of Object.values(this.memory)) {
      types[entry.type] = (types[entry.type] || 0) + 1;
    }

    return {
      totalEntries: entries,
      typeBreakdown: types,
      memoryFile: this.memoryFile
    };
  }
}
