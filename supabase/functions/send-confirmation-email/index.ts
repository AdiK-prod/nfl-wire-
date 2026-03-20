import { buildConfirmationEmailHtml } from "../_shared/email-templates.ts";

type Payload = {
  email: string;
  team_name: string;
  team_id: string;
};

const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const fromAddress = Deno.env.get("RESEND_FROM") ?? "NFL Wire <news@nflwire.com>";
const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "https://nfl-wire.vercel.app";

async function handleRequest(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!payload.email || !payload.team_name || !payload.team_id) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: "Email not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const manageUrl = `${appBaseUrl}/manage-subscription?team_id=${encodeURIComponent(
    payload.team_id,
  )}&email=${encodeURIComponent(payload.email)}`;
  const html = buildConfirmationEmailHtml(payload.team_name, manageUrl);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: payload.email,
        subject: `Welcome to NFL Wire — ${payload.team_name}`,
        html,
        headers: {
          "List-Unsubscribe": `<${appBaseUrl}/unsubscribe?email=${encodeURIComponent(
            payload.email,
          )}>`,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      const safeDetail = text.slice(0, 1000);
      console.error("[send-confirmation-email] Resend error", response.status, safeDetail);
      return new Response(
        JSON.stringify({
          error: "Email send failed",
          resend_status: response.status,
          resend_detail: safeDetail,
        }),
        {
        status: 502,
        headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[send-confirmation-email] Unexpected error", e);
    return new Response(JSON.stringify({ error: "Email send failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

Deno.serve(handleRequest);

