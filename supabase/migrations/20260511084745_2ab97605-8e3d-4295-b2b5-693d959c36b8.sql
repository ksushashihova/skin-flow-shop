
-- Tighten "WITH CHECK (true)" inserts
DROP POLICY IF EXISTS "anyone insert consent" ON public.consents;
CREATE POLICY "insert own consent" ON public.consents
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "anyone subscribe" ON public.subscribers;
CREATE POLICY "subscribe with consent" ON public.subscribers
  FOR INSERT
  WITH CHECK (consent = true AND email IS NOT NULL AND length(email) >= 3);

-- handle_new_user is called by trigger as the table owner; no external EXECUTE needed
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
