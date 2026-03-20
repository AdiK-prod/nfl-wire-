import { supabase } from "../_shared/supabase-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "https://nfl-wire.vercel.app";

type Feedback = "thumbs_up" | "thumbs_down";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const url = new URL(req.url);
  const newsletterId = url.searchParams.get("newsletter_id");
  const subscriberId = url.searchParams.get("subscriber_id");
  const feedback = url.searchParams.get("feedback") as Feedback | null;

  if (!newsletterId || !subscriberId || (feedback !== "thumbs_up" && feedback !== "thumbs_down")) {
    return new Response("Invalid parameters", { status: 400, headers: corsHeaders });
  }

  try {
    const { data: existing } = await supabase
      .from("newsletter_metrics")
      .select("id")
      .eq("newsletter_id", newsletterId)
      .eq("subscriber_id", subscriberId)
      .limit(1);

    const first = existing?.[0];
    if (first) {
      await supabase.from("newsletter_metrics").update({ feedback }).eq("id", first.id);
    } else {
      await supabase.from("newsletter_metrics").insert({
        newsletter_id: newsletterId,
        subscriber_id: subscriberId,
        feedback,
      });
    }
  } catch (e) {
    console.error("[feedback] failed", e);
  }

  const redirectTarget = `${appBaseUrl}/feedback-thanks?feedback=${encodeURIComponent(feedback)}`;
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: redirectTarget,
    },
  });
});

