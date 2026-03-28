// supabase/functions/kiwify-webhook/index.ts
// Instale o CLI do Supabase para rodar e fazer deploy de Edge Functions
// supabase functions deploy kiwify-webhook

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response("Method not allowed", { status: 405 });
    }

    // 1. Pegar o corpo bruto (raw) para validar a assinatura
    const rawBody = await req.text();
    
    // 2. Verificação de Autenticidade (HMAC-SHA1)
    const url = new URL(req.url);
    const signatureFromUrl = url.searchParams.get('signature');
    const signatureFromHeader = req.headers.get('x-kiwify-signature');
    const kiwifySignature = signatureFromHeader || signatureFromUrl;
    
    const secretToken = Deno.env.get('KIWIFY_WEBHOOK_TOKEN');

    if (secretToken && kiwifySignature) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secretToken),
        { name: "HMAC", hash: "SHA-1" },
        false,
        ["sign"]
      );
      const signatureArrayBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(rawBody)
      );
      
      const computedSignature = Array.from(new Uint8Array(signatureArrayBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      console.log(`Assinatura recebida: ${kiwifySignature}`);
      console.log(`Assinatura calculada: ${computedSignature}`);

      if (kiwifySignature !== computedSignature) {
        console.error("Assinatura inválida! O HMAC não confere.");
        return new Response("Invalid Signature", { status: 401 });
      }
    } else if (secretToken && !kiwifySignature) {
      console.error("Assinatura ausente!");
      return new Response("Missing Signature", { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Verifique o tipo de evento (queremos saber quando a compra é aprovada)
    if (payload.order_status === 'paid' || payload.order_status === 'approved') {
      const customerEmail = payload.Customer?.email || payload.customer?.email;

      if (!customerEmail) {
        return new Response("Missing Customer Email", { status: 400 });
      }

      console.log(`Processando pagamento aprovado para: ${customerEmail}`);

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      // Buscar usuário pelo e-mail
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      if (userError) throw userError;

      const user = userData.users.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());

      if (user) {
        console.log(`Usuário encontrado: ${user.id}. Ativando Premium...`);
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ is_premium: true })
          .eq('id', user.id);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ message: "User upgraded successfully" }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });

      } else {
        console.warn(`Usuário ${customerEmail} pagou mas não tem conta no sistema.`);
        return new Response(JSON.stringify({ message: "Purchase recorded but user not found." }), {
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
    console.error("Erro interno no Webhook:", error);
    return new Response("Server error", { status: 500 });
  }
})
