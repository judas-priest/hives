/**
 * MCP (Model Context Protocol) - Extensibility framework for dynamic tool discovery
 */

import { spawn } from 'child_process';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/**
 * MCP Server Manager
 */
export class MCPManager {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    this.servers = new Map();
    this.tools = new Map();
    this.serverConfigs = {};
  }

  /**
   * Initialize MCP servers from settings
   */
  async initialize() {
    const settings = this.settingsManager.getAll();
    this.serverConfigs = settings.mcp?.servers || {};

    if (Object.keys(this.serverConfigs).length === 0) {
      return;
    }

    console.log(chalk.cyan('🔌 Initializing MCP servers...'));

    for (const [name, config] of Object.entries(this.serverConfigs)) {
      if (config.enabled !== false) {
        await this.startServer(name, config);
      }
    }
  }

  /**
   * Start an MCP server
   */
  async startServer(name, config) {
    try {
      console.log(chalk.gray(`  Starting ${name}...`));

      const server = {
        name,
        config,
        process: null,
        tools: [],
        status: 'starting',
        buffer: ''
      };

      // Spawn server process
      const args = config.args || [];
      const env = { ...process.env, ...(config.env || {}) };

      server.process = spawn(config.command, args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle server output
      server.process.stdout.on('data', (data) => {
        server.buffer += data.toString();
        this.processServerOutput(server);
      });

      server.process.stderr.on('data', (data) => {
        console.error(chalk.yellow(`  ⚠️  ${name}: ${data.toString().trim()}`));
      });

      server.process.on('exit', (code) => {
        console.log(chalk.red(`  ✗ ${name} exited with code ${code}`));
        server.status = 'stopped';
        this.servers.delete(name);
      });

      this.servers.set(name, server);

      // Send initialization request
      await this.sendRequest(server, {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          clientInfo: {
            name: 'hives-modern-cli',
            version: '1.0.0'
          }
        },
        id: 1
      });

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 1000));

      // List available tools
      await this.listServerTools(server);

      server.status = 'ready';
      console.log(chalk.green(`  ✓ ${name} ready with ${server.tools.length} tool(s)`));
    } catch (error) {
      console.error(chalk.red(`  ✗ Failed to start ${name}:`), error.message);
    }
  }

  /**
   * Send JSON-RPC request to server
   */
  async sendRequest(server, request) {
    if (!server.process || !server.process.stdin.writable) {
      throw new Error('Server process not available');
    }

    const message = JSON.stringify(request) + '\n';
    server.process.stdin.write(message);
  }

  /**
   * Process server output
   */
  processServerOutput(server) {
    const lines = server.buffer.split('\n');
    server.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);
        this.handleServerMessage(server, message);
      } catch (error) {
        console.error(chalk.yellow(`  ⚠️  Invalid JSON from ${server.name}: ${line}`));
      }
    }
  }

  /**
   * Handle message from server
   */
  handleServerMessage(server, message) {
    if (message.method === 'tools/list') {
      // Server sent tool list
      if (message.result && message.result.tools) {
        server.tools = message.result.tools;
        this.registerTools(server.name, message.result.tools);
      }
    } else if (message.result) {
      // Response to our request
      if (message.result.tools) {
        server.tools = message.result.tools;
        this.registerTools(server.name, message.result.tools);
      }
    }
  }

  /**
   * List tools available from a server
   */
  async listServerTools(server) {
    await this.sendRequest(server, {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: Date.now()
    });
  }

  /**
   * Register tools from server
   */
  registerTools(serverName, tools) {
    for (const tool of tools) {
      const toolId = `${serverName}:${tool.name}`;
      this.tools.set(toolId, {
        server: serverName,
        ...tool
      });
    }
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(toolId, params) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    const server = this.servers.get(tool.server);
    if (!server || server.status !== 'ready') {
      throw new Error(`Server ${tool.server} not ready`);
    }

    const requestId = Date.now();
    await this.sendRequest(server, {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: tool.name,
        arguments: params
      },
      id: requestId
    });

    // Wait for response (simplified - in production, use proper promise/callback)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Tool call timeout'));
      }, 30000);

      const checkResponse = () => {
        // In a real implementation, we'd properly handle responses
        // For now, this is a simplified placeholder
        clearTimeout(timeout);
        resolve({ success: true, result: 'Tool executed' });
      };

      setTimeout(checkResponse, 1000);
    });
  }

  /**
   * Stop an MCP server
   */
  async stopServer(name) {
    const server = this.servers.get(name);
    if (!server) {
      return false;
    }

    if (server.process) {
      server.process.kill();
    }

    this.servers.delete(name);

    // Remove tools from this server
    for (const [toolId, tool] of this.tools.entries()) {
      if (tool.server === name) {
        this.tools.delete(toolId);
      }
    }

    return true;
  }

  /**
   * Restart an MCP server
   */
  async restartServer(name) {
    await this.stopServer(name);
    const config = this.serverConfigs[name];
    if (config) {
      await this.startServer(name, config);
    }
  }

  /**
   * List all configured MCP servers
   */
  listServers() {
    console.log(chalk.cyan.bold('\n🔌 MCP Servers:\n'));

    if (this.servers.size === 0 && Object.keys(this.serverConfigs).length === 0) {
      console.log(chalk.gray('  No MCP servers configured.\n'));
      console.log(chalk.cyan('💡 Configure servers in settings:\n'));
      console.log(chalk.gray('  ~/.hives-cli/settings.json or .hives/settings.json\n'));
      console.log(chalk.gray('Example configuration:'));
      console.log(chalk.gray(JSON.stringify({
        mcp: {
          servers: {
            'example-server': {
              command: 'node',
              args: ['path/to/server.js'],
              env: {},
              enabled: true
            }
          }
        }
      }, null, 2)) + '\n');
      return;
    }

    for (const [name, config] of Object.entries(this.serverConfigs)) {
      const server = this.servers.get(name);
      const status = server
        ? (server.status === 'ready' ? chalk.green('✓ Ready') : chalk.yellow('⏳ Starting'))
        : (config.enabled === false ? chalk.gray('○ Disabled') : chalk.red('✗ Stopped'));

      const toolCount = server ? server.tools.length : 0;

      console.log(`  ${status} ${chalk.green(name)}`);
      console.log(chalk.gray(`     Command: ${config.command} ${(config.args || []).join(' ')}`));
      if (server) {
        console.log(chalk.gray(`     Tools: ${toolCount}`));
      }
      console.log();
    }
  }

  /**
   * List all available tools from MCP servers
   */
  listTools() {
    console.log(chalk.cyan.bold('\n🔧 MCP Tools:\n'));

    if (this.tools.size === 0) {
      console.log(chalk.gray('  No tools available from MCP servers.\n'));
      console.log(chalk.gray('  Use /mcp list to see configured servers.\n'));
      return;
    }

    for (const [toolId, tool] of this.tools.entries()) {
      console.log(chalk.green(`  ${toolId}`));
      if (tool.description) {
        console.log(chalk.gray(`     ${tool.description}`));
      }
      console.log();
    }
  }

  /**
   * Show tool schema
   */
  showToolSchema(toolId) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      console.log(chalk.red(`\n✗ Tool '${toolId}' not found\n`));
      return;
    }

    console.log(chalk.cyan.bold(`\n🔧 Tool Schema: ${toolId}\n`));
    console.log(chalk.green(`  Name: ${tool.name}`));
    console.log(chalk.green(`  Server: ${tool.server}`));
    if (tool.description) {
      console.log(chalk.green(`  Description: ${tool.description}`));
    }

    if (tool.inputSchema) {
      console.log(chalk.cyan('\n  Input Schema:'));
      console.log(chalk.gray('  ' + JSON.stringify(tool.inputSchema, null, 2).replace(/\n/g, '\n  ')));
    }

    console.log();
  }

  /**
   * Show tool descriptions
   */
  showToolDescriptions() {
    console.log(chalk.cyan.bold('\n📖 MCP Tool Descriptions:\n'));

    if (this.tools.size === 0) {
      console.log(chalk.gray('  No tools available.\n'));
      return;
    }

    for (const [toolId, tool] of this.tools.entries()) {
      console.log(chalk.green(`  ${toolId}`));
      console.log(chalk.gray(`     Server: ${tool.server}`));
      if (tool.description) {
        console.log(chalk.gray(`     ${tool.description}`));
      }

      if (tool.inputSchema && tool.inputSchema.properties) {
        console.log(chalk.gray('     Parameters:'));
        for (const [param, schema] of Object.entries(tool.inputSchema.properties)) {
          const required = tool.inputSchema.required?.includes(param) ? ' (required)' : '';
          console.log(chalk.gray(`       • ${param}${required}: ${schema.description || schema.type}`));
        }
      }

      console.log();
    }
  }

  /**
   * Get tool for AI use
   */
  getToolDefinitions() {
    const definitions = [];

    for (const [toolId, tool] of this.tools.entries()) {
      definitions.push({
        name: toolId.replace(':', '_'),
        description: tool.description || `Tool from MCP server ${tool.server}`,
        input_schema: tool.inputSchema || {
          type: 'object',
          properties: {},
          required: []
        }
      });
    }

    return definitions;
  }

  /**
   * Execute MCP tool
   */
  async executeTool(toolName, params) {
    // Convert underscored tool name back to toolId
    const toolId = toolName.replace('_', ':');
    return await this.callTool(toolId, params);
  }

  /**
   * Shutdown all servers
   */
  async shutdown() {
    for (const name of this.servers.keys()) {
      await this.stopServer(name);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      configuredServers: Object.keys(this.serverConfigs).length,
      runningServers: this.servers.size,
      availableTools: this.tools.size
    };
  }
}

export default MCPManager;
