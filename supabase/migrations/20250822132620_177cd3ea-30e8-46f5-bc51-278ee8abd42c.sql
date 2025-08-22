-- Add pregnancy and metabolomics lab tests
INSERT INTO public.lab_tests (
  name, 
  description, 
  category, 
  biomarkers, 
  price, 
  turnaround_days, 
  sample_type, 
  provider_name
) VALUES 
-- Pregnancy Tests (Home Collection)
(
  'At-Home Pregnancy Confirmation Test',
  'Comprehensive pregnancy test with quantitative hCG levels to confirm pregnancy and estimate timing',
  'specialized',
  ARRAY['Beta hCG', 'Progesterone', 'Estradiol'],
  89.00,
  1,
  'Urine',
  'HomeTest Labs'
),
(
  'Early Pregnancy Health Panel',
  'Complete early pregnancy health assessment including nutritional status and thyroid function',
  'specialized', 
  ARRAY['Beta hCG', 'TSH', 'Free T4', 'Folate', 'Vitamin B12', 'Iron', 'Ferritin'],
  189.00,
  3,
  'Blood (finger prick)',
  'Maternal Health Co'
),
(
  'Prenatal Genetic Screening (At-Home)',
  'Non-invasive prenatal testing for common chromosomal conditions',
  'genomics',
  ARRAY['cfDNA', 'Trisomy 21', 'Trisomy 18', 'Trisomy 13', 'Sex chromosome analysis'],
  299.00,
  7,
  'Blood (finger prick)',
  'GenomeFirst'
),
-- Metabolomics Tests
(
  'Comprehensive Metabolomics Panel',
  'Advanced metabolic profiling to assess cellular energy production and metabolic pathways',
  'metabolomics',
  ARRAY['Amino acids', 'Organic acids', 'Fatty acids', 'Carbohydrate metabolites', 'Energy metabolism markers'],
  349.00,
  14,
  'Urine + Blood',
  'MetaboHealth'
),
(
  'Gut Metabolome Analysis',
  'Detailed analysis of gut-derived metabolites affecting overall health and inflammation',
  'metabolomics',
  ARRAY['Short-chain fatty acids', 'Bile acids', 'Tryptophan metabolites', 'Phenol compounds'],
  249.00,
  10,
  'Stool + Urine',
  'MicrobiomeMetrics'
),
(
  'Mitochondrial Function Panel',
  'Assess cellular energy production and mitochondrial health through metabolite analysis',
  'metabolomics', 
  ARRAY['CoQ10', 'Carnitine', 'Citric acid cycle intermediates', 'ATP production markers'],
  199.00,
  7,
  'Blood (finger prick)',
  'CellularHealth Labs'
);