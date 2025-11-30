<template>
  <div id="app">
    <header class="app-header">
      <h1>🤖 Polza AI Chat with Tools</h1>
      <p class="subtitle">Vue.js Integration with File System Support</p>
    </header>

    <div v-if="!apiKey" class="api-key-setup">
      <div class="setup-card">
        <h2>Welcome! Let's get started</h2>
        <p>Enter your Polza AI API key to begin chatting with tools support.</p>
        <div class="input-group">
          <input
            v-model="apiKeyInput"
            type="password"
            placeholder="Enter your Polza API key (ak_...)"
            @keydown.enter="saveApiKey"
            class="api-key-input"
          />
          <button @click="saveApiKey" class="btn-save" :disabled="!apiKeyInput.trim()">
            Start Chatting
          </button>
        </div>
        <p class="help-text">
          Don't have an API key? Get one at
          <a href="https://polza.ai" target="_blank" rel="noopener">polza.ai</a>
        </p>
      </div>
    </div>

    <div v-else class="app-container">
      <div class="sidebar">
        <FileSystemBrowser
          :initial-path="currentPath"
          :base-url="backendUrl"
          @file-selected="handleFileSelected"
          @directory-selected="handleDirectorySelected"
          @file-read="handleFileRead"
        />
      </div>

      <div class="main-content">
        <PolzaChat
          :api-key="apiKey"
          :base-url="polzaBaseUrl"
          :system-prompt="systemPrompt"
          @error="handleChatError"
          @message-sent="handleMessageSent"
          @response-received="handleResponseReceived"
        />
      </div>
    </div>

    <footer class="app-footer">
      <div class="footer-content">
        <div class="footer-info">
          <span>Backend: {{ backendUrl }}</span>
          <span>•</span>
          <span>Polza API: {{ polzaBaseUrl }}</span>
        </div>
        <div class="footer-actions">
          <button v-if="apiKey" @click="clearApiKey" class="btn-footer">
            🔑 Change API Key
          </button>
          <a
            href="https://github.com/judas-priest/hives"
            target="_blank"
            rel="noopener"
            class="btn-footer"
          >
            ⭐ GitHub
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PolzaChat from './components/PolzaChat.vue'
import FileSystemBrowser from './components/FileSystemBrowser.vue'

// Configuration
const backendUrl = ref('http://localhost:3000')
const polzaBaseUrl = ref('https://api.polza.ai/api/v1')
const currentPath = ref(process.cwd?.() || '/')

// API Key management
const apiKey = ref<string>('')
const apiKeyInput = ref<string>('')

// System prompt
const systemPrompt = ref(`You are a helpful AI assistant with access to file system tools.
You can read, write, edit files, list directories, search files, and execute bash commands.
Always explain what you're doing when using tools and ask for confirmation before making changes.`)

// Load API key from localStorage
onMounted(() => {
  const savedKey = localStorage.getItem('polza_api_key')
  if (savedKey) {
    apiKey.value = savedKey
  }
})

/**
 * Save API key
 */
function saveApiKey() {
  const key = apiKeyInput.value.trim()
  if (key) {
    apiKey.value = key
    localStorage.setItem('polza_api_key', key)
    apiKeyInput.value = ''
  }
}

/**
 * Clear API key
 */
function clearApiKey() {
  if (confirm('Are you sure you want to clear your API key?')) {
    apiKey.value = ''
    localStorage.removeItem('polza_api_key')
  }
}

/**
 * File system event handlers
 */
function handleFileSelected(path: string) {
  console.log('File selected:', path)
}

function handleDirectorySelected(path: string) {
  console.log('Directory selected:', path)
}

function handleFileRead(content: string, path: string) {
  console.log('File read:', path, 'Length:', content.length)
}

/**
 * Chat event handlers
 */
function handleChatError(error: string) {
  console.error('Chat error:', error)
}

function handleMessageSent(content: string) {
  console.log('Message sent:', content)
}

function handleResponseReceived(content: string) {
  console.log('Response received:', content)
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, sans-serif;
  background: #f5f7fa;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  font-size: 32px;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 16px;
  opacity: 0.9;
}

.api-key-setup {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.setup-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.setup-card h2 {
  margin-bottom: 16px;
  color: #333;
}

.setup-card p {
  margin-bottom: 24px;
  color: #666;
  line-height: 1.6;
}

.input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.api-key-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.api-key-input:focus {
  outline: none;
  border-color: #667eea;
}

.btn-save {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.help-text {
  font-size: 14px;
  color: #999;
}

.help-text a {
  color: #667eea;
  text-decoration: none;
}

.help-text a:hover {
  text-decoration: underline;
}

.app-container {
  flex: 1;
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 20px;
  padding: 20px;
  max-width: 1800px;
  margin: 0 auto;
  width: 100%;
}

.sidebar {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.main-content {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.app-footer {
  background: white;
  border-top: 1px solid #e0e0e0;
  padding: 16px 24px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1800px;
  margin: 0 auto;
}

.footer-info {
  display: flex;
  gap: 12px;
  font-size: 14px;
  color: #666;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

.btn-footer {
  padding: 8px 16px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  color: #666;
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-footer:hover {
  background: #f5f5f5;
  border-color: #667eea;
  color: #667eea;
}

@media (max-width: 1024px) {
  .app-container {
    grid-template-columns: 1fr;
  }

  .sidebar {
    max-height: 300px;
  }

  .footer-content {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
