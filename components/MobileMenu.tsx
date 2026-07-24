"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { useAuth } from "@/lib/auth-context";
import { useTranslations } from "@/lib/i18n/i18n-context";
import Modal from "@/components/ui/Modal";

interface MobileMenuProps {
  hasUnread: boolean;
}

// Su mobile la barra in basso mostra solo Home/Feed/Classifica/Profilo:
// tutto il resto (Enciclopedia, Chat, Notifiche, Crea viaggio, Esci) sta
// qui, dietro l'hamburger, per non affollare la barra fissa in fondo.
export default function MobileMenu({ hasUnread }: MobileMenuProps) {
  const { user } = useAuth();
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Apri il menu"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-brand-50 sm:hidden"
      >
        ☰
        {hasUnread && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-600" aria-hidden />}
      </button>

      <Modal open={open} onClose={close} title="Menu">
        <ul className="flex flex-col gap-1">
          <li>
            <Link
              href="/enciclopedia"
              onClick={close}
              className="tap-scale flex min-h-[48px] items-center rounded-2xl px-3 font-semibold text-gray-700 hover:bg-brand-50"
            >
              {t("encyclopedia")}
            </Link>
          </li>
          <li>
            <Link
              href="/info"
              onClick={close}
              className="tap-scale flex min-h-[48px] items-center rounded-2xl px-3 font-semibold text-gray-700 hover:bg-brand-50"
            >
              ℹ️ Come funziona
            </Link>
          </li>
          {user && (
            <>
              <li>
                <Link
                  href="/chat"
                  onClick={close}
                  className="tap-scale flex min-h-[48px] items-center rounded-2xl px-3 font-semibold text-gray-700 hover:bg-brand-50"
                >
                  {t("chat")}
                </Link>
              </li>
              <li>
                <Link
                  href="/notifiche"
                  onClick={close}
                  className="tap-scale flex min-h-[48px] items-center justify-between rounded-2xl px-3 font-semibold text-gray-700 hover:bg-brand-50"
                >
                  🔔 {t("notifications")}
                  {hasUnread && <span className="h-2 w-2 rounded-full bg-brand-600" aria-hidden />}
                </Link>
              </li>
              <li>
                <Link
                  href="/viaggi/nuovo"
                  onClick={close}
                  className="tap-scale flex min-h-[48px] items-center rounded-2xl px-3 font-semibold text-gray-700 hover:bg-brand-50"
                >
                  ✚ Crea un viaggio
                </Link>
              </li>
              <li className="mt-2 border-t border-gray-100 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    signOut(getFirebaseAuth());
                  }}
                  className="tap-scale flex min-h-[48px] w-full items-center rounded-2xl px-3 text-left font-semibold text-gray-500 hover:bg-gray-50"
                >
                  {t("logout")}
                </button>
              </li>
            </>
          )}
          {!user && (
            <>
              <li>
                <Link
                  href="/login"
                  onClick={close}
                  className="tap-scale flex min-h-[48px] items-center rounded-2xl px-3 font-semibold text-gray-700 hover:bg-brand-50"
                >
                  {t("login")}
                </Link>
              </li>
              <li>
                <Link
                  href="/registrati"
                  onClick={close}
                  className="tap-scale flex min-h-[48px] items-center rounded-2xl bg-brand-600 px-3 font-bold text-white"
                >
                  {t("register")}
                </Link>
              </li>
            </>
          )}
        </ul>
      </Modal>
    </>
  );
}
