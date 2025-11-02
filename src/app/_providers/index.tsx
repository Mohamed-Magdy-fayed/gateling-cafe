import { cookies } from "next/headers";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";
import { getSessionFromCookie } from "@/auth/core/session";
import { AuthProvider } from "@/auth/nextjs/components/auth-provider";
import { DirectionProvider } from "@/components/ui/direction-provider";
import { Toaster } from "@/components/ui/sonner";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/lib";
import { TranslationProvider } from "@/lib/i18n/useTranslation";

interface ProvidersProps {
  children: React.ReactNode;
}

export async function Providers({ children }: ProvidersProps) {
  const cookieStore = await cookies();

  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME);
  const locale = localeCookie?.value || "en";

  const session = await getSessionFromCookie(cookieStore);

  return (
    <Suspense>
      <TranslationProvider defaultLocale={locale} fallbackLocale={"en"}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NuqsAdapter>
            <DirectionProvider>
              <AuthProvider session={session}>
                <Toaster />
                {children}
              </AuthProvider>
            </DirectionProvider>
          </NuqsAdapter>
        </ThemeProvider>
      </TranslationProvider>
    </Suspense>
  );
}
