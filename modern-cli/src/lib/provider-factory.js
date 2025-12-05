/**
 * Provider Factory - Creates appropriate AI client based on provider configuration
 */

import { PolzaClient } from './polza-client.js';
import { KodacodeClient } from './kodacode-client.js';

/**
 * Provider types
 */
export const PROVIDERS = {
  POLZA: 'polza',
  KODACODE: 'kodacode',
};

/**
 * Default models for each provider
 */
const DEFAULT_MODELS = {
  [PROVIDERS.POLZA]: 'anthropic/claude-sonnet-4.5',
  [PROVIDERS.KODACODE]: 'minimax-m2',
};

/**
 * Create a client instance based on provider configuration
 *
 * @param {Object} config - Configuration object
 * @param {string} config.provider - Provider name ('polza' or 'kodacode')
 * @param {string} config.polzaApiKey - Polza API key
 * @param {string} config.polzaApiBase - Polza API base URL
 * @param {string} config.githubToken - GitHub token for Kodacode
 * @param {string} config.kodacodeApiBase - Kodacode API base URL
 * @returns {PolzaClient|KodacodeClient} - Client instance
 */
export function createClient(config) {
  const provider = config.provider || PROVIDERS.POLZA;

  switch (provider) {
    case PROVIDERS.KODACODE:
      if (!config.githubToken) {
        throw new Error('GitHub token is required for Kodacode provider');
      }
      return new KodacodeClient(
        config.githubToken,
        config.kodacodeApiBase || 'https://api.kodacode.ru/v1'
      );

    case PROVIDERS.POLZA:
    default:
      if (!config.polzaApiKey) {
        throw new Error('Polza API key is required for Polza provider');
      }
      return new PolzaClient(
        config.polzaApiKey,
        config.polzaApiBase || 'https://api.polza.ai/api/v1'
      );
  }
}

/**
 * Get default model for a provider
 *
 * @param {string} provider - Provider name
 * @returns {string} - Default model ID
 */
export function getDefaultModel(provider) {
  return DEFAULT_MODELS[provider] || DEFAULT_MODELS[PROVIDERS.POLZA];
}

/**
 * Validate provider configuration
 *
 * @param {Object} config - Configuration object
 * @returns {Object} - Validation result { valid: boolean, errors: string[] }
 */
export function validateProviderConfig(config) {
  const errors = [];
  const provider = config.provider || PROVIDERS.POLZA;

  if (!Object.values(PROVIDERS).includes(provider)) {
    errors.push(`Invalid provider: ${provider}. Must be one of: ${Object.values(PROVIDERS).join(', ')}`);
  }

  if (provider === PROVIDERS.POLZA && !config.polzaApiKey) {
    errors.push('POLZA_API_KEY environment variable is required for Polza provider');
  }

  if (provider === PROVIDERS.KODACODE && !config.githubToken) {
    errors.push('GITHUB_TOKEN environment variable is required for Kodacode provider');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get provider info
 *
 * @param {string} provider - Provider name
 * @returns {Object} - Provider information
 */
export function getProviderInfo(provider) {
  const info = {
    [PROVIDERS.POLZA]: {
      name: 'Polza AI',
      website: 'https://polza.ai',
      description: 'Multi-provider AI gateway with 100+ models',
      authType: 'API Key',
      defaultModel: DEFAULT_MODELS[PROVIDERS.POLZA],
      supportedModels: [
        'anthropic/claude-sonnet-4.5',
        'anthropic/claude-3-5-sonnet',
        'openai/gpt-4o',
        'openai/o1-preview',
        'deepseek/deepseek-r1',
        'google/gemini-pro',
      ],
    },
    [PROVIDERS.KODACODE]: {
      name: 'Kodacode',
      website: 'https://api.kodacode.ru',
      description: 'GitHub-authenticated AI models with large context windows',
      authType: 'GitHub Token',
      defaultModel: DEFAULT_MODELS[PROVIDERS.KODACODE],
      supportedModels: [
        'minimax-m2',           // 180K context
        'gemini-2.5-flash',     // 986K context
        'deepseek-v3.1-terminus', // 114K context
        'glm-4.6',              // 186K context
        'qwen3-235b-a22b',      // 116K context
        'qwen3-coder',          // 116K context
        'kimi-k2-thinking',     // 244K context
      ],
    },
  };

  return info[provider] || null;
}
