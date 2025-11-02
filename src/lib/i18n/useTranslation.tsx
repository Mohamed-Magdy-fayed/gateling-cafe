"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import { setLocaleCookie } from "@/lib/i18n/actions";
import { mainTranslations } from "@/lib/i18n/global";
import { createI18n, type LanguageMessages } from "./lib";

const TranslationContext = createContext({
  locale: "en",
  dir: "ltr" as "rtl" | "ltr",
  setLocale: (_: string) => { },
  fallbackLocale: "en",
});

export function TranslationProvider({
  defaultLocale = navigator.language,
  fallbackLocale,
  children,
}: {
  fallbackLocale: string;
  defaultLocale?: string;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState(defaultLocale);
  const dir = useMemo(() => (locale === "ar" ? "rtl" : "ltr"), [locale]);

  return (
    <TranslationContext.Provider
      value={{ locale, setLocale, fallbackLocale, dir }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation<
  const T extends Record<string, LanguageMessages>,
>(translations?: T) {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LocaleProvider");
  }

  // Create a new, fully-typed i18n instance every time,
  // based on the provided translations and the current locale from context.
  const { t } = useMemo(
    () =>
      createI18n(
        translations || mainTranslations,
        context.locale,
        context.fallbackLocale,
      ),
    [translations, context.locale, context.fallbackLocale],
  );

  const [isPending, startTransition] = useTransition();

  const setLocale = (newLocale: string) => {
    // 1. Optimistically update the client-side state immediately.
    const newDir = newLocale === "ar" ? "rtl" : "ltr";
    document.dir = newDir;
    document.getElementsByTagName("html")[0]?.setAttribute("dir", newDir);
    context.setLocale(newLocale);

    // 2. Call the server action in a transition to avoid blocking UI.
    startTransition(() => {
      setLocaleCookie(newLocale);
    });
  };

  return {
    isPending,
    locale: context.locale,
    dir: context.dir,
    setLocale,
    t,
  };
}
