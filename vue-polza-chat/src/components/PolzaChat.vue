<template>
  <div class="polza-chat">
    <div class="chat-header">
      <h2>Polza AI Chat</h2>
      <div class="header-controls">
        <select v-model="selectedModel" class="model-select">
          <option value="anthropic/claude-sonnet-4.5">Claude Sonnet 4.5</option>
          <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
          <option value="openai/gpt-4">GPT-4</option>
          <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</option>
        </select>
        <button @click="clearChat" class="btn-clear" :disabled="isLoading">
          Clear
        </button>
      </div>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <div
        v-for="message in messages"
        :key="message.id"
        :class="['message', `message-${message.role}`]"
      >
        <div class="message-header">
          <span class="message-role">{{ formatRole(message.role) }}</span>
          <span class="message-time">{{ formatTime(message.timestamp) }}</span>
        </div>
        <div class="message-content">
          <div v-if="message.content" class="message-text">
            {{ message.content }}
          </div>
          <div v-if="message.toolCalls && message.toolCalls.length > 0" class="tool-calls">
            <div
              v-for="toolCall in message.toolCalls"
              :key="toolCall.id"
              :class="['tool-call', `tool-call-${toolCall.status}`]"
            >
              <div class="tool-call-header">
                <span class="tool-name">🛠️ {{ toolCall.tool }}</span>
                <span :class="['tool-status', `status-${toolCall.status}`]">
                  {{ toolCall.status }}
                </span>
              </div>
              <div class="tool-parameters">
                <details>
                  <summary>Parameters</summary>
                  <pre>{{ JSON.stringify(toolCall.parameters, null, 2) }}</pre>
                </details>
              </div>
              <div v-if="toolCall.result" class="tool-result">
                <div class="tool-result-title">{{ toolCall.result.title }}</div>
                <pre class="tool-result-output">{{ toolCall.result.output }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="message message-assistant">
        <div class="message-header">
          <span class="message-role">Assistant</span>
        </div>
        <div class="message-content">
          <div class="loading-indicator">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-input-container">
      <div class="input-controls">
        <label class="checkbox-label">
          <input v-model="useTools" type="checkbox" />
          Enable Tools
        </label>
        <label class="checkbox-label">
          <input v-model="useStream" type="checkbox" />
          Enable Streaming
        </label>
      </div>
      <div class="chat-input">
        <textarea
          v-model="inputMessage"
          @keydown.enter.exact.prevent="handleSend"
          @keydown.enter.shift.exact.prevent="inputMessage += '\n'"
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          :disabled="isLoading"
          rows="3"
        ></textarea>
        <button
          @click="handleSend"
          :disabled="!inputMessage.trim() || isLoading"
          class="btn-send"
        >
          Send
        </button>
      </div>
    </div>

    <div v-if="error" class="error-message">
      <strong>Error:</strong> {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { useChat } from '../composables/useChat'

const props = defineProps<{
  apiKey: string
  baseURL?: string
  systemPrompt?: string
}>()

const emit = defineEmits<{
  error: [error: string]
  messageSent: [content: string]
  responseReceived: [content: string]
}>()

// Chat composable
const chat = useChat(props.apiKey, props.baseURL)

// Component state
const inputMessage = ref('')
const useTools = ref(true)
const useStream = ref(true)
const selectedModel = ref('anthropic/claude-sonnet-4.5')
const messagesContainer = ref<HTMLElement | null>(null)

// Destructure from chat composable
const { messages, isLoading, error, sendMessage, clearSession, createSession, setModel } = chat

// Initialize session on mount
onMounted(() => {
  createSession(selectedModel.value, props.systemPrompt)
})

// Watch for model changes
watch(selectedModel, (newModel) => {
  setModel(newModel)
})

// Watch messages to scroll to bottom
watch(messages, async () => {
  await nextTick()
  scrollToBottom()
})

// Watch for errors
watch(error, (newError) => {
  if (newError) {
    emit('error', newError)
  }
})

/**
 * Handle send message
 */
async function handleSend() {
  const message = inputMessage.value.trim()
  if (!message || isLoading.value) return

  inputMessage.value = ''
  emit('messageSent', message)

  try {
    await sendMessage(message, {
      useTools: useTools.value,
      stream: useStream.value,
    })

    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage && lastMessage.role === 'assistant') {
      emit('responseReceived', lastMessage.content)
    }
  } catch (err) {
    console.error('Failed to send message:', err)
  }
}

/**
 * Clear chat
 */
function clearChat() {
  if (confirm('Are you sure you want to clear the chat?')) {
    clearSession()
  }
}

/**
 * Scroll to bottom of messages
 */
function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

/**
 * Format role for display
 */
function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

/**
 * Format timestamp
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}
</script>

<style scoped>
.polza-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 800px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom: 1px solid #e0e0e0;
}

.chat-header h2 {
  margin: 0;
  font-size: 20px;
}

.header-controls {
  display: flex;
  gap: 8px;
}

.model-select {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 14px;
}

.model-select option {
  background: #667eea;
  color: white;
}

.btn-clear {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-clear:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.btn-clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f5f5f5;
}

.message {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-user {
  background: #e3f2fd;
  margin-left: 20%;
}

.message-assistant {
  background: white;
  margin-right: 20%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  color: #666;
}

.message-role {
  font-weight: bold;
  text-transform: uppercase;
}

.message-content {
  color: #333;
}

.message-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.5;
}

.tool-calls {
  margin-top: 12px;
}

.tool-call {
  margin-top: 8px;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  background: #fafafa;
}

.tool-call-running {
  border-color: #2196f3;
  background: #e3f2fd;
}

.tool-call-completed {
  border-color: #4caf50;
  background: #e8f5e9;
}

.tool-call-error {
  border-color: #f44336;
  background: #ffebee;
}

.tool-call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tool-name {
  font-weight: bold;
  font-size: 14px;
}

.tool-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  text-transform: uppercase;
}

.status-pending {
  background: #fff3e0;
  color: #f57c00;
}

.status-running {
  background: #e3f2fd;
  color: #1976d2;
}

.status-completed {
  background: #e8f5e9;
  color: #388e3c;
}

.status-error {
  background: #ffebee;
  color: #d32f2f;
}

.tool-parameters,
.tool-result {
  margin-top: 8px;
  font-size: 13px;
}

.tool-parameters details {
  cursor: pointer;
}

.tool-parameters summary {
  font-weight: 500;
  color: #666;
}

.tool-parameters pre,
.tool-result-output {
  margin: 8px 0 0 0;
  padding: 8px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.tool-result-title {
  font-weight: 500;
  margin-bottom: 4px;
  color: #333;
}

.loading-indicator {
  display: flex;
  gap: 4px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #667eea;
  animation: pulse 1.4s infinite ease-in-out;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes pulse {
  0%,
  80%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

.chat-input-container {
  border-top: 1px solid #e0e0e0;
  background: white;
  padding: 12px;
}

.input-controls {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
}

.checkbox-label input {
  cursor: pointer;
}

.chat-input {
  display: flex;
  gap: 8px;
}

.chat-input textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  resize: none;
  transition: border-color 0.2s;
}

.chat-input textarea:focus {
  outline: none;
  border-color: #667eea;
}

.chat-input textarea:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.btn-send {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-send:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.error-message {
  padding: 12px;
  background: #ffebee;
  border-top: 1px solid #f44336;
  color: #d32f2f;
  font-size: 14px;
}
</style>
