import { Resend } from 'resend'

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

const FROM = process.env.EMAIL_FROM ?? 'My Home Support <onboarding@resend.dev>'

// ── Welcome email after org registration ─────────────────────────
export async function sendWelcomeEmail({
  to,
  adminName,
  orgName,
  trialDays = 30,
}: {
  to: string
  adminName: string
  orgName: string
  trialDays?: number
}) {
  return getResend()?.emails.send({
    from: FROM,
    to,
    subject: `Welcome to My Home Support — your ${trialDays}-day trial has started`,
    html: welcomeHtml({ adminName, orgName, trialDays }),
  })
}

// ── Missed clock-out alert (sent to admin) ────────────────────────
export async function sendMissedClockOutAlert({
  to,
  adminName,
  agentName,
  clientName,
  clockInAt,
  hoursElapsed,
}: {
  to: string
  adminName: string
  agentName: string
  clientName: string
  clockInAt: string
  hoursElapsed: number
}) {
  return getResend()?.emails.send({
    from: FROM,
    to,
    subject: `⚠ Missed clock-out — ${agentName} has been on-site for ${hoursElapsed}h`,
    html: missedClockOutHtml({ adminName, agentName, clientName, clockInAt, hoursElapsed }),
  })
}

// ── Daily summary email ───────────────────────────────────────────
export async function sendDailySummary({
  to,
  adminName,
  orgName,
  date,
  stats,
}: {
  to: string
  adminName: string
  orgName: string
  date: string
  stats: {
    totalVisits: number
    totalHours: number
    activeAgents: number
    missedClockOuts: number
  }
}) {
  return getResend()?.emails.send({
    from: FROM,
    to,
    subject: `Daily summary — ${orgName} — ${date}`,
    html: dailySummaryHtml({ adminName, orgName, date, stats }),
  })
}

// ── HTML templates ────────────────────────────────────────────────

function base(title: string, content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#FAFAF8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF8;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <!-- Header -->
      <tr>
        <td style="background:#2D6A4F;border-radius:16px 16px 0 0;padding:32px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:8px 12px;margin-bottom:16px;">
                  <span style="color:white;font-size:14px;">🏠</span>
                </div>
                <div style="color:white;font-size:20px;font-weight:700;letter-spacing:-0.3px;">My Home Support</div>
                <div style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:2px;margin-top:2px;">ADMIN PORTAL</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="background:white;padding:40px;border-left:1px solid #E8E5DE;border-right:1px solid #E8E5DE;">
          ${content}
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="background:#F5F4F0;border-radius:0 0 16px 16px;border:1px solid #E8E5DE;border-top:none;padding:24px 40px;">
          <p style="margin:0;color:#9C9690;font-size:12px;text-align:center;">
            My Home Support · Secure · Encrypted<br/>
            <a href="#" style="color:#2D6A4F;text-decoration:none;">Unsubscribe</a> ·
            <a href="#" style="color:#2D6A4F;text-decoration:none;">Privacy Policy</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

function welcomeHtml({ adminName, orgName, trialDays }: { adminName: string; orgName: string; trialDays: number }) {
  return base('Welcome to My Home Support', `
    <h1 style="margin:0 0 8px;color:#1C1917;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
      Welcome, ${adminName}! 👋
    </h1>
    <p style="margin:0 0 24px;color:#6B6460;font-size:15px;line-height:1.6;">
      <strong>${orgName}</strong> is now set up on My Home Support. Your free ${trialDays}-day trial has started.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#EEF7F2;border-radius:12px;padding:24px;margin-bottom:28px;">
      <tr>
        <td>
          <p style="margin:0 0 12px;color:#2D6A4F;font-weight:700;font-size:13px;letter-spacing:1px;">WHAT YOU CAN DO NOW</p>
          ${['Add your care agents', 'Register your clients', 'Create assignments & schedules', 'Track time entries with GPS', 'Generate payroll reports'].map(item =>
            `<p style="margin:0 0 8px;color:#1C1917;font-size:14px;">✓ &nbsp;${item}</p>`
          ).join('')}
        </td>
      </tr>
    </table>

    <a href="https://my-home-support.vercel.app/login"
       style="display:inline-block;background:#2D6A4F;color:white;font-weight:600;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:-0.2px;">
      Go to my dashboard →
    </a>

    <p style="margin:28px 0 0;color:#9C9690;font-size:13px;line-height:1.6;">
      Your trial runs for ${trialDays} days. No credit card required to get started.<br/>
      Questions? Reply to this email — we read every message.
    </p>
  `)
}

function missedClockOutHtml({
  adminName, agentName, clientName, clockInAt, hoursElapsed,
}: { adminName: string; agentName: string; clientName: string; clockInAt: string; hoursElapsed: number }) {
  return base('Missed Clock-Out Alert', `
    <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#92400E;font-weight:600;font-size:14px;">⚠ Action may be required</p>
    </div>

    <h1 style="margin:0 0 8px;color:#1C1917;font-size:22px;font-weight:700;">
      Missed clock-out detected
    </h1>
    <p style="margin:0 0 24px;color:#6B6460;font-size:15px;line-height:1.6;">
      Hi ${adminName}, <strong>${agentName}</strong> clocked in ${hoursElapsed} hours ago
      and has not yet clocked out.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E5DE;border-radius:12px;overflow:hidden;margin-bottom:28px;">
      ${[
        ['Agent', agentName],
        ['Client', clientName],
        ['Clocked in at', clockInAt],
        ['Hours elapsed', `${hoursElapsed}h`],
      ].map(([label, value], i) => `
        <tr style="background:${i % 2 === 0 ? '#FAFAF8' : 'white'};">
          <td style="padding:12px 20px;color:#9C9690;font-size:13px;font-weight:600;width:140px;">${label}</td>
          <td style="padding:12px 20px;color:#1C1917;font-size:14px;font-weight:500;">${value}</td>
        </tr>`
      ).join('')}
    </table>

    <a href="https://my-home-support.vercel.app/pointages"
       style="display:inline-block;background:#2D6A4F;color:white;font-weight:600;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">
      Review time entries →
    </a>
  `)
}

function dailySummaryHtml({
  adminName, orgName, date, stats,
}: { adminName: string; orgName: string; date: string; stats: { totalVisits: number; totalHours: number; activeAgents: number; missedClockOuts: number } }) {
  return base(`Daily Summary — ${date}`, `
    <h1 style="margin:0 0 4px;color:#1C1917;font-size:22px;font-weight:700;">
      Daily summary
    </h1>
    <p style="margin:0 0 28px;color:#9C9690;font-size:14px;">${orgName} · ${date}</p>

    <p style="margin:0 0 16px;color:#6B6460;font-size:15px;">Hi ${adminName}, here's what happened today:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        ${[
          { label: 'Visits', value: stats.totalVisits, color: '#2D6A4F', bg: '#EEF7F2' },
          { label: 'Total hours', value: `${stats.totalHours}h`, color: '#C4724A', bg: '#FDF3EE' },
          { label: 'Active agents', value: stats.activeAgents, color: '#2D6A4F', bg: '#EEF7F2' },
          { label: 'Missed clock-outs', value: stats.missedClockOuts, color: stats.missedClockOuts > 0 ? '#B45309' : '#2D6A4F', bg: stats.missedClockOuts > 0 ? '#FEF3C7' : '#EEF7F2' },
        ].map(s => `
          <td style="width:25%;padding:0 6px 0 0;">
            <div style="background:${s.bg};border-radius:12px;padding:16px;text-align:center;">
              <div style="color:${s.color};font-size:22px;font-weight:700;">${s.value}</div>
              <div style="color:#9C9690;font-size:11px;margin-top:4px;font-weight:600;">${s.label.toUpperCase()}</div>
            </div>
          </td>`
        ).join('')}
      </tr>
    </table>

    <a href="https://my-home-support.vercel.app/"
       style="display:inline-block;background:#2D6A4F;color:white;font-weight:600;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">
      View full dashboard →
    </a>
  `)
}
