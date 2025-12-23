import { ref, computed } from 'vue'
import type { Message, ToolCall, ChatSession } from '../types'
import { PolzaService } from '../services/polzaService'
import { ToolService } from '../services/toolService'

export function useChat(apiKey: string, baseURL?: string) {
  const polzaService = new PolzaService(apiKey, baseURL)
  const toolService = new ToolService()

  const sessions = ref<Map<string, ChatSession>>(new Map())
  const currentSessionId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const currentSession = computed(() => {
    if (!currentSessionId.value) return null
    return sessions.value.get(currentSessionId.value) || null
  })

  const messages = computed(() => {
    return currentSession.value?.messages || []
  })

  /**
   * Create a new chat session
   */
  function createSession(model?: string, systemPrompt?: string): string {
    const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const session: ChatSession = {
      id: sessionId,
      messages: [],
      model: model || 'anthropic/claude-sonnet-4.5',
      systemPrompt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    sessions.value.set(sessionId, session)
    currentSessionId.value = sessionId

    return sessionId
  }

  /**
   * Switch to a different session
   */
  function switchSession(sessionId: string): boolean {
    if (sessions.value.has(sessionId)) {
      currentSessionId.value = sessionId
      return true
    }
    return false
  }

  /**
   * Add a message to the current session
   */
  function addMessage(message: Omit<Message, 'id' | 'timestamp'>): Message {
    if (!currentSession.value) {
      throw new Error('No active session')
    }

    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...message,
    }

    currentSession.value.messages.push(newMessage)
    currentSession.value.updatedAt = Date.now()

    return newMessage
  }

  /**
   * Send a message and get AI response
   */
  async function sendMessage(
    content: string,
    options?: { useTools?: boolean; stream?: boolean }
  ): Promise<void> {
    if (!currentSession.value) {
      throw new Error('No active session')
    }

    const { useTools = true, stream = true } = options || {}

    try {
      isLoading.value = true
      error.value = null

      // Add user message
      addMessage({
        role: 'user',
        content,
      })

      // Prepare messages for API
      const apiMessages = currentSession.value.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Add system prompt if exists
      if (currentSession.value.systemPrompt) {
        apiMessages.unshift({
          role: 'system',
          content: currentSession.value.systemPrompt,
        })
      }

      // Prepare request
      const tools = useTools ? PolzaService.getToolsDefinition() : undefined

      if (stream) {
        // Streaming response
        const assistantMessage = addMessage({
          role: 'assistant',
          content: '',
          toolCalls: [],
        })

        let accumulatedContent = ''
        const toolCalls: Map<
          number,
          { id?: string; name?: string; arguments: string }
        > = new Map()

        for await (const chunk of polzaService.chatStream({
          messages: apiMessages,
          tools,
          tool_choice: useTools ? 'auto' : undefined,
        })) {
          const delta = chunk.choices[0]?.delta

          if (delta.content) {
            accumulatedContent += delta.content
            assistantMessage.content = accumulatedContent
          }

          if (delta.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              const existing = toolCalls.get(toolCall.index) || {
                arguments: '',
              }

              if (toolCall.id) existing.id = toolCall.id
              if (toolCall.function?.name) existing.name = toolCall.function.name
              if (toolCall.function?.arguments) {
                existing.arguments += toolCall.function.arguments
              }

              toolCalls.set(toolCall.index, existing)
            }
          }
        }

        // Process tool calls if any
        if (toolCalls.size > 0) {
          assistantMessage.toolCalls = Array.from(toolCalls.values())
            .filter((tc) => tc.id && tc.name)
            .map((tc) => ({
              id: tc.id!,
              tool: tc.name!,
              parameters: JSON.parse(tc.arguments),
              status: 'pending' as const,
            }))

          // Execute tools
          await executeToolCalls(assistantMessage.toolCalls)
        }
      } else {
        // Non-streaming response
        const response = await polzaService.chat({
          messages: apiMessages,
          tools,
          tool_choice: useTools ? 'auto' : undefined,
        })

        const choice = response.choices[0]
        const assistantMessage = addMessage({
          role: 'assistant',
          content: choice.message.content || '',
          toolCalls: choice.message.tool_calls?.map((tc) => ({
            id: tc.id,
            tool: tc.function.name,
            parameters: JSON.parse(tc.function.arguments),
            status: 'pending' as const,
          })),
        })

        // Execute tools if any
        if (assistantMessage.toolCalls && assistantMessage.toolCalls.length > 0) {
          await executeToolCalls(assistantMessage.toolCalls)
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      addMessage({
        role: 'assistant',
        content: `Error: ${error.value}`,
      })
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Execute tool calls
   */
  async function executeToolCalls(toolCalls: ToolCall[]): Promise<void> {
    for (const toolCall of toolCalls) {
      toolCall.status = 'running'

      try {
        const result = await toolService.executeTool({
          tool: toolCall.tool,
          parameters: toolCall.parameters,
          sessionId: currentSessionId.value || undefined,
        })

        if (result.success && result.result) {
          toolCall.result = result.result
          toolCall.status = 'completed'
        } else {
          toolCall.result = {
            title: `Error executing ${toolCall.tool}`,
            output: result.error || 'Unknown error',
          }
          toolCall.status = 'error'
        }
      } catch (err) {
        toolCall.result = {
          title: `Error executing ${toolCall.tool}`,
          output: err instanceof Error ? err.message : 'Unknown error',
        }
        toolCall.status = 'error'
      }
    }
  }

  /**
   * Clear current session
   */
  function clearSession(): void {
    if (currentSession.value) {
      currentSession.value.messages = []
      currentSession.value.updatedAt = Date.now()
    }
  }

  /**
   * Delete a session
   */
  function deleteSession(sessionId: string): boolean {
    if (sessions.value.has(sessionId)) {
      sessions.value.delete(sessionId)
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = null
      }
      return true
    }
    return false
  }

  /**
   * Set API key
   */
  function setApiKey(key: string): void {
    polzaService.setApiKey(key)
  }

  /**
   * Set model
   */
  function setModel(model: string): void {
    if (currentSession.value) {
      currentSession.value.model = model
      polzaService.setModel(model)
    }
  }

  /**
   * Get all sessions
   */
  function getAllSessions(): ChatSession[] {
    return Array.from(sessions.value.values())
  }

  return {
    // State
    sessions,
    currentSessionId,
    currentSession,
    messages,
    isLoading,
    error,

    // Methods
    createSession,
    switchSession,
    addMessage,
    sendMessage,
    clearSession,
    deleteSession,
    setApiKey,
    setModel,
    getAllSessions,
    executeToolCalls,
  }
}
