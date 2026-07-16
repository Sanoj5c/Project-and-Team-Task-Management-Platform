"use client";

import { FormEvent, useEffect, useState } from "react";

type SettingsTab = "profile" | "security" | "account";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiErrorResponse = {
  message?: string | string[];
};

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000/api/v1"
).replace(/\/$/, "");

function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem("accessToken") ??
    localStorage.getItem("access_token") ??
    localStorage.getItem("token")
  );
}

function getErrorMessage(
  responseBody: ApiErrorResponse,
  fallback: string,
): string {
  if (Array.isArray(responseBody.message)) {
    return responseBody.message.join(", ");
  }

  return responseBody.message ?? fallback;
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export default function PmSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const token = getAccessToken();

      if (!token) {
        setError("You are not logged in. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/users/me`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const responseBody = (await response.json()) as
          | UserProfile
          | ApiErrorResponse;

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              responseBody as ApiErrorResponse,
              "Failed to load profile.",
            ),
          );
        }

        const user = responseBody as UserProfile;

        setProfile(user);
        setName(user.name);
        setEmail(user.email);
      } catch (caughtError: unknown) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to load profile.";

        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, []);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    const token = getAccessToken();

    if (!token) {
      setError("You are not logged in. Please log in again.");
      return;
    }

    if (name.trim().length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setSavingProfile(true);

    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
        }),
      });

      const responseBody = (await response.json()) as
        | UserProfile
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            responseBody as ApiErrorResponse,
            "Failed to update profile.",
          ),
        );
      }

      const updatedUser = responseBody as UserProfile;

      setProfile(updatedUser);
      setName(updatedUser.name);
      setEmail(updatedUser.email);
      setSuccess("Profile updated successfully.");

      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to update profile.";

      setError(message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    const token = getAccessToken();

    if (!token) {
      setError("You are not logged in. Please log in again.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSavingPassword(true);

    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      });

      const responseBody = (await response.json()) as
        | UserProfile
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            responseBody as ApiErrorResponse,
            "Failed to update password.",
          ),
        );
      }

      setProfile(responseBody as UserProfile);
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password updated successfully.");
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to update password.";

      setError(message);
    } finally {
      setSavingPassword(false);
    }
  }

  function changeTab(tab: SettingsTab) {
    setActiveTab(tab);
    clearMessages();
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8">
          <p className="text-gray-500">Loading your settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

      <p className="mt-2 text-gray-500">
        Manage your profile, password, and account information.
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6">
          <nav className="flex gap-8" aria-label="Settings tabs">
            <button
              type="button"
              onClick={() => changeTab("profile")}
              className={`border-b-2 px-1 py-4 text-sm font-medium transition ${
                activeTab === "profile"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Profile
            </button>

            <button
              type="button"
              onClick={() => changeTab("security")}
              className={`border-b-2 px-1 py-4 text-sm font-medium transition ${
                activeTab === "security"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Security
            </button>

            <button
              type="button"
              onClick={() => changeTab("account")}
              className={`border-b-2 px-1 py-4 text-sm font-medium transition ${
                activeTab === "account"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Account
            </button>
          </nav>
        </div>

        <div className="p-6">
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              {success}
            </div>
          )}

          {activeTab === "profile" && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Profile information
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Update your personal details and email address.
                </p>
              </div>

              <form
                onSubmit={handleProfileSubmit}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Full name
                  </label>

                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    minLength={2}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Enter your email address"
                  />
                </div>

                <div className="flex justify-end border-t border-gray-100 pt-5">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProfile ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "security" && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Change password
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Use a password containing at least 8 characters.
                </p>
              </div>

              <form
                onSubmit={handlePasswordSubmit}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="new-password"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    New password
                  </label>

                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(event.target.value)
                    }
                    minLength={8}
                    required
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Enter a new password"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Confirm new password
                  </label>

                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    minLength={8}
                    required
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Confirm your new password"
                  />
                </div>

                <div className="flex justify-end border-t border-gray-100 pt-5">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingPassword
                      ? "Updating..."
                      : "Update password"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "account" && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Account information
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  View your role, status, and account dates.
                </p>
              </div>

              {profile ? (
                <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                  <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">
                      User ID
                    </dt>
                    <dd className="break-all text-sm text-gray-900 sm:col-span-2">
                      {profile.id}
                    </dd>
                  </div>

                  <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">
                      Role
                    </dt>
                    <dd className="text-sm text-gray-900 sm:col-span-2">
                      {formatRole(profile.role)}
                    </dd>
                  </div>

                  <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">
                      Account status
                    </dt>
                    <dd className="sm:col-span-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          profile.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {profile.isActive ? "Active" : "Inactive"}
                      </span>
                    </dd>
                  </div>

                  <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">
                      Account created
                    </dt>
                    <dd className="text-sm text-gray-900 sm:col-span-2">
                      {formatDate(profile.createdAt)}
                    </dd>
                  </div>

                  <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">
                      Last updated
                    </dt>
                    <dd className="text-sm text-gray-900 sm:col-span-2">
                      {formatDate(profile.updatedAt)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-gray-500">
                  Account information is unavailable.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}