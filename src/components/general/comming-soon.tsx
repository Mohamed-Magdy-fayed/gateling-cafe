"use client"

import { useTranslation } from "@/lib/i18n/useTranslation";
import { Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComingSoonProps {
  className?: string;
  title?: string;
  description?: string;
  showIcon?: boolean;
  variant?: "default" | "minimal" | "card";
}

export function ComingSoon({
  className,
  title,
  description,
  showIcon = true,
  variant = "default",
}: ComingSoonProps) {
  const { t } = useTranslation();

  const defaultTitle = t("common.comingSoon.title");
  const defaultDescription = t("common.comingSoon.description");

  const baseClasses = cn(
    "flex flex-col items-center justify-center text-center",
    "transition-all duration-200",
    "rtl:text-right"
  );

  const variantClasses = {
    default: cn(
      "p-8 rounded-lg",
      "bg-gradient-to-br from-muted/50 to-muted/30",
      "border border-border/50",
      "dark:from-muted/30 dark:to-muted/10"
    ),
    minimal: "p-4",
    card: cn(
      "p-6 rounded-xl shadow-sm",
      "bg-card border border-border",
      "dark:shadow-none"
    ),
  };

  const iconClasses = cn(
    "mb-4 transition-transform duration-300 hover:scale-110",
    "text-muted-foreground/70",
    variant === "minimal" && "mb-2"
  );

  const titleClasses = cn(
    "font-semibold text-foreground mb-2",
    variant === "default" && "text-xl",
    variant === "minimal" && "text-lg",
    variant === "card" && "text-lg"
  );

  const descriptionClasses = cn(
    "text-muted-foreground leading-relaxed max-w-md",
    variant === "default" && "text-sm",
    variant === "minimal" && "text-xs",
    variant === "card" && "text-sm"
  );

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      {showIcon && (
        <div className={iconClasses}>
          {variant === "minimal" ? (
            <Clock className="h-5 w-5" />
          ) : (
            <div className="relative">
              <Clock className="h-8 w-8" />
              <Sparkles className="h-4 w-4 absolute -top-1 -right-1 text-primary animate-pulse" />
            </div>
          )}
        </div>
      )}

      <h3 className={titleClasses}>
        {title || defaultTitle}
      </h3>

      <p className={descriptionClasses}>
        {description || defaultDescription}
      </p>
    </div>
  );
}

