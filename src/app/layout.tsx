import "./globals.css";

import type { Metadata } from "next";
import { Roboto_Serif } from "next/font/google";
import { cookies } from "next/headers";
import { Providers } from "@/app/_providers";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/lib";

export const metadata: Metadata = {
  title: {
    default: "Lavida Jungle Play",
    template: `%s | Lavida Jungle Play`,
  },
  description: "Manage your cafe with ease using Lavida Jungle Play.",
  authors: [
    {
      name: "Lavida Jungle Play",
      url: "https://gateling-cafe.vercel.app",
    },
  ],
  creator: "Lavida Jungle Play",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://gateling-cafe.vercel.app",
    title: "Lavida Jungle Play",
    description: "Manage your cafe with ease using Lavida Jungle Play.",
    siteName: "Lavida Jungle Play",
  },
};

const roboto = Roboto_Serif({
  subsets: ["latin"],
  variable: "--font-roboto-serif",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = (await cookies()).get(LOCALE_COOKIE_NAME)?.value || "en";

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${roboto.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
