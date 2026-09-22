import { StickyScrollCards } from "@/components/ui/sticky-scroll-cards";

// Cards 100% locais (public/cards/) — nada de Unsplash/CDN.
const CARDS = [
  { title: "Datasets limpos — JSON + CSV", src: "/cards/dataset.svg" },
  { title: "Guias técnicos — 7 capítulos", src: "/cards/ebook.svg" },
  { title: "Packs de prompts testados", src: "/cards/prompts.svg" },
];

/**
 * Seção de produtos com scroll fixo (sticky stack + Lenis).
 * Padrão do design system: Hero > Produtos > Prova social > CTA.
 */
export function ProductShowcase() {
  return (
    <section id="produtos" className="bg-[#0B0F1A] text-white">
      <StickyScrollCards cards={CARDS} hint="role para explorar os produtos" />
    </section>
  );
}
