export async function sendEmail(to: string, subject: string, html: string, fallbackLink?: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n[mail] (RESEND_API_KEY not set — email NOT sent)\n[to] ${to}\n[subject] ${subject}\n${fallbackLink ? '[link] ' + fallbackLink : html}\n`);
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || 'StreamBox <onboarding@resend.dev>', to, subject, html })
  });
  if (!res.ok) console.error('[mail] Resend error', await res.text());
  return res.ok;
}
