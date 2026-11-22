"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Reveal({
  delay = 0,
  className,
  style,
  ...props
}: ComponentProps<"div"> & { delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-visible={visible}
      className={cn("lp-reveal", className)}
      style={{ transitionDelay: `${delay}ms`, ...style }}
      {...props}
    />
  );
}
