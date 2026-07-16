-- ================================================================
-- increment_model_downloads RPC
-- Apply via: Supabase Dashboard > SQL Editor, or supabase db push
--
-- Mirrors increment_post_shares(post_id uuid). Called from
-- src/lib/services/models.service.ts:incrementDownloadCount(), which
-- was invoking this RPC even though it was never defined — every
-- call has been failing silently against the live project.
-- ================================================================

CREATE OR REPLACE FUNCTION public.increment_model_downloads(model_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.models
  SET download_count = download_count + 1
  WHERE id = model_id;
END;
$function$;
