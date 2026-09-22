import { useEffect } from "react";
import { ImmersiveHero, DS } from "./components/ImmersiveHero";
import { ProductShowcase } from "./components/ProductShowcase";
import { ProductDock } from "./components/ProductDock";
import { CheckoutBlock } from "./components/CheckoutBlock";
import "./App.css";

// Números REAIS do pipeline (data-sales-agent/output/resumo_executivo.json).
// Sem depoimento inventado: prova = dado verificável.
const STATS = [
  { value: "50", label: "registros processados e validados" },
  { value: "100%", label: "qualidade dos dados" },
  { value: "10", label: "campos por registro" },
  { value: "R$ 2,88 M", label: "preço médio (dataset SP)" },
];

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div id="inicio" className="min-h-screen bg-[#0B0F1A] text-white antialiased">
      <ImmersiveHero />

      <div id="metodo">
        <ProductShowcase />
      </div>

      {/* Prova com dados reais do pipeline */}
      <section id="depoimentos" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center text-3xl font-black md:text-5xl">
          Prova, não promessa: <span style={{ color: DS.secondary }}>números do pipeline</span>
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur transition-colors duration-200 hover:border-white/30"
            >
              <div className="text-4xl font-black" style={{ color: DS.accent }}>
                {s.value}
              </div>
              <div className="mt-2 text-sm text-white/60">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <CheckoutBlock />

      <ProductDock />
    </div>
  );
}

export default App;
