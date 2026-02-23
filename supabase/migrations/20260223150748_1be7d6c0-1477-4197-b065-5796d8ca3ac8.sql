CREATE POLICY "Users can leave events"
  ON global_event_participants
  FOR DELETE
  USING (user_id = auth.uid() AND is_community_user());