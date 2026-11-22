"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { NAV_LINKS, START_HREF } from "../content";
import { Button, Logo } from "../kit";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-500",
        scrolled ? "border-white/[0.06] bg-[#0b0b0b]/80 backdrop-blur-xl" : "border-white/10 bg-white/[0.04] backdrop-blur-md",
      )}
    >
      <div className="mx-auto grid h-12 max-w-[1010px] grid-cols-[1fr_auto] items-center px-5 md:grid-cols-[1fr_auto_1fr]">
        <Link href="#inicio" aria-label="Inicio">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm tracking-[-0.02em] text-lp-body transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-2">
          <Button href="/empresas" variant="glass" size="sm">
            Empresas
          </Button>
          <Button href="#producto" variant="glass" size="sm" className="hidden sm:inline-flex">
            Cómo funciona
          </Button>
          <Button href={START_HREF} variant="solid" size="sm">
            Grabar mi logro
          </Button>
        </div>
      </div>
    </header>
  );
}
