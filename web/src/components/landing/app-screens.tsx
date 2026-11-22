import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";
import grabar from "./screens/grabar.jpg";
import portfolio from "./screens/portfolio.jpg";
import publicar from "./screens/publicar.jpg";
import revisar from "./screens/revisar.jpg";

/* Real captures of /app, taken with an example session (1280×800 @2x). Retake them when the app UI changes. */
export const APP_SCREENS: { src: StaticImageData; path: string; alt: string }[] = [
  { src: grabar, path: "/app/crear", alt: "Pantalla para contar un logro por audio, con la foto del proyecto ya cargada" },
  { src: revisar, path: "/app/crear/…/revisar", alt: "Pantalla de revisión: cada hecho muestra la frase de la que sale y una pregunta por un dato que falta" },
  { src: publicar, path: "/app/crear/…/publicar", alt: "Los posts para LinkedIn y X, listos para copiar, con la foto del proyecto" },
  { src: portfolio, path: "/app/portfolio", alt: "Editor del portfolio con la plantilla Galería y el logro aprobado" },
];

export function AppFrame({
  screen,
  priority = false,
  className,
}: {
  screen: (typeof APP_SCREENS)[number];
  priority?: boolean;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-xl border border-white/10 bg-[#1b1c22] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      <div className="flex h-9 items-center gap-3 border-b border-white/[0.06] px-3.5">
        <span className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2.5 rounded-full bg-white/15" />
          ))}
        </span>
        <span className="mx-auto flex h-6 max-w-[320px] flex-1 items-center justify-center truncate rounded-md bg-white/[0.05] px-3 font-lp-mono text-[11px] text-white/45">
          {screen.path}
        </span>
        <span className="w-[42px]" aria-hidden />
      </div>
      <Image
        src={screen.src}
        alt={screen.alt}
        placeholder="blur"
        sizes="(min-width: 1024px) 700px, 100vw"
        loading={priority ? "eager" : "lazy"}
        className="block h-auto w-full"
      />
    </figure>
  );
}
