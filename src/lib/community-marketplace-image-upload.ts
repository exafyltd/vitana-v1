/**
 * BOOTSTRAP-COMMUNITY-MARKETPLACE (Chunk 4): listing photo upload.
 *
 * Uploads to the `community-marketplace-listings` bucket (see
 * supabase/migrations/20260727170000_bootstrap_community_marketplace_storage.sql
 * in vitana-platform) under `{user_id}/<filename>` — the user_id MUST be the
 * first path segment to satisfy the bucket's RLS policy
 * (auth.uid()::text = (storage.foldername(name))[1]), same convention as
 * diary-photos / CoverPhotoPicker.tsx.
 */

import { supabase } from "@/integrations/supabase/client";

const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp"];
const ALLOWED_MIME_PREFIXES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB, matches the bucket's file_size_limit

export class ListingImageUploadError extends Error {
  constructor(public reasonCode: "invalid_type" | "too_large" | "not_authenticated" | "upload_failed", message: string) {
    super(message);
    this.name = "ListingImageUploadError";
  }
}

export async function uploadCommunityListingImage(file: File): Promise<string> {
  const fileExt = (file.name.split(".").pop() || "").toLowerCase();
  const isHeic = file.type === "image/heic" || file.type === "image/heif" || fileExt === "heic" || fileExt === "heif";
  if (isHeic || !ALLOWED_MIME_PREFIXES.includes(file.type) || !ALLOWED_EXTS.includes(fileExt)) {
    throw new ListingImageUploadError("invalid_type", "Unsupported image format.");
  }
  if (file.size > MAX_BYTES) {
    throw new ListingImageUploadError("too_large", "Image is larger than 5MB.");
  }

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new ListingImageUploadError("not_authenticated", "Not authenticated.");

  // Materialize via arrayBuffer -> Blob before upload: avoids iOS Safari /
  // Android file-descriptor reliability issues seen with raw File uploads
  // elsewhere in this app (CoverPhotoPicker.tsx, AvatarUploadField.tsx).
  const arrayBuffer = await file.arrayBuffer();
  const body = new Blob([arrayBuffer], { type: file.type });
  const fileName = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("community-marketplace-listings")
    .upload(fileName, body, { contentType: file.type });
  if (uploadError) throw new ListingImageUploadError("upload_failed", uploadError.message);

  const { data } = supabase.storage.from("community-marketplace-listings").getPublicUrl(fileName);
  return data.publicUrl;
}

export async function deleteCommunityListingImage(publicUrl: string): Promise<void> {
  const marker = "/community-marketplace-listings/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length));
  await supabase.storage.from("community-marketplace-listings").remove([path]);
}
