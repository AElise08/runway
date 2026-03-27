# Plano de Ação - Projeto Miranda (Runway)

Este documento é o plano de arquitetura guiado para a construção e evolução do Projeto Miranda. Ele divide as abstrações de negócio do `ideias.md` em tarefas acionáveis para os agentes de programação, seguindo uma ordem lógica de dependências.

---

## Fase 1: Core de Viralidade e Limite Freemium (Frontend / UI)
**Objetivo:** Garantir que o app base funcione como uma isca orgânica perfeita antes de plugar o banco de dados. O foco é UI, compartilhamento (geração de imagem) e limite local.

### Tarefa 1.1: Mecanismo de Compartilhamento "Capa de Revista"
**Contexto:** O humor ácido precisa ser viral. Quando a "Miranda" der o veredito, precisamos gerar uma imagem bonita com a foto do usuário, a ofensa e o `VerdictBadge` para ele postar no TikTok/Instagram.
* **Sugestão de Prompt:**
  > "Estou construindo o Projeto Miranda. Temos o `App.tsx` e o `VerdictBadge.tsx`. Preciso de um botão 'Exportar Avaliação'. Use uma biblioteca como `html2canvas` ou similar para capturar a div que contém a foto avaliada, o texto da ofensa da IA e o VerdictBadge, estilizando como uma capa de revista de moda, e permita o download da imagem."

### Tarefa 1.2: Lógica de Limite Freemium (Local Storage)
**Contexto:** O usuário deve usar no máximo 3 vezes antes de bater no paywall. Nesta fase, faremos o controle basilar no frontend (que será evoluído para DB depois).
* **Sugestão de Prompt:**
  > "Preciso implementar um limite de 3 avaliações gratuitas no `App.tsx`. Gerencie o contador de uso usando `localStorage`. Quando o usuário atingir 3 usos, oculte o botão de upload e mostre um componente de Paywall com a mensagem: 'Miranda se recusa a aturar mais doentices visuais de graça. Assine o Passe Front Row para ter a mentoria real dela.'."

---

## Fase 2: Expansão Cognitiva e Prompts Dinâmicos (Integração IA)
**Objetivo:** Refinar as respostas da IA no `services/geminiService.ts` e injetar inteligência realista (contexto de data, dupla personalidade da IA).

### Tarefa 2.1: Contexto Temporal e Personalidade Base
**Contexto:** O prompt do sistema precisa receber o mês e o ano atuais para a IA dar foras realistas (ex: "Isso é tão Primavera 2021"). 
* **Sugestão de Prompt:**
  > "Revise o arquivo `services/geminiService.ts`. Injete dinamicamente o Mês e Ano atuais no `system_prompt`. Ajuste as instruções para que a IA aja como a 'Miranda' da moda: ácida, usando referências de alta costura, e insira que ela deve zombar se o look parecer ultrapassado em relação à data atual."

### Tarefa 2.2: O Modo 'Stylist Elite' (Premium)
**Contexto:** Quando o usuário for premium, a IA deve passar do "Roast" para a "Cura" (análise de paleta Inverno/Verão, silhueta).
* **Sugestão de Prompt:**
  > "No `services/geminiService.ts`, crie uma bifurcação na função de chat: passe a aceitar um parâmetro booleano `isPremium`. Se `true`, a IA deve usar um prompt 'Stylist Elite': além da crítica inicial, ela deve oferecer dicas construtivas sobre colorimetria, proporção de silhueta e peças essenciais. Se `false`, ela mantém apenas o humor ácido."

---

## Fase 3: Infraestrutura, Banco de Dados e Autenticação (Supabase)
**Objetivo:** Transicionar de um app local para uma plataforma real que diferencia quem é assinante e quem não é.

### Tarefa 3.1: Setup de Autenticação
**Contexto:** Precisamos que os usuários façam login (Google/Email) para atrelar a assinatura.
* **Sugestão de Prompt:**
  > "Vamos integrar o Supabase ao nosso React App. Configure a autenticação (Autenticação Google e Email mágico) no projeto. Crie um `components/Auth.tsx` ou adicione no `Header.tsx` botões para Entrar e Sair. Proteja o estado da aplicação e armazene a sessão atual."

### Tarefa 3.2: Tabela de Assinaturas (Profiles)
**Contexto:** Ler se a conta daquele email tem o tier premium.
* **Sugestão de Prompt:**
  > "Com o Supabase Auth configurado, preciso de um script/instruções para criar uma tabela `profiles` no Supabase vinculada ao `auth.users`. Esta tabela deve ter um campo `is_premium` (boolean, default false) e `daily_looks` (int, default 0). Atualize o `App.tsx` para ler o status premium do usuário logado e liberar até 20 avaliações diárias em vez de 3."

---

## Fase 4: Pagamentos e Webhooks (Kiwify)
**Objetivo:** Fazer a ponte financeira. O checkout será externo na Kiwify, e nosso sistema apenas consumirá o webhook.

### Tarefa 4.1: UI do Checkout
**Contexto:** Conectar o botão do Paywall ao link da Kiwify.
* **Sugestão de Prompt:**
  > "No componente de Paywall que criamos, adicione um botão de Call-to-Action 'Assinar Passe Front Row VIP'. Esse botão deve ser um link externo que redireciona o usuário para nosso link de pagamento da Kiwify (use um link fictício por enquanto, ex: `https://pay.kiwify.com.br/xxxxx`). Adicione um informativo: 'Faça login com o mesmo email usado na compra após o pagamento'."

### Tarefa 4.2: Edge Function / Webhook Supabase
**Contexto:** Ouvir a Kiwify para dar o acesso premium automaticamente.
* **Sugestão de Prompt:**
  > "Precisamos criar uma Supabase Edge Function (ou uma rota API no Next.js se preferirmos adicionar Next depois) para atuar como webhook da Kiwify. O script deve receber o POST da Kiwify do evento `order_approved`, extrair o email do comprador (`req.body.Customer.email`) e fazer um UPDATE na tabela `profiles` marcando `is_premium = true`. Crie o código da Edge Function."
