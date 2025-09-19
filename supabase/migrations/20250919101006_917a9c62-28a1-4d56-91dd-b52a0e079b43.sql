-- Fix security warnings by adding search_path to new functions
ALTER FUNCTION get_minimal_profiles_by_ids_text(text[]) SET search_path = 'public';
ALTER FUNCTION search_minimal_profiles_text(text, text) SET search_path = 'public';
ALTER FUNCTION get_thread_participants_text(text, text) SET search_path = 'public';
ALTER FUNCTION get_message_reactions_text(text) SET search_path = 'public';
ALTER FUNCTION toggle_message_reaction_text(text, text) SET search_path = 'public';