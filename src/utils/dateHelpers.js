// Date helper utilities

export function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getTodayParts() {
  const now = new Date();
  return {
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    hour: now.getHours(),
    min: now.getMinutes(),
  };
}

// Reduce number to single digit (unless 11 or 22 - master numbers)
export function reduceToSingleDigit(n, keepMaster = false) {
  if (keepMaster && (n === 11 || n === 22)) return n;
  while (n > 9) {
    n = String(n)
      .split('')
      .reduce((sum, d) => sum + parseInt(d), 0);
    if (keepMaster && (n === 11 || n === 22)) return n;
  }
  return n;
}

// Letter to numerology value (A=1..Z=26 → reduced 1-9)
export function letterValue(ch) {
  const code = ch.toUpperCase().charCodeAt(0) - 64;
  if (code < 1 || code > 26) return 0;
  return reduceToSingleDigit(code);
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

export function calcLifePath(day, month, year) {
  const digits = `${day}${month}${year}`.split('').map(Number);
  return reduceToSingleDigit(digits.reduce((a, b) => a + b, 0));
}

export function calcExpression(name) {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, '');
  const sum = letters.split('').reduce((a, c) => a + letterValue(c), 0);
  return reduceToSingleDigit(sum);
}

export function calcSoulUrge(name) {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, '');
  const sum = letters.split('').filter(c => VOWELS.has(c)).reduce((a, c) => a + letterValue(c), 0);
  return reduceToSingleDigit(sum || 1);
}

export function calcPersonality(name) {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, '');
  const sum = letters.split('').filter(c => !VOWELS.has(c)).reduce((a, c) => a + letterValue(c), 0);
  return reduceToSingleDigit(sum || 1);
}

export function calcBirthday(day) {
  return reduceToSingleDigit(day);
}

export function calcPersonalYear(day, month) {
  const currentYear = new Date().getFullYear();
  const digits = `${day}${month}${currentYear}`.split('').map(Number);
  return reduceToSingleDigit(digits.reduce((a, b) => a + b, 0));
}

export const NUMEROLOGY_INFO = {
  1: {
    name: 'The Leader',
    meaning: 'You are a born leader with strong individuality and pioneering spirit. The number 1 represents the Sun energy — creative, ambitious, and self-reliant. You forge your own path and inspire others with your confidence and originality.',
    planet: 'Sun ☀️',
    luckyColor: 'Gold, Orange',
    luckyDay: 'Sunday',
  },
  2: {
    name: 'The Diplomat',
    meaning: 'You are sensitive, cooperative, and deeply intuitive. The number 2 represents the Moon — emotional intelligence, partnerships, and harmony. You excel in relationships and bring balance wherever you go.',
    planet: 'Moon 🌙',
    luckyColor: 'White, Silver',
    luckyDay: 'Monday',
  },
  3: {
    name: 'The Communicator',
    meaning: 'Creative, expressive, and joyful, you radiate positive energy. The number 3 is ruled by Jupiter — expansion, wisdom, and optimism. You thrive through self-expression in arts, communication, and teaching.',
    planet: 'Jupiter ♃',
    luckyColor: 'Yellow, Purple',
    luckyDay: 'Thursday',
  },
  4: {
    name: 'The Builder',
    meaning: 'Disciplined, practical, and hardworking, you build solid foundations. The number 4 is governed by Rahu — transformation and unconventional paths. You bring order to chaos through methodical effort.',
    planet: 'Rahu ☊',
    luckyColor: 'Blue, Green',
    luckyDay: 'Saturday',
  },
  5: {
    name: 'The Freedom Seeker',
    meaning: 'Adventurous, versatile, and magnetic, you embrace change. The number 5 is ruled by Mercury — intellect, communication, and adaptability. You thrive on variety and can succeed in multiple fields.',
    planet: 'Mercury ☿',
    luckyColor: 'Green, Grey',
    luckyDay: 'Wednesday',
  },
  6: {
    name: 'The Nurturer',
    meaning: 'Loving, responsible, and harmonious, you are the caretaker of others. The number 6 is governed by Venus — beauty, love, and family. You find fulfillment in service and creating beautiful environments.',
    planet: 'Venus ♀',
    luckyColor: 'Pink, White',
    luckyDay: 'Friday',
  },
  7: {
    name: 'The Seeker',
    meaning: 'Analytical, spiritual, and introspective, you seek deeper truths. The number 7 is ruled by Ketu — spiritual liberation and mysticism. You are drawn to philosophy, meditation, and the hidden realms of existence.',
    planet: 'Ketu ☋',
    luckyColor: 'Purple, Violet',
    luckyDay: 'Monday',
  },
  8: {
    name: 'The Powerhouse',
    meaning: 'Ambitious, authoritative, and materially focused, you achieve great success. The number 8 is governed by Saturn — karma, discipline, and reward. You understand that success comes through persistent effort and responsibility.',
    planet: 'Saturn ♄',
    luckyColor: 'Black, Dark Blue',
    luckyDay: 'Saturday',
  },
  9: {
    name: 'The Humanitarian',
    meaning: 'Compassionate, idealistic, and universally minded, you serve humanity. The number 9 is ruled by Mars — courage, passion, and humanitarian service. You complete cycles and help others transcend limitations.',
    planet: 'Mars ♂️',
    luckyColor: 'Red, Crimson',
    luckyDay: 'Tuesday',
  },
};
