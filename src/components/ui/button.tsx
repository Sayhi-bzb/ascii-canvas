/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"
import { rx } from "@/styles/recipes"
import type { Shape, Size, Tone } from "@/styles/tokens"

export type ButtonTone = Tone
export type ButtonSize = Size
export type ButtonShape = Shape

export type LegacyButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"

export type LegacyButtonSize =
  | "default"
  | "sm"
  | "lg"
  | "icon"
  | "icon-sm"
  | "icon-lg"

type ButtonVariantInput = {
  className?: string
  tone?: ButtonTone
  size?: ButtonSize | LegacyButtonSize
  shape?: ButtonShape
  variant?: LegacyButtonVariant
  outlined?: boolean
}

const variantToneMap: Record<LegacyButtonVariant, ButtonTone> = {
  default: "primary",
  destructive: "danger",
  outline: "neutral",
  secondary: "neutral",
  ghost: "subtle",
  link: "link",
}

const normalizeSize = (
  size: ButtonSize | LegacyButtonSize | undefined
): { size: ButtonSize; shape: ButtonShape | undefined } => {
  if (!size || size === "default") return { size: "md", shape: undefined }
  if (size === "sm" || size === "md" || size === "lg") {
    return { size, shape: undefined }
  }
  if (size === "icon-sm") return { size: "sm", shape: "square" }
  if (size === "icon-lg") return { size: "lg", shape: "square" }
  return { size: "md", shape: "square" }
}

const resolveButtonStyle = ({
  tone,
  size,
  shape,
  variant,
  outlined,
}: Omit<ButtonVariantInput, "className">) => {
  const normalized = normalizeSize(size)
  const resolvedTone = tone ?? variantToneMap[variant ?? "default"]
  const resolvedShape = shape ?? normalized.shape ?? "auto"
  const resolvedOutlined = outlined ?? variant === "outline"

  return {
    tone: resolvedTone,
    size: normalized.size,
    shape: resolvedShape,
    outlined: resolvedOutlined,
  }
}

const buttonVariants = (options: ButtonVariantInput = {}) => {
  const resolved = resolveButtonStyle(options)
  return cn(
    rx.control({
      tone: resolved.tone,
      size: resolved.size,
      shape: resolved.shape,
      outlined: resolved.outlined,
    }),
    options.className
  )
}

type ButtonProps = React.ComponentProps<"button"> & {
  asChild?: boolean
  tone?: ButtonTone
  shape?: ButtonShape
  size?: ButtonSize | LegacyButtonSize
  variant?: LegacyButtonVariant
  outlined?: boolean
}

function Button({
  className,
  tone,
  variant,
  size = "default",
  shape,
  outlined,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"
  const resolved = resolveButtonStyle({ tone, variant, size, shape, outlined })

  return (
    <Comp
      data-slot="button"
      data-tone={resolved.tone}
      data-size={resolved.size}
      data-shape={resolved.shape}
      className={buttonVariants({ tone, variant, size, shape, outlined, className })}
      {...props}
    />
  )
}

export { Button, buttonVariants }
