
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        const seqId = url.searchParams.get('id')

        if (!seqId) {
            return new Response("Missing transaction ID", { status: 400 })
        }

        // Initialize Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        )

        // Parse numeric ID
        const numericId = parseInt(seqId.includes('-') ? seqId.split('-')[1] : seqId)

        // Fetch transaction
        const { data: txn, error } = await supabaseClient
            .from('transactions')
            .select('*, holders(name)')
            .eq('seq_id', numericId)
            .single()

        if (error || !txn) {
            console.error("Error fetching txn:", error)
            return new Response("Transaction not found", { status: 404 })
        }

        const title = `Transaction ${seqId} - ${txn.profit} Profit`
        const description = `${txn.type} | ${txn.payment_method} | ${new Date(txn.created_at).toLocaleDateString()}`
        const redirectUrl = `${Deno.env.get('APP_URL') || 'https://your-app-url.vercel.app'}/t/${seqId}`

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- WhatsApp / Social Meta Tags -->
    <title>${title}</title>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${req.url}" />
    
    <!-- Redirect to the actual app -->
    <meta http-equiv="refresh" content="0;url=${redirectUrl}">
    <script>window.location.href = "${redirectUrl}";</script>
</head>
<body>
    Redirecting to transaction details...
</body>
</html>
    `.trim()

        return new Response(html, {
            headers: { ...corsHeaders, 'Content-Type': 'text/html' },
            status: 200,
        })

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
