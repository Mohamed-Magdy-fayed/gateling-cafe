import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ReactNode } from 'react'

export default function WrapWithTooltip({ children, text, delay }: { children: ReactNode, text: string | ReactNode, delay?: number }) {
    return (
        <Tooltip delayDuration={delay}>
            <TooltipTrigger asChild>
                {children}
            </TooltipTrigger>
            <TooltipContent>
                {text}
            </TooltipContent>
        </Tooltip>
    )
}
