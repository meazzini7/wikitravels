"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { ensureUserProfile } from "@/lib/ensure-user-profile";
import { mapAuthError } from "@/lib/auth-errors";
import FlamingoMascot from "@/components/FlamingoMascot";
import GoogleIcon from "@/components/GoogleIcon";

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

  // Completa l'accesso se si è tornati qui da un redirect Google (vedi
  // onGoogleLogin: il redirect è solo un fallback per quando il popup è
  // bloccato, quindi in pratica questo effect nella maggior parte dei casi
  // non trova nulla e non fa niente).
  useEffect(() => {
    getRedirectResult(getFirebaseAuth())
      .then(async (cred) => {
        if (!cred) return;
        const profile = await ensureUserProfile(cred.user);
        router.push(profile.onboardingCompleted ? "/" : "/onboarding");
      })
      .catch((err) => setError(mapAuthError(err)));
  }, [router]);

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

  // Il popup è il metodo principale: a differenza del redirect, non dipende
  // dal fatto che il browser condivida lo storage tra questo dominio e
  // l'authDomain di Firebase durante il round-trip (cosa che i browser
  // moderni bloccano sempre più spesso, causando un rientro "silenzioso"
  // senza login né errore). Il redirect resta come ripiego solo per i casi
  // in cui il popup viene davvero bloccato o non è supportato (es. alcuni
  // browser in-app).
  const onGoogleLogin = async () => {
    setError(null);
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    try {
      const cred = await signInWithPopup(auth, provider);
      const profile = await ensureUserProfile(cred.user);
      router.push(profile.onboardingCompleted ? "/" : "/onboarding");
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectErr) {
          setError(mapAuthError(redirectErr));
        }
        return;
      }
      setError(mapAuthError(err));
    }
  };

  return (
    <div className="card-surface w-full max-w-sm p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <FlamingoMascot className="h-14 w-14" />
        <h1 className="font-heading text-2xl font-bold text-gray-900">Bentornato!</h1>
        <p className="text-sm text-gray-500">Accedi per continuare il tuo viaggio.</p>
      </div>

      <button
        onClick={onGoogleLogin}
        className="tap-scale flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 px-4 font-bold text-gray-700 hover:bg-gray-50"
      >
        <GoogleIcon className="h-5 w-5" />
        Continua con Google
      </button>

      <div className="my-5 flex items-center gap-2 text-xs font-semibold text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        oppure con email
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-bold text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-2.5 focus:border-brand-400 focus:outline-none"
            {...register("email", { required: "Inserisci la tua email" })}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-bold text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-2xl border-2 border-gray-200 px-4 py-2.5 focus:border-brand-400 focus:outline-none"
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
          className="tap-scale min-h-[48px] rounded-2xl bg-brand-600 px-4 py-2 font-heading font-bold text-white shadow-pop hover:bg-brand-700 disabled:opacity-60"
        >
          Accedi
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600">
        Non hai un account?{" "}
        <Link href="/registrati" className="font-bold text-brand-700">
          Registrati
        </Link>
      </p>
    </div>
  );
}
