import { Recipe, DayPlan, NutritionPlanData } from '@/types/recipe';

// Day 1 Recipes
const berryChiaYogurt: Recipe = {
  recipeId: 'berry-chia-yogurt-bowl',
  title: 'Berry Chia Yogurt Bowl',
  imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=1200&h=900&fit=crop',
  calories: 300,
  macros: { protein: 22, carbs: 35, fat: 8, fiber: 7, sugar: 12 },
  prep: { timeMin: 10, difficulty: 'Easy', servings: 1 },
  tags: ['high-protein', 'gluten-free', 'vegetarian'],
  allergens: ['dairy'],
  ingredients: [
    { qty: '170 g', item: 'Greek yogurt, 2%' },
    { qty: '60 g', item: 'Mixed berries' },
    { qty: '1 tbsp', item: 'Chia seeds' },
    { qty: '1 tsp', item: 'Honey', optional: true }
  ],
  steps: [
    'Stir chia seeds into Greek yogurt and let rest for 5 minutes.',
    'Top with fresh mixed berries and drizzle honey if desired.'
  ],
  swaps: [
    { label: 'Make it vegan', replace: { 'Greek yogurt': 'coconut yogurt' } },
    { label: 'No added sugar', remove: ['Honey'] }
  ],
  slot: 'breakfast'
};

const cottageCheeseBowl: Recipe = {
  recipeId: 'cottage-cheese-cinnamon-bowl',
  title: 'Cottage Cheese & Cinnamon Almond Bowl',
  imageUrl: 'https://images.unsplash.com/photo-1571490008099-fb5def3b451b?w=1200&h=900&fit=crop',
  calories: 280,
  macros: { protein: 23, carbs: 15, fat: 12, fiber: 3, sugar: 8 },
  prep: { timeMin: 5, difficulty: 'Easy', servings: 1 },
  tags: ['high-protein', 'gluten-free', 'vegetarian'],
  allergens: ['dairy', 'nuts'],
  ingredients: [
    { qty: '170 g', item: 'Cottage cheese' },
    { qty: '10', item: 'Almonds, chopped' },
    { qty: '1 tsp', item: 'Cinnamon' },
    { qty: '1 tsp', item: 'Honey', optional: true }
  ],
  steps: [
    'Mix cottage cheese with cinnamon.',
    'Top with chopped almonds and drizzle honey if desired.'
  ],
  swaps: [
    { label: 'Nut-free', replace: { 'Almonds': 'pumpkin seeds' } }
  ],
  slot: 'snack1'
};

const grilledChickenSalad: Recipe = {
  recipeId: 'grilled-chicken-mediterranean-salad',
  title: 'Grilled Chicken Mediterranean Salad',
  imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=900&fit=crop',
  calories: 450,
  macros: { protein: 38, carbs: 25, fat: 22, fiber: 8, sugar: 6 },
  prep: { timeMin: 20, difficulty: 'Medium', servings: 1 },
  tags: ['high-protein', 'gluten-free', 'dairy-free'],
  allergens: [],
  ingredients: [
    { qty: '150 g', item: 'Chicken breast' },
    { qty: '2 cups', item: 'Mixed greens' },
    { qty: '50 g', item: 'Cherry tomatoes, halved' },
    { qty: '30 g', item: 'Cucumber, diced' },
    { qty: '20 g', item: 'Feta cheese' },
    { qty: '10', item: 'Kalamata olives' },
    { qty: '1 tbsp', item: 'Olive oil' },
    { qty: '1 tbsp', item: 'Lemon juice' }
  ],
  steps: [
    'Season chicken breast with salt, pepper, and herbs.',
    'Grill chicken for 6-7 minutes per side until cooked through.',
    'Let chicken rest for 5 minutes, then slice.',
    'Arrange greens on a plate and top with tomatoes, cucumber, feta, and olives.',
    'Add sliced chicken on top.',
    'Drizzle with olive oil and lemon juice.'
  ],
  swaps: [
    { label: 'Vegan option', replace: { 'Chicken breast': 'grilled tofu', 'Feta cheese': 'vegan feta' } },
    { label: 'Dairy-free', remove: ['Feta cheese'] }
  ],
  slot: 'lunch'
};

const proteinSmoothie: Recipe = {
  recipeId: 'blackberry-protein-smoothie',
  title: 'Blackberry Protein Smoothie',
  imageUrl: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=1200&h=900&fit=crop',
  calories: 210,
  macros: { protein: 20, carbs: 25, fat: 4, fiber: 6, sugar: 15 },
  prep: { timeMin: 5, difficulty: 'Easy', servings: 1 },
  tags: ['high-protein', 'gluten-free'],
  allergens: ['dairy'],
  ingredients: [
    { qty: '1 scoop', item: 'Vanilla protein powder' },
    { qty: '1 cup', item: 'Blackberries' },
    { qty: '½', item: 'Banana' },
    { qty: '200 ml', item: 'Milk of choice' },
    { qty: '½ cup', item: 'Ice cubes' }
  ],
  steps: [
    'Add all ingredients to a blender.',
    'Blend on high until smooth and creamy.',
    'Pour into a glass and enjoy immediately.'
  ],
  swaps: [
    { label: 'Make it vegan', replace: { 'Milk of choice': 'almond milk', 'Vanilla protein powder': 'vegan protein powder' } }
  ],
  slot: 'snack2'
};

const salmonVeggies: Recipe = {
  recipeId: 'baked-salmon-roasted-veggies',
  title: 'Baked Salmon with Roasted Vegetables',
  imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1200&h=900&fit=crop',
  calories: 520,
  macros: { protein: 42, carbs: 30, fat: 26, fiber: 8, sugar: 10 },
  prep: { timeMin: 30, difficulty: 'Medium', servings: 1 },
  tags: ['high-protein', 'gluten-free', 'dairy-free', 'omega-3'],
  allergens: ['fish'],
  ingredients: [
    { qty: '180 g', item: 'Salmon fillet' },
    { qty: '1 cup', item: 'Broccoli florets' },
    { qty: '1 cup', item: 'Bell peppers, sliced' },
    { qty: '100 g', item: 'Sweet potato, cubed' },
    { qty: '2 tsp', item: 'Olive oil' },
    { qty: '1 tsp', item: 'Garlic powder' },
    { qty: 'pinch', item: 'Salt and pepper' },
    { qty: '1', item: 'Lemon wedge' }
  ],
  steps: [
    'Preheat oven to 200°C (400°F).',
    'Toss vegetables with 1 tsp olive oil, salt, and pepper.',
    'Spread vegetables on a baking sheet and roast for 15 minutes.',
    'Season salmon with remaining olive oil, garlic powder, salt, and pepper.',
    'Add salmon to the baking sheet with vegetables.',
    'Bake for an additional 12-15 minutes until salmon is cooked through.',
    'Serve with a lemon wedge.'
  ],
  swaps: [
    { label: 'White fish option', replace: { 'Salmon fillet': 'cod or halibut' } }
  ],
  slot: 'dinner'
};

// Day 2 Recipes
const avocadoSweetPotatoHash: Recipe = {
  recipeId: 'avocado-sweet-potato-hash',
  title: 'Avocado Sweet Potato Hash with Eggs',
  imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=1200&h=900&fit=crop',
  calories: 420,
  macros: { protein: 20, carbs: 45, fat: 18, fiber: 9, sugar: 8 },
  prep: { timeMin: 20, difficulty: 'Medium', servings: 1 },
  tags: ['high-protein', 'gluten-free', 'whole-foods'],
  allergens: ['eggs'],
  ingredients: [
    { qty: '1 small', item: 'Sweet potato, diced' },
    { qty: '1 tsp', item: 'Olive oil' },
    { qty: '2', item: 'Eggs' },
    { qty: '½', item: 'Avocado, sliced' },
    { qty: 'pinch', item: 'Salt and pepper' },
    { qty: 'pinch', item: 'Chili flakes', optional: true }
  ],
  steps: [
    'Heat olive oil in a pan over medium heat.',
    'Add diced sweet potato and cook until tender, about 12-15 minutes.',
    'Push sweet potato to the side and crack eggs into the pan.',
    'Cook eggs to desired doneness.',
    'Plate sweet potato and eggs, top with avocado slices.',
    'Season with salt, pepper, and chili flakes.'
  ],
  swaps: [
    { label: 'Lower carb', replace: { 'Sweet potato': 'cauliflower rice' } },
    { label: 'Vegan option', replace: { 'Eggs': 'scrambled tofu' } }
  ],
  slot: 'breakfast'
};

const appleAlmondButter: Recipe = {
  recipeId: 'apple-almond-butter-snack',
  title: 'Apple Slices with Almond Butter',
  imageUrl: 'https://images.unsplash.com/photo-1568471173238-64ed8e8aae6d?w=1200&h=900&fit=crop',
  calories: 220,
  macros: { protein: 8, carbs: 28, fat: 10, fiber: 6, sugar: 18 },
  prep: { timeMin: 3, difficulty: 'Easy', servings: 1 },
  tags: ['gluten-free', 'vegan', 'whole-foods'],
  allergens: ['nuts'],
  ingredients: [
    { qty: '1 medium', item: 'Apple, sliced' },
    { qty: '2 tbsp', item: 'Almond butter' },
    { qty: '1 tsp', item: 'Cinnamon', optional: true }
  ],
  steps: [
    'Slice apple into wedges.',
    'Spread almond butter on apple slices or use as a dip.',
    'Sprinkle with cinnamon if desired.'
  ],
  swaps: [
    { label: 'Nut-free', replace: { 'Almond butter': 'sunflower seed butter' } }
  ],
  slot: 'snack1'
};

const turkeyWrap: Recipe = {
  recipeId: 'turkey-avocado-wrap',
  title: 'Turkey & Avocado Whole Wheat Wrap',
  imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=1200&h=900&fit=crop',
  calories: 380,
  macros: { protein: 32, carbs: 35, fat: 14, fiber: 8, sugar: 4 },
  prep: { timeMin: 10, difficulty: 'Easy', servings: 1 },
  tags: ['high-protein', 'dairy-free'],
  allergens: ['gluten'],
  ingredients: [
    { qty: '1 large', item: 'Whole wheat tortilla' },
    { qty: '100 g', item: 'Turkey breast, sliced' },
    { qty: '¼', item: 'Avocado, mashed' },
    { qty: '2', item: 'Lettuce leaves' },
    { qty: '2 slices', item: 'Tomato' },
    { qty: '1 tbsp', item: 'Mustard or hummus' }
  ],
  steps: [
    'Lay tortilla flat and spread mashed avocado.',
    'Add turkey slices, lettuce, and tomato.',
    'Drizzle with mustard or spread hummus.',
    'Roll tightly and slice in half.'
  ],
  swaps: [
    { label: 'Gluten-free', replace: { 'Whole wheat tortilla': 'gluten-free wrap' } },
    { label: 'Vegetarian', replace: { 'Turkey breast': 'hummus and chickpeas' } }
  ],
  slot: 'lunch'
};

const greekYogurtBerries: Recipe = {
  recipeId: 'greek-yogurt-berries',
  title: 'Greek Yogurt with Mixed Berries',
  imageUrl: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1200&h=900&fit=crop',
  calories: 180,
  macros: { protein: 18, carbs: 22, fat: 3, fiber: 4, sugar: 14 },
  prep: { timeMin: 3, difficulty: 'Easy', servings: 1 },
  tags: ['high-protein', 'gluten-free', 'vegetarian'],
  allergens: ['dairy'],
  ingredients: [
    { qty: '170 g', item: 'Greek yogurt, plain' },
    { qty: '80 g', item: 'Mixed berries' },
    { qty: '1 tsp', item: 'Honey', optional: true }
  ],
  steps: [
    'Spoon Greek yogurt into a bowl.',
    'Top with fresh mixed berries.',
    'Drizzle with honey if desired.'
  ],
  swaps: [
    { label: 'Vegan', replace: { 'Greek yogurt': 'coconut yogurt' } }
  ],
  slot: 'snack2'
};

const chickenStirFry: Recipe = {
  recipeId: 'chicken-veggie-stir-fry',
  title: 'Chicken & Veggie Stir-Fry',
  imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=1200&h=900&fit=crop',
  calories: 460,
  macros: { protein: 40, carbs: 38, fat: 16, fiber: 6, sugar: 8 },
  prep: { timeMin: 25, difficulty: 'Medium', servings: 1 },
  tags: ['high-protein', 'dairy-free'],
  allergens: ['soy'],
  ingredients: [
    { qty: '150 g', item: 'Chicken breast, sliced' },
    { qty: '1 cup', item: 'Broccoli florets' },
    { qty: '½ cup', item: 'Bell peppers, sliced' },
    { qty: '½ cup', item: 'Snap peas' },
    { qty: '100 g', item: 'Brown rice, cooked' },
    { qty: '1 tbsp', item: 'Soy sauce or tamari' },
    { qty: '1 tsp', item: 'Sesame oil' },
    { qty: '1 tsp', item: 'Garlic, minced' },
    { qty: '1 tsp', item: 'Ginger, minced' }
  ],
  steps: [
    'Heat sesame oil in a wok or large pan over high heat.',
    'Add chicken and cook until golden, about 5-6 minutes.',
    'Add garlic and ginger, stir for 30 seconds.',
    'Add all vegetables and stir-fry for 5-7 minutes.',
    'Add soy sauce and toss to coat.',
    'Serve over cooked brown rice.'
  ],
  swaps: [
    { label: 'Vegetarian', replace: { 'Chicken breast': 'tofu' } },
    { label: 'Gluten-free', replace: { 'Soy sauce': 'tamari or coconut aminos' } }
  ],
  slot: 'dinner'
};

// Day 3 Recipes
const greekYogurtParfait: Recipe = {
  recipeId: 'greek-yogurt-granola-parfait',
  title: 'Greek Yogurt Parfait with Granola & Banana',
  imageUrl: 'https://images.unsplash.com/photo-1511376777868-611b54f68947?w=1200&h=900&fit=crop',
  calories: 360,
  macros: { protein: 20, carbs: 55, fat: 8, fiber: 5, sugar: 25 },
  prep: { timeMin: 5, difficulty: 'Easy', servings: 1 },
  tags: ['high-protein', 'vegetarian'],
  allergens: ['dairy', 'gluten'],
  ingredients: [
    { qty: '170 g', item: 'Greek yogurt' },
    { qty: '½', item: 'Banana, sliced' },
    { qty: '30 g', item: 'Granola' },
    { qty: '30 g', item: 'Mixed berries' }
  ],
  steps: [
    'Layer Greek yogurt in a glass or bowl.',
    'Add a layer of granola.',
    'Top with banana slices and berries.',
    'Repeat layers if desired.'
  ],
  swaps: [
    { label: 'Gluten-free', replace: { 'Granola': 'gluten-free granola' } },
    { label: 'Vegan', replace: { 'Greek yogurt': 'coconut yogurt' } }
  ],
  slot: 'breakfast'
};

const hummusVeggies: Recipe = {
  recipeId: 'hummus-veggie-sticks',
  title: 'Hummus with Veggie Sticks',
  imageUrl: 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=1200&h=900&fit=crop',
  calories: 200,
  macros: { protein: 8, carbs: 24, fat: 9, fiber: 7, sugar: 6 },
  prep: { timeMin: 5, difficulty: 'Easy', servings: 1 },
  tags: ['vegan', 'gluten-free', 'high-fiber'],
  allergens: [],
  ingredients: [
    { qty: '60 g', item: 'Hummus' },
    { qty: '1', item: 'Carrot, cut into sticks' },
    { qty: '½', item: 'Cucumber, cut into sticks' },
    { qty: '½', item: 'Bell pepper, sliced' }
  ],
  steps: [
    'Arrange veggie sticks on a plate.',
    'Serve with hummus for dipping.'
  ],
  swaps: [
    { label: 'Add protein', replace: { 'Hummus': 'hummus + hard-boiled egg' } }
  ],
  slot: 'snack1'
};

const quinoaBowl: Recipe = {
  recipeId: 'quinoa-black-bean-bowl',
  title: 'Quinoa & Black Bean Power Bowl',
  imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&h=900&fit=crop',
  calories: 440,
  macros: { protein: 18, carbs: 65, fat: 14, fiber: 14, sugar: 6 },
  prep: { timeMin: 20, difficulty: 'Easy', servings: 1 },
  tags: ['vegan', 'gluten-free', 'high-fiber', 'plant-based'],
  allergens: [],
  ingredients: [
    { qty: '100 g', item: 'Quinoa, cooked' },
    { qty: '80 g', item: 'Black beans, cooked' },
    { qty: '½', item: 'Avocado, sliced' },
    { qty: '50 g', item: 'Corn kernels' },
    { qty: '50 g', item: 'Cherry tomatoes, halved' },
    { qty: '1 tbsp', item: 'Lime juice' },
    { qty: '1 tsp', item: 'Olive oil' },
    { qty: 'pinch', item: 'Cumin and paprika' }
  ],
  steps: [
    'In a bowl, combine cooked quinoa and black beans.',
    'Top with avocado, corn, and cherry tomatoes.',
    'Drizzle with lime juice and olive oil.',
    'Season with cumin and paprika.'
  ],
  swaps: [
    { label: 'Add protein', replace: { 'Black beans': 'grilled chicken' } }
  ],
  slot: 'lunch'
};

export const mockNutritionPlan: NutritionPlanData = {
  planName: 'Balanced Mediterranean Plan',
  duration: '7 days',
  isGenerated: true,
  caloriesTarget: 2000,
  proteinTarget: 150,
  dietaryRestrictions: [],
  days: [
    {
      day: 1,
      meals: [
        berryChiaYogurt,
        cottageCheeseBowl,
        grilledChickenSalad,
        proteinSmoothie,
        salmonVeggies
      ]
    },
    {
      day: 2,
      meals: [
        avocadoSweetPotatoHash,
        appleAlmondButter,
        turkeyWrap,
        greekYogurtBerries,
        chickenStirFry
      ]
    },
    {
      day: 3,
      meals: [
        greekYogurtParfait,
        hummusVeggies,
        quinoaBowl,
        proteinSmoothie,
        salmonVeggies
      ]
    }
  ]
};
