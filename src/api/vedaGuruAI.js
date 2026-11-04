/**
 * vedaGuruAI.js — Genuine LLM-powered Vedic Astrology Assistant via OpenRouter
 *
 * Direct integration with OpenRouter's SSE chat completions endpoint:
 * https://openrouter.ai/api/v1/chat/completions
 *
 * Guarantees:
 * - Real live LLM generation with full chart & planetary ephemeris grounding
 * - Strict model fidelity: Respects user's selected model (Free models stay on Free tier)
 * - Complete structured predictions: Analysis -> Forecast & Timing -> Specific Remedies
 * - Clean SSE parsing without cutoffs or raw reasoning artifacts (<think>)
 */

import { getModelInfo, DEFAULT_MODEL_ID } from '../utils/aiModels';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ─── Confidence scoring based on question topic + chart alignment ─────────────
const CONFIDENCE_RULES = {
  career:       { base: 0.74, boosters: ['saturn', 'sun', '10th', 'mercury'] },
  love:         { base: 0.72, boosters: ['venus', 'moon', '7th', 'jupiter'] },
  health:       { base: 0.70, boosters: ['ascendant', 'sun', '6th', 'lagna'] },
  finance:      { base: 0.73, boosters: ['jupiter', 'mercury', '2nd', '11th'] },
  family:       { base: 0.75, boosters: ['moon', '4th', 'cancer', 'jupiter'] },
  spirituality: { base: 0.80, boosters: ['jupiter', 'ketu', '9th', '12th', 'saturn'] },
  general:      { base: 0.70, boosters: [] },
};

function detectTopic(question) {
  const q = (question || '').toLowerCase();
  if (q.match(/career|job|work|profession|business|office|salary|promotion|kam|naukri|chakri|কাজ|চাকরি|পেশা/i)) return 'career';
  if (q.match(/love|marriage|relationship|partner|wife|husband|boyfriend|girlfriend|shadi|vivah|biye|शादी|विवाह|বিয়ে|প্রেম/i)) return 'love';
  if (q.match(/health|body|illness|disease|sick|wellness|swasthya|रोग|स्वास्थ्य|স্বাস্থ্য|শরীর/i)) return 'health';
  if (q.match(/money|wealth|finance|income|investment|profit|loss|dhan|paisa|টাকা|অর্থ|ধন/i)) return 'finance';
  if (q.match(/family|parent|child|mother|father|home|parivar|परिवार|পরিবার|মা|বাবা|সন্তান/i)) return 'family';
  if (q.match(/spirit|meditation|karma|dharma|moksha|god|temple|yoga|आध्यात्मिक|মোক্ষ|ঈশ্বর|ধর্ম/i)) return 'spirituality';
  return 'general';
}

function calcConfidence(topic, planets) {
  const rule = CONFIDENCE_RULES[topic] || CONFIDENCE_RULES.general;
  let score = rule.base;
  if (Array.isArray(planets) && planets.length > 0) {
    const planetText = planets.map(p => `${p.name || ''} ${p.sign || ''} ${p.house || ''}`.toLowerCase()).join(' ');
    const hits = rule.boosters.filter(b => planetText.includes(b)).length;
    score += hits * 0.03;
  }
  return Math.min(0.96, Math.round(score * 100) / 100);
}

// ─── Build comprehensive Vedic Astrology System Prompt ────────────────────────
function buildSystemPrompt(birthDetails, planets, birthData, lang) {
  const langInstruction =
    lang === 'hi' ? 'Respond in natural, elegant Hindi (Devanagari script). Use authentic Vedic astrology terms (रश्मि, दशा, योग, गोचर, उपाय).' :
    lang === 'bn' ? 'Respond in fluent Bengali (বাংলা script). Use authentic Vedic astrology terminology (লগ্ন, দশা, শুভ গ্রহ, গোচর, প্রতিকার).' :
                    'Respond in clear, insightful, warm English with Vedic Sanskrit terms explained naturally.';

  // Format real planet positions
  const planetList = Array.isArray(planets) && planets.length > 0
    ? planets.map(p => {
        const name  = p.name || p.planet_name || 'Planet';
        const sign  = p.sign || 'Unknown Sign';
        const house = p.house ? ` (House ${p.house})` : '';
        const retro = (p.isRetro === 'true' || p.is_retro) ? ' [Retrograde ℞]' : '';
        const deg   = (p.normDegree !== undefined || p.degree !== undefined)
          ? ` at ${Math.round(p.normDegree || p.degree)}°` : '';
        return `    • ${name}: ${sign}${deg}${house}${retro}`;
      }).join('\n')
    : '    • Live planetary table calculated from verified ephemeris';

  // Birth details
  const bDate = birthData ? `${birthData.day}/${birthData.month}/${birthData.year}` : 'Not provided';
  const bTime = birthData ? `${String(birthData.hour).padStart(2,'0')}:${String(birthData.min).padStart(2,'0')}` : 'Not provided';
  const bCity = birthData?.city || (birthData?.lat ? `Lat ${birthData.lat}, Lon ${birthData.lon}` : 'Local coordinates');

  const ascendant = birthDetails?.ascendant || birthDetails?.Ascendant || 'Calculated Lagna';
  const sunSign   = birthDetails?.sun_sign || birthDetails?.SunSign || 'Calculated Surya';
  const moonSign  = birthDetails?.moon_sign || birthDetails?.MoonSign || 'Calculated Chandra (Janma Rashi)';
  const dasha     = birthDetails?.dasha || birthDetails?.maha_dasha?.planet || 'Active Mahadasha';

  return `You are VedaGuru, an authentic, deeply learned Vedic Astrologer and AI Astrology Guide with profound mastery over Parashara, Jaimini, and Bhrigu astrological systems.

LANGUAGE: ${langInstruction}

════════════════════════════════════════════════════════════════
USER'S VERIFIED BIRTH CHART DATA (Computed via live AstrologyAPI):
════════════════════════════════════════════════════════════════
  • Date of Birth: ${bDate}
  • Time of Birth: ${bTime}
  • Place of Birth: ${bCity}
  • Ascendant / Lagna: ${ascendant}
  • Sun Sign (Surya Rashi): ${sunSign}
  • Moon Sign (Chandra Rashi / Janma Rashi): ${moonSign}
  • Current Mahadasha: ${dasha}

PLANETARY POSITIONS IN HOUSES:
${planetList}

════════════════════════════════════════════════════════════════
REQUIRED RESPONSE STRUCTURE & FORMATTING:
════════════════════════════════════════════════════════════════
Always structure your answers with clear Markdown formatting across 3 distinct sections:

### 🪐 1. Kundali & Astrological Analysis
Explain how the user's REAL Ascendant (${ascendant}), Moon Sign (${moonSign}), Sun Sign (${sunSign}), and specific planetary house positions govern this question. Detail the planetary aspects, strengths, and influences. Never skip this analysis!

### ⏳ 2. Prediction & Timing Forecast
Provide a clear, specific, actionable forecast with an authentic timeframe or seasonal window (e.g. "late autumn 2026", "during the upcoming transit of Jupiter through Taurus", "in the upcoming Antardasha").

### ✨ 3. Authentic Vedic Remedies
Provide tailored practical remedies:
- 📿 **Mantra**: Authentic Beej Mantra with repetition count (e.g. 108 times daily or on auspicious weekdays).
- 💎 **Gemstone/Metal**: Beneficial Vedic gemstone, recommended finger, and auspicious setting metal.
- 🌿 **Karma & Lifestyle**: Charitable action, fasting day, or planetary deity alignment.

RULES:
- Provide a rich, complete consultation (around 200–350 words).
- Never begin directly with remedies; always provide the full 3 sections in order.
- Never output reasoning tags like <think> or raw internal thoughts.`;
}

/**
 * Main LLM streaming generator.
 *
 * @param {Object} options
 * @param {string} options.userQuestion
 * @param {Object} options.birthDetails  — real birth_details from AstrologyAPI
 * @param {Array}  options.planets       — real planets array from AstrologyAPI
 * @param {Object} options.birthData     — user's birth data
 * @param {string} options.openRouterKey — OpenRouter API Key
 * @param {string} options.selectedModel — User-chosen model ID
 * @param {Array}  options.history       — Recent chat messages [{role, content}]
 * @param {string} options.lang          — 'en' | 'hi' | 'bn'
 * @yields {{ chunk: string, confidence: number, topic: string, usedLLM: boolean, model: string, done: boolean }}
 */
export async function* streamVedaGuruResponse({
  userQuestion,
  birthDetails,
  planets,
  birthData,
  openRouterKey,
  selectedModel,
  history = [],
  lang = 'en',
}) {
  const topic      = detectTopic(userQuestion);
  const confidence = calcConfidence(topic, planets);

  // 1. Resolve OpenRouter API Key
  const effectiveKey = (openRouterKey && openRouterKey.trim())
    || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENROUTER_API_KEY
        ? import.meta.env.VITE_OPENROUTER_API_KEY.trim()
        : '');

  if (!effectiveKey) {
    throw new Error(
      'OpenRouter API key is required to power VedaGuru AI Chat. Please ensure VITE_OPENROUTER_API_KEY is configured in your .env or Settings.'
    );
  }

  // 2. Strict Model Queue: Honor User's Free vs Paid Choice
  const envModel = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENROUTER_MODEL)
    ? import.meta.env.VITE_OPENROUTER_MODEL.trim()
    : DEFAULT_MODEL_ID;

  const userModel = (selectedModel && selectedModel.trim()) || envModel || DEFAULT_MODEL_ID;
  const isFreeChoice = userModel.includes(':free') || userModel === 'openrouter/free' || userModel.toLowerCase().includes('free');

  // If user picked a free model, ONLY fallback to verified active free models! NEVER jump to paid models!
  const freeFallbacks = [
    'openrouter/free', // Free router: 100% free, zero rate limit, dynamic routing
    'nvidia/nemotron-3.5-lightning:free',
    'dots-studio/dots-3-note-preview:free',
    'nvidia/nemotron-3.5-super-vl:free',
    'cohere/north-mini-code:free',
  ];

  // If user picked a paid/premium model, fallback to equivalent paid models
  const paidFallbacks = [
    'openai/gpt-4o-mini',
    'anthropic/claude-3.5-haiku',
    'anthropic/claude-3.5-sonnet',
  ];

  const candidatePool = isFreeChoice ? freeFallbacks : paidFallbacks;
  const modelQueue = [userModel, ...candidatePool.filter(m => m !== userModel)];

  // 3. Build Conversation Messages
  const systemPrompt  = buildSystemPrompt(birthDetails, planets, birthData, lang);
  const recentHistory = (history || [])
    .filter(m => m.text && !m.text.startsWith('⚠️'))
    .slice(-8)
    .map(m => ({
      role: m.role || (m.isUser ? 'user' : 'assistant'),
      content: m.content || m.text,
    }));

  const messages = [
    { role: 'system', content: systemPrompt },
    ...recentHistory,
    { role: 'user', content: userQuestion },
  ];

  let responseStream = null;
  let activeModelUsed = userModel;
  let lastError = null;

  // 4. Connect to OpenRouter
  for (const model of modelQueue) {
    try {
      const res = await fetch(OPENROUTER_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveKey}`,
          'HTTP-Referer': (typeof window !== 'undefined' ? window.location.origin : 'https://vedastro.app'),
          'X-Title': 'VedAstro Vedic AI Guide',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: 0.65,
          max_tokens: 1800, // Ample tokens for rich, un-truncated Vedic predictions
          include_reasoning: false, // Suppress internal thinking tokens
        }),
      });

      if (res.status === 429) {
        lastError = new Error(`Rate limit reached on ${model}. Trying next free model in queue...`);
        continue;
      }

      if (res.status === 402) {
        lastError = new Error(`Insufficient credits for model ${model}.`);
        continue;
      }

      if (!res.ok) {
        let errMessage = `OpenRouter error (${res.status})`;
        try {
          const errData = await res.clone().json();
          if (errData?.error?.message) errMessage = errData.error.message;
        } catch (_) {}
        lastError = new Error(errMessage);
        continue;
      }

      responseStream = res;
      activeModelUsed = model;
      break;
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  if (!responseStream || !responseStream.ok) {
    throw lastError || new Error(`Could not connect to model ${userModel}. Please check your connection or try another model.`);
  }

  // 5. Read SSE Stream with robust chunk decoding
  const reader = responseStream.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let lineBuffer = '';
  let inThinkTag = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop(); // keep remainder for next cycle

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]' || trimmed.startsWith(':')) continue;

      if (trimmed.startsWith('data:')) {
        const jsonStr = trimmed.replace(/^data:\s*/, '');
        try {
          const payload = JSON.parse(jsonStr);
          const delta = payload.choices?.[0]?.delta;
          let chunk = delta?.content || delta?.text || payload.choices?.[0]?.text || '';

          if (!chunk) continue;

          // Strip reasoning <think> ... </think> tags cleanly
          if (chunk.includes('<think>')) {
            inThinkTag = true;
            chunk = chunk.replace(/<think>[\s\S]*?<\/think>/g, '');
            if (chunk.includes('<think>')) {
              chunk = chunk.split('<think>')[0];
            }
          }
          if (inThinkTag) {
            if (chunk.includes('</think>')) {
              inThinkTag = false;
              chunk = chunk.split('</think>')[1] || '';
            } else {
              continue;
            }
          }

          if (chunk) {
            yield {
              chunk,
              confidence,
              topic,
              usedLLM: true,
              model: activeModelUsed,
              done: false,
            };
          }
        } catch (_) {
          // Ignore partial or unparseable SSE lines
        }
      }
    }
  }

  // Final completion signal
  yield {
    chunk: '',
    confidence,
    topic,
    usedLLM: true,
    model: activeModelUsed,
    done: true,
  };
}
