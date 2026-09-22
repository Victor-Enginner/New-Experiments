#!/usr/bin/env python3
"""
🎨 ADAPTADOR 77lib → Vitrine de Produto

Pega um template da biblioteca 77lib (HTML standalone, Tailwind CDN +
UnicornStudio WebGL) e injeta a copy real do produto — preservando
100% do design, animações e efeitos.

Uso:
  python3 adaptar-template.py templates-77lib/aura-enterprise-digital-6.html dist/advocacia/index.html
"""

import sys, json

TEMPLATE = sys.argv[1] if len(sys.argv) > 1 else 'templates-77lib/aura-enterprise-digital-6.html'
SAIDA = sys.argv[2] if len(sys.argv) > 2 else 'dist/advocacia/index.html'

# === COPY DO PRODUTO (Pack Prompts Jurídicos — fonte: brief + pesquisa sixth X1) ===
SUBS = [
    # --- <title> e meta ---
    ("Niteco - Enterprise Digital Agency", "Pack Prompts Jurídicos — Recupere 4 Dias por Mês"),

    # --- NAV ---
    ("NITECO", "LEX·IA"),
    (">Work<", ">Os 10 Prompts<"),
    (">Careers<", ">Garantia<"),

    # --- HERO ---
    ("Where global delivery meets digital excellence.",
     "Recupere 4 dias por mês com 0% de alucinação."),
    ("We're a global digital agency creating localized, high-performing commerce and marketing solutions for enterprise brands.",
     "Em 2025, um advogado foi condenado por litigância de má-fé por usar petição com leis falsas criadas por IA. O problema não era a IA — era a falta de validação. Este pack entrega 10 prompts jurídicos com checklist anti-alucinação e protocolo LGPD embutido."),
    ("Discover NICEf", "QUERO O PACK — R$ 47"),

    # --- SEÇÃO SERVIÇOS → PILARES DO PACK ---
    ("Digital mastery across all fronts.", "Um pack. Três camadas de proteção."),
    ("Web &amp; E-Commerce", "Anti-Alucinação"),
    ("We build robust, scalable platforms that drive conversions and elevate user experiences.",
     "Cada prompt obriga a IA a declarar o nível de confiança e sinalizar o que exige conferência humana. Nenhuma lei inventada passa despercebida."),
    ("Digital Marketing", "Protocolo LGPD"),
    ("Data-driven strategies that amplify your brand's reach, engage your target audience, and maximize your return on investment.",
     "O que você pode — e o que NUNCA deve — colocar em ferramentas cloud. Inclui fluxo 100% offline com modelos locais para dados sensíveis."),
    ("Managed Services", "10 Fluxos Prontos"),
    ("Continuous optimization, technical support, and proactive maintenance to ensure your digital assets run at peak performance.",
     "Petição, jurisprudência, contratos, pareceres, e-mails, atas e compliance. Copie, cole, valide. Funciona em ChatGPT, Claude, Gemini e Ollama."),

    # --- CASE HEINEKEN → O CASO 2025 ---
    ("A localized B2B ordering solution for Heineken",
     "O caso que mudou a advocacia: a condenação de 2025"),
    ("They have been an excellent partner in our digital transformation journey, providing top-tier solutions and exceptional service.",
     "Um advogado entregou petição com leis e jurisprudência inventadas por IA — sem conferir. Foi condenado por litigância de má-fé. Todo advogado conhece esse caso. Este pack existe para que você nunca vire essa manchete: cada prompt tem validação humana obrigatória embutida no fluxo."),

    # --- THE LATEST → MERCADO EM MOVIMENTO ---
    ("The latest", "O mercado já está se movendo"),
    ("Get the latest insights on digital transformation and e-commerce.",
     "OAB + Stanford firmaram parceria para pesquisar IA na advocacia. O CFOAB lançou plano nacional de IA. Escritórios reportam 40% menos tempo em tarefas operacionais. Quem se profissionalizar primeiro, cobra mais caro depois."),
    ("Understanding composable architecture and its impact on modern enterprise commerce",
     "Advogados que usam IA recuperam até 4 dias por mês — veja como, com segurança"),

    # --- OUR CLIENTS → PARA QUEM É ---
    ("Our clients", "Para quem é este pack"),

    # --- CHARITY → GARANTIA ---
    ("Niteco Charity Foundation", "Garantia incondicional de 7 dias"),
    ("Making a difference in communities", "Não recuperou tempo na primeira semana? Devolvemos 100%."),

    # --- OFFICES → OS 10 PROMPTS (cidades viram os prompts!) ---
    ("Our offices around the world", "Os 10 prompts do pack"),
    ("Stockholm", "01 · Resumo de Petição"),
    ("London", "02 · Jurisprudência Certa"),
    ("Hanoi", "03 · Análise de Contrato"),
    ("Ho Chi Minh City", "04 · Resposta a Cliente"),
    ("Sydney", "05 · Petição Inicial"),
    ("Hong Kong", "06 · Due Diligence"),

    # --- CTA FINAL ---
    ("Ready to transform your digital presence?",
     "A IA já escreve a petição. Quem valida é você."),
    ("Let's work together", "Garantir meu pack — R$ 47"),
]

def main():
    html = open(TEMPLATE, encoding='utf-8').read()
    aplicadas, perdidas = 0, []
    for antigo, novo in SUBS:
        if antigo in html:
            html = html.replace(antigo, novo)
            aplicadas += 1
        else:
            perdidas.append(antigo[:50])

    # Link de pagamento: CTAs principais apontam para o checkout
    html = html.replace('<a href="#" class="bg-[#f9d022] text-[#141618] px-7 py-3',
                        '<a href="https://pay.hotmart.com/CONFIGURE-SEU-LINK" class="bg-[#f9d022] text-[#141618] px-7 py-3')
    html = html.replace('<a href="#" class="inline-flex items-center justify-center bg-[#f9d022]',
                        '<a href="https://pay.hotmart.com/CONFIGURE-SEU-LINK" class="inline-flex items-center justify-center bg-[#f9d022]')

    import os
    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    open(SAIDA, 'w', encoding='utf-8').write(html)

    print(f"✅ {aplicadas}/{len(SUBS)} substituições aplicadas → {SAIDA}")
    if perdidas:
        print(f"⚠️  {len(perdidas)} não encontradas (ajuste fino manual depois):")
        for p in perdidas: print(f"   - {p}")

if __name__ == '__main__':
    main()
