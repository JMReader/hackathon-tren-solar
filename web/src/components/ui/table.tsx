import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto rounded-[22px] bg-paper shadow-raised">
      <table className={cn("w-full caption-bottom border-collapse text-sm", className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("[&_tr]:shadow-[inset_0_-1px_0_var(--color-divider)]", className)} {...props} />
}

function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:shadow-none", className)} {...props} />
}

function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "shadow-[inset_0_-1px_0_var(--color-divider)] transition-[background-color] duration-150 hover:bg-cream/70 data-selected:bg-accent-soft/50",
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-10 px-4 text-left align-middle text-[11px] font-semibold tracking-[0.06em] whitespace-nowrap text-ink-muted uppercase first:pl-6 last:pr-6",
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      className={cn("min-w-0 px-4 py-3 align-middle text-ink tabular-nums first:pl-6 last:pr-6", className)}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  return <caption className={cn("px-6 py-3 text-left text-xs text-ink-muted", className)} {...props} />
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption }
