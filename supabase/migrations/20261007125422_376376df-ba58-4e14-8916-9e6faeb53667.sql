CREATE TABLE public.wards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  ward_name text NOT NULL,
  ward_code text,
  extension_no text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ward_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wards TO authenticated;
GRANT ALL ON public.wards TO service_role;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wards" ON public.wards FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own wards" ON public.wards FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own wards" ON public.wards FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own wards" ON public.wards FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER wards_set_updated_at BEFORE UPDATE ON public.wards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  mr_number text NOT NULL,
  full_name text NOT NULL,
  father_or_husband_name text,
  gender text CHECK (gender IN ('Male','Female','Other')),
  date_of_birth date,
  abo_group text CHECK (abo_group IN ('A','B','AB','O')),
  rh_d text CHECK (rh_d IN ('Pos','Neg')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mr_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own patients" ON public.patients FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own patients" ON public.patients FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own patients" ON public.patients FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER patients_set_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.blood_units (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  component text NOT NULL CHECK (component IN ('Whole Blood','PRBC','FFP','Platelets','Cryo')),
  abo_group text NOT NULL CHECK (abo_group IN ('A','B','AB','O')),
  rh_d text NOT NULL CHECK (rh_d IN ('Pos','Neg')),
  volume_ml integer CHECK (volume_ml > 0),
  collection_date date NOT NULL,
  expiry_at timestamptz NOT NULL,
  storage_location text,
  status text NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','Reserved','Issued','Expired','Discarded')),
  discard_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, unit_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_units TO authenticated;
GRANT ALL ON public.blood_units TO service_role;
ALTER TABLE public.blood_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own blood units" ON public.blood_units FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own blood units" ON public.blood_units FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own blood units" ON public.blood_units FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own blood units" ON public.blood_units FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER blood_units_set_updated_at BEFORE UPDATE ON public.blood_units FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();