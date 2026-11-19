const nodemailer = require('nodemailer');

const DEFAULT_TO_EMAIL = 'rtladministracion@gmail.com';
const DEFAULT_SMTP_HOST = 'smtp.gmail.com';
const DEFAULT_SMTP_PORT = 465;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeHeader(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

function formatArgentinaDate(isoString) {
  const date = isoString ? new Date(isoString) : new Date();
  if (Number.isNaN(date.getTime())) return String(isoString || '');
  return date.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function whatsappHref(phone) {
  const digits = String(phone ?? '').replace(/\D+/g, '');
  return digits.length >= 6 ? `https://wa.me/${digits}` : null;
}

function buildClubRequestMessage(record, meta = {}, options = {}) {
  const to = sanitizeHeader(options.to || DEFAULT_TO_EMAIL);
  const from = sanitizeHeader(
    options.from || (options.user ? `RTL - Solicitudes de Alta <${options.user}>` : to)
  );
  const replyTo = sanitizeHeader(record.email);
  const subject = sanitizeHeader(
    `Nueva solicitud de alta: ${record.clubName} (Plan ${record.plan})`
  );
  const stamp = formatArgentinaDate(meta.createdAt);
  const requestId = meta.id || '-';
  const wa = whatsappHref(record.phone);

  const textLines = [
    'Nueva solicitud de alta recibida desde /clubes',
    '==============================================',
    `Complejo: ${record.clubName}`,
    `Responsable: ${record.owner}`,
    `WhatsApp: ${record.phone}`,
    `Correo: ${record.email}`,
    `Cantidad de canchas: ${record.courts}`,
    `Plan elegido: ${record.plan}`,
    '',
    `ID de solicitud: ${requestId}`,
    `Fecha y hora (AR): ${stamp}`,
  ];

  const phoneHtml = wa
    ? `<a href="${escapeHtml(wa)}" style="color:#0f766e;text-decoration:none;">${escapeHtml(record.phone)}</a>`
    : escapeHtml(record.phone);

  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:10px;">',
    '<h2 style="margin:0 0 8px;color:#0f172a;">Nueva solicitud de alta de club</h2>',
    '<p style="margin:0 0 16px;color:#4b5563;font-size:14px;">Se envió un formulario desde <strong>/clubes</strong>.</p>',
    '<table style="width:100%;border-collapse:collapse;font-size:14px;">',
    `<tr><td style="padding:8px 0;color:#6b7280;width:160px;">Complejo</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(record.clubName)}</td></tr>`,
    `<tr><td style="padding:8px 0;color:#6b7280;">Responsable</td><td style="padding:8px 0;">${escapeHtml(record.owner)}</td></tr>`,
    `<tr><td style="padding:8px 0;color:#6b7280;">WhatsApp</td><td style="padding:8px 0;">${phoneHtml}</td></tr>`,
    `<tr><td style="padding:8px 0;color:#6b7280;">Correo</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(record.email)}" style="color:#0f766e;text-decoration:none;">${escapeHtml(record.email)}</a></td></tr>`,
    `<tr><td style="padding:8px 0;color:#6b7280;">Cantidad de canchas</td><td style="padding:8px 0;">${escapeHtml(record.courts)}</td></tr>`,
    `<tr><td style="padding:8px 0;color:#6b7280;">Plan elegido</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(record.plan)}</td></tr>`,
    '</table>',
    `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />`,
    `<p style="margin:0;color:#6b7280;font-size:12px;">ID: ${escapeHtml(requestId)} · Fecha (AR): ${escapeHtml(stamp)}</p>`,
    '</div>',
  ].join('');

  return {
    from,
    to,
    replyTo,
    subject,
    text: textLines.join('\n'),
    html,
  };
}

function createMailer({ env = process.env, createTransport = nodemailer.createTransport } = {}) {
  let cachedTransport = null;
  let cachedKey = null;

  function getConfig() {
    const user = (env.SMTP_USER || '').trim();
    const pass = (env.SMTP_PASS || '').trim();
    const host = (env.SMTP_HOST || DEFAULT_SMTP_HOST).trim();
    const port = Number(env.SMTP_PORT || DEFAULT_SMTP_PORT);
    const secure = env.SMTP_SECURE !== undefined ? env.SMTP_SECURE === 'true' : port === 465;
    const to = (env.CLUB_REQUEST_TO_EMAIL || DEFAULT_TO_EMAIL).trim();
    const from = (env.SMTP_FROM || '').trim();
    return { user, pass, host, port, secure, to, from };
  }

  function getTransport(cfg) {
    const key = `${cfg.host}:${cfg.port}:${cfg.secure}:${cfg.user}:${cfg.pass}`;
    if (!cachedTransport || cachedKey !== key) {
      cachedTransport = createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user: cfg.user, pass: cfg.pass },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      });
      cachedKey = key;
    }
    return cachedTransport;
  }

  async function sendClubRequestEmail(record, meta = {}) {
    const cfg = getConfig();
    if (!cfg.user || !cfg.pass) {
      return { sent: false, skipped: true };
    }
    const message = buildClubRequestMessage(record, meta, {
      to: cfg.to,
      from: cfg.from,
      user: cfg.user,
    });
    const info = await getTransport(cfg).sendMail(message);
    return { sent: true, skipped: false, messageId: info?.messageId || null };
  }

  return { sendClubRequestEmail };
}

const defaultMailer = createMailer();

module.exports = {
  DEFAULT_TO_EMAIL,
  escapeHtml,
  sanitizeHeader,
  buildClubRequestMessage,
  createMailer,
  defaultMailer,
};
