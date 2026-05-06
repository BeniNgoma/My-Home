-- ============================================================
-- CareTrack — Storage buckets + policies
-- Exécuter APRÈS 001_schema.sql dans l'éditeur SQL Supabase
-- ============================================================

-- Créer les buckets publics
INSERT INTO storage.buckets (id, name, public)
  VALUES ('clock-in-photos',  'clock-in-photos',  true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('clock-out-photos', 'clock-out-photos', true)
  ON CONFLICT (id) DO NOTHING;

-- Policies clock-in-photos
CREATE POLICY "agents_upload_clock_in" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'clock-in-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "public_read_clock_in" ON storage.objects
  FOR SELECT USING (bucket_id = 'clock-in-photos');

-- Policies clock-out-photos
CREATE POLICY "agents_upload_clock_out" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'clock-out-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "public_read_clock_out" ON storage.objects
  FOR SELECT USING (bucket_id = 'clock-out-photos');
