import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

export function BackLink({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={cn("ltr:-ml-3 rtl:-mr-3", className)}
    >
      <Link
        href={href}
        className="flex gap-2 items-center text-sm text-muted-foreground"
      >
        <ArrowLeftIcon className="rtl:rotate-180" />
        {children}
      </Link>
    </Button>
  )
}
