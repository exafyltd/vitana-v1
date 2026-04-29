/**
 * VTID-02601 — React Query hooks around the reminders REST API.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listReminders,
  createReminder,
  updateReminder,
  snoozeReminder,
  completeReminder,
  deleteReminder,
  deleteAllReminders,
  CreateReminderInput,
  ReminderRow,
} from "@/lib/reminders-api";

const REMINDERS_KEY = ["reminders"];

export function useReminders(opts?: { include_fired?: boolean; q?: string }) {
  return useQuery<ReminderRow[]>({
    queryKey: [...REMINDERS_KEY, opts ?? {}],
    queryFn: () => listReminders(opts),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReminderInput) => createReminder(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: REMINDERS_KEY }),
  });
}

export function useUpdateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; patch: Partial<CreateReminderInput> }) =>
      updateReminder(args.id, args.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: REMINDERS_KEY }),
  });
}

export function useSnoozeReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; minutes?: number }) =>
      snoozeReminder(args.id, args.minutes ?? 10),
    onSuccess: () => qc.invalidateQueries({ queryKey: REMINDERS_KEY }),
  });
}

export function useCompleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeReminder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: REMINDERS_KEY }),
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReminder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: REMINDERS_KEY }),
  });
}

export function useDeleteAllReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAllReminders(),
    onSuccess: () => qc.invalidateQueries({ queryKey: REMINDERS_KEY }),
  });
}
