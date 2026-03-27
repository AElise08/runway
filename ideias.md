
### Estratégia Premium "Front Row" (Acesso VIP) - R$ 14,90/mês
A monetização principal será B2C com foco em volume e recorrência barata, gerenciada via **Kiwify**.

**1. O Funil de Vendas (Como convencer a pagar):**
- **Isca (Freemium):** O usuário tem 3 avaliações gratuitas por dia. A Miranda é implacável, ácida e destrói o look. O objetivo aqui é gerar o "Roast" para a pessoa rir e compartilhar no TikTok/Instagram.
- **A Dor / Curiosidade:** Após ser "humilhado" 3 vezes, o usuário pensa: "Tá, mas como eu melhoro?".
- **O Paywall:** "Miranda não trabalha de graça. Para mentoria exclusiva, pague o preço." (Mensalidade de R$ 14,90).

**2. O que a pessoa ganha no Premium (O Produto Real):**
- **Uso diario:** de 20 looks.
- **Modo "Stylist Privado":** A persona da Miranda deixa de ser apenas uma "hater" e passa a atuar como uma verdadeira editora de moda mentorando o usuário. Ela passa a identificar a paleta de cores ideal (Colorimetria), sugere cortes que favorecem o tipo de corpo e constrói um "Guarda-Roupa Cápsula" baseado nos gostos que o usuário fornecer.
- **Busca Rápida para Compras:** "Você precisa de um blazer estruturado preto. Aqui estão 3 opções reais" (você pode injetar seus links de afiliado aqui também para lucro duplo).

**3. Fluxo Técnico da Integração Kiwify:**
Como o Kiwify é muito focado em infoprodutos e assinaturas de comunidade, usá-lo para um App SaaS requer um fluxo de comunicação:
1. **Checkout:** No seu app React, o botão "Virar VIP" encaminha o usuário para o link de checkout nativo da Kiwify (ex: pay.kiwify.com.br/123456).
2. **Webhook (O pulo do gato):** Na Kiwify, você configura um Webhook de "Assinatura Aprovada".
3. **Liberação de Acesso:** Você precisará de um banco de dados simples (ex: Firebase, Supabase ou Vercel KV) para guardar os usuários. Quando a Kiwify mandar o Webhook avisando que "joao@email.com comprou", seu sistema atualiza o status do João para `VIP = true`.
4. **Login no App:** O usuário faz login no seu app usando o mesmo e-mail da compra. O seu app verifica no banco: Se VIP, libera a UI premium e muda o System Prompt enviado ao Gemini para a versão "Mentora de Estilo".
