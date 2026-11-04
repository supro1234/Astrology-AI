/**
 * safeStr — safely converts any API response value to a renderable string.
 *
 * AstrologyAPI.com sometimes returns nested objects instead of plain strings:
 *   current_vdasha  → { planet: "Jupiter", planet_id: 5, start: "...", end: "..." }
 *   ascendant_report→ { ascendant: "Aries", ... }
 *   planets[]       → { name: "Sun", sign: "Aries", house: 1, ... }
 *
 * This util extracts the human-readable string from any of these shapes.
 */
export function safeStr(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string' && val.trim() !== '') return val.trim();
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    // Priority order for common field names
    const candidates = [
      val.planet,
      val.planet_name,
      val.name,
      val.sign,
      val.zodiac_sign,
      val.ascendant,
      val.lagna,
      val.rising_sign,
      val.dasha,
      val.maha_dasha,
      val.major,
      val.label,
      val.tithi_name,
      val.nak_name,
      val.yog_name,
      val.karan_name,
      val.day,
      val.result,
      val.value,
      val.title,
      val.text,
    ];
    for (const c of candidates) {
      if (c !== null && c !== undefined) {
        const s = safeStr(c); // recurse once
        if (s) return s;
      }
    }
    // Last resort: JSON dump trimmed
    try {
      const j = JSON.stringify(val);
      return j !== '{}' && j !== 'null' ? j : null;
    } catch {
      return null;
    }
  }
  return String(val);
}

/**
 * safeNum — safely extracts a number from any API value.
 */
export function safeNum(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  }
  if (typeof val === 'object') {
    return safeNum(val.score || val.value || val.number || null);
  }
  return null;
}

/**
 * extractPlanet — gets a clean { name, sign, house, isRetro, fullDegree } from any planet object.
 */
export function extractPlanet(p) {
  if (!p || typeof p !== 'object') return null;
  return {
    name: safeStr(p.name || p.planet_name || p.planet),
    sign: safeStr(p.sign || p.zodiac_sign || p.rasi),
    house: safeStr(p.house || p.house_number),
    degree: safeStr(p.full_degree || p.norm_degree),
    isRetro: p.isRetro === 'true' || p.is_retro === true || p.retrograde === true,
    speed: safeStr(p.speed),
  };
}

/**
 * extractDasha — gets { maha, antar, mahaEnd, antarEnd } from any dasha response shape.
 */
export function extractDasha(dashaVal) {
  if (!dashaVal) return { maha: '—', antar: '—', mahaEnd: '', antarEnd: '' };

  const m = dashaVal.maha_dasha || dashaVal.major || dashaVal.mahadasha || dashaVal.major_dasha;
  const a = dashaVal.antar_dasha || dashaVal.antardasha || dashaVal.sub_dasha || dashaVal.sub;

  if (m && typeof m === 'object') {
    return {
      maha: safeStr(m.planet || m.name || m.sign),
      antar: safeStr(a?.planet || a?.name || a?.sign) || '—',
      mahaEnd: safeStr(m.end || dashaVal.maha_dasha_end),
      antarEnd: safeStr(a?.end || dashaVal.antar_dasha_end) || '',
    };
  }

  if (m && typeof m === 'string') {
    return {
      maha: m,
      antar: safeStr(a) || '—',
      mahaEnd: safeStr(dashaVal.maha_dasha_end || dashaVal.major_end),
      antarEnd: safeStr(dashaVal.antar_dasha_end || dashaVal.sub_end) || '',
    };
  }

  if (Array.isArray(dashaVal) && dashaVal.length > 0) {
    return {
      maha: safeStr(dashaVal[0]?.planet || dashaVal[0]?.dasha || dashaVal[0]?.name),
      antar: safeStr(dashaVal[1]?.planet || dashaVal[1]?.dasha || dashaVal[1]?.name) || '—',
      mahaEnd: safeStr(dashaVal[0]?.end),
      antarEnd: safeStr(dashaVal[1]?.end) || '',
    };
  }

  if (dashaVal.planet) {
    return {
      maha: safeStr(dashaVal.planet || dashaVal.name),
      antar: '—',
      mahaEnd: safeStr(dashaVal.end),
      antarEnd: '',
    };
  }

  return { maha: '—', antar: '—', mahaEnd: '', antarEnd: '' };
}

/**
 * extractLagna — gets ascendant string from any ascendant_report response.
 */
export function extractLagna(val) {
  if (!val) return '—';
  return safeStr(
    val.ascendant || val.Ascendant || val.lagna ||
    val.rising_sign || val.report?.ascendant
  ) || '—';
}
