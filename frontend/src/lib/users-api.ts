import { api } from "./api";
import type { User } from "@/types";

export type UserRole =
  | "admin"
  | "project_manager"
  | "team_member";

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

export type UpdateProfilePayload = {
  name?: string;
  email?: string;
};

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>("/users");
  return data;
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<User> {
  const { data } = await api.post<User>(
    "/users",
    payload,
  );

  return data;
}

export async function deleteUser(
  id: string,
): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function getMyProfile(): Promise<User> {
  const { data } = await api.get<User>("/users/me");
  return data;
}

export async function updateMyProfile(
  payload: UpdateProfilePayload,
): Promise<User> {
  const { data } = await api.patch<User>(
    "/users/me",
    payload,
  );

  return data;
}