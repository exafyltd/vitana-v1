import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type DistributionPost = Database["public"]["Tables"]["distribution_posts"]["Row"];
export type DistributionPostInsert = Database["public"]["Tables"]["distribution_posts"]["Insert"];
export type DistributionPostUpdate = Database["public"]["Tables"]["distribution_posts"]["Update"];

export function useDistributionPosts(status?: Database["public"]["Enums"]["post_status"]) {
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["distribution_posts", status],
    queryFn: async () => {
      let query = supabase
        .from("distribution_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DistributionPost[];
    },
  });

  const createPost = useMutation({
    mutationFn: async (post: DistributionPostInsert) => {
      const { data, error } = await supabase
        .from("distribution_posts")
        .insert(post)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_posts"] });
      toast.success("Post created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create post: ${error.message}`);
    },
  });

  const updatePost = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: DistributionPostUpdate;
    }) => {
      const { data, error } = await supabase
        .from("distribution_posts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_posts"] });
      toast.success("Post updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update post: ${error.message}`);
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("distribution_posts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_posts"] });
      toast.success("Post deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete post: ${error.message}`);
    },
  });

  const blastNow = useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase
        .from("distribution_posts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", postId)
        .select()
        .single();

      if (error) throw error;
      
      // TODO: Trigger actual distribution via edge function
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_posts"] });
      toast.success("Blasting now!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to blast: ${error.message}`);
    },
  });

  return {
    posts,
    isLoading,
    createPost,
    updatePost,
    deletePost,
    blastNow,
  };
}
