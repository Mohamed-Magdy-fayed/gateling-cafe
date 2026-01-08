import type { ReactNode } from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function WrapWithTooltip({
    children,
    text,
    delay,
}: {
    children: ReactNode;
    text: string | ReactNode;
    delay?: number;
}) {
    return (
        <Tooltip delayDuration={delay}>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent>{text}</TooltipContent>
        </Tooltip>
    );
}
