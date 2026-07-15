-- Atomic share counter increment — called via supabase.rpc('increment_post_shares', { post_id })
CREATE OR REPLACE FUNCTION public.increment_post_shares(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts SET share_count = share_count + 1 WHERE id = post_id;
END;
$$;
