import { Button as ButtonPrimitive } from "@ui-sdk/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Spinner } from "./spinner"

const buttonStyles = cva(
  "pressable focus-ring relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none data-disabled:cursor-not-allowed data-disabled:opacity-45 data-pending:cursor-progress [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent-strong text-white shadow-accent hover:bg-accent-hover",
        secondary: "bg-sunken text-ink hover:bg-[#e3d8d5]",
        dark: "bg-slate text-inverse hover:bg-slate-hover",
        outline: "bg-paper text-ink shadow-raised hover:bg-sunken",
        ghost: "text-ink hover:bg-fill-soft",
        danger: "bg-danger text-inverse hover:bg-danger-hover",
      },
      size: {
        sm: "h-8 px-3.5 text-[13px]",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
)

type ButtonProps = Omit<ComponentProps<typeof ButtonPrimitive>, "children"> &
  VariantProps<typeof buttonStyles> & { children?: ReactNode }

function Button({ className, variant, size, children, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive className={cn(buttonStyles({ variant, size }), className)} {...props}>
      <PendingSwap>{children}</PendingSwap>
    </ButtonPrimitive>
  )
}

function PendingSwap({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="inline-flex items-center gap-2 transition-[opacity,filter] duration-200 ease-out in-data-pending:opacity-0 in-data-pending:blur-[2px]">
        {children}
      </span>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 ease-out in-data-pending:opacity-100">
        <Spinner />
      </span>
    </>
  )
}

export { Button, buttonStyles, PendingSwap }
