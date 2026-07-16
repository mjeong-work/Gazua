-- ================================================================
-- Direct messages
-- Apply via: Supabase Dashboard > SQL Editor, or supabase db push
--
-- Flat messages table (no separate conversations table — a "conversation"
-- is just a client-side grouping of messages by counterpart). Replaces
-- the localStorage-only MessagesContext.
--
-- Also enables Realtime for messages AND notifications: this project's
-- `supabase_realtime` publication currently has zero tables in it, which
-- means the existing subscribeToNotifications() consumer (wired into
-- AppHeader for the unread bell badge) has never actually received an
-- event despite looking fully wired up.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content       text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  read_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_not_self CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_pair
  ON public.messages (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread
  ON public.messages (recipient_id, read_at) WHERE read_at IS NULL;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages: participant read" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "messages: authenticated insert" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages: recipient mark read" ON public.messages
  FOR UPDATE USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
