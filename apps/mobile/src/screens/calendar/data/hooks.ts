/**
 * VTID-05530 — React Query bindings for the reminders client (the web's `useReminders` hooks).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  completeReminderWithSlot,
  createReminder,
  deleteAllReminders,
  deleteReminder,
  getReminderById,
  listReminders,
  type CreateReminderInput,
  type ReminderRow,
} from './reminders';

export const REMINDERS_KEY = ['reminders'] as const;

export function useReminders() {
  return useQuery<ReminderRow[]>({
    queryKey: [...REMINDERS_KEY, { include_fired: true, limit: 100 }],
    queryFn: () => listReminders({ include_fired: true, limit: 100 }),
    staleTime: 15_000,
  });
}

/** One reminder for the fire deep link. `null` once it no longer exists. */
export function useReminderById(id: string | undefined) {
  return useQuery<ReminderRow | null>({
    queryKey: ['reminder', id],
    queryFn: () => getReminderById(id as string),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: CreateReminderInput) => createReminder(input), onSuccess: () => qc.invalidateQueries({ queryKey: REMINDERS_KEY }) });
}

export function useCompleteReminder() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => (await completeReminderWithSlot(id)).reminder, onSuccess: () => qc.invalidateQueries({ queryKey: REMINDERS_KEY }) });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => deleteReminder(id), onSuccess: () => qc.invalidateQueries({ queryKey: REMINDERS_KEY }) });
}

export function useDeleteAllReminders() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => deleteAllReminders(), onSuccess: () => qc.invalidateQueries({ queryKey: REMINDERS_KEY }) });
}
