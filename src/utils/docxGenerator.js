import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { getAuthenticGemstones } from './gemstoneHelper';
import { extractLagna, extractDasha, safeStr } from './apiHelpers';

export async function generateDocxReport(birthData, data, t) {
  const lagna = extractLagna(data.ascendant);
  const dasha = extractDasha(data.dasha);
  const gems = data.gems || getAuthenticGemstones(lagna);
  const planets = Array.isArray(data.planets) ? data.planets : [];

  const sunSign = safeStr(planets.find(p => ['Sun', 'সূর্য', 'सूर्य'].includes(p.name || p.planet_name))?.sign) || '—';
  const moonSign = safeStr(planets.find(p => ['Moon', 'চন্দ্র', 'चंद्र'].includes(p.name || p.planet_name))?.sign) || '—';

  const formatPrediction = (key) => {
    const template = t(key);
    if (!template) return '';
    return template
      .replace(/{lagna}/g, lagna)
      .replace(/{sunSign}/g, sunSign)
      .replace(/{moonSign}/g, moonSign)
      .replace(/{mahaDasha}/g, dasha?.maha || '—');
  };

  const sections = [];

  // Title
  sections.push(
    new Paragraph({
      text: `${birthData.name}'s Vedic Astrology Report`,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Birth Details
  sections.push(
    new Paragraph({ text: 'Birth Details', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
    new Paragraph({ text: `Name: ${birthData.name}` }),
    new Paragraph({ text: `Date: ${birthData.day}/${birthData.month}/${birthData.year}` }),
    new Paragraph({ text: `Time: ${String(birthData.hour).padStart(2, '0')}:${String(birthData.min).padStart(2, '0')}` }),
    new Paragraph({ text: `City: ${birthData.city || '—'}` }),
    new Paragraph({ text: `Timezone: UTC+${birthData.tzone}` })
  );

  // Core Signs
  sections.push(
    new Paragraph({ text: 'Core Signs', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 100 } }),
    new Paragraph({ text: `Rising Sign (Lagna): ${lagna}` }),
    new Paragraph({ text: `Sun Sign: ${sunSign}` }),
    new Paragraph({ text: `Moon Sign: ${moonSign}` }),
    new Paragraph({ text: `Current Dasha: ${dasha.maha} (Maha) -> ${dasha.antar} (Antar)` })
  );

  // Predictions
  sections.push(
    new Paragraph({ text: 'Predictions', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 100 } }),
    new Paragraph({ text: `Career: ${formatPrediction('career_prediction')}`, spacing: { after: 100 } }),
    new Paragraph({ text: `Love: ${formatPrediction('love_prediction')}`, spacing: { after: 100 } }),
    new Paragraph({ text: `Health: ${formatPrediction('health_prediction')}`, spacing: { after: 100 } }),
    new Paragraph({ text: `Finance: ${formatPrediction('finance_prediction')}`, spacing: { after: 100 } })
  );

  // Gemstones
  if (gems && gems.LIFE) {
    sections.push(
      new Paragraph({ text: 'Recommended Gemstones', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 100 } }),
      new Paragraph({ text: `Life Stone: ${gems.LIFE.name} (${gems.LIFE.weight})` }),
      new Paragraph({ text: `Benefic Stone: ${gems.BENEFIC.name} (${gems.BENEFIC.weight})` }),
      new Paragraph({ text: `Lucky Stone: ${gems.LUCKY.name} (${gems.LUCKY.weight})` })
    );
  }

  const doc = new Document({
    creator: 'VedAstro App',
    title: `${birthData.name}'s Horoscope Report`,
    sections: [{
      properties: {},
      children: sections,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${birthData.name.replace(/\s+/g, '_')}_Horoscope_Report.docx`);
}
