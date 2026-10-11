/**
 * Task API Client - Vitana Gateway Service
 */

import { Task, CreateTaskPayload, UpdateTaskPayload } from "@/types/task";
import { GATEWAY_BASE } from '@/lib/gateway-base';
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = GATEWAY_BASE;

/**
 * Result of a task read (VTID-05063).
 *
 * The gateway's ledger reads require `Authorization: Bearer <token>` (service
 * token or an exafy_admin JWT). A 401 or 403 is an access-denied state: the
 * caller must stop asking, not retry every poll interval forever.
 * - `access_denied`: the gateway answered 401 or 403.
 * - `signed_out`: no Supabase session, so no request was sent.
 * - `error`: network failure or any other non-2xx answer.
 */
export type TaskReadResult =
  | { ok: true; tasks: Task[] }
  | { ok: false; reason: "access_denied" | "signed_out" | "error" };

/**
 * GET a task list with the signed-in user's Supabase access token, the same
 * way src/lib/admin-api.ts (adminFetch) authenticates gateway calls. Without a
 * session nothing is sent.
 */
async function readTasks(url: string, failureLabel: string): Promise<TaskReadResult> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { ok: false, reason: "signed_out" };
    }

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: "access_denied" };
    }

    if (!response.ok) {
      throw new Error(`Failed to ${failureLabel} tasks: ${response.status}`);
    }

    const data = await response.json();
    return { ok: true, tasks: data.items || [] };
  } catch (error) {
    console.error(`Error ${failureLabel === "fetch" ? "fetching" : "polling"} tasks:`, error);
    return { ok: false, reason: "error" };
  }
}

/**
 * Fetch all tasks
 */
export function fetchTasks(): Promise<TaskReadResult> {
  return readTasks(`${BASE_URL}/api/v1/tasks`, "fetch");
}

/**
 * Poll tasks since timestamp (fallback)
 */
export function pollTasks(since: string): Promise<TaskReadResult> {
  return readTasks(`${BASE_URL}/api/v1/tasks?since=${encodeURIComponent(since)}`, "poll");
}

/**
 * Create a new task
 */
export async function createTask(payload: CreateTaskPayload): Promise<Task | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/tasks`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating task:", error);
    return null;
  }
}

/**
 * Update an existing task
 */
export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<Task | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/tasks/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to update task: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating task:", error);
    return null;
  }
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/tasks/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Error deleting task:", error);
    return false;
  }
}
