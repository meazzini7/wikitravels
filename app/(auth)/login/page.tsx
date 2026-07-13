"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { ensureUserProfile } from "@/lib/ensure-user-profile";
import { mapAuthError } from "@/lib/auth-errors";

interface FormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), values.email, values.password);
      const profile = await ensureUserProfile(cred.user);
      router.push(profile.onboardingCompleted ? "/" : "/onboarding");
    } catch (err) {
      setError(mapAuthError(err));
    }
  };

  const onGoogleLogin = async () => {
    setError(null);
    try {
      const cred = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
      const profile = await ensureUserProfile(cred.user);
      router.push(profile.onboardingCompleted ? "/" : "/onboarding");
    } catch (err) {
      setError(mapAuthError(err));
    }
  };

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Accedi</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            {...register("email", { required: "Inserisci la tua email" })}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            {...register("password", { required: "Inserisci la password" })}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[44px] rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Accedi
        </button>
      </form>
      <div className="my-4 flex items-center gap-2 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        oppure
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <button
        onClick={onGoogleLogin}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
      >
        Continua con Google
      </button>
      <p className="mt-6 text-center text-sm text-gray-600">
        Non hai un account?{" "}
        <Link href="/registrati" className="font-medium text-brand-700">
          Registrati
        </Link>
      </p>
    </div>
  );
}
