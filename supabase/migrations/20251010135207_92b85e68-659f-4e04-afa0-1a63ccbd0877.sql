-- Grant execute permissions on get_conversation_participants function
GRANT EXECUTE ON FUNCTION public.get_conversation_participants(uuid) TO authenticated;