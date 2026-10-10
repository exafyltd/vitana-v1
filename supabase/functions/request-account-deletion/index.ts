import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createDataClient } from "../_shared/data-client.ts";
import { storageBridgeProvider, listFiles, removeFiles } from '../_shared/storage-bridge-client.ts';
import { decideAfterErase } from '../_shared/erase-user-data.ts';
import {
  eraseUserStorage,
  storageFullyErased,
  type BucketResult,
  type StorageAdapter,
} from '../_shared/erase-user-storage.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tables with user_id that do NOT cascade from auth.users
const USER_TABLES_NO_CASCADE = [
  // Order matters: delete child rows before parents
  { table: "ai_messages", column: "conversation_id", via: "ai_conversations" },
  { table: "ai_conversations", column: "user_id" },
  { table: "diary_entries", column: "user_id" },
  { table: "memberships", column: "user_id" },
  { table: "role_preferences", column: "user_id" },
  { table: "user_supplements", column: "user_id" },
  { table: "global_message_thread_reads", column: "user_id" },
  { table: "thread_reads", column: "user_id" },
  { table: "global_thread_participants", column: "user_id" },
  { table: "thread_participants", column: "user_id" },
  { table: "global_messages", column: "sender_id" },
  { table: "messages", column: "sender_id" },
  { table: "chat_messages", column: "sender_id" },
  { table: "event_rsvps", column: "user_id" },
  { table: "campaign_audience_segments", column: "user_id" },
  { table: "calendar_events", column: "user_id" },
  { table: "calendar_invite_responses", column: "user_id" },
  { table: "active_threads", column: "user_id" },
  { table: "anticipatory_guidance", column: "user_id" },
  { table: "autopilot_recommendations", column: "user_id" },
];

// VTID-05053: every member file at every folder depth, then verified empty.
// The bucket list and the walk live in _shared/erase-user-storage.ts.
async function deleteUserStorageFiles(
  serviceClient: any,
  userId: string
): Promise<BucketResult[]> {
  // VTID-03815 (B6): STORAGE_BRIDGE_PROVIDER=bridge routes list+remove
  // through the gateway's storage-bridge route instead of calling Supabase
  // Storage directly — default is unchanged.
  const useBridge = storageBridgeProvider() === 'bridge';
  const storage: StorageAdapter = useBridge
    ? {
        hasIds: false,
        list: (bucket, prefix, limit) => listFiles(bucket, prefix, { limit }),
        remove: async (bucket, paths) => {
          await removeFiles(bucket, paths);
        },
      }
    : {
        hasIds: true,
        list: async (bucket, prefix, limit) => {
          const { data, error } = await serviceClient.storage.from(bucket).list(prefix, { limit });
          if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
          return data ?? [];
        },
        remove: async (bucket, paths) => {
          const { error } = await serviceClient.storage.from(bucket).remove(paths);
          if (error) throw new Error(`remove from ${bucket}: ${error.message}`);
        },
      };
  return eraseUserStorage(storage, userId);
}

async function deleteUserTableData(
  serviceClient: any,
  userId: string
): Promise<{ table: string; error?: string }[]> {
  const results = [];

  for (const entry of USER_TABLES_NO_CASCADE) {
    try {
      if (entry.table === "ai_messages" && entry.via === "ai_conversations") {
        // Delete ai_messages by joining through ai_conversations
        const { data: convos } = await serviceClient
          .from("ai_conversations")
          .select("id")
          .eq("user_id", userId);

        if (convos && convos.length > 0) {
          const convoIds = convos.map((c: any) => c.id);
          const { error } = await serviceClient
            .from("ai_messages")
            .delete()
            .in("conversation_id", convoIds);
          results.push({ table: "ai_messages", error: error?.message });
        } else {
          results.push({ table: "ai_messages" });
        }
        continue;
      }

      const { error } = await serviceClient
        .from(entry.table)
        .delete()
        .eq(entry.column, userId);

      results.push({ table: entry.table, error: error?.message });
    } catch (e: any) {
      console.warn(`[Deletion] Table ${entry.table} error:`, e.message);
      results.push({ table: entry.table, error: e.message });
    }
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller identity with anon client
    const anonClient = createDataClient(createClient, supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Parse optional reason
    let reason: string | null = null;
    try {
      const body = await req.json();
      reason = body?.reason || null;
    } catch {
      // No body is fine
    }

    // Use service role client for DB operations (bypasses RLS)
    const serviceClient = createDataClient(createClient, supabaseUrl, supabaseServiceKey);

    // Log the deletion request
    const { error: insertError } = await serviceClient
      .from("account_deletion_requests")
      .insert({ user_id: userId, reason, status: "processing" });

    if (insertError) {
      console.error("Failed to log deletion request:", insertError);
      return new Response(JSON.stringify({ error: "Failed to process request" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Step 1: Delete non-cascading table data ──
    console.log(`[Deletion] Deleting non-cascading table data for user ${userId}`);
    const tableResults = await deleteUserTableData(serviceClient, userId);
    const tableErrors = tableResults.filter((r) => r.error);
    if (tableErrors.length > 0) {
      console.warn("[Deletion] Some table deletions had errors:", tableErrors);
    }

    // ── Step 1b (VTID-04765): erase every other table holding user_id ──
    // Memory, diary and health tables are not in the list above and do not
    // cascade from auth.users. The account is deleted only when this finished
    // cleanly, so no rows are left behind without an account to erase them.
    console.log(`[Deletion] erase_user_data for user ${userId}`);
    const { data: eraseResult, error: eraseError } = await serviceClient.rpc("erase_user_data", {
      p_user_id: userId,
    });
    const erase = decideAfterErase(eraseError, eraseResult);
    if (!erase.proceed) {
      console.error(`[Deletion] ${erase.detail} — account NOT deleted, retry needed`, eraseResult);
      await serviceClient
        .from("account_deletion_requests")
        .update({ status: "failed", processed_at: new Date().toISOString() })
        .eq("user_id", userId);
      return new Response(JSON.stringify({ error: "Failed to delete account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (erase.erased) {
      console.log(`[Deletion] ${erase.detail}`, eraseResult?.retained ? { retained: eraseResult.retained } : {});
    } else {
      console.error(`[Deletion] ${erase.detail}`);
    }

    // ── Step 2: Delete storage files ──
    console.log(`[Deletion] Cleaning storage buckets for user ${userId}`);
    const storageResults = await deleteUserStorageFiles(serviceClient, userId);
    const storageErrors = storageResults.filter((r) => r.error);
    if (storageErrors.length > 0) {
      console.warn("[Deletion] Some storage cleanups had errors:", storageErrors);
    }
    // VTID-05053: keep the account while any of the member's files remain
    // (or could not be verified). Deleting it would leave the files with no
    // account to erase them from; the request stays visible for a retry.
    if (!storageFullyErased(storageResults)) {
      const residual = storageResults.filter((r) => r.residual !== 0);
      console.error("[Deletion] storage_incomplete — account NOT deleted, retry needed", residual);
      await serviceClient
        .from("account_deletion_requests")
        .update({ status: "storage_incomplete", processed_at: new Date().toISOString() })
        .eq("user_id", userId);
      return new Response(JSON.stringify({ error: "Failed to delete account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Step 3: Delete the auth user (cascades remaining FK tables) ──
    console.log(`[Deletion] Deleting auth user ${userId}`);
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Failed to delete user:", deleteError);
      await serviceClient
        .from("account_deletion_requests")
        .update({ status: "failed", processed_at: new Date().toISOString() })
        .eq("user_id", userId);

      return new Response(JSON.stringify({ error: "Failed to delete account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as completed
    await serviceClient
      .from("account_deletion_requests")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    console.log(`[Deletion] Account deletion completed for user ${userId}`);

    return new Response(
      JSON.stringify({
        ok: true,
        summary: {
          tables_cleaned: tableResults.length,
          table_errors: tableErrors.length,
          storage_buckets_cleaned: storageResults.filter((r) => r.deleted > 0).length,
          storage_files_deleted: storageResults.reduce((sum, r) => sum + r.deleted, 0),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Account deletion error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
