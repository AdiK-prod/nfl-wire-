export function buildConfirmationEmailHtml(teamName: string, manageUrl: string) {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to NFL Wire</title>
    <style>
      body { margin: 0; padding: 0; background: #0b1120; font-family: -apple-system, BlinkMacSystemFont, system-ui, -system-ui, sans-serif; }
      .container { max-width: 600px; margin: 0 auto; background: #0f172a; color: #e5e7eb; padding: 24px 20px 32px; }
      .card { background: #020617; border-radius: 16px; padding: 24px 20px 28px; border: 1px solid rgba(148, 163, 184, 0.3); }
      .logo { font-size: 20px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #38bdf8; }
      .badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; background: rgba(56, 189, 248, 0.1); color: #7dd3fc; margin-top: 6px; }
      h1 { margin: 18px 0 8px; font-size: 24px; line-height: 1.25; color: #f9fafb; }
      p { margin: 6px 0; font-size: 14px; line-height: 1.6; color: #e5e7eb; }
      .pill { margin-top: 14px; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; padding: 6px 12px; border-radius: 999px; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(148, 163, 184, 0.4); color: #e5e7eb; }
      .section { margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(30, 64, 175, 0.6); }
      .muted { font-size: 12px; color: #9ca3af; }
      .link { color: #60a5fa; text-decoration: none; }
      .link:hover { text-decoration: underline; }
      .footer { margin-top: 18px; font-size: 11px; color: #6b7280; }
      .team-chip { display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(148,163,184,0.5); font-size: 12px; color: #e5e7eb; margin-top: 4px; }
      .dot { width: 6px; height: 6px; border-radius: 999px; background: #22c55e; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <div class="logo">NFL Wire</div>
        <div class="badge">
          <span>Daily Team Briefing</span>
        </div>

        <h1>Welcome aboard – ${teamName} locked in</h1>

        <p>You're now subscribed to <strong>${teamName}</strong> on NFL Wire.</p>
        <p>Expect a 5-minute, team-specific morning briefing in your inbox around <strong>6:00 AM</strong>, built from fresh reporting, injury updates, and key storylines.</p>

        <div class="team-chip">
          <span class="dot"></span>
          <span>${teamName} · Active subscription</span>
        </div>

        <div class="section">
          <p class="muted"><strong>What you'll get:</strong></p>
          <p class="muted">• One top story that actually matters<br/>
             • 2–4 quick hits you can scan in seconds<br/>
             • Injury + roster notes that impact Sundays</p>
        </div>

        <div class="section">
          <p class="muted">
            Want to pause or change teams? Use the
            <a href="${manageUrl}" class="link">Manage subscription</a> link at the bottom of any email.
          </p>
        </div>

        <div class="footer">
          <p>You’re receiving this because you signed up for NFL Wire for ${teamName}.</p>
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim();
}

