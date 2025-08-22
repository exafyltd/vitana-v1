-- Create enum types for lab testing system
CREATE TYPE public.lab_test_category AS ENUM (
  'blood_markers',
  'genomics', 
  'microbiome',
  'metabolomics',
  'allergy',
  'cancer',
  'specialized'
);

CREATE TYPE public.collection_method AS ENUM (
  'home_kit',
  'lab_facility'
);

CREATE TYPE public.order_status AS ENUM (
  'pending',
  'confirmed',
  'sample_collected',
  'processing',
  'completed',
  'cancelled'
);

CREATE TYPE public.notification_type AS ENUM (
  'test_results',
  'appointment_reminder',
  'test_reminder',
  'critical_alert'
);

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  medical_conditions TEXT[],
  medications TEXT[],
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lab tests catalog table
CREATE TABLE public.lab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category lab_test_category NOT NULL,
  biomarkers TEXT[] NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  turnaround_days INTEGER NOT NULL,
  sample_type TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  provider_logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lab test orders table
CREATE TABLE public.lab_test_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_test_id UUID NOT NULL REFERENCES public.lab_tests(id),
  collection_method collection_method NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  facility_address TEXT,
  shipping_address JSONB,
  special_instructions TEXT,
  payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lab test results table
CREATE TABLE public.lab_test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.lab_test_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  biomarker_data JSONB NOT NULL,
  ai_insights TEXT,
  result_pdf_url TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_test_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for lab_tests (public read access)
CREATE POLICY "Lab tests are viewable by everyone" ON public.lab_tests
  FOR SELECT USING (is_active = true);

-- Create RLS policies for lab_test_orders
CREATE POLICY "Users can view their own orders" ON public.lab_test_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON public.lab_test_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON public.lab_test_orders
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for lab_test_results
CREATE POLICY "Users can view their own results" ON public.lab_test_results
  FOR SELECT USING (auth.uid() = user_id);

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_tests_updated_at
  BEFORE UPDATE ON public.lab_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_test_orders_updated_at
  BEFORE UPDATE ON public.lab_test_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample lab tests
INSERT INTO public.lab_tests (name, description, category, biomarkers, price, turnaround_days, sample_type, provider_name) VALUES
('Complete Blood Panel', 'Comprehensive analysis of blood markers including CBC, metabolic panel, and lipids', 'blood_markers', ARRAY['Hemoglobin', 'White Blood Cell Count', 'Glucose', 'Cholesterol', 'HDL', 'LDL', 'Triglycerides'], 149.99, 3, 'Blood', 'LabCorp'),
('DNA Health Analysis', 'Comprehensive genetic testing for health predispositions and traits', 'genomics', ARRAY['APOE', 'MTHFR', 'CYP2D6', 'BRCA1', 'BRCA2'], 299.99, 14, 'Saliva', '23andMe Health'),
('Gut Microbiome Analysis', 'Complete analysis of gut bacteria diversity and health markers', 'microbiome', ARRAY['Lactobacillus', 'Bifidobacterium', 'Diversity Index', 'Pathogenic Bacteria'], 199.99, 10, 'Stool', 'Viome'),
('Comprehensive Allergy Panel', 'Tests for common environmental and food allergens', 'allergy', ARRAY['Peanuts', 'Tree Nuts', 'Dairy', 'Gluten', 'Pollen', 'Dust Mites'], 179.99, 5, 'Blood', 'Quest Diagnostics'),
('Cancer Biomarker Screen', 'Early detection markers for common cancers', 'cancer', ARRAY['PSA', 'CEA', 'CA 19-9', 'CA 125', 'AFP'], 249.99, 7, 'Blood', 'LabCorp'),
('Hormone Balance Panel', 'Comprehensive hormone analysis including thyroid and reproductive hormones', 'blood_markers', ARRAY['TSH', 'T3', 'T4', 'Testosterone', 'Estradiol', 'Cortisol'], 189.99, 5, 'Blood', 'Quest Diagnostics');