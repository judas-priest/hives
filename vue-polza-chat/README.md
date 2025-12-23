# 🤖 Vue Polza Chat

A complete Vue.js chat interface with Polza AI integration, featuring full tools support and file system browser.

## ✨ Features

- 💬 **Modern Chat Interface** - Beautiful Vue 3 chat UI with streaming support
- 🛠️ **Tools Integration** - Full support for all agent_polza2 tools:
  - `bash` - Execute shell commands
  - `read` - Read file contents
  - `write` - Write files
  - `edit` - Edit files with string replacement
  - `list` - List directory contents
  - `glob` - Find files by pattern
  - `grep` - Search in files with regex
- 📁 **File System Browser** - Interactive file explorer with real-time navigation
- ⚡ **Streaming Responses** - Real-time AI responses via SSE
- 🎨 **Beautiful UI** - Modern, responsive design with smooth animations
- 🔒 **Secure Backend** - Tool execution via secure backend API
- 💾 **Session Management** - Persistent chat sessions
- 🔑 **API Key Storage** - Secure localStorage-based key management

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Vue.js Frontend                      │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────┐ │
│  │  PolzaChat     │  │  FileSystem    │  │  Services │ │
│  │  Component     │  │  Browser       │  │  Layer    │ │
│  └────────────────┘  └────────────────┘  └───────────┘ │
├─────────────────────────────────────────────────────────┤
│               useChat Composable (State)                │
├─────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐                │
│  │PolzaService    │  │ ToolService    │                │
│  │(API calls)     │  │(Backend proxy) │                │
│  └────────────────┘  └────────────────┘                │
└─────────────────────────────────────────────────────────┘
                         ↓ HTTP/SSE
┌─────────────────────────────────────────────────────────┐
│                  Express.js Backend                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Tool Execution Handlers                           │ │
│  │  • bash • read • write • edit • list • glob • grep │ │
│  └────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                  File System Access                     │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- Polza AI API Key (get one at [polza.ai](https://polza.ai))

### Installation

1. **Install Frontend Dependencies**

```bash
cd vue-polza-chat
npm install
```

2. **Install Backend Dependencies**

```bash
cd server
npm install
```

### Configuration

1. **Set Backend Allowed Directory** (optional)

```bash
# In server/.env or set environment variable
export ALLOWED_ROOT=/path/to/allowed/directory
```

2. **Get Your Polza API Key**
   - Visit [polza.ai](https://polza.ai) and sign up
   - Generate an API key
   - Save it for later use

### Running the Application

#### Option 1: Run Both Frontend and Backend Together

```bash
# From vue-polza-chat directory
npm start
```

This will start:
- Frontend dev server on `http://localhost:5173`
- Backend API server on `http://localhost:3000`

#### Option 2: Run Separately

**Terminal 1 - Backend:**
```bash
cd vue-polza-chat/server
npm start
```

**Terminal 2 - Frontend:**
```bash
cd vue-polza-chat
npm run dev
```

### First Use

1. Open `http://localhost:5173` in your browser
2. Enter your Polza API key when prompted
3. Start chatting with AI that can use tools!

## 📖 Usage

### Basic Chat

Simply type your message and press Enter to send. The AI will respond using the Polza API.

```
You: Hello! Can you help me with my project?
AI: Of course! I'd be happy to help. What would you like assistance with?
```

### Using Tools

Enable the "Enable Tools" checkbox to allow the AI to use file system tools:

```
You: List all JavaScript files in the current directory
AI: I'll search for JavaScript files using the glob tool.
[Tool: glob - pattern: **/*.js]
Found 15 JavaScript files:
- src/main.js
- src/components/App.js
...
```

### File System Browser

Use the sidebar to:
- Navigate directories
- View file contents
- Copy file paths to use in chat
- Quick access to project files

### Advanced Features

**Streaming Mode:**
- Enable "Enable Streaming" for real-time responses
- See the AI's response as it types

**Model Selection:**
- Choose from multiple models:
  - Claude Sonnet 4.5 (recommended)
  - Claude 3.5 Sonnet
  - GPT-4
  - GPT-3.5 Turbo

**Tool Examples:**

Read a file:
```
You: Read the package.json file
AI: [Tool: read - file_path: package.json]
```

Edit a file:
```
You: Change "version" from "1.0.0" to "1.0.1" in package.json
AI: [Tool: edit - file_path: package.json, old_string: "1.0.0", new_string: "1.0.1"]
```

Search files:
```
You: Find all TODO comments in TypeScript files
AI: [Tool: grep - pattern: TODO, type: ts]
```

## 🛠️ Development

### Project Structure

```
vue-polza-chat/
├── src/
│   ├── components/
│   │   ├── PolzaChat.vue          # Main chat component
│   │   └── FileSystemBrowser.vue  # File browser component
│   ├── composables/
│   │   └── useChat.ts             # Chat state management
│   ├── services/
│   │   ├── polzaService.ts        # Polza API integration
│   │   └── toolService.ts         # Tool execution service
│   ├── types/
│   │   └── index.ts               # TypeScript types
│   ├── App.vue                    # Root component
│   ├── main.ts                    # Entry point
│   └── style.css                  # Global styles
├── server/
│   ├── index.js                   # Express backend
│   └── package.json               # Backend dependencies
├── public/                        # Static assets
├── index.html                     # HTML template
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript config
└── package.json                   # Project dependencies
```

### Available Scripts

**Frontend:**
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

**Backend:**
```bash
npm run server      # Start backend server
npm run server:dev  # Start with auto-reload
```

**Combined:**
```bash
npm start  # Start both frontend and backend
```

### Adding New Tools

1. **Add Tool Handler in Backend** (`server/index.js`):

```javascript
const toolHandlers = {
  myTool: async (params) => {
    const { param1, param2 } = params

    // Tool logic here

    return {
      title: 'My Tool Result',
      output: 'Result output here',
      metadata: { /* additional data */ }
    }
  }
}
```

2. **Add Tool Definition** (`src/services/polzaService.ts`):

```typescript
{
  type: 'function',
  function: {
    name: 'myTool',
    description: 'Description of what the tool does',
    parameters: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: 'First parameter'
        }
      },
      required: ['param1']
    }
  }
}
```

3. **Add TypeScript Types** (`src/types/index.ts`):

```typescript
export interface MyToolParams {
  param1: string
  param2?: string
}

export type AvailableTools =
  | 'bash'
  | 'read'
  // ... existing tools
  | 'myTool'  // Add your tool
```

## 🔒 Security

### Backend Security Features

- **Path Validation** - All file operations are restricted to `ALLOWED_ROOT` directory
- **Timeout Protection** - Commands have maximum execution time
- **CORS Configuration** - Restricts API access to allowed origins
- **Input Validation** - All tool parameters are validated
- **Error Handling** - Prevents information leakage through error messages

### Best Practices

1. **Never expose API keys** - Use environment variables
2. **Set ALLOWED_ROOT** - Restrict file system access
3. **Use HTTPS in production** - Encrypt API communication
4. **Validate user input** - Sanitize all inputs before tool execution
5. **Implement rate limiting** - Prevent API abuse
6. **Monitor tool usage** - Log all tool executions

## 🎨 Customization

### Styling

Edit `src/style.css` to customize the color scheme:

```css
:root {
  --primary-color: #667eea;  /* Main theme color */
  --primary-dark: #764ba2;   /* Dark variant */
  /* ... other variables */
}
```

### System Prompt

Modify the system prompt in `src/App.vue`:

```typescript
const systemPrompt = ref(`Your custom system prompt here`)
```

### Backend Configuration

Set environment variables for backend:

```bash
PORT=3000                        # Server port
ALLOWED_ROOT=/your/safe/path     # Allowed directory
NODE_ENV=production              # Environment
```

## 🐛 Troubleshooting

### Common Issues

**Backend not connecting:**
```bash
# Check if backend is running
curl http://localhost:3000/health

# Should return: {"status":"ok","allowed_root":"/path/to/root"}
```

**CORS errors:**
- Ensure backend is running on port 3000
- Check Vite proxy configuration in `vite.config.ts`

**Tool execution fails:**
- Verify `ALLOWED_ROOT` includes the target path
- Check file permissions
- Review backend logs for errors

**API key not working:**
- Verify key format starts with `ak_`
- Check Polza API status at [polza.ai](https://polza.ai)
- Clear browser cache and try again

## 📚 API Reference

### Polza API

See `polza.txt` for complete API documentation including:
- Chat completions endpoint
- Streaming support
- Tool calling format
- Model parameters

### Backend API

**Execute Tool:**
```http
POST /api/tools/execute
Content-Type: application/json

{
  "tool": "bash",
  "parameters": {
    "command": "ls -la"
  }
}
```

**Batch Execute:**
```http
POST /api/tools/batch
Content-Type: application/json

{
  "tools": [
    { "tool": "read", "parameters": { "file_path": "file1.txt" } },
    { "tool": "read", "parameters": { "file_path": "file2.txt" } }
  ]
}
```

**List Directory:**
```http
GET /api/files/list?path=/path/to/directory
```

**Read File:**
```http
GET /api/files/read?path=/path/to/file
```

**Write File:**
```http
POST /api/files/write
Content-Type: application/json

{
  "path": "/path/to/file",
  "content": "File content here"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Polza AI](https://polza.ai) - Get your API key
- [agent_polza2](../agent_polza2) - Original implementation
- [Issue #3](https://github.com/judas-priest/hives/issues/3) - Original feature request

## 💡 Examples

### Example 1: Code Analysis

```
You: Analyze the structure of this project
AI: I'll examine the project structure using file system tools.
[Tool: list - path: .]
[Tool: glob - pattern: **/*.ts]
[Tool: read - file_path: package.json]

Based on my analysis, this is a Vue.js project with:
- TypeScript configuration
- Vite build system
- 15 TypeScript files in src/
...
```

### Example 2: File Manipulation

```
You: Create a new component called Hello.vue with a basic template
AI: I'll create the component file for you.
[Tool: write - file_path: src/components/Hello.vue, content: ...]

I've created Hello.vue with a basic template, script setup, and styles.
```

### Example 3: Search and Replace

```
You: Find all instances of 'console.log' and tell me where they are
AI: [Tool: grep - pattern: console\.log, output_mode: content]

Found console.log statements in:
- src/main.ts:15
- src/services/polzaService.ts:42
- src/components/PolzaChat.vue:127
```

## 🎯 Roadmap

- [ ] Add more tools (webfetch, websearch, task)
- [ ] Implement MCP (Model Context Protocol) support
- [ ] Add conversation history export
- [ ] Multi-session management UI
- [ ] Dark mode support
- [ ] Mobile-responsive design improvements
- [ ] Syntax highlighting for code in messages
- [ ] File diff viewer for edit operations
- [ ] Undo/redo for file operations
- [ ] Integration with git operations

---

Made with ❤️ for [Issue #3](https://github.com/judas-priest/hives/issues/3)
