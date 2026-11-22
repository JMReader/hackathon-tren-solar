"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { NAV_LINKS, START_HREF } from "../content";
import { Button, Logo } from "../kit";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:pt-4">
      <div
        className={cn(
          "pointer-events-auto grid h-12 w-full max-w-[960px] grid-cols-[1fr_auto] items-center gap-4 rounded-full pr-1.5 pl-4 ring-1 backdrop-blur-xl transition-[background-color,box-shadow,max-width] duration-500 ease-lp md:grid-cols-[1fr_auto_1fr]",
          scrolled
            ? "max-w-[920px] bg-[#0b0b0b]/80 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.65)] ring-white/10"
            : "bg-black/20 shadow-[0_8px_30px_-14px_rgb(0_0_0/0.35)] ring-white/15",
        )}
      >
        <Link href="#inicio" aria-label="Inicio" className="justify-self-start">
          <Logo />
        </Link>
        <nav aria-label="Secciones" className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm tracking-[-0.02em] text-white/80 transition-colors hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-1">
          <Link
            href="/empresas"
            className="hidden h-9 items-center rounded-full px-3 text-sm tracking-[-0.02em] text-white/80 transition-colors hover:text-white sm:inline-flex"
          >
            Empresas
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-full px-2 text-sm tracking-[-0.02em] text-white/80 transition-colors hover:text-white sm:px-3"
          >
            Ingresar
          </Link>
          <Button href={START_HREF} variant="light" size="sm" className="h-9 px-4">
            Grabar<span className="hidden sm:inline">&nbsp;mi logro</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
