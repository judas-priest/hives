/**
 * Checkpointing System - Git-based undo mechanism for file modifications
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import crypto from 'crypto';

const execAsync = promisify(exec);

/**
 * Checkpoint Manager - Manages file modification checkpoints
 */
export class CheckpointManager {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    this.enabled = false;
    this.shadowRepoPath = null;
    this.checkpoints = [];
    this.currentProject = null;
  }

  /**
   * Initialize checkpointing for the current project
   */
  async initialize() {
    const settings = this.settingsManager.getAll();
    this.enabled = settings.checkpointing?.enabled || false;

    if (!this.enabled) {
      return;
    }

    // Get current working directory hash for shadow repo path
    const cwd = process.cwd();
    const projectHash = crypto.createHash('md5').update(cwd).digest('hex').substring(0, 16);
    this.currentProject = cwd;

    // Shadow repository path
    const historyDir = join(homedir(), '.hives-cli', 'history');
    this.shadowRepoPath = join(historyDir, projectHash);

    // Create shadow repository if it doesn't exist
    if (!existsSync(this.shadowRepoPath)) {
      await this.createShadowRepo();
    }

    // Load existing checkpoints
    await this.loadCheckpoints();
  }

  /**
   * Create shadow Git repository
   */
  async createShadowRepo() {
    try {
      mkdirSync(this.shadowRepoPath, { recursive: true });

      // Initialize git repo
      await execAsync('git init', { cwd: this.shadowRepoPath });
      await execAsync('git config user.name "Hives CLI"', { cwd: this.shadowRepoPath });
      await execAsync('git config user.email "cli@hives.local"', { cwd: this.shadowRepoPath });

      // Create metadata file
      const metadata = {
        projectPath: this.currentProject,
        created: new Date().toISOString(),
        checkpoints: []
      };

      const metadataPath = join(this.shadowRepoPath, 'metadata.json');
      writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      await execAsync('git add metadata.json', { cwd: this.shadowRepoPath });
      await execAsync('git commit -m "Initialize checkpoint repository"', { cwd: this.shadowRepoPath });

      console.log(chalk.green('✓ Checkpoint repository initialized'));
    } catch (error) {
      console.error(chalk.red('✗ Failed to create shadow repository:'), error.message);
      this.enabled = false;
    }
  }

  /**
   * Load existing checkpoints from metadata
   */
  async loadCheckpoints() {
    try {
      const metadataPath = join(this.shadowRepoPath, 'metadata.json');
      if (existsSync(metadataPath)) {
        const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
        this.checkpoints = metadata.checkpoints || [];
      }
    } catch (error) {
      console.error(chalk.yellow('⚠️  Failed to load checkpoints:'), error.message);
      this.checkpoints = [];
    }
  }

  /**
   * Save checkpoints to metadata
   */
  async saveCheckpoints() {
    try {
      const metadataPath = join(this.shadowRepoPath, 'metadata.json');
      const metadata = {
        projectPath: this.currentProject,
        created: existsSync(metadataPath)
          ? JSON.parse(readFileSync(metadataPath, 'utf-8')).created
          : new Date().toISOString(),
        checkpoints: this.checkpoints
      };

      writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      // Commit metadata changes
      await execAsync('git add metadata.json', { cwd: this.shadowRepoPath });
      await execAsync('git commit -m "Update checkpoint metadata" --allow-empty', { cwd: this.shadowRepoPath });
    } catch (error) {
      console.error(chalk.yellow('⚠️  Failed to save checkpoints:'), error.message);
    }
  }

  /**
   * Create a checkpoint before file modification
   */
  async createCheckpoint(operation, files, conversationSnapshot = null) {
    if (!this.enabled || !this.shadowRepoPath) {
      return null;
    }

    try {
      const checkpointId = `cp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Copy files to shadow repo
      const copiedFiles = [];
      for (const file of files) {
        const relativePath = file.replace(this.currentProject + '/', '');
        const shadowPath = join(this.shadowRepoPath, 'files', relativePath);

        // Create directory structure
        mkdirSync(dirname(shadowPath), { recursive: true });

        // Copy file if it exists
        if (existsSync(file)) {
          const content = readFileSync(file);
          writeFileSync(shadowPath, content);
          copiedFiles.push(relativePath);
        }
      }

      // Stage files
      if (copiedFiles.length > 0) {
        await execAsync(`git add files/`, { cwd: this.shadowRepoPath });
      }

      // Save conversation snapshot if provided
      if (conversationSnapshot) {
        const snapshotPath = join(this.shadowRepoPath, 'snapshots', `${checkpointId}.json`);
        mkdirSync(dirname(snapshotPath), { recursive: true });
        writeFileSync(snapshotPath, JSON.stringify(conversationSnapshot, null, 2));
        await execAsync(`git add snapshots/${checkpointId}.json`, { cwd: this.shadowRepoPath });
      }

      // Create commit
      const commitMessage = `Checkpoint: ${operation}\n\nFiles: ${copiedFiles.join(', ')}`;
      const { stdout } = await execAsync(`git commit -m "${commitMessage}" --allow-empty`, { cwd: this.shadowRepoPath });

      // Get commit hash
      const { stdout: commitHash } = await execAsync('git rev-parse HEAD', { cwd: this.shadowRepoPath });

      // Add checkpoint to metadata
      const checkpoint = {
        id: checkpointId,
        commitHash: commitHash.trim(),
        operation,
        files: copiedFiles,
        timestamp: new Date().toISOString(),
        hasConversation: !!conversationSnapshot
      };

      this.checkpoints.push(checkpoint);
      await this.saveCheckpoints();

      return checkpointId;
    } catch (error) {
      console.error(chalk.yellow('⚠️  Failed to create checkpoint:'), error.message);
      return null;
    }
  }

  /**
   * Restore files from a checkpoint
   */
  async restoreCheckpoint(checkpointId) {
    if (!this.enabled || !this.shadowRepoPath) {
      console.log(chalk.yellow('\n⚠️  Checkpointing is not enabled\n'));
      return false;
    }

    try {
      // Find checkpoint
      const checkpoint = this.checkpoints.find(cp => cp.id === checkpointId);
      if (!checkpoint) {
        console.log(chalk.red(`\n✗ Checkpoint '${checkpointId}' not found\n`));
        return false;
      }

      console.log(chalk.cyan(`\n📦 Restoring checkpoint: ${checkpoint.id}`));
      console.log(chalk.gray(`   Operation: ${checkpoint.operation}`));
      console.log(chalk.gray(`   Files: ${checkpoint.files.join(', ')}`));
      console.log(chalk.gray(`   Created: ${new Date(checkpoint.timestamp).toLocaleString()}\n`));

      // Checkout the commit
      await execAsync(`git checkout ${checkpoint.commitHash}`, { cwd: this.shadowRepoPath });

      // Restore files
      let restoredCount = 0;
      for (const relativePath of checkpoint.files) {
        const shadowPath = join(this.shadowRepoPath, 'files', relativePath);
        const targetPath = join(this.currentProject, relativePath);

        if (existsSync(shadowPath)) {
          const content = readFileSync(shadowPath);
          mkdirSync(dirname(targetPath), { recursive: true });
          writeFileSync(targetPath, content);
          restoredCount++;
          console.log(chalk.green(`  ✓ Restored: ${relativePath}`));
        } else {
          console.log(chalk.yellow(`  ⚠  Not found in checkpoint: ${relativePath}`));
        }
      }

      // Return to latest commit
      await execAsync('git checkout main 2>/dev/null || git checkout master', { cwd: this.shadowRepoPath });

      console.log(chalk.green(`\n✓ Restored ${restoredCount} file(s) from checkpoint\n`));
      return true;
    } catch (error) {
      console.error(chalk.red('✗ Failed to restore checkpoint:'), error.message);
      return false;
    }
  }

  /**
   * List all checkpoints
   */
  listCheckpoints() {
    if (!this.enabled) {
      console.log(chalk.yellow('\n⚠️  Checkpointing is not enabled'));
      console.log(chalk.gray('Enable it in settings: /settings set checkpointing.enabled true\n'));
      return;
    }

    if (this.checkpoints.length === 0) {
      console.log(chalk.gray('\n  No checkpoints yet.\n'));
      return;
    }

    console.log(chalk.cyan.bold('\n📦 Available Checkpoints:\n'));

    // Sort by timestamp (newest first)
    const sorted = [...this.checkpoints].sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    for (const cp of sorted) {
      const timestamp = new Date(cp.timestamp).toLocaleString();
      const conversationBadge = cp.hasConversation ? chalk.blue(' [+conv]') : '';
      console.log(chalk.green(`  ${cp.id}`) + conversationBadge);
      console.log(chalk.gray(`    Operation: ${cp.operation}`));
      console.log(chalk.gray(`    Files: ${cp.files.join(', ')}`));
      console.log(chalk.gray(`    Created: ${timestamp}\n`));
    }

    console.log(chalk.cyan('💡 Usage:\n'));
    console.log(`  ${chalk.green('/restore <id>'.padEnd(20))} ${chalk.gray('Restore checkpoint')}`);
    console.log(`  ${chalk.green('/checkpoint show'.padEnd(20))} ${chalk.gray('Show checkpoint details')}`);
    console.log();
  }

  /**
   * Show checkpoint details
   */
  async showCheckpoint(checkpointId) {
    if (!this.enabled) {
      console.log(chalk.yellow('\n⚠️  Checkpointing is not enabled\n'));
      return;
    }

    const checkpoint = this.checkpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint) {
      console.log(chalk.red(`\n✗ Checkpoint '${checkpointId}' not found\n`));
      return;
    }

    console.log(chalk.cyan.bold('\n📦 Checkpoint Details:\n'));
    console.log(`  ${chalk.green('ID:')} ${checkpoint.id}`);
    console.log(`  ${chalk.green('Operation:')} ${checkpoint.operation}`);
    console.log(`  ${chalk.green('Created:')} ${new Date(checkpoint.timestamp).toLocaleString()}`);
    console.log(`  ${chalk.green('Commit:')} ${checkpoint.commitHash}`);
    console.log(`  ${chalk.green('Files:')}`);

    for (const file of checkpoint.files) {
      console.log(`    • ${chalk.gray(file)}`);
    }

    if (checkpoint.hasConversation) {
      console.log(`\n  ${chalk.blue('ℹ️  This checkpoint includes a conversation snapshot')}`);
    }

    console.log();
  }

  /**
   * Clean old checkpoints
   */
  async cleanCheckpoints(daysToKeep = 30) {
    if (!this.enabled) {
      console.log(chalk.yellow('\n⚠️  Checkpointing is not enabled\n'));
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const toRemove = this.checkpoints.filter(cp => new Date(cp.timestamp) < cutoffDate);

    if (toRemove.length === 0) {
      console.log(chalk.gray('\n  No old checkpoints to clean.\n'));
      return;
    }

    console.log(chalk.cyan(`\n🧹 Cleaning ${toRemove.length} checkpoint(s) older than ${daysToKeep} days...\n`));

    // Remove from array
    this.checkpoints = this.checkpoints.filter(cp => !toRemove.includes(cp));
    await this.saveCheckpoints();

    console.log(chalk.green(`✓ Cleaned ${toRemove.length} old checkpoint(s)\n`));
  }

  /**
   * Get checkpoint statistics
   */
  getStats() {
    if (!this.enabled) {
      return {
        enabled: false,
        count: 0
      };
    }

    return {
      enabled: true,
      count: this.checkpoints.length,
      oldestTimestamp: this.checkpoints.length > 0
        ? this.checkpoints.reduce((min, cp) => cp.timestamp < min ? cp.timestamp : min, this.checkpoints[0].timestamp)
        : null,
      newestTimestamp: this.checkpoints.length > 0
        ? this.checkpoints.reduce((max, cp) => cp.timestamp > max ? cp.timestamp : max, this.checkpoints[0].timestamp)
        : null,
      shadowRepoPath: this.shadowRepoPath
    };
  }
}

export default CheckpointManager;
