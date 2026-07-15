import { api } from "./api";
import { Project } from "@/types";

export interface CreateProjectPayload {
  name: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  memberIds?: string[];
}

export async function getProjects(): Promise<Project[]> {
  const { data } = await api.get<Project[]>("/projects");
  return data;
}

export async function getProject(id: string): Promise<Project> {
  const { data } = await api.get<Project>(`/projects/${id}`);
  return data;
}

export async function createProject(
  payload: CreateProjectPayload
): Promise<Project> {
  const { data } = await api.post<Project>("/projects", payload);
  return data;
}

export async function updateProject(
  id: string,
  payload: Partial<CreateProjectPayload>
): Promise<Project> {
  const { data } = await api.patch<Project>(`/projects/${id}`, payload);
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`);
}

export async function addProjectMember(
  projectId: string,
  userId: string
): Promise<Project> {
  const { data } = await api.post<Project>(`/projects/${projectId}/members`, {
    userId,
  });
  return data;
}

export async function removeProjectMember(
  projectId: string,
  userId: string
): Promise<Project> {
  const { data } = await api.delete<Project>(
    `/projects/${projectId}/members/${userId}`
  );
  return data;
}