/**
 * VTID-05511 — the provider directory data. There is no provider catalogue
 * yet: the web pages render fixed sample providers. `PROVIDERS` is the six of
 * `DoctorsCoaches.tsx` (:181-261, catalog keys as there); the profile page
 * (`ProviderProfile.tsx` :43-92) knows only the first three, with the same
 * values in English literals — natively it reads the same catalog keys, which
 * hold exactly those English words. `/discover/provider/4..6` is "not found",
 * as on the web.
 *
 * The rest is the web's real reads and writes, re-implemented over the app's
 * Supabase client (class-B, queries unchanged):
 *  - `provider_appointments` upcoming (scheduled, from now, ascending) and
 *    history (completed, before now, newest, 20) — DoctorsCoaches.tsx:102-133;
 *  - the appointment insert after a booking (:136-155, ProviderProfile.tsx:96-115);
 *  - `bookmarked_items` (src/hooks/useBookmarks.ts): read, insert (23505 =
 *    already bookmarked), delete, and the realtime refetch.
 */
import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notify, notifyError } from '../../../ports/ui';
import { useAuth } from '../../../auth/AuthProvider';
import { db } from './client';

export interface Provider {
  id: number;
  name: string;
  titleKey: string;
  specialtyKey: string;
  rating: number;
  reviews: number;
  location: string;
  image: string;
  badgeKeys: string[];
  years: string;
  nextAvailableKey: string;
  bookings: number;
  priceRange: string;
  aboutKey: string;
}

const D = 'screens.discover';

export const PROVIDERS: Provider[] = [
  { id: 1, name: 'Dr. Sarah Chen', titleKey: `${D}.providerTitle_longevitySpecialist`, specialtyKey: `${D}.providerSpecialty_longevity`, rating: 4.9, reviews: 156, location: 'New York, NY', image: '/lovable-uploads/sarah-miller-avatar.jpg', badgeKeys: [`${D}.providerBadge_topRated`, `${D}.providerBadge_verified`], years: '15', nextAvailableKey: `${D}.providerAvailable_today2pm`, bookings: 1234, priceRange: '$150 - $400', aboutKey: `${D}.providerAbout_sarah` },
  { id: 2, name: 'Marcus Rodriguez', titleKey: `${D}.providerTitle_functionalFitness`, specialtyKey: `${D}.wsCategory_fitness_name`, rating: 4.8, reviews: 89, location: 'Los Angeles, CA', image: '/lovable-uploads/mike-thompson-avatar.jpg', badgeKeys: [`${D}.providerBadge_trending`, `${D}.providerBadge_certified`], years: '8', nextAvailableKey: `${D}.providerAvailable_tomorrow9am`, bookings: 567, priceRange: '$75 - $120', aboutKey: `${D}.providerAbout_marcus` },
  { id: 3, name: 'Luna Wellness Spa', titleKey: `${D}.providerTitle_holisticWellnessCenter`, specialtyKey: `${D}.providerSpecialty_recoveryTherapy`, rating: 4.9, reviews: 234, location: 'Miami, FL', image: '/lovable-uploads/design-team-avatar.jpg', badgeKeys: [`${D}.providerBadge_nearYou`, `${D}.providerBadge_premium`], years: '12', nextAvailableKey: `${D}.providerAvailable_today4pm`, bookings: 2156, priceRange: '$90 - $300', aboutKey: `${D}.providerAbout_luna` },
  { id: 4, name: 'Peak Performance Lab', titleKey: `${D}.providerTitle_biohackingOptimization`, specialtyKey: `${D}.wsCategory_biohacking_name`, rating: 4.7, reviews: 67, location: 'Austin, TX', image: '/lovable-uploads/james-davis-avatar.jpg', badgeKeys: [`${D}.providerBadge_new`, `${D}.providerBadge_innovative`], years: '5', nextAvailableKey: `${D}.providerAvailable_friday10am`, bookings: 234, priceRange: '$200 - $500', aboutKey: `${D}.providerAbout_peak` },
  { id: 5, name: 'Maya Wellness Collective', titleKey: `${D}.providerTitle_holisticHealthCoaching`, specialtyKey: `${D}.wsCategory_mental_name`, rating: 4.9, reviews: 123, location: 'Seattle, WA', image: '/lovable-uploads/emma-wilson-avatar.jpg', badgeKeys: [`${D}.providerBadge_popular`, `${D}.providerBadge_holistic`], years: '10', nextAvailableKey: `${D}.providerAvailable_monday1pm`, bookings: 890, priceRange: '$85 - $180', aboutKey: `${D}.providerAbout_maya` },
  { id: 6, name: 'Dr. Michael Roberts', titleKey: `${D}.providerTitle_sleepExpert`, specialtyKey: `${D}.providerSpecialty_sleepMedicine`, rating: 4.8, reviews: 178, location: 'Chicago, IL', image: '/lovable-uploads/dr-roberts-avatar.jpg', badgeKeys: [`${D}.providerBadge_expert`, `${D}.providerBadge_verified`], years: '20', nextAvailableKey: `${D}.providerAvailable_nextWeek`, bookings: 1567, priceRange: '$180 - $350', aboutKey: `${D}.providerAbout_michael` },
];

/** The profile page's three providers (ProviderProfile.tsx:43-92). */
export const PROFILE_PROVIDERS: Provider[] = PROVIDERS.slice(0, 3);

export function findProfileProvider(id: string | undefined): Provider | undefined {
  return PROFILE_PROVIDERS.find((p) => p.id.toString() === id);
}

/** `parseInt(priceRange.split('-')[0].replace(/\D/g, ''))` — the booking price. */
export function bookingPrice(p: Provider): number {
  return parseInt(p.priceRange.split('-')[0].replace(/\D/g, ''), 10);
}

// ── appointments ────────────────────────────────────────────────────────
export interface Appointment {
  id: string;
  provider_name: string;
  provider_specialty: string;
  provider_image_url?: string | null;
  appointment_type: string;
  start_time: string;
  duration_minutes: number;
  location?: string | null;
  patient_notes?: string | null;
}

export function useUpcomingAppointments() {
  return useQuery({
    queryKey: ['provider-appointments', 'upcoming'],
    queryFn: async (): Promise<Appointment[]> => {
      const { data, error } = await db().from('provider_appointments').select('*').eq('status', 'scheduled').gte('start_time', new Date().toISOString()).order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Appointment[];
    },
  });
}

export function useVisitHistory() {
  return useQuery({
    queryKey: ['provider-appointments', 'history'],
    queryFn: async (): Promise<Appointment[]> => {
      const { data, error } = await db().from('provider_appointments').select('*').eq('status', 'completed').lt('start_time', new Date().toISOString()).order('start_time', { ascending: false }).limit(20);
      if (error) throw error;
      return (data ?? []) as Appointment[];
    },
  });
}

/** The `saveAppointmentMutation` row for a booked provider (tomorrow, 30 min). */
export function appointmentFor(p: Provider, t: (k: string) => string, now: number = Date.now()) {
  return {
    provider_id: p.id.toString(),
    provider_name: p.name,
    provider_specialty: t(p.specialtyKey),
    provider_image_url: p.image,
    appointment_type: 'consultation',
    status: 'scheduled',
    start_time: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 30,
    location: p.location,
  };
}

/** `saveAppointmentMutation`: insert, refresh the upcoming list, toast. */
export function useSaveAppointment() {
  const queryClient = useQueryClient();
  return useCallback(
    async (row: ReturnType<typeof appointmentFor>) => {
      const { data, error } = await db().from('provider_appointments').insert([row]).select().single();
      if (error) {
        notifyError('toasts.discover.bookingFailed', 'toasts.discover.pleaseTryAgain');
        throw error;
      }
      void queryClient.invalidateQueries({ queryKey: ['provider-appointments', 'upcoming'] });
      notify('toasts.discover.appointmentBooked', 'toasts.discover.yourAppointmentHasConfirmed');
      return data;
    },
    [queryClient],
  );
}

// ── bookmarks (useBookmarks.ts) ─────────────────────────────────────────
export interface BookmarkItem {
  item_type: string;
  item_id: string;
  item_name: string;
  item_image_url?: string;
  item_metadata?: Record<string, unknown>;
}

export interface Bookmark extends BookmarkItem {
  id: string;
  user_id: string;
  created_at: string;
}

export function useBookmarks() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookmarks = useCallback(async () => {
    if (!user) {
      setBookmarks([]);
      setIsLoading(false);
      return;
    }
    const { data, error } = await db().from('bookmarked_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) notifyError('toasts.hooks.error', 'toasts.hooks.failedLoadBookmarks');
    else setBookmarks((data ?? []) as Bookmark[]);
    setIsLoading(false);
  }, [user]);

  const addBookmark = async (item: BookmarkItem): Promise<boolean> => {
    if (!user) {
      notifyError('toasts.hooks.signRequired', 'toasts.hooks.pleaseSignBookmarkItems');
      return false;
    }
    const { error } = await db()
      .from('bookmarked_items')
      .insert({ user_id: user.id, item_type: item.item_type, item_id: item.item_id, item_name: item.item_name, item_image_url: item.item_image_url, item_metadata: item.item_metadata || {} });
    if (error) {
      if (error.code === '23505') {
        notify('toasts.hooks.alreadyBookmarked', 'toasts.hooks.thisItemAlreadyYourBookmarks');
        return false;
      }
      notifyError('toasts.hooks.error', 'toasts.hooks.failedBookmarkItem');
      return false;
    }
    notify('toasts.hooks.bookmarked');
    await fetchBookmarks();
    return true;
  };

  const removeBookmark = async (itemType: string, itemId: string): Promise<boolean> => {
    if (!user) return false;
    const { error } = await db().from('bookmarked_items').delete().eq('user_id', user.id).eq('item_type', itemType).eq('item_id', itemId);
    if (error) {
      notifyError('toasts.hooks.error', 'toasts.hooks.failedRemoveBookmark');
      return false;
    }
    notify('toasts.hooks.removed', 'toasts.hooks.itemRemovedFromBookmarks');
    await fetchBookmarks();
    return true;
  };

  const isBookmarked = (itemType: string, itemId: string) => bookmarks.some((b) => b.item_type === itemType && b.item_id === itemId);
  const getBookmarksByType = (itemType: string) => bookmarks.filter((b) => b.item_type === itemType);
  const toggleBookmark = (item: BookmarkItem) => (isBookmarked(item.item_type, item.item_id) ? removeBookmark(item.item_type, item.item_id) : addBookmark(item));

  useEffect(() => {
    void fetchBookmarks();
    if (!user) return undefined;
    const client = db();
    const channel = client
      .channel('bookmarks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookmarked_items', filter: `user_id=eq.${user.id}` }, () => {
        void fetchBookmarks();
      })
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [user, fetchBookmarks]);

  return { bookmarks, isLoading, addBookmark, removeBookmark, isBookmarked, getBookmarksByType, toggleBookmark };
}
