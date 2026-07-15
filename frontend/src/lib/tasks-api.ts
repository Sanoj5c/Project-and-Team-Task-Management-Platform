import { api } from "./api";
import { Task, TaskStatus, TaskPriority } from "@/types";

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  projectId: string;
  assigneeId?: string;
}

export async function getTasksForProject(projectId: string): Promise<Task[]> {
  const { data } = await api.get<Task[]>(`/tasks?projectId=${projectId}`);
  return data;
}

export async function getMyTasks(): Promise<Task[]> {
  const { data } = await api.get<Task[]>(`/tasks?mine=true`);
  return data;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { data } = await api.post<Task>("/tasks", payload);
  return data;
}

export async function updateTask(
  id: string,
  payload: Partial<CreateTaskPayload>
): Promise<Task> {
  const { data } = await api.patch<Task>(`/tasks/${id}`, payload);
  return data;
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus
): Promise<Task> {
  const { data } = await api.patch<Task>(`/tasks/${id}/status`, { status });
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
}