import { MagneticDock } from "@/components/ui/magnetic-dock";
import { Home, Database, BookOpen, Sparkles, Mail } from "lucide-react";

const iconClass = "h-full w-full";

/**
 * Navegação fixa inferior (magnetic dock).
 * Rola suave até as seções da página única.
 */
export function ProductDock() {
  const go = (id) => () =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const items = [
    { id: "inicio", label: "Início", icon: <Home className={iconClass} />, onClick: go("inicio") },
    { id: "produtos", label: "Produtos", icon: <Database className={iconClass} />, onClick: go("produtos") },
    { id: "depoimentos", label: "Prova social", icon: <BookOpen className={iconClass} />, onClick: go("depoimentos") },
    { id: "metodo", label: "Método IA", icon: <Sparkles className={iconClass} />, onClick: go("metodo") },
    { id: "contato", label: "Contato", icon: <Mail className={iconClass} />, onClick: go("contato") },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center">
      <div className="pointer-events-auto dark">
        <MagneticDock items={items} variant="glass" iconSize={48} />
      </div>
    </div>
  );
}
