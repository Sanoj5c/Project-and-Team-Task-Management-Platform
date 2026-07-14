import { api } from "./api";
import { Project } from "@/types";

export async function getProjects(): Promise<Project[]> {
  const { data } = await api.get<Project[]>("/projects");
  return data;
}