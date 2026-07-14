import { api } from "./api";
import { AuthResponse } from "@/types";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", payload);
  return data;
}

export async function register(
  payload: RegisterPayload
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register", payload);
  return data;
}

export function saveAuthSession(auth: AuthResponse) {
  localStorage.setItem("accessToken", auth.accessToken);
  localStorage.setItem("refreshToken", auth.refreshToken);
  localStorage.setItem("user", JSON.stringify(auth.user));
}

export function clearAuthSession() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

export function getCurrentUser(): AuthResponse["user"] | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}