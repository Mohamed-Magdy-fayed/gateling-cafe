import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"
import { type ComponentProps } from "react"

export function LoadingSpinner({
    className,
    ...props
}: ComponentProps<typeof Loader2Icon>) {
    return (
        <Loader2Icon
            size={20}
            className={cn("animate-spin", className)}
            {...props}
        />
    );
}
