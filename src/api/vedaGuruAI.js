/**
 * vedaGuruAI.js — Real LLM-powered Vedic astrology chat
 *
 * Uses OpenRouter to access Claude and falls back to Gemini/GPT.
 * Supports streaming and automatic rate-limit fallbacks.
 */

const OPENROUTER_URL = '/openrouter-api/v1/chat/completions';

const MODELS = [
  "anthropic/claude-opus-4.8", 
  "google/gemini-3.1-flash-lite", 
  "openai/gpt-5.3-chat"
];

// ─── Confidence scoring (rule-based, upgradeable to ML) ──────────────────────
const CONFIDENCE_RULES = {
  career:      { base: 0.72, boosters: ['saturn', 'sun', '10th'] },
  love:        { base: 0.68, boosters: ['venus', 'moon', '7th'] },
  health:      { base: 0.65, boosters: ['ascendant', '6th', 'lagna'] },
  finance:     { base: 0.70, boosters: ['jupiter', '2nd', '11th'] },
  family:      { base: 0.74, boosters: ['moon', '4th', 'cancer'] },
  spirituality:{ base: 0.78, boosters: ['jupiter', 'ketu', '9th', '12th'] },
  general:     { base: 0.66, boosters: [] },
};

/**
 * Detect topic from user question for confidence scoring
 */
function detectTopic(question) {
  const q = question.toLowerCase();
  if (q.match(/career|job|work|profession|business|office|salary|promotion/)) return 'career';
  if (q.match(/love|marriage|relationship|partner|wife|husband|boyfriend|girlfriend|शादी|विवाह|বিয়ে/)) return 'love';
  if (q.match(/health|body|illness|disease|sick|wellness|स्वास्थ्य|স্বাস্থ্য/)) return 'health';
  if (q.match(/money|wealth|finance|income|investment|profit|loss|धन|পয়সা/)) return 'finance';
  if (q.match(/family|parent|child|mother|father|home|परिवार|পরিবার/)) return 'family';
  if (q.match(/spirit|meditation|karma|dharma|moksha|god|temple|yoga|आध्यात्मिक/)) return 'spirituality';
  return 'general';
}

/**
 * Calculate confidence score based on topic + available planetary data
 */
function calcConfidence(topic, planets) {
  const rule = CONFIDENCE_RULES[topic] || CONFIDENCE_RULES.general;
  let score = rule.base;
  if (planets && planets.length > 0) {
    const planetText = planets.map(p => `${p.name} ${p.sign}`.toLowerCase()).join(' ');
    const hits = rule.boosters.filter(b => planetText.includes(b)).length;
    score += hits * 0.03;
  }
  return Math.min(0.95, Math.round(score * 100) / 100);
}

/**
 * Build the system prompt with full birth chart context
 */
function buildSystemPrompt(birthDetails, planets, lang) {
  const langInstruction = lang === 'hi'
    ? 'Always respond in Hindi (Devanagari script). Mix Sanskrit terms naturally.'
    : lang === 'bn'
    ? 'Always respond in Bengali (বাংলা script). Mix Sanskrit terms naturally.'
    : 'Respond in clear, warm English. Use Sanskrit terms with English explanations.';

  const planetList = planets && planets.length > 0
    ? planets.map(p => {
        const name = p.name || p.planet_name || '?';
        const sign = p.sign || '?';
        const house = p.house ? ` (House ${p.house})` : '';
        const retro = p.isRetro === 'true' || p.is_retro ? ' ℞' : '';
        return `  • ${name}: ${sign}${house}${retro}`;
      }).join('\n')
    : '  • Planetary data unavailable';

  return `You are VedaGuru, a compassionate and deeply knowledgeable Vedic astrologer with 50 years of experience.

LANGUAGE: ${langInstruction}

YOUR PERSONALITY:
- Highly analytical, direct, and straightforward.
- Act like an expert AI Astrology Agent. Get straight to the point without flowery greetings.
- Format your responses clearly using bullet points and concise paragraphs.
- Reference specific planets, houses, and signs by name logically.
- Suggest practical and specific remedies.
- Keep responses focused: 50-70 words.

USER'S BIRTH CHART:
  Ascendant (Lagna): ${birthDetails?.ascendant || birthDetails?.Ascendant || '—'}
  Sun Sign: ${birthDetails?.sun_sign || birthDetails?.SunSign || '—'}
  Moon Sign: ${birthDetails?.moon_sign || birthDetails?.MoonSign || '—'}
  Current Mahadasha: ${birthDetails?.dasha || '—'}

PLANETARY POSITIONS:
${planetList}

IMPORTANT RULES:
1. Always reference the user's ACTUAL ascendant and planets above (not generic)
2. When suggesting timing, say "around [month/season]" — never exact dates
3. For remedies, suggest: mantras, colors, fasting days, and/or gemstones
4. Add a confidence note if the question is highly specific (e.g., "This prediction carries ~70% confidence based on current planetary positions")
5. Never claim 100% certainty — astrology has inherent uncertainty`;
}

/**
 * Main LLM chat function (Streaming Generator)
 *
 * @param {string} userQuestion - The user's question
 * @param {Object} birthDetails - birth_details API response
 * @param {Array}  planets      - planets API response array
 * @param {Object} birthData    - raw birth data from localStorage
 * @param {string} openRouterKey - user's OpenRouter API key
 * @param {Array}  history     - previous messages [{role, content}]
 * @param {string} lang        - 'en' | 'hi' | 'bn'
 * @yields {{ chunk: string, confidence: number, topic: string, usedLLM: boolean, done: boolean }}
 */
export async function* streamVedaGuruResponse({
  userQuestion,
  birthDetails,
  planets,
  birthData,
  openRouterKey,
  history = [],
  lang = 'en',
}) {
  const topic = detectTopic(userQuestion);
  const confidence = calcConfidence(topic, planets);

  // ── Fallback if no OpenRouter key ────────────────────────────────────────────────
  if (!openRouterKey) {
    yield {
      chunk: buildEnhancedFallback(userQuestion, birthDetails, planets, birthData, lang),
      confidence,
      topic,
      usedLLM: false,
      done: true
    };
    return;
  }

  // ── Build message array with conversation history ────────────────────────────
  const systemPrompt = buildSystemPrompt(birthDetails, planets, lang);

  // Keep last 6 exchanges to stay within token limits
  const recentHistory = history.slice(-12);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...recentHistory,
    { role: 'user', content: userQuestion },
  ];

  let res = null;
  let lastError = null;

  // Automatic Fallback Loop
  for (const model of MODELS) {
    try {
      res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openRouterKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'VedAstro',
        },
        body: JSON.stringify({
          model: model,
          messages,
          stream: true,
          temperature: 0.72,
          max_tokens: 800,
        }),
      });

      if (res.status === 429) {
        lastError = new Error(`Rate limited on ${model}`);
        continue; // Trigger fallback to next model
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `OpenRouter error ${res.status}`);
      }

      break; // Request successful
    } catch (err) {
      lastError = err;
      continue; // Try next model on network errors
    }
  }

  if (!res || !res.ok) {
    throw lastError || new Error("All fallback models failed or were rate limited.");
  }

  // Read the stream
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6));
          const chunkContent = data.choices?.[0]?.delta?.content || '';
          if (chunkContent) {
            yield {
              chunk: chunkContent,
              confidence,
              topic,
              usedLLM: true,
              done: false
            };
          }
        } catch (e) {
          // Ignore parse errors for incomplete chunks
        }
      }
    }
  }

  // Final yield
  yield {
    chunk: '',
    confidence,
    topic,
    usedLLM: true,
    done: true
  };
}

// ─── Enhanced Template Fallback ───────────────────────────────────────────────
// Much richer than the old keyword-matching — uses actual birth data
function buildEnhancedFallback(question, birth, planets, birthData, lang) {
  const q = question.toLowerCase();
  const asc = birth?.ascendant || birth?.Ascendant || 'your ascendant';
  const sun = birth?.sun_sign || birth?.SunSign || 'your Sun sign';
  const moon = birth?.moon_sign || birth?.MoonSign || 'your Moon sign';
  const dasha = birth?.dasha || 'your current Dasha';

  const bDay = Number(birthData?.day) || 1;
  const bMonth = Number(birthData?.month) || 1;
  const bYear = Number(birthData?.year) || 2000;
  const luckyNum = ((bDay + bMonth + bYear) % 9) || 9;

  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const peakMonth = months[(now.getMonth() + (luckyNum % 4)) % 12];
  const peakYear = now.getFullYear() + (now.getMonth() + luckyNum > 12 ? 1 : 0);

  // Find strong planets from data
  const strongPlanets = planets?.filter(p => !p.isRetro && !p.is_retro)
    .slice(0, 2).map(p => p.name || p.planet_name).filter(Boolean) || [];

  const planetContext = strongPlanets.length > 0
    ? ` Your ${strongPlanets.join(' and ')} are currently well-positioned and lend their support.`
    : '';

  let response = '';

  if (q.match(/career|job|work|promotion|business/)) {
    response = `🪐 **Career Guidance for ${asc} Ascendant**\n\nYour 10th house (Career) is governed by your ${asc} rising. With the Sun in ${sun}, your professional identity is strongly tied to your sense of purpose.${planetContext}\n\nDuring your ${dasha} Dasha, focus on building long-term credibility over quick gains. A favorable window for advancement appears around ${peakMonth} ${peakYear}.\n\n✨ **Remedy:** Chant the Surya mantra (Om Hreem Suryaya Namaha) 108x on Sundays. Wear copper-colored clothing on important work days.\n\n_Add your OpenRouter key in Settings for personalized AI-powered guidance._`;
  } else if (q.match(/love|marriage|relationship|partner/)) {
    response = `💖 **Relationship Guidance**\n\nWith ${asc} rising, Venus governs key aspects of your partnerships. Your Moon in ${moon} reveals your deep emotional needs in relationships — you seek genuine depth, not surface connection.${planetContext}\n\nThe 7th house of marriage is currently activated during your ${dasha} period. If you are seeking a partner, around ${peakMonth} ${peakYear} brings increased social opportunities.\n\n✨ **Remedy:** On Fridays, light a ghee lamp and chant "Om Shukraya Namaha" 108 times. Wear white or light pink on important social occasions.\n\n_Add your OpenRouter key in Settings for personalized AI-powered guidance._`;
  } else if (q.match(/health|body|illness|wellness/)) {
    response = `🌿 **Health Guidance for ${asc} Ascendant**\n\nYour Ascendant (${asc}) governs your physical constitution and vitality. The 6th house indicates areas requiring mindful attention.${planetContext}\n\nDuring your ${dasha} Dasha, prioritize sleep, hydration, and regular movement. Avoid overexertion particularly in the coming months.\n\n✨ **Remedy:** Practice Pranayama (breathing exercises) for 15 minutes each morning. Consume tulsi (holy basil) tea — it strengthens immunity and calms the mind.\n\n_Add your OpenRouter key in Settings for personalized AI-powered guidance._`;
  } else if (q.match(/money|wealth|finance|income|investment/)) {
    response = `💰 **Financial Guidance**\n\nYour 2nd house (wealth) and 11th house (gains) are key indicators for financial growth. With Sun in ${sun}, your earning potential is tied to your personal authority and leadership.${planetContext}\n\nJupiter's current position is beneficial for long-term investments. Avoid speculative ventures during this ${dasha} period — steady, disciplined savings will yield better results by ${peakMonth} ${peakYear}.\n\n✨ **Remedy:** On Thursdays, donate yellow items to those in need. Chant "Om Gurave Namaha" 108 times to strengthen Jupiter's benefic influence.\n\n_Add your OpenRouter key in Settings for personalized AI-powered guidance._`;
  } else if (q.match(/lucky number|shubh|शुभ|ভাগ্য/)) {
    response = `🔢 **Your Lucky Numbers**\n\nBased on your birth date, your primary lucky number is **${luckyNum}**. Secondary numbers: ${(luckyNum * 2) % 9 || 9} and ${(luckyNum + 3) % 9 || 9}.\n\nSchedule important meetings, signings, or launches on dates that reduce to ${luckyNum} (e.g., the ${luckyNum}th, ${luckyNum + 9}th, ${luckyNum + 18}th of any month).\n\n✨ Your lucky day of the week is ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][luckyNum % 7]}. Your lucky colors are aligned with your ${asc} ascendant.`;
  } else {
    response = `🔮 **Cosmic Guidance**\n\nBased on your birth chart (Ascendant: ${asc} | Sun: ${sun} | Moon: ${moon}), the cosmic energies suggest this is a period of significant growth and realignment.${planetContext}\n\nYour ${dasha} Dasha is shaping your experiences. Trust the divine timing — meaningful shifts are expected around ${peakMonth} ${peakYear}.\n\n✨ **Daily Practice:** Meditate for 10 minutes at sunrise. Keep a gratitude journal — this strengthens your connection to Jupiter's expansive energy.\n\n_💡 Tip: Add your OpenRouter key in Settings → AI Chat for fully personalized responses powered by Claude._`;
  }

  return response;
}
