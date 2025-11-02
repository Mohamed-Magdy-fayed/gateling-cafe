import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import type * as React from "react";
import { LoadingSpinner } from "@/components/general/loading-spinner";
import { P } from "@/components/ui/typography";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export function SpinnerButton({
  className,
  variant,
  size,
  asChild = false,
  children,
  disabled,
  text,
  loadingText,
  isLoading,
  icon: Icon,
  progress,
  ...props
}: React.ComponentProps<typeof Button> & {
  loadingText?: string;
  text: string;
  isLoading: boolean;
  icon: LucideIcon | (() => React.JSX.Element);
  progress?: number;
}) {
  const { t } = useTranslation({
    en: { loading: "Loading..." },
    ar: { loading: "جار التحميل..." },
  });

  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "!whitespace-nowrap !overflow-hidden !relative !px-8 !min-w-fit !m-0",
        buttonVariants({ variant, size, className }),
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-4",
          isLoading && "opacity-0 transition-all",
        )}
      >
        <P>{text}</P>
        <Icon className="w-4 h-4" />
      </div>
      <div
        className={cn(
          "opacity-0 absolute flex items-center gap-2 px-4",
          isLoading && "opacity-100 transition-all",
        )}
      >
        <P>{loadingText || t("loading")}</P>
        <LoadingSpinner className="w-4 h-4" />
      </div>
    </Comp>
  );
}

export { Button, buttonVariants };
