import { supabase } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const transparentGif = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
  0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
  0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b,
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const newsletterId = url.searchParams.get("newsletter_id");
    const subscriberId = url.searchParams.get("subscriber_id");

    if (newsletterId && subscriberId) {
      const { data: existing } = await supabase
        .from("newsletter_metrics")
        .select("id, opened_at")
        .eq("newsletter_id", newsletterId)
        .eq("subscriber_id", subscriberId)
        .limit(1);

      const first = existing?.[0];
      if (!first) {
        await supabase.from("newsletter_metrics").insert({
          newsletter_id: newsletterId,
          subscriber_id: subscriberId,
          opened_at: new Date().toISOString(),
        });
      } else if (!first.opened_at) {
        await supabase
          .from("newsletter_metrics")
          .update({ opened_at: new Date().toISOString() })
          .eq("id", first.id);
      }
    }
  } catch (e) {
    console.error("[track-open] failed", e);
  }

  return new Response(transparentGif, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});

