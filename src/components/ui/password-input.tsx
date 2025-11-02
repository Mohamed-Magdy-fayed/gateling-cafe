"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import {
  useState,
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
  type ChangeEvent,
  useEffect,
  useDeferredValue,
  useMemo,
} from "react"
import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const PasswordInputContext = createContext<{ password: string } | null>(null)

export function PasswordInput({
  className,
  children,
  onChange,
  value,
  defaultValue,
  ...props
}: Omit<ComponentProps<typeof Input>, "type"> & {
  children?: ReactNode
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState(defaultValue ?? "")
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr")

  useEffect(() => {
    if (typeof window === "undefined") return

    const root = document.documentElement

    const readDirection = () =>
      (root.getAttribute("dir")?.toLowerCase() === "rtl" ? "rtl" : "ltr") as
      | "ltr"
      | "rtl"

    setDirection(prev => {
      const next = readDirection()
      return prev === next ? prev : next
    })

    const observer = new MutationObserver(() => {
      setDirection(prev => {
        const next = readDirection()
        return prev === next ? prev : next
      })
    })

    observer.observe(root, { attributes: true, attributeFilter: ["dir"] })

    return () => observer.disconnect()
  }, [])

  const Icon = showPassword ? EyeOffIcon : EyeIcon
  const currentValue = value ?? password
  const isRtl = direction === "rtl"
  const inputPadding = isRtl ? "pe-9 ps-3" : "ps-9 pe-3"
  const togglePosition = isRtl ? "end-2" : "start-2"

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    onChange?.(e)
  }

  return (
    <PasswordInputContext value={{ password: currentValue.toString() }}>
      <div className="space-y-3">
        <div className="relative">
          <Input
            {...props}
            value={value}
            defaultValue={defaultValue}
            type={showPassword ? "text" : "password"}
            className={cn(inputPadding, className)}
            onChange={handleChange}
          />
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className={cn(
              "absolute top-1/2 size-7 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground",
              togglePosition,
            )}
            onClick={() => setShowPassword(p => !p)}
          >
            <Icon className="size-5" />
            <span className="sr-only">
              {showPassword ? "Hide password" : "Show password"}
            </span>
          </Button>
        </div>
        {children}
      </div>
    </PasswordInputContext>
  )
}

export function PasswordInputStrengthChecker() {
  const [optionsLoaded, setOptionsLoaded] = useState(false)
  const [errorLoadingOptions, setErrorLoadingOptions] = useState(false)

  const { password } = usePasswordInput()
  const deferredPassword = useDeferredValue(password)
  const strengthResult = useMemo(() => {
    if (!optionsLoaded || deferredPassword.length === 0) {
      return { score: 0, feedback: { warning: undefined } } as const
    }

    return zxcvbn(deferredPassword)
  }, [optionsLoaded, deferredPassword])

  useEffect(() => {
    Promise.all([
      import("@zxcvbn-ts/language-common"),
      import("@zxcvbn-ts/language-en"),
    ])
      .then(([common, english]) => {
        zxcvbnOptions.setOptions({
          translations: english.translations,
          graphs: common.adjacencyGraphs,
          maxLength: 50,
          dictionary: {
            ...common.dictionary,
            ...english.dictionary,
          },
        })
        setOptionsLoaded(true)
      })
      .catch(() => setErrorLoadingOptions(true))
  }, [])

  function getLabel() {
    if (deferredPassword.length === 0) return "Password strength"
    if (!optionsLoaded) return "Loading strength checker"

    const score = strengthResult.score
    switch (score) {
      case 0:
      case 1:
        return "Very weak"
      case 2:
        return "Weak"
      case 3:
        return "Strong"
      case 4:
        return "Very strong"
      default:
        throw new Error(`Invalid score: ${score satisfies never}`)
    }
  }

  const label = getLabel()

  if (errorLoadingOptions) return null

  return (
    <div className="space-y-0.5">
      <div
        role="progressbar"
        aria-label="Password Strength"
        aria-valuenow={strengthResult.score}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuetext={label}
        className="flex gap-1"
      >
        {Array.from({ length: 4 }).map((_, i) => {
          const color =
            strengthResult.score >= 3 ? "bg-primary" : "bg-destructive"

          return (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full",
                strengthResult.score > i ? color : "bg-secondary",
              )}
            />
          )
        })}
      </div>
      <div className="flex justify-end text-sm text-muted-foreground">
        {strengthResult.feedback.warning == null ? (
          label
        ) : (
          <Tooltip>
            <TooltipTrigger className="underline underline-offset-1">
              {label}
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4} className="text-base">
              {strengthResult.feedback.warning}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

const usePasswordInput = () => {
  const context = useContext(PasswordInputContext)
  if (context == null) {
    throw new Error(
      "usePasswordInput must be used within a PasswordInputContext",
    )
  }
  return context
}
