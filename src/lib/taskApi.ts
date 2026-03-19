/**
 * Task API Client - Vitana Gateway Service
 */

import { Task, CreateTaskPayload, UpdateTaskPayload } from "@/types/task";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = import.meta.env.VITE_GATEWAY_BASE || "https://oasis-operator-86804897789.us-central1.run.app";

/**
 * Get auth headers for API requests
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  } catch {
    // Continue without auth header
  }
  return headers;
}

/**
 * Fetch all tasks
 */
export async function fetchTasks(): Promise<Task[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/api/v1/tasks`, {
      method: "GET",
      credentials: "include",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
}

/**
 * Poll tasks since timestamp (fallback)
 */
export async function pollTasks(since: string): Promise<Task[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/api/v1/tasks?since=${encodeURIComponent(since)}`, {
      method: "GET",
      credentials: "include",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to poll tasks: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error polling tasks:", error);
    return [];
  }
}

/**
 * Create a new task
 */
export async function createTask(payload: CreateTaskPayload): Promise<Task | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/api/v1/tasks`, {
      method: "POST",
      credentials: "include",
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/api/v1/tasks/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/api/v1/tasks/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers,
    });

    return response.ok;
  } catch (error) {
    console.error("Error deleting task:", error);
    return false;
  }
}
