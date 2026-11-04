/**
 * Curated list of OpenRouter AI Models supported in VedAstro
 * Includes verified 100% FREE models and premium frontier models.
 */

export const AVAILABLE_MODELS = [
  // ── Top Verified Working Free Models on OpenRouter ───────
  {
    id: 'openrouter/free',
    name: 'Free Models Auto-Router',
    tag: '100% Free · Auto-Selected',
    provider: 'OpenRouter',
    badgeColor: '#00E575',
    isFree: true,
  },
  {
    id: 'google/gemma-4-31b-it:free',
    name: 'Gemma 4 31B',
    tag: 'Free · High Intelligence',
    provider: 'Google',
    badgeColor: '#4ade80',
    isFree: true,
  },
  {
    id: 'google/gemma-4-26b-a4b-it:free',
    name: 'Gemma 4 26B',
    tag: 'Free · Fast',
    provider: 'Google',
    badgeColor: '#38bdf8',
    isFree: true,
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'Nemotron 3.5 Lightning',
    tag: 'Free · High Speed',
    provider: 'NVIDIA',
    badgeColor: '#76b900',
    isFree: true,
  },
  {
    id: 'nvidia/nemotron-3.5-super-vl:free',
    name: 'Nemotron 3.5 Super VL',
    tag: 'Free · Reasoning',
    provider: 'NVIDIA',
    badgeColor: '#76b900',
    isFree: true,
  },
  {
    id: 'dots-studio/dots-3-note-preview:free',
    name: 'Dots3 Note Preview',
    tag: 'Free · Conversational',
    provider: 'Dots Studio',
    badgeColor: '#a78bfa',
    isFree: true,
  },
  {
    id: 'cohere/north-mini-code:free',
    name: 'Cohere North Mini',
    tag: 'Free · Analytical',
    provider: 'Cohere',
    badgeColor: '#fb923c',
    isFree: true,
  },

  // ── Leading Frontier Models (Paid / Bring Your Own Key) ──
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    tag: 'Smart & Balanced',
    provider: 'OpenAI',
    badgeColor: '#10b981',
    isFree: false,
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    tag: 'Fast & Deep',
    provider: 'Anthropic',
    badgeColor: '#d97706',
    isFree: false,
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    tag: 'Elite Astrology',
    provider: 'Anthropic',
    badgeColor: '#a855f7',
    isFree: false,
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    tag: 'Flagship Intelligence',
    provider: 'OpenAI',
    badgeColor: '#10b981',
    isFree: false,
  },
];

export const DEFAULT_MODEL_ID = 'openrouter/free';

/**
 * Get display info for any model ID
 */
export function getModelInfo(modelId) {
  if (!modelId) return AVAILABLE_MODELS[0];
  const found = AVAILABLE_MODELS.find(
    (m) => m.id === modelId || m.id.toLowerCase() === modelId.toLowerCase()
  );
  if (found) return found;

  const isFree = modelId.includes(':free') || modelId === 'openrouter/free' || modelId.toLowerCase().includes('free');
  const parts = modelId.split('/');
  const rawName = parts[parts.length - 1].replace(/:free$/, '').replace(/[-_]/g, ' ');
  const capitalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  return {
    id: modelId,
    name: isFree ? `${capitalizedName} (Free)` : capitalizedName,
    tag: isFree ? 'Free' : 'Custom',
    provider: parts[0] || 'AI',
    badgeColor: isFree ? '#00E575' : '#a78bfa',
    isFree,
  };
}
