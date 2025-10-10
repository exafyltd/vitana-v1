import { useMemo } from "react";
import { useContacts } from "./useContacts";

export function useIsContactInList(userId: string | null | undefined) {
  const { contacts } = useContacts();
  
  return useMemo(() => {
    if (!userId) return false;
    return contacts.some(contact => contact.contact_user_id === userId);
  }, [userId, contacts]);
}
