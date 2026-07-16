import { api } from "./api";
import type { User } from "@/types";

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "project_manager" | "team_member";
};

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>("/users");
  return data;
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<User> {
  const { data } = await api.post<User>("/users", payload);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}