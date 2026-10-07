CREATE TABLE public.blood_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_code text NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  ward_id uuid REFERENCES public.wards(id) ON DELETE SET NULL,
  requesting_doctor text NOT NULL,
  bed_no text,
  indication text NOT NULL,
  urgency text NOT NULL DEFAULT 'Routine' CHECK (urgency IN ('Routine','Urgent','Emergency')),
  is_uncrossmatched boolean NOT NULL DEFAULT false,
  required_by timestamptz,
  status text NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted','Sample Received','Crossmatch In Progress','Ready for Issue','Issued','Pending Approval','Approved','Cancelled','Rejected')),
  approved_by text,
  approval_mode text CHECK (approval_mode IN ('In app','Verbal')),
  approved_at timestamptz,
  is_archived boolean NOT NULL DEFAULT false,
  archive_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, request_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_requests TO authenticated;
GRANT ALL ON public.blood_requests TO service_role;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own blood requests" ON public.blood_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own blood requests" ON public.blood_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own blood requests" ON public.blood_requests FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own blood requests" ON public.blood_requests FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX blood_requests_patient_id_idx ON public.blood_requests (patient_id);
CREATE INDEX blood_requests_ward_id_idx ON public.blood_requests (ward_id);
CREATE TRIGGER blood_requests_set_updated_at BEFORE UPDATE ON public.blood_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.request_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  component text NOT NULL CHECK (component IN ('Whole Blood','PRBC','FFP','Platelets','Cryo')),
  quantity_requested integer NOT NULL CHECK (quantity_requested > 0),
  quantity_issued integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_items TO authenticated;
GRANT ALL ON public.request_items TO service_role;
ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own request items" ON public.request_items FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own request items" ON public.request_items FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own request items" ON public.request_items FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own request items" ON public.request_items FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX request_items_request_id_idx ON public.request_items (request_id);
CREATE TRIGGER request_items_set_updated_at BEFORE UPDATE ON public.request_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.crossmatch_tests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.blood_units(id) ON DELETE RESTRICT,
  patient_abo text,
  patient_rh text,
  antibody_screen text NOT NULL DEFAULT 'Not done' CHECK (antibody_screen IN ('Negative','Positive','Not done')),
  result text NOT NULL CHECK (result IN ('Compatible','Incompatible')),
  tested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crossmatch_tests TO authenticated;
GRANT ALL ON public.crossmatch_tests TO service_role;
ALTER TABLE public.crossmatch_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own crossmatch tests" ON public.crossmatch_tests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own crossmatch tests" ON public.crossmatch_tests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own crossmatch tests" ON public.crossmatch_tests FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own crossmatch tests" ON public.crossmatch_tests FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX crossmatch_tests_request_id_idx ON public.crossmatch_tests (request_id);
CREATE INDEX crossmatch_tests_unit_id_idx ON public.crossmatch_tests (unit_id);
CREATE TRIGGER crossmatch_tests_set_updated_at BEFORE UPDATE ON public.crossmatch_tests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.issue_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.blood_requests(id) ON DELETE RESTRICT,
  unit_id uuid NOT NULL UNIQUE REFERENCES public.blood_units(id) ON DELETE RESTRICT,
  crossmatch_id uuid REFERENCES public.crossmatch_tests(id) ON DELETE SET NULL,
  received_by text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  issued_uncrossmatched boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issue_records TO authenticated;
GRANT ALL ON public.issue_records TO service_role;
ALTER TABLE public.issue_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own issue records" ON public.issue_records FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own issue records" ON public.issue_records FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own issue records" ON public.issue_records FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own issue records" ON public.issue_records FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX issue_records_request_id_idx ON public.issue_records (request_id);
CREATE INDEX issue_records_crossmatch_id_idx ON public.issue_records (crossmatch_id);
CREATE TRIGGER issue_records_set_updated_at BEFORE UPDATE ON public.issue_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();