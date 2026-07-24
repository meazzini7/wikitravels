"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// Impostare gli interessi non è mai stato davvero obbligatorio: il
// redirect a /onboarding scattava solo subito dopo login/registrazione, ma
// chi navigava altrove prima di completarlo (o tornava con una sessione
// già salvata) restava per sempre con gli interessi di default e
// onboardingCompleted a false. Questo guard, montato una volta sola nel
// layout radice, riporta a /onboarding da qualunque pagina finché non
// viene completato.
export default function OnboardingGuard() {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user || !profile) return;
    if (profile.onboardingCompleted) return;
    if (pathname === "/onboarding") return;
    router.replace("/onboarding");
  }, [loading, user, profile, pathname, router]);

  return null;
}
