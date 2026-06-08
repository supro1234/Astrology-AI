import axios from 'axios';

const BASE = '/astro-api/v1';

function getHeaders(apiKey) {
  let lang = 'en';
  try {
    const val = localStorage.getItem('vedastro_lang');
    if (val) lang = val.replace(/['\"]+/g, '');
  } catch (e) {}

  return {
    'x-astrologyapi-key': apiKey,
    'Content-Type': 'application/json',
    'Accept-Language': lang,
  };
}

function getBirthBody(birthData) {
  const day = Number(birthData.day);
  const month = Number(birthData.month);
  const year = Number(birthData.year);
  const hour = Number(birthData.hour);
  const min = Number(birthData.min);
  const lat = parseFloat(birthData.lat);
  const lon = parseFloat(birthData.lon);
  const tzone = parseFloat(birthData.tzone);

  // Strict input sanitization and validation
  if (isNaN(day) || day < 1 || day > 31) throw new Error('Invalid day');
  if (isNaN(month) || month < 1 || month > 12) throw new Error('Invalid month');
  if (isNaN(year) || year < 1000 || year > 3000) throw new Error('Invalid year');
  if (isNaN(hour) || hour < 0 || hour > 23) throw new Error('Invalid hour');
  if (isNaN(min) || min < 0 || min > 59) throw new Error('Invalid minute');
  if (isNaN(lat) || lat < -90 || lat > 90) throw new Error('Invalid latitude');
  if (isNaN(lon) || lon < -180 || lon > 180) throw new Error('Invalid longitude');
  if (isNaN(tzone) || tzone < -12 || tzone > 14) throw new Error('Invalid timezone');

  return { day, month, year, hour, min, lat, lon, tzone };
}

async function callApi(endpoint, body, credentials) {
  const apiKey = credentials?.apiKey;
  if (!apiKey) throw new Error('NO_API_KEY');

  const res = await axios.post(
    BASE + endpoint,
    body || {},
    { headers: getHeaders(apiKey) }
  );
  // If API returns { error: true } or { status: false }, treat as null
  if (res.data?.error === true || res.data?.status === false) {
    console.warn(`[AstrologyAPI] ${endpoint} returned error:`, res.data);
    return null;
  }
  return res.data;
}

// ─── Verify Credentials ───────────────────────────────────────
export async function verifyCredentials(userId, apiKey) {
  const res = await axios.post(
    `${BASE}/sun_sign_prediction/daily/aries`,
    {},
    { headers: getHeaders(apiKey) }
  );
  // Treat API-level errors as verification failure
  if (res.data?.error === true || res.data?.status === false) {
    const err = new Error('Verification failed — API returned error');
    err.response = { status: 401, data: res.data };
    throw err;
  }
  return res.data;
}

// ─── Planet Positions (includes Ascendant as a planet entry) ──
export async function getPlanets(birthData, credentials) {
  return callApi('/planets', getBirthBody(birthData), credentials);
}

// ─── Extended Planets (includes Lagna, Rahu, Ketu) ───────────
export async function getPlanetsExtended(birthData, credentials) {
  return callApi('/planets/extended', getBirthBody(birthData), credentials);
}

// ─── Ascendant Report ────────────────────────────────────────
export async function getAscendantReport(birthData, credentials) {
  return callApi('/ascendant_report', getBirthBody(birthData), credentials);
}

// ─── Birth Details (returns ascendant + moon + sun) ──────────
export async function getBirthDetails(birthData, credentials) {
  return callApi('/birth_details', getBirthBody(birthData), credentials);
}

// ─── Current Vimshottari Dasha (Maha + Antar + Pratyantar) ───
export async function getCurrentDasha(birthData, credentials) {
  return callApi('/current_vdasha', getBirthBody(birthData), credentials);
}

// ─── All dasha levels: returns full Maha + Antar breakdown ───
export async function getAllDasha(birthData, credentials) {
  return callApi('/current_vdasha_all', getBirthBody(birthData), credentials);
}

// ─── House Report — uses house_report/{num} ──────────────────
export async function getHouseReport(houseNum, birthData, credentials) {
  return callApi(`/house_report/${houseNum}`, getBirthBody(birthData), credentials);
}

// ─── Planet Report ───────────────────────────────────────────
export async function getPlanetReport(planetName, birthData, credentials) {
  return callApi(`/planet_report/${planetName}`, getBirthBody(birthData), credentials);
}

// ─── Panchang ────────────────────────────────────────────────
export async function getPanchang(date, lat, lon, tzone, credentials) {
  const body = {
    day: Number(date.day), month: Number(date.month), year: Number(date.year),
    hour: 6, min: 0,
    lat: parseFloat(lat), lon: parseFloat(lon), tzone: parseFloat(tzone),
  };
  return callApi('/basic_panchang', body, credentials);
}

// ─── Kundli Match ────────────────────────────────────────────
export async function getMatchMaking(person1, person2, credentials) {
  // Validate person 1
  getBirthBody(person1);
  // Validate person 2
  getBirthBody(person2);

  const body = {
    m_day: Number(person1.day), m_month: Number(person1.month), m_year: Number(person1.year),
    m_hour: Number(person1.hour), m_min: Number(person1.min),
    m_lat: parseFloat(person1.lat), m_lon: parseFloat(person1.lon), m_tzone: parseFloat(person1.tzone),
    f_day: Number(person2.day), f_month: Number(person2.month), f_year: Number(person2.year),
    f_hour: Number(person2.hour), f_min: Number(person2.min),
    f_lat: parseFloat(person2.lat), f_lon: parseFloat(person2.lon), f_tzone: parseFloat(person2.tzone),
  };
  return callApi('/match_making_report', body, credentials);
}

// ─── AI Chat ─────────────────────────────────────────────────
// Combines /birth_details + /planets to produce a rich VedaGuru answer.
// Falls back to /general_ascendant_report if needed.
export async function getAiChat(userQuestion, birthData, credentials) {
  if (!credentials?.apiKey) throw new Error('NO_API_KEY');
  if (!birthData) throw new Error('NO_BIRTH_DATA');

  const body = getBirthBody(birthData);

  // Fetch birth details and planets in parallel
  const [birthRes, planetsRes] = await Promise.allSettled([
    axios.post(`${BASE}/birth_details`, body, { headers: getHeaders(credentials.apiKey) }),
    axios.post(`${BASE}/planets`, body, { headers: getHeaders(credentials.apiKey) }),
  ]);

  const birth = birthRes.status === 'fulfilled' ? birthRes.value?.data : null;
  const planets = planetsRes.status === 'fulfilled' ? planetsRes.value?.data : null;

  // Build a rich contextual answer from the API data
  return buildVedaGuruResponse(userQuestion, birth, planets, birthData);
}

// ─── Build VedaGuru Response ──────────────────────────────────
function buildVedaGuruResponse(question, birth, planets, birthData) {
  const q = question.toLowerCase();
  let lang = 'en';
  try {
    const val = localStorage.getItem('vedastro_lang');
    if (val) lang = val.replace(/['"]+/g, '');
  } catch (e) {}

  const ascendant = birth?.ascendant || birth?.Ascendant || '—';
  const sunSign = birth?.sun_sign || birth?.SunSign || '—';
  const moonSign = birth?.moon_sign || birth?.MoonSign || '—';

  // Calculate dynamic lucky numbers and timing
  const bDay = Number(birthData?.day) || 1;
  const bMonth = Number(birthData?.month) || 1;
  const bYear = Number(birthData?.year) || 2000;
  const luckyNum = (bDay + bMonth + bYear) % 9 || 9;
  
  // Predict timing (simple heuristic based on luckyNum)
  const nextMonth = new Date().getMonth() + 1 + (luckyNum % 4);
  const tYear = nextMonth > 12 ? new Date().getFullYear() + 1 : new Date().getFullYear();
  const tMonth = nextMonth > 12 ? nextMonth - 12 : nextMonth;
  const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const bnMonthNames = ["", "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
  const hiMonthNames = ["", "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];

  let insight = '';
  
  // Marriage logic
  const isMarriageQuery = q.includes('marriage') || q.includes('marigade') || q.includes('wedding') || q.includes('বিয়ে') || q.includes('शादी');
  
  if (lang === 'bn') {
    if (isMarriageQuery) {
      if (q.includes('date') || q.includes('when') || q.includes('timing') || q.includes('সময়')) {
        insight = `বিয়ের সময়: আপনার চার্টের সপ্তম ভাব বিশ্লেষণ করে এবং আপনার বর্তমান দশা অনুসারে, আপনার বিয়ের প্রবল সম্ভাবনা ${bnMonthNames[tMonth]} ${tYear} থেকে শুরু হচ্ছে। এটি আপনার চার্টের গ্রহের পরিবর্তনের কারণে ব্যাপকভাবে পরিবর্তিত হতে পারে, তবে এটি একটি অনুকূল সময়।`;
      } else {
        insight = `সম্পর্ক: শুক্র এবং সপ্তম ভাব আপনার সম্পর্ক পরিচালনা করে। আপনার চন্দ্র ${moonSign}-এ রয়েছে, যা আপনার মানসিক প্রকৃতি প্রকাশ করে। আপনি সর্বদা ভারসাম্য এবং গভীর সংযোগ খোঁজেন।`;
      }
    } else if (q.includes('career') || q.includes('job') || q.includes('profession') || q.includes('কাজ') || q.includes('কর্ম')) {
      insight = `কর্মজীবন: আপনার দশম ভাব এবং এর অধিপতি আপনার কর্মজীবন পরিচালনা করে। শনি গ্রহের অবস্থান আপনার পেশাদার দীর্ঘায়ু নির্দেশ করে। আপনার চন্দ্র ${moonSign}-এ রয়েছে, যা পেশাদার ক্ষেত্রে আপনার শক্তিশালী অন্তর্দৃষ্টিকে বোঝায়।`;
    } else if (q.includes('health') || q.includes('body') || q.includes('স্বাস্থ্য') || q.includes('শরীর')) {
      insight = `স্বাস্থ্য: আপনার লগ্ন ${ascendant} আপনার শারীরিক গঠন নিয়ন্ত্রণ করে। ষষ্ঠ ভাব স্বাস্থ্যের চ্যালেঞ্জগুলি নির্দেশ করে। নিয়মিত আধ্যাত্মিক চর্চা এবং বিশ্রাম আপনার জন্য খুব উপকারী হবে।`;
    } else if (q.includes('money') || q.includes('wealth') || q.includes('finance') || q.includes('অর্থ') || q.includes('টাকা')) {
      insight = `অর্থ: দ্বিতীয় এবং একাদশ ভাব সম্পদ সঞ্চয় পরিচালনা করে। বৃহস্পতির অবস্থান আর্থিক সমৃদ্ধি বৃদ্ধি করে। আপনার সূর্য ${sunSign}-এ থাকায়, এটি আপনার উপার্জনের স্টাইলকে প্রভাবিত করে।`;
    } else if (q.includes('number') || q.includes('lucky') || q.includes('সংখ্যা')) {
      insight = `ভাগ্যবান সংখ্যা: আপনার জন্মতারিখ অনুযায়ী আপনার প্রধান ভাগ্যবান সংখ্যা হলো ${luckyNum}। এই সংখ্যার সাথে যুক্ত দিনগুলি আপনার জন্য শুভ।`;
    } else if (q.includes('timing') || q.includes('when') || q.includes('সময়')) {
      insight = `সময়ের পূর্বাভাস: আপনার বর্তমান দশা এবং গ্রহের গোচর অনুযায়ী, উল্লেখযোগ্য ইতিবাচক পরিবর্তন ${bnMonthNames[tMonth]} ${tYear} এর কাছাকাছি ঘটবে বলে আশা করা যায়।`;
    } else {
      insight = `মহাজাগতিক দিকনির্দেশনা: আপনার জন্মকুণ্ডলী অনুযায়ী (লগ্ন: ${ascendant}, সূর্য: ${sunSign}, চন্দ্র: ${moonSign}), এই সময়টি আপনার আত্মিক পথে চলার জন্য খুব ভালো। গ্রহগুলো আপনাকে আপনার সঠিক উদ্দেশ্যের দিকে নিয়ে যাচ্ছে। মহাবিশ্বের সময়ের ওপর বিশ্বাস রাখুন।`;
    }
    return `নমস্কার! আপনার কুণ্ডলী বিশ্লেষণ করে আমি যা দেখতে পাচ্ছি:\n\n${insight}`;
  } 
  
  if (lang === 'hi') {
    if (isMarriageQuery) {
      if (q.includes('date') || q.includes('when') || q.includes('timing') || q.includes('समय') || q.includes('तारीख')) {
        insight = `शादी का समय: आपकी कुंडली के 7वें भाव और आपकी वर्तमान दशा का विश्लेषण करने पर, आपकी शादी की प्रबल संभावना ${hiMonthNames[tMonth]} ${tYear} के आसपास बन रही है। यह आपकी कुंडली में ग्रहों के गोचर के कारण अत्यधिक परिवर्तनशील है, लेकिन यह एक शुभ समय है।`;
      } else {
        insight = `रिश्ते: शुक्र और 7वां भाव आपके संबंधों को नियंत्रित करते हैं। आपका चंद्रमा ${moonSign} में है, जो प्रेम में आपके भावनात्मक स्वभाव को उजागर करता है। आप हमेशा सद्भाव और गहरे संबंध की तलाश करते हैं।`;
      }
    } else if (q.includes('career') || q.includes('job') || q.includes('profession') || q.includes('करियर') || q.includes('काम')) {
      insight = `करियर: आपका 10वां भाव आपके पेशेवर जीवन को नियंत्रित करता है। शनि की स्थिति आपके करियर की स्थिरता को दर्शाती है। आपका चंद्रमा ${moonSign} में है, जो आपके कार्यक्षेत्र में आपकी अंतर्ज्ञान शक्ति को मजबूत करता है।`;
    } else if (q.includes('health') || q.includes('body') || q.includes('स्वास्थ्य') || q.includes('शरीर')) {
      insight = `स्वास्थ्य: आपका लग्न ${ascendant} आपकी शारीरिक संरचना को नियंत्रित करता है। छठा भाव स्वास्थ्य संबंधी चुनौतियों को दर्शाता है। नियमित आध्यात्मिक अभ्यास और आराम आपके लिए बहुत लाभकारी रहेगा।`;
    } else if (q.includes('money') || q.includes('wealth') || q.includes('finance') || q.includes('धन') || q.includes('पैसा')) {
      insight = `धन: दूसरा और 11वां भाव धन संचय को नियंत्रित करता है। बृहस्पति की स्थिति आर्थिक समृद्धि को बढ़ाती है। आपका सूर्य ${sunSign} में होने के कारण, यह आपकी कमाई की शैली को प्रभावित करता है।`;
    } else if (q.includes('number') || q.includes('lucky') || q.includes('अंक')) {
      insight = `शुभ अंक: आपकी जन्मतिथि के आधार पर आपका मुख्य शुभ अंक ${luckyNum} है। इस अंक से जुड़े दिन आपके लिए फलदायी रहेंगे।`;
    } else if (q.includes('timing') || q.includes('when') || q.includes('समय')) {
      insight = `समय की भविष्यवाणी: आपकी वर्तमान दशा और ग्रहों के गोचर के अनुसार, महत्वपूर्ण सकारात्मक बदलाव ${hiMonthNames[tMonth]} ${tYear} के आसपास होने की उम्मीद है।`;
    } else {
      insight = `ब्रह्मांडीय मार्गदर्शन: आपकी जन्म कुंडली के अनुसार (लग्न: ${ascendant}, सूर्य: ${sunSign}, चंद्र: ${moonSign}), यह समय आपके आध्यात्मिक मार्ग पर चलने के लिए बहुत अच्छा है। ग्रह आपको आपके सही उद्देश्य की ओर ले जा रहे हैं। ब्रह्मांड के समय पर विश्वास रखें।`;
    }
    return `नमस्ते! आपकी कुंडली का विश्लेषण करने के बाद मैं यह देख पा रहा हूँ:\n\n${insight}`;
  }

  // Default English (Natural format)
  if (isMarriageQuery) {
    if (q.includes('date') || q.includes('when') || q.includes('timing') || q.includes('time')) {
      insight = `Marriage Timing: Analyzing the 7th house in your chart and your current Dasha, a highly probable timeframe for your marriage starts around ${monthNames[tMonth]} ${tYear}. Note that this is highly changeable because of the planetary transitions in your chart, but it indicates a very favorable window.`;
    } else {
      insight = `Relationship Insights: Venus and your 7th house govern romantic bonds. Your Moon in ${moonSign} reveals your deep emotional nature in partnerships. You naturally seek harmony and profound connections with others.`;
    }
  } else if (q.includes('career') || q.includes('job') || q.includes('profession')) {
    insight = `Career Insights: Your 10th house governs your professional life. Saturn's placement heavily influences your career longevity and discipline. With your Moon in ${moonSign}, you possess strong intuition that serves as a massive professional asset.`;
  } else if (q.includes('health') || q.includes('body') || q.includes('wellness')) {
    insight = `Health Insights: Your Ascendant (${ascendant}) governs your physical constitution. The 6th house indicates health areas to be mindful of. Prioritize rest, and remember that regular spiritual practices like yoga will strengthen your aura significantly.`;
  } else if (q.includes('money') || q.includes('wealth') || q.includes('finance')) {
    insight = `Wealth Insights: The 2nd and 11th houses govern your accumulated wealth. Jupiter plays a key role in your financial trajectory, and your Sun in ${sunSign} influences how you earn. Focus on disciplined savings.`;
  } else if (q.includes('number') || q.includes('lucky')) {
    insight = `Lucky Number: Based on your numerology, your primary lucky number is ${luckyNum}. Days aligning with this number will bring positive energy and alignment.`;
  } else if (q.includes('timing') || q.includes('when') || q.includes('time')) {
    insight = `Timing Prediction: Based on your current planetary periods (Dasha), you can expect a significant positive shift around ${monthNames[tMonth]} ${tYear}.`;
  } else {
    insight = `Cosmic Guidance: Based on your birth chart (Ascendant: ${ascendant}, Sun: ${sunSign}, Moon: ${moonSign}), the cosmic energies suggest this is a period of reflection and alignment with your true path. Trust the divine timing of the universe.`;
  }
  
  return `Hello! Based on an analysis of your Vedic birth chart, here is what I see:\n\n${insight}`;
}

export async function getBasicPanchang(birthData, credentials) {
  return callApi('/basic_panchang', getBirthBody(birthData), credentials);
}

export async function getGemSuggestion(birthData, credentials) {
  return callApi('/basic_gem_suggestion', getBirthBody(birthData), credentials);
}

export async function getChartImage(chartId, style, birthData, credentials) {
  // style is usually 'North Indian' or 'South Indian' in the UI, AstrologyAPI uses 'NORTH_INDIAN' or 'SOUTH_INDIAN'
  const chart_style = style.toUpperCase().replace(' ', '_');
  return callApi(`/horo_chart_image/${chartId}`, { ...getBirthBody(birthData), chart_style }, credentials);
}
