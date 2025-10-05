export const SUPPLEMENT_CATEGORIES = {
  vitamins: [
    'Vitamin A',
    'Vitamin B-Complex',
    'Vitamin B1 (Thiamine)',
    'Vitamin B2 (Riboflavin)',
    'Vitamin B3 (Niacin)',
    'Vitamin B5 (Pantothenic Acid)',
    'Vitamin B6 (Pyridoxine)',
    'Vitamin B9 (Folate)',
    'Vitamin B12 (Cobalamin)',
    'Vitamin C',
    'Vitamin D',
    'Vitamin E',
    'Vitamin K',
  ],
  minerals: [
    'Calcium',
    'Magnesium',
    'Zinc',
    'Iron',
    'Selenium',
    'Potassium',
    'Chromium',
    'Copper',
    'Manganese',
    'Molybdenum',
    'Iodine',
    'Phosphorus',
  ],
  aminoAcids: [
    'L-Carnitine',
    'L-Glutamine',
    'L-Arginine',
    'L-Lysine',
    'Taurine',
    'Creatine',
    'BCAA',
    'Beta-Alanine',
    'NAC (N-Acetyl Cysteine)',
  ],
  fattyAcids: [
    'Omega-3',
    'Omega-6',
    'CLA (Conjugated Linoleic Acid)',
    'MCT Oil',
  ],
  adaptogens: [
    'Ashwagandha',
    'Rhodiola',
    'Ginseng',
    'Cordyceps',
    'Reishi',
    "Lion's Mane",
    'Holy Basil',
  ],
  probiotics: [
    'Multi-Strain Probiotic',
    'Targeted Probiotic',
    'Prebiotic',
  ],
  antioxidants: [
    'CoQ10',
    'Alpha-Lipoic Acid',
    'Resveratrol',
    'Glutathione',
    'Astaxanthin',
  ],
  other: [
    'Collagen',
    'Fiber',
    'Digestive Enzymes',
    'Protein Powder',
    'Electrolytes',
    'Nootropics',
    'Sleep Support',
    'Joint Support',
  ],
};

export const getAllCategories = () => {
  return Object.values(SUPPLEMENT_CATEGORIES).flat().sort();
};

export const getCategoryGroups = () => {
  return [
    { label: 'Vitamins', items: SUPPLEMENT_CATEGORIES.vitamins },
    { label: 'Minerals', items: SUPPLEMENT_CATEGORIES.minerals },
    { label: 'Amino Acids', items: SUPPLEMENT_CATEGORIES.aminoAcids },
    { label: 'Fatty Acids', items: SUPPLEMENT_CATEGORIES.fattyAcids },
    { label: 'Adaptogens', items: SUPPLEMENT_CATEGORIES.adaptogens },
    { label: 'Probiotics', items: SUPPLEMENT_CATEGORIES.probiotics },
    { label: 'Antioxidants', items: SUPPLEMENT_CATEGORIES.antioxidants },
    { label: 'Other', items: SUPPLEMENT_CATEGORIES.other },
  ];
};
