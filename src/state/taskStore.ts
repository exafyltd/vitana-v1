/**
 * Task Store - Zustand State Management
 */

import { create } from "zustand";
import { Task, ConnectionState } from "@/types/task";

interface TaskState {
  tasks: Task[];
  connectionState: ConnectionState;
  
  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  setConnectionState: (state: ConnectionState) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  connectionState: "OFFLINE",
  
  setTasks: (tasks) => set({ tasks }),
  
  addTask: (task) => set((state) => {
    // Mark as new for 5s glow animation
    const newTask = { ...task, isNew: true };
    
    // Remove isNew flag after 5 seconds
    setTimeout(() => {
      set((s) => ({
        tasks: s.tasks.map((t) => 
          t.id === task.id ? { ...t, isNew: false } : t
        ),
      }));
    }, 5000);
    
    return { tasks: [newTask, ...state.tasks] };
  }),
  
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((task) =>
      task.id === id ? { ...task, ...updates } : task
    ),
  })),
  
  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter((task) => task.id !== id),
  })),
  
  setConnectionState: (state) => set({ connectionState: state }),
}));
