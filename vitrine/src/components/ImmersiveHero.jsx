import { SilkAurora } from "@/components/ui/silk-aurora";
import { KineticTextReveal } from "@/components/ui/kinetic-text-reveal";
import { ArrowDown, Play } from "lucide-react";

// Paleta do design-system/vitrine/MASTER.md (modo dark imersivo)
export const DS = {
  primary: "#7C3AED",
  secondary: "#A78BFA",
  accent: "#16A34A",
  base: "#0B0F1A",
  mid: "#1A1033",
};

/**
 * Hero imersivo: camada WebGL (silk-aurora) + loop animado local.
 * `public/hero-loop.gif` gerado via /tmp/opencode/gen-hero.py (100% local).
 * Para usar vídeo real: drope `public/hero.mp4` e troque o <img> por <video>.
 */
export function ImmersiveHero() {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative">
      <SilkAurora
        baseColor={DS.base}
        midColor={DS.mid}
        accentColor={DS.primary}
        sheenColor={DS.accent}
        speed={0.9}
        intensity={1.1}
      >
        {/* Camada de movimento (loop local, data-flow nas cores do DS) */}
        <img
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
          src="/hero-loop.gif"
          alt=""
          aria-hidden="true"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />

        <div className="relative z-10">
          <p
            className="mb-5 text-xs font-medium uppercase tracking-[0.24em]"
            style={{ color: DS.secondary }}
          >
            Fábrica de Renda IA — vitrine local
          </p>
          <h1 className="max-w-[820px] text-5xl font-black leading-[1.02] text-white md:text-7xl">
            <KineticTextReveal
              text="Dados viram produtos."
              splitBy="words"
              direction="up"
              stagger={0.09}
            />
            <br />
            <KineticTextReveal
              text="Produtos viram renda."
              splitBy="words"
              direction="up"
              stagger={0.09}
              delay={0.5}
              segmentClassName="text-white/60"
            />
          </h1>
          <p className="mt-7 max-w-[620px] text-base leading-relaxed text-white/70 md:text-xl">
            Datasets limpos, guias técnicos e packs de prompts — gerados pelo
            data-sales-agent, servidos desta máquina, sem Vercel.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => scrollTo("produtos")}
              className="cursor-pointer rounded-xl px-7 py-3.5 font-semibold text-black transition-transform duration-200 hover:-translate-y-0.5"
              style={{ background: DS.accent }}
            >
              Ver produtos
            </button>
            <button
              type="button"
              onClick={() => scrollTo("contato")}
              className="cursor-pointer rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 font-semibold text-white backdrop-blur transition-colors duration-200 hover:border-white/50"
            >
              <Play className="mr-2 inline h-4 w-4" />
              Como funciona
            </button>
          </div>
        </div>
      </SilkAurora>

      <button
        type="button"
        onClick={() => scrollTo("produtos")}
        aria-label="Rolar para produtos"
        className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 cursor-pointer rounded-full border border-white/20 bg-white/5 p-3 text-white/70 backdrop-blur transition-colors hover:border-white/50 hover:text-white"
      >
        <ArrowDown className="h-5 w-5 animate-bounce" />
      </button>
    </div>
  );
}
