import { SfButton, SfBadge } from "@storefront-ui/react";
import { Check, ShieldCheck } from "lucide-react";
import { DS } from "./ImmersiveHero";

const INCLUDES = [
  "Dataset com 50 registros (JSON + CSV)",
  "Guia técnico com 7 capítulos",
  "Metadados e documentação",
  "30 dias de atualizações",
  "Suporte via e-mail e WhatsApp",
];

/**
 * Bloco de checkout: card no padrão do DS + botões do Storefront UI.
 * Tokens SFUI mapeados para a paleta local em index.css (@theme).
 * Troque os hrefs pelos links reais (Hotmart/Kiwify/Pix).
 */
export function CheckoutBlock() {
  return (
    <section id="contato" className="border-t border-white/10 px-6 py-24">
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
        <SfBadge content="MELHOR OFERTA" />
        <h2 className="mt-4 text-2xl font-black">Pacote Completo</h2>
        <div className="mt-2 text-5xl font-black" style={{ color: DS.accent }}>
          R$ 49,90
        </div>
        <p className="mt-1 text-sm text-white/50">pagamento único</p>

        <ul className="mt-6 space-y-2.5 text-left text-sm text-white/80">
          {INCLUDES.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: DS.accent }} />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-3">
          <SfButton size="lg" className="w-full cursor-pointer">
            Comprar agora
          </SfButton>
          <SfButton size="lg" variant="secondary" className="w-full cursor-pointer">
            Pagar via Pix
          </SfButton>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/40">
          <ShieldCheck className="h-3.5 w-3.5" />
          Pagamento seguro · Download imediato · 7 dias de garantia
        </p>
      </div>
      <p className="mt-10 text-center text-xs text-white/30">
        Vitrine local — servida desta máquina · sem Vercel
      </p>
    </section>
  );
}
