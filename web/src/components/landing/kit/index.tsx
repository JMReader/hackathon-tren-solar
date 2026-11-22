import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export { Reveal } from "./reveal";
export { Logo, LogoMark } from "./logo";

type ButtonVariant = "glass" | "solid" | "light";

const buttonVariants: Record<ButtonVariant, string> = {
  glass:
    "bg-white/[0.14] text-white ring-1 ring-inset ring-white/20 backdrop-blur-md hover:bg-white/[0.22]",
  solid: "bg-[#111] text-white ring-1 ring-inset ring-white/10 hover:bg-[#1c1c1c]",
  light: "bg-white text-lp-bg hover:bg-white/85",
};

export function Button({
  variant = "solid",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[-0.02em] whitespace-nowrap transition-[background-color,transform] duration-300 ease-lp active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-accent",
        size === "md" ? "h-10 px-4 text-[15px]" : "h-8 px-3 text-sm",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md bg-lp-accent-soft px-2 text-xs font-medium tracking-[-0.02em] text-lp-accent",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Heading whose trailing words fade to grey (Pulse signature). */
export function Heading({
  as: As = "h2",
  lead,
  fade,
  className,
}: {
  as?: "h1" | "h2" | "h3";
  lead: ReactNode;
  fade?: ReactNode;
  className?: string;
}) {
  return (
    <As className={cn("font-medium tracking-[-0.02em] text-balance text-lp-fg", className)}>
      {lead}
      {fade && (
        <>
          {" "}
          <span className="lp-fade">{fade}</span>
        </>
      )}
    </As>
  );
}

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1010px] px-5", className)} {...props} />;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-sm tracking-[-0.02em] text-lp-body", className)}>{children}</p>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-lp-line bg-gradient-to-b from-white/[0.05] to-white/[0.015]",
        className,
      )}
      {...props}
    />
  );
}

/** Soft blurred glow used behind section titles. */
export function Glow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -z-0 rounded-[50%] bg-[radial-gradient(closest-side,rgb(214_150_100/0.35),rgb(70_100_130/0.18)_55%,transparent)] blur-2xl",
        className,
      )}
    />
  );
}
