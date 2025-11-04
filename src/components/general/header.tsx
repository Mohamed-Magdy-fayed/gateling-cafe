"use client";

import { CoffeeIcon, LogOutIcon, MenuIcon, XIcon } from "lucide-react";
// import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { logOut } from "@/auth/nextjs/actions";
import { useAuth } from "@/auth/nextjs/components/auth-provider";
import { DarkModeSwitcher } from "@/components/general/dark-mode-switcher";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { LoadingSpinner } from "@/components/general/loading-spinner";
import WrapWithTooltip from "@/components/general/wrap-with-tooltip";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { H1, H3 } from "@/components/ui/typography";
import { useIsMobile } from "@/hooks/use-is-mobile";
import ar from "@/lib/i18n/global/ar";
import en from "@/lib/i18n/global/en";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";

export function Header() {
  const { t } = useTranslation({
    en,
    ar,
  });
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const session = useAuth();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigation = [
    { name: t("dashboard"), href: "/dashboard" },
    { name: t("productsTranslations.products"), href: "/products" },
    { name: t("ordersTranslations.orders"), href: "/orders" },
    { name: t("users"), href: "/users" },
  ].filter((screen) =>
    session.session?.user.screens.some((s) => screen.href.includes(s)),
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300 ease-in-out",
        isScrolled
          ? "border-b bg-background/80 backdrop-blur-md shadow-sm supports-backdrop-filter:bg-background/80"
          : "border-b border-transparent bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60",
      )}
    >
      <div className="container mx-auto px-4 sm:px-8 lg:px-12">
        <div className="flex h-16 gap-4 items-center justify-between">
          {/* Logo with enhanced styling */}
          <div className="flex items-center gap-2">
            {/* <Image
              src="/logo.png"
              alt="Logo"
              width={256}
              height={256}
              className="w-20 dark:invert"
            /> */}
            <CoffeeIcon size={32} className="text-primary-foreground bg-primary rounded-md p-1" />
            <H3 className="text-xl font-bold hidden md:inline">
              {t("appName")}
            </H3>
          </div>

          {/* Desktop Navigation with enhanced styling */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "relative px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-all duration-200 rounded-md hover:bg-accent/50 group",
                  pathname === item.href
                    ? "text-foreground bg-accent/50"
                    : "font-medium text-foreground/80",
                )}
              >
                {item.name}
                <span
                  className={cn(
                    "absolute inset-x-4 bottom-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left",
                  )}
                />
              </Link>
            ))}
          </nav>

          {/* Right side actions with improved spacing and animations */}
          <div className="flex items-center gap-2">
            {/* Theme and Language Switchers */}
            <div className="flex items-center gap-1">
              <div>
                <DarkModeSwitcher />
              </div>
              <div>
                <LanguageSwitcher />
              </div>
            </div>

            <div className="flex items-center gap-2 ml-2">
              {session.isAuthenticated && (
                <WrapWithTooltip text={t("auth.signOut")}>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    className="transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      startTransition(async () => {
                        await logOut();
                      })
                    }
                  >
                    {isPending ? <LoadingSpinner /> : <LogOutIcon size={16} />}
                  </Button>
                </WrapWithTooltip>
              )}
            </div>

            {/* Enhanced Mobile Navigation */}
            <div className="lg:hidden ml-2">
              <Sheet
                open={isMobileMenuOpen}
                onOpenChange={setIsMobileMenuOpen}
                modal
              >
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="transition-all duration-200 hover:scale-105"
                  >
                    <MenuIcon size={20} />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  hideCloseButton
                  side={isMobile ? "bottom" : "right"}
                  className="w-full md:w-80 p-0"
                >
                  <SheetHeader className="sr-only">
                    <SheetTitle>{t("common.menu")}</SheetTitle>
                  </SheetHeader>
                  {/* Mobile Menu Header */}
                  <div className="flex items-center justify-between p-6 border-b">
                    <H1 className="text-xl font-bold">{t("appName")}</H1>
                    <SheetClose asChild>
                      <Button variant="ghost" size="sm">
                        <XIcon size={20} />
                      </Button>
                    </SheetClose>
                  </div>

                  {/* Mobile Navigation Links */}
                  <div className="flex flex-col p-6 space-y-2">
                    {navigation.map((item, index) => (
                      <Button
                        variant="ghost"
                        size="lg"
                        key={item.name}
                        className="w-full justify-start text-left transition-all duration-200 hover:translate-x-2"
                        asChild
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.name}
                        </Link>
                      </Button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
