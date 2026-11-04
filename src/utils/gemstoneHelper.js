const ZODIAC_INDEX = {
  Aries: 1, Taurus: 2, Gemini: 3, Cancer: 4, Leo: 5, Virgo: 6,
  Libra: 7, Scorpio: 8, Sagittarius: 9, Capricorn: 10, Aquarius: 11, Pisces: 12
};

const LORDS = {
  1: 'Mars', 2: 'Venus', 3: 'Mercury', 4: 'Moon', 5: 'Sun', 6: 'Mercury',
  7: 'Venus', 8: 'Mars', 9: 'Jupiter', 10: 'Saturn', 11: 'Saturn', 12: 'Jupiter'
};

const GEMS = {
  Sun: {
    name: 'Ruby (Manik)',
    gem_deity: 'Surya',
    weight: '3 to 5',
    wear_metal: 'Gold or Copper',
    wear_finger: 'Ring Finger',
    wear_day: 'Sunday Morning'
  },
  Moon: {
    name: 'Pearl (Moti)',
    gem_deity: 'Chandra',
    weight: '4 to 6',
    wear_metal: 'Silver',
    wear_finger: 'Little Finger',
    wear_day: 'Monday Morning'
  },
  Mars: {
    name: 'Red Coral (Moonga)',
    gem_deity: 'Mangal',
    weight: '5 to 7',
    wear_metal: 'Gold or Copper',
    wear_finger: 'Ring Finger',
    wear_day: 'Tuesday Morning'
  },
  Mercury: {
    name: 'Emerald (Panna)',
    gem_deity: 'Budh',
    weight: '4 to 6',
    wear_metal: 'Gold or Silver',
    wear_finger: 'Little Finger',
    wear_day: 'Wednesday Morning'
  },
  Jupiter: {
    name: 'Yellow Sapphire (Pukhraj)',
    gem_deity: 'Guru',
    weight: '4 to 6',
    wear_metal: 'Gold',
    wear_finger: 'Index Finger',
    wear_day: 'Thursday Morning'
  },
  Venus: {
    name: 'Diamond / White Sapphire',
    gem_deity: 'Shukra',
    weight: '0.5 to 2 (Diamond) or 5 to 7',
    wear_metal: 'Gold or Platinum',
    wear_finger: 'Middle or Ring Finger',
    wear_day: 'Friday Morning'
  },
  Saturn: {
    name: 'Blue Sapphire (Neelam)',
    gem_deity: 'Shani',
    weight: '4 to 6',
    wear_metal: 'Silver or Panchdhatu',
    wear_finger: 'Middle Finger',
    wear_day: 'Saturday Morning'
  }
};

export function getAuthenticGemstones(lagnaString) {
  if (!lagnaString || lagnaString === '—') return null;

  const lagnaMatch = Object.keys(ZODIAC_INDEX).find(z => lagnaString.toLowerCase().includes(z.toLowerCase()));
  if (!lagnaMatch) return null;

  const lagnaNum = ZODIAC_INDEX[lagnaMatch];

  // 1st House Lord (Life Stone)
  const lifeLord = LORDS[lagnaNum];
  // 5th House Lord (Benefic Stone)
  let beneficNum = lagnaNum + 4;
  if (beneficNum > 12) beneficNum -= 12;
  const beneficLord = LORDS[beneficNum];
  // 9th House Lord (Lucky Stone)
  let luckyNum = lagnaNum + 8;
  if (luckyNum > 12) luckyNum -= 12;
  const luckyLord = LORDS[luckyNum];

  return {
    LIFE: GEMS[lifeLord],
    BENEFIC: GEMS[beneficLord],
    LUCKY: GEMS[luckyLord]
  };
}

export function enhanceGemSuggestion(apiGems, userProfile = {}) {
  if (!apiGems) return null;
  const { budget = 'medium', healthConditions = [] } = userProfile;
  
  const enhanceSingle = (gem, type) => {
    if (!gem) return null;
    let priceRange = '₹2,000 - ₹5,000';
    let alternatives = [];
    let healthWarning = null;
    let score = 85;

    const name = gem.name || gem.gem_name || '';

    if (name.includes('Ruby') || name.includes('Manik')) {
       priceRange = budget === 'premium' ? '₹20,000+' : '₹5,000 - ₹15,000';
       alternatives = ['Red Garnet', 'Sunstone'];
       if (healthConditions.includes('heart')) healthWarning = 'Consult doctor before wearing Ruby if you have high blood pressure.';
       score = 92;
    } else if (name.includes('Pearl') || name.includes('Moti')) {
       priceRange = '₹1,000 - ₹4,000';
       alternatives = ['Moonstone'];
       if (healthConditions.includes('cold')) healthWarning = 'Avoid during severe cold/cough.';
       score = 88;
    } else if (name.includes('Coral') || name.includes('Moonga')) {
       priceRange = '₹2,000 - ₹6,000';
       alternatives = ['Carnelian'];
       score = 90;
    } else if (name.includes('Emerald') || name.includes('Panna')) {
       priceRange = budget === 'premium' ? '₹30,000+' : '₹8,000 - ₹20,000';
       alternatives = ['Green Tourmaline', 'Peridot'];
       score = 94;
    } else if (name.includes('Yellow Sapphire') || name.includes('Pukhraj')) {
       priceRange = budget === 'premium' ? '₹40,000+' : '₹10,000 - ₹25,000';
       alternatives = ['Citrine', 'Yellow Topaz'];
       score = 95;
    } else if (name.includes('Diamond') || name.includes('White Sapphire')) {
       priceRange = budget === 'premium' ? '₹50,000+' : '₹5,000 - ₹15,000';
       alternatives = ['Opal', 'Zircon'];
       score = 91;
    } else if (name.includes('Blue Sapphire') || name.includes('Neelam')) {
       priceRange = budget === 'premium' ? '₹50,000+' : '₹15,000 - ₹30,000';
       alternatives = ['Amethyst', 'Blue Topaz', 'Iolite'];
       if (healthConditions.includes('bone') || healthConditions.includes('kidney')) {
         healthWarning = 'Test for 3 days before wearing. May aggravate joint issues if unsuitable.';
       }
       score = 89;
    } else if (name.includes('Hessonite') || name.includes('Gomed')) {
       priceRange = '₹1,500 - ₹4,000';
       alternatives = ['Orange Zircon'];
       score = 82;
    } else if (name.includes('Cat') || name.includes('Lahsuniya')) {
       priceRange = '₹1,500 - ₹5,000';
       alternatives = ['Tiger Eye'];
       score = 84;
    }

    if (budget === 'affordable') {
      priceRange = '₹500 - ₹2,000';
    }

    return {
      ...gem,
      priceRange,
      alternatives,
      healthWarning,
      score: score + (type === 'LIFE' ? 4 : type === 'LUCKY' ? 2 : 0)
    };
  };

  return {
    LIFE: enhanceSingle(apiGems.LIFE, 'LIFE'),
    BENEFIC: enhanceSingle(apiGems.BENEFIC, 'BENEFIC'),
    LUCKY: enhanceSingle(apiGems.LUCKY, 'LUCKY'),
  };
}
