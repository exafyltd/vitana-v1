import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { v4 as uuidv4 } from 'uuid';

export interface GalleryPhoto {
  id: string;
  user_id: string;
  image_url: string;
  caption?: string;
  sort_order: number;
  is_public: boolean;
  created_at: string;
}

export function useProfileGallery(userId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;
  const isOwner = user?.id === targetUserId;

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['profile-gallery', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from('profile_gallery')
        .select('*')
        .eq('user_id', targetUserId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as GalleryPhoto[];
    },
    enabled: !!targetUserId,
  });

  const uploadPhoto = useMutation({
    mutationFn: async ({ file, caption, is_public = true }: { file: File; caption?: string; is_public?: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${user.id}/gallery/${uuidv4()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('media-uploads')
        .upload(filePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('media-uploads')
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from('profile_gallery')
        .insert({
          user_id: user.id,
          image_url: urlData.publicUrl,
          caption,
          is_public,
          sort_order: photos.length,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile-gallery', targetUserId] }),
  });

  const deletePhoto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profile_gallery')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile-gallery', targetUserId] }),
  });

  const updateCaption = useMutation({
    mutationFn: async ({ id, caption }: { id: string; caption: string }) => {
      const { error } = await supabase
        .from('profile_gallery')
        .update({ caption })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile-gallery', targetUserId] }),
  });

  return {
    photos,
    isLoading,
    isOwner,
    uploadPhoto,
    deletePhoto,
    updateCaption,
  };
}
