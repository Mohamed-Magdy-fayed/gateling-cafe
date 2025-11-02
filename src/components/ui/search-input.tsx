"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { SearchIcon, XIcon } from "lucide-react"

function SearchInput({
    className,
    type = "text",
    value,
    defaultValue,
    onChange,
    ...props
}: React.ComponentProps<typeof Input>) {
    return (
        <div className="relative">
            <Input
                type={type}
                value={value}
                defaultValue={defaultValue}
                onChange={onChange}
                className={cn("ps-3 pe-12", className)}
                {...props}
            />
            {!value ? (
                <SearchIcon
                    aria-hidden="true"
                    className={cn(
                        "pointer-events-none absolute top-1/2 size-5 -translate-y-1/2 text-muted-foreground end-3",
                    )}
                />
            ) : (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "absolute top-1/2 size-5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground end-1.5",
                    )}
                    onClick={() => onChange?.({ target: { value: "" } } as any)}
                >
                    <XIcon className="size-4" />
                    <span className="sr-only">Clear search input</span>
                </Button>
            )}
        </div>
    )
}

export { SearchInput }
