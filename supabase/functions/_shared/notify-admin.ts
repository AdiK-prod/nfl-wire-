const RESEND_API_KEY = Deno.env.get('NFLWIRE_RESEND_API_KEY');
const ADMIN_EMAIL = Deno.env.get('NFLWIRE_ADMIN_EMAIL') ?? 'admin@nflwire.com';
const RESEND_URL = 'https://api.resend.com/emails';

export type NotifyAdminPayload =
  | { type: 'source_flagged'; data: { url: string; teamName: string; confidence: number; reason?: string } }
  | { type: 'pipeline_error'; data: { teamName: string; error: string } }
  | { type: 'low_relevance_source'; data: { sourceId: string; teamName: string; discardRate: number } };

function getAdminLink(): string {
  const appUrl = Deno.env.get('NFLWIRE_APP_URL') ?? '';
  return appUrl ? `${appUrl.replace(/\/$/, '')}/admin/sources` : '#';
}

function buildSubjectAndHtml(payload: NotifyAdminPayload): { subject: string; html: string } {
  const adminLink = getAdminLink();

  switch (payload.type) {
    case 'source_flagged': {
      const { url, teamName, confidence, reason } = payload.data;
      return {
        subject: `Source Flagged: ${url.slice(0, 50)}${url.length > 50 ? '...' : ''}`,
        html: `
          <h2>Source requires review</h2>
          <p><strong>URL:</strong> <a href="${url}">${url}</a></p>
          <p><strong>Team:</strong> ${teamName}</p>
          <p><strong>Confidence:</strong> ${confidence}%</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p><a href="${adminLink}">Review in Admin</a></p>
        `.trim(),
      };
    }
    case 'pipeline_error': {
      const { teamName, error } = payload.data;
      return {
        subject: `Pipeline Error: ${teamName}`,
        html: `
          <h2>Content pipeline failed</h2>
          <p><strong>Team:</strong> ${teamName}</p>
          <p><strong>Error:</strong> ${error}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        `.trim(),
      };
    }
    case 'low_relevance_source': {
      const { sourceId, teamName, discardRate } = payload.data;
      return {
        subject: `Low Relevance Source: ${sourceId.slice(0, 8)}...`,
        html: `
          <h2>Source has high discard rate</h2>
          <p><strong>Source ID:</strong> ${sourceId}</p>
          <p><strong>Team:</strong> ${teamName}</p>
          <p><strong>Discard Rate:</strong> ${(discardRate * 100).toFixed(1)}%</p>
          <p><a href="${adminLink}">Review in Admin</a></p>
        `.trim(),
      };
    }
  }
}

export async function notifyAdmin(notification: NotifyAdminPayload): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[notify-admin] NFLWIRE_RESEND_API_KEY not set; skipping admin email');
    return;
  }

  const { subject, html } = buildSubjectAndHtml(notification);

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'NFL-Wire-Edge-Function/1.0',
    },
    body: JSON.stringify({
      from: 'NFL Wire Alerts <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API ${res.status}: ${text}`);
  }
}
