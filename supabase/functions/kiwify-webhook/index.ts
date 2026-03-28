// supabase/functions/kiwify-webhook/index.ts
// Instale o CLI do Supabase para rodar e fazer deploy de Edge Functions
// supabase functions deploy kiwify-webhook

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    // A Kiwify manda as informações via POST
    if (req.method !== 'POST') {
      return new Response("Method not allowed", { status: 405 });
    }

    // 1. Verificação de Autenticidade do Token da Kiwify (Validação de Segurança)
    const kiwifySignature = req.headers.get('x-kiwify-signature');
    const secretToken = Deno.env.get('KIWIFY_WEBHOOK_TOKEN'); // Configure essa variável no Supabase: supabase secrets set KIWIFY_WEBHOOK_TOKEN=seu_token_aqui

    // Só faça essa verificação se o token de ambiente estiver setado
    if (secretToken && kiwifySignature !== secretToken) {
       console.error("Token da Kiwify inválido! Assinatura não confere.");
       return new Response("Unauthorized", { status: 401 });
    }

    const payload = await req.json();

    // Verifique o tipo de evento (queremos saber quando a compra é aprovada)
    if (payload.order_status === 'paid' || payload.order_status === 'approved') {
      const customerEmail = payload.Customer?.email || payload.customer?.email;

      console.log(`Recebido webhook da Kiwify para o status: ${payload.order_status}`);
      console.log(`Email do cliente: ${customerEmail}`);
      console.log(`Payload completo:`, JSON.stringify(payload));

      if (!customerEmail) {
        console.error("Missing Customer Email in Payload!");
        return new Response("Missing Customer Email", { status: 400 });
      }

      // Conecte ao seu banco Supabase usando a Service Role Key para ignorar regras de RLS
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // 1. Precisamos buscar o ID do usuário (auth.users) baseado no email
      // Como estamos numa Edge API e por questões de segurança o Supabase bloqueia selects no auth.users sem permissões,
      // usaremos nossa Service Role.
      
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers()
      if (userError) throw userError;

      const user = userData.users.find(u => u.email === customerEmail);

      if (user) {
        // Encontrou o usuário! Pelo email atrelado à compra, marca ele como premium.
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ is_premium: true })
          .eq('id', user.id);

        if (updateError) {
          throw updateError;
        }

        return new Response(JSON.stringify({ message: "User upgraded successfully" }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });

      } else {
        // Usuário comprou mas ainda não logou no nosso site pra criar a conta.
        // Solução avançada 1: Você pode criar o usuário pra ele e mandar email.
        // Solução desta fase: Vamos ignorar e avisar o log, ou dependemos da instrução 
        // "Faça login com o mesmo email usado". Para robustez total numa V2, criaríamos uma tabela 
        // "pending_purchases" e bateríamos com ela no trigger de "new_user" que você adicionou no DB.
        
        console.log(`User ${customerEmail} paid but hasn't created an account yet.`);
        return new Response(JSON.stringify({ message: "Purchase recorded but user not found. Handled later or manually." }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    return new Response(JSON.stringify({ message: "Ignored event" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error(error);
    return new Response("Server error", { status: 500 });
  }
})
