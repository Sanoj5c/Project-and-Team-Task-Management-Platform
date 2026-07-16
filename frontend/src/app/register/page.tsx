"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AxiosError } from "axios";
import {
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  clearAuthSession,
  register,
} from "@/lib/auth-api";

type ApiErrorResponse = {
  message?: string | string[];
};

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof AxiosError) {
    const responseData = error.response
      ?.data as ApiErrorResponse | undefined;

    const message = responseData?.message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    setError("");
    setSuccess("");

    if (trimmedName.length < 2) {
      setError(
        "Full name must contain at least 2 characters.",
      );
      return;
    }

    if (!trimmedEmail) {
      setError("Email address is required.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters.",
      );
      return;
    }

    setLoading(true);

    try {
      // Remove any previously saved login session.
      clearAuthSession();

      await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
      });

      // Make sure registration does not keep any tokens.
      clearAuthSession();

      setSuccess(
        "Account created successfully. Redirecting to login...",
      );

      setName("");
      setEmail("");
      setPassword("");

      window.setTimeout(() => {
        router.replace(
          `/login?registered=true&email=${encodeURIComponent(
            trimmedEmail,
          )}`,
        );
      }, 1000);
    } catch (caughtError: unknown) {
      setError(
        getErrorMessage(
          caughtError,
          "Registration failed. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="mb-6 flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
          <Image
            src="/logo.png"
            alt="TaskFlow"
            width={56}
            height={13}
            priority
          />
        </div>
      </div>

      <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
        Create your TaskFlow account
      </h1>

      <p className="mb-8 text-center text-gray-500">
        Join the world&apos;s most focused
        productivity suite.
      </p>

      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="register-name"
              className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              Full name
            </label>

            <input
              id="register-name"
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              disabled={loading}
              placeholder="John Doe"
              autoComplete="name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              Email address
            </label>

            <input
              id="register-email"
              type="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              disabled={loading}
              placeholder="name@company.com"
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="register-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                required
                minLength={8}
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                disabled={loading}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) => !current,
                  )
                }
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <p className="mt-1.5 text-xs text-gray-400">
              At least 8 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || Boolean(success)}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Creating account..."
              : success
                ? "Account created"
                : "Create account"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-indigo-600 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
