<template>
  <div class="file-browser">
    <div class="browser-header">
      <h3>File System</h3>
      <button @click="refresh" class="btn-refresh" :disabled="isLoading">
        🔄 Refresh
      </button>
    </div>

    <div class="path-bar">
      <span class="path-label">Path:</span>
      <input
        v-model="currentPath"
        @keydown.enter="navigateTo(currentPath)"
        class="path-input"
        placeholder="/path/to/directory"
      />
      <button @click="navigateTo(currentPath)" class="btn-go">Go</button>
    </div>

    <div class="breadcrumb">
      <span
        v-for="(part, index) in pathParts"
        :key="index"
        class="breadcrumb-item"
      >
        <a @click="navigateToIndex(index)" href="#">{{ part }}</a>
        <span v-if="index < pathParts.length - 1" class="separator">/</span>
      </span>
    </div>

    <div v-if="isLoading" class="loading">Loading...</div>

    <div v-else-if="error" class="error">
      <strong>Error:</strong> {{ error }}
    </div>

    <div v-else class="file-list">
      <div
        v-if="currentPath !== '/'"
        @click="navigateUp"
        class="file-item directory"
      >
        <span class="file-icon">📁</span>
        <span class="file-name">..</span>
      </div>

      <div
        v-for="entry in sortedEntries"
        :key="entry.path"
        @click="handleClick(entry)"
        @dblclick="handleDoubleClick(entry)"
        :class="['file-item', entry.type, { selected: selectedPath === entry.path }]"
      >
        <span class="file-icon">{{ getIcon(entry) }}</span>
        <span class="file-name">{{ entry.name }}</span>
        <span v-if="entry.type === 'file' && entry.size" class="file-size">
          {{ formatSize(entry.size) }}
        </span>
      </div>
    </div>

    <div v-if="selectedEntry" class="file-actions">
      <button @click="readFile" :disabled="selectedEntry.type !== 'file'" class="btn-action">
        📄 Read
      </button>
      <button @click="openInChat" class="btn-action">
        💬 Open in Chat
      </button>
      <button @click="copyPath" class="btn-action">
        📋 Copy Path
      </button>
    </div>

    <div v-if="fileContent" class="file-preview">
      <div class="preview-header">
        <h4>{{ selectedEntry?.name }}</h4>
        <button @click="closePreview" class="btn-close">×</button>
      </div>
      <pre class="preview-content">{{ fileContent }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ToolService } from '../services/toolService'
import type { FileSystemEntry } from '../types'

const props = defineProps<{
  initialPath?: string
  baseURL?: string
}>()

const emit = defineEmits<{
  fileSelected: [path: string]
  directorySelected: [path: string]
  fileRead: [content: string, path: string]
}>()

const toolService = new ToolService(props.baseURL)

const currentPath = ref(props.initialPath || process.cwd?.() || '/')
const entries = ref<FileSystemEntry[]>([])
const selectedEntry = ref<FileSystemEntry | null>(null)
const selectedPath = ref<string | null>(null)
const fileContent = ref<string | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

const pathParts = computed(() => {
  return currentPath.value
    .split('/')
    .filter(Boolean)
    .map((part, index, arr) => {
      return part
    })
})

const sortedEntries = computed(() => {
  return [...entries.value].sort((a, b) => {
    // Directories first
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1
    }
    // Then alphabetically
    return a.name.localeCompare(b.name)
  })
})

onMounted(() => {
  loadDirectory(currentPath.value)
})

async function loadDirectory(path: string) {
  isLoading.value = true
  error.value = null

  try {
    const result = await toolService.listDirectory(path)
    entries.value = result
    currentPath.value = path
    selectedEntry.value = null
    selectedPath.value = null
    fileContent.value = null
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load directory'
    entries.value = []
  } finally {
    isLoading.value = false
  }
}

function navigateTo(path: string) {
  loadDirectory(path)
}

function navigateUp() {
  const parts = currentPath.value.split('/').filter(Boolean)
  parts.pop()
  const newPath = '/' + parts.join('/')
  loadDirectory(newPath || '/')
}

function navigateToIndex(index: number) {
  const parts = currentPath.value.split('/').filter(Boolean)
  const newParts = parts.slice(0, index + 1)
  const newPath = '/' + newParts.join('/')
  loadDirectory(newPath)
}

function handleClick(entry: FileSystemEntry) {
  selectedEntry.value = entry
  selectedPath.value = entry.path

  if (entry.type === 'file') {
    emit('fileSelected', entry.path)
  } else {
    emit('directorySelected', entry.path)
  }
}

function handleDoubleClick(entry: FileSystemEntry) {
  if (entry.type === 'directory') {
    loadDirectory(entry.path)
  } else {
    readFile()
  }
}

async function readFile() {
  if (!selectedEntry.value || selectedEntry.value.type !== 'file') return

  isLoading.value = true
  error.value = null

  try {
    const content = await toolService.readFile(selectedEntry.value.path)
    fileContent.value = content
    emit('fileRead', content, selectedEntry.value.path)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to read file'
  } finally {
    isLoading.value = false
  }
}

function closePreview() {
  fileContent.value = null
}

function openInChat() {
  if (selectedEntry.value) {
    const message = `Selected ${selectedEntry.value.type}: ${selectedEntry.value.path}`
    // This could emit an event to add the file path to chat input
    navigator.clipboard.writeText(selectedEntry.value.path)
    alert(`Path copied to clipboard: ${selectedEntry.value.path}`)
  }
}

function copyPath() {
  if (selectedEntry.value) {
    navigator.clipboard.writeText(selectedEntry.value.path)
    alert(`Copied to clipboard: ${selectedEntry.value.path}`)
  }
}

function refresh() {
  loadDirectory(currentPath.value)
}

function getIcon(entry: FileSystemEntry): string {
  if (entry.type === 'directory') return '📁'

  const ext = entry.name.split('.').pop()?.toLowerCase()
  const iconMap: Record<string, string> = {
    js: '📜',
    ts: '📘',
    vue: '💚',
    jsx: '⚛️',
    tsx: '⚛️',
    json: '📋',
    md: '📝',
    txt: '📄',
    css: '🎨',
    html: '🌐',
    py: '🐍',
    rs: '🦀',
    go: '🐹',
    java: '☕',
    c: '🔧',
    cpp: '🔧',
    sh: '🐚',
    yml: '⚙️',
    yaml: '⚙️',
    xml: '📰',
    svg: '🖼️',
    png: '🖼️',
    jpg: '🖼️',
    jpeg: '🖼️',
    gif: '🖼️',
  }

  return iconMap[ext || ''] || '📄'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
</script>

<style scoped>
.file-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.browser-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.browser-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.btn-refresh {
  padding: 6px 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  background: #f5f5f5;
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.path-bar {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  align-items: center;
}

.path-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.path-input {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.path-input:focus {
  outline: none;
  border-color: #667eea;
}

.btn-go {
  padding: 6px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-go:hover {
  background: #5568d3;
}

.breadcrumb {
  padding: 8px 16px;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  font-size: 13px;
  overflow-x: auto;
  white-space: nowrap;
}

.breadcrumb-item a {
  color: #667eea;
  text-decoration: none;
  cursor: pointer;
}

.breadcrumb-item a:hover {
  text-decoration: underline;
}

.separator {
  margin: 0 4px;
  color: #999;
}

.loading,
.error {
  padding: 20px;
  text-align: center;
  color: #666;
}

.error {
  color: #d32f2f;
  background: #ffebee;
}

.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.file-item:hover {
  background: #f5f5f5;
}

.file-item.selected {
  background: #e3f2fd;
}

.file-item.directory {
  font-weight: 500;
}

.file-icon {
  font-size: 18px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.file-size {
  font-size: 12px;
  color: #999;
}

.file-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #f5f5f5;
  border-top: 1px solid #e0e0e0;
}

.btn-action {
  flex: 1;
  padding: 8px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}

.btn-action:hover:not(:disabled) {
  background: #f5f5f5;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.file-preview {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  max-height: 80%;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  border-radius: 8px 8px 0 0;
}

.preview-header h4 {
  margin: 0;
  font-size: 16px;
}

.btn-close {
  width: 32px;
  height: 32px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 50%;
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
  transition: background 0.2s;
}

.btn-close:hover {
  background: #ffebee;
}

.preview-content {
  flex: 1;
  margin: 0;
  padding: 16px;
  overflow: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}
</style>
