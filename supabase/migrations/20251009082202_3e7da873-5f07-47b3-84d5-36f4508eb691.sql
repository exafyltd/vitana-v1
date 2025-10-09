-- Create supplements table for product catalog
CREATE TABLE IF NOT EXISTS public.supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  dosage TEXT,
  serving_size TEXT,
  servings_per_container INTEGER,
  ingredients JSONB DEFAULT '[]'::jsonb,
  benefits TEXT[],
  image_url TEXT,
  rating NUMERIC DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  in_stock BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.supplements ENABLE ROW LEVEL SECURITY;

-- Anyone can view active supplements
CREATE POLICY "Anyone can view active supplements"
  ON public.supplements FOR SELECT
  USING (is_active = true);

-- Create indexes for performance
CREATE INDEX idx_supplements_category ON public.supplements(category);
CREATE INDEX idx_supplements_price ON public.supplements(price);
CREATE INDEX idx_supplements_rating ON public.supplements(rating DESC);

-- Insert sample supplement data
INSERT INTO public.supplements (name, brand, description, category, price, dosage, serving_size, servings_per_container, benefits, image_url, rating, review_count, in_stock) VALUES
('Athletic Greens AG1', 'Athletic Greens', 'Comprehensive daily nutrition powder with 75 vitamins, minerals, and whole-food sourced ingredients', 'Multivitamins', 99.00, '1 scoop daily', '12g', 30, ARRAY['Energy boost', 'Immune support', 'Gut health', 'Recovery'], '/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png', 4.8, 2453, true),
('Omega-3 Fish Oil', 'Nordic Naturals', 'High-potency EPA and DHA from wild-caught fish for heart and brain health', 'Omega-3', 45.00, '2 softgels daily', '2g', 60, ARRAY['Heart health', 'Brain function', 'Joint support', 'Anti-inflammatory'], '/lovable-uploads/emma-wilson-avatar.jpg', 4.7, 1876, true),
('Vitamin D3 + K2', 'Thorne Research', 'Synergistic vitamin D3 and K2 for bone health and calcium metabolism', 'Vitamins', 29.00, '1 capsule daily', '5000 IU D3 + 200mcg K2', 90, ARRAY['Bone strength', 'Immune function', 'Calcium absorption', 'Heart health'], '/lovable-uploads/dr-roberts-avatar.jpg', 4.9, 3245, true),
('Magnesium Glycinate', 'Pure Encapsulations', 'Highly absorbable magnesium for muscle relaxation and sleep support', 'Minerals', 24.00, '2 capsules before bed', '200mg', 120, ARRAY['Sleep quality', 'Muscle recovery', 'Stress relief', 'Relaxation'], '/lovable-uploads/james-davis-avatar.jpg', 4.6, 987, true),
('Ashwagandha KSM-66', 'Nootropics Depot', 'Premium adaptogen for stress resilience and cortisol management', 'Adaptogens', 32.00, '300mg twice daily', '600mg', 60, ARRAY['Stress reduction', 'Cortisol balance', 'Energy support', 'Mood enhancement'], '/lovable-uploads/mike-thompson-avatar.jpg', 4.8, 1543, true),
('Lions Mane Mushroom', 'Real Mushrooms', 'Organic extract for cognitive function and nerve growth factor support', 'Nootropics', 38.00, '2 capsules daily', '1000mg', 60, ARRAY['Cognitive function', 'Memory support', 'Focus enhancement', 'Neuroprotection'], '/lovable-uploads/murphy-avatar.jpg', 4.7, 876, true),
('NMN 500mg', 'ProHealth Longevity', 'NAD+ precursor for cellular energy and longevity support', 'Longevity', 79.00, '500mg daily', '500mg', 60, ARRAY['Cellular energy', 'Anti-aging', 'NAD+ boost', 'Metabolic health'], '/lovable-uploads/dr-roberts-avatar.jpg', 4.5, 654, true),
('Resveratrol Trans', 'Life Extension', 'High-purity trans-resveratrol for cardiovascular and longevity support', 'Longevity', 34.00, '250mg daily', '250mg', 60, ARRAY['Cardiovascular health', 'Longevity support', 'Antioxidant', 'Cellular protection'], '/lovable-uploads/emma-wilson-avatar.jpg', 4.6, 543, true),
('Melatonin 3mg', 'Natrol', 'Fast-dissolve melatonin for natural sleep support', 'Sleep', 12.00, '1 tablet 30 min before bed', '3mg', 90, ARRAY['Sleep onset', 'Sleep quality', 'Jet lag relief', 'Circadian rhythm'], '/lovable-uploads/james-davis-avatar.jpg', 4.4, 2134, true),
('L-Theanine 200mg', 'NOW Foods', 'Calming amino acid for focus without drowsiness', 'Nootropics', 18.00, '1-2 capsules daily', '200mg', 120, ARRAY['Calm focus', 'Stress relief', 'Relaxation', 'Sleep support'], '/lovable-uploads/mike-thompson-avatar.jpg', 4.7, 1234, true),
('Creatine Monohydrate', 'Optimum Nutrition', 'Pure micronized creatine for strength and cognitive performance', 'Performance', 22.00, '5g daily', '5g', 60, ARRAY['Muscle strength', 'Exercise performance', 'Cognitive function', 'Energy production'], '/lovable-uploads/james-davis-avatar.jpg', 4.8, 3456, true),
('Collagen Peptides', 'Vital Proteins', 'Grass-fed bovine collagen for skin, hair, and joint support', 'Beauty', 43.00, '2 scoops daily', '20g', 28, ARRAY['Skin elasticity', 'Hair health', 'Joint support', 'Gut lining'], '/lovable-uploads/emma-wilson-avatar.jpg', 4.6, 2876, true),
('Probiotics 50 Billion', 'Garden of Life', 'Multi-strain probiotic for comprehensive gut health', 'Gut Health', 36.00, '1 capsule daily', '50 billion CFU', 30, ARRAY['Digestive health', 'Immune support', 'Gut flora balance', 'Regularity'], '/lovable-uploads/dr-roberts-avatar.jpg', 4.7, 1987, true),
('Curcumin Complex', 'Life Extension', 'Enhanced absorption turmeric extract for inflammation support', 'Herbs', 28.00, '2 capsules daily', '1000mg', 60, ARRAY['Anti-inflammatory', 'Joint health', 'Antioxidant', 'Cognitive support'], '/lovable-uploads/murphy-avatar.jpg', 4.5, 876, true),
('Zinc Picolinate 30mg', 'Thorne Research', 'Highly absorbable zinc for immune function and metabolism', 'Minerals', 16.00, '1 capsule daily', '30mg', 60, ARRAY['Immune function', 'Skin health', 'Metabolism', 'Testosterone support'], '/lovable-uploads/james-davis-avatar.jpg', 4.6, 765, true),
('B-Complex Plus', 'Pure Encapsulations', 'Complete B-vitamin complex for energy and stress support', 'Vitamins', 27.00, '1 capsule daily', 'Full B spectrum', 120, ARRAY['Energy production', 'Stress support', 'Cognitive function', 'Metabolism'], '/lovable-uploads/mike-thompson-avatar.jpg', 4.8, 1543, true),
('Spermidine 5mg', 'ProHealth Longevity', 'Autophagy inducer for cellular renewal and longevity', 'Longevity', 68.00, '5mg daily', '5mg', 60, ARRAY['Autophagy', 'Cellular renewal', 'Anti-aging', 'Longevity'], '/lovable-uploads/dr-roberts-avatar.jpg', 4.4, 321, true),
('CoQ10 Ubiquinol 100mg', 'Jarrow Formulas', 'Active form of CoQ10 for heart and cellular energy', 'Heart Health', 42.00, '1 softgel daily', '100mg', 60, ARRAY['Heart health', 'Cellular energy', 'Antioxidant', 'Mitochondrial support'], '/lovable-uploads/emma-wilson-avatar.jpg', 4.7, 1234, true),
('Alpha-GPC 300mg', 'Nootropics Depot', 'Choline source for cognitive enhancement and focus', 'Nootropics', 29.00, '1-2 capsules daily', '300mg', 60, ARRAY['Focus', 'Memory', 'Cognitive performance', 'Neuroprotection'], '/lovable-uploads/murphy-avatar.jpg', 4.6, 654, true),
('Rhodiola Rosea', 'NOW Foods', 'Adaptogenic herb for stamina and mental clarity', 'Adaptogens', 19.00, '1 capsule twice daily', '500mg', 60, ARRAY['Physical stamina', 'Mental clarity', 'Stress adaptation', 'Fatigue reduction'], '/lovable-uploads/james-davis-avatar.jpg', 4.5, 543, true);