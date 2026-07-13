"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { ensureUserProfile } from "@/lib/ensure-user-profile";
import { mapAuthError } from "@/lib/auth-errors";

interface FormValues {
  displayName: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

export default function RegistratiPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), values.email, values.password);
      await updateProfile(cred.user, { displayName: values.displayName });
      await ensureUserProfile(cred.user);
      router.push("/onboarding");
    } catch (err) {
      setError(mapAuthError(err));
    }
  };

  const onGoogleSignUp = async () => {
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Crea il tuo account</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-gray-700">
            Nome
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            {...register("displayName", { required: "Inserisci il tuo nome" })}
          />
          {errors.displayName && (
            <p className="mt-1 text-sm text-red-600">{errors.displayName.message}</p>
          )}
        </div>
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
            autoComplete="new-password"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            {...register("password", {
              required: "Inserisci una password",
              minLength: { value: 6, message: "Almeno 6 caratteri" },
            })}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="passwordConfirm" className="mb-1 block text-sm font-medium text-gray-700">
            Conferma password
          </label>
          <input
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            {...register("passwordConfirm", {
              validate: (value) => value === watch("password") || "Le password non coincidono",
            })}
          />
          {errors.passwordConfirm && (
            <p className="mt-1 text-sm text-red-600">{errors.passwordConfirm.message}</p>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[44px] rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Registrati
        </button>
      </form>
      <div className="my-4 flex items-center gap-2 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        oppure
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <button
        onClick={onGoogleSignUp}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
      >
        Continua con Google
      </button>
      <p className="mt-6 text-center text-sm text-gray-600">
        Hai già un account?{" "}
        <Link href="/login" className="font-medium text-brand-700">
          Accedi
        </Link>
      </p>
    </div>
  );
}
