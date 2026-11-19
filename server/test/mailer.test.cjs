const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_TO_EMAIL,
  escapeHtml,
  sanitizeHeader,
  buildClubRequestMessage,
  createMailer,
} = require('../mailer.cjs');

test('buildClubRequestMessage targets rtladministracion@gmail.com and escapes HTML/headers', () => {
  const message = buildClubRequestMessage(
    {
      clubName: 'Club <script>alert(1)</script>\r\nBcc: evil@example.com',
      owner: 'Juan "Admin" & Co.',
      phone: '+54 9 381 644-3413',
      email: 'club@example.com\nX-Injected: 1',
      courts: 6,
      plan: 'Pro',
    },
    { id: 'req-123', createdAt: '2026-11-19T16:30:00.000Z' },
    { user: 'rtladministracion@gmail.com' }
  );

  assert.equal(message.to, DEFAULT_TO_EMAIL);
  assert.equal(DEFAULT_TO_EMAIL, 'rtladministracion@gmail.com');
  assert.equal(message.replyTo, 'club@example.com X-Injected: 1');
  assert.doesNotMatch(message.subject, /[\r\n]/);
  assert.doesNotMatch(message.replyTo, /[\r\n]/);
  assert.match(message.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(message.html, /Juan &quot;Admin&quot; &amp; Co\./);
  assert.match(message.html, /https:\/\/wa\.me\/5493816443413/);
  assert.match(message.text, /Plan elegido: Pro/);
  assert.match(message.text, /Cantidad de canchas: 6/);
  assert.match(message.text, /ID de solicitud: req-123/);
});

test('createMailer skips sending when SMTP credentials are missing', async () => {
  let called = false;
  const mailer = createMailer({
    env: {},
    createTransport: () => {
      called = true;
      return { sendMail: async () => ({ messageId: 'should-not-run' }) };
    },
  });

  const result = await mailer.sendClubRequestEmail({
    clubName: 'Club Norte',
    owner: 'Ana',
    phone: '3815551234',
    email: 'ana@club.com',
    courts: 4,
    plan: 'Elite',
  });

  assert.deepEqual(result, { sent: false, skipped: true });
  assert.equal(called, false);
});

test('createMailer sends formatted email via configured SMTP transport', async () => {
  let transportOptions = null;
  let sentMessage = null;
  const mailer = createMailer({
    env: {
      SMTP_USER: 'rtladministracion@gmail.com',
      SMTP_PASS: 'app-password-test',
    },
    createTransport: options => {
      transportOptions = options;
      return {
        sendMail: async msg => {
          sentMessage = msg;
          return { messageId: '<msg-1@gmail.com>' };
        },
      };
    },
  });

  const result = await mailer.sendClubRequestEmail(
    {
      clubName: 'Club Sur',
      owner: 'Carlos',
      phone: '3814440000',
      email: 'carlos@clubsur.com',
      courts: 5,
      plan: 'Personalizado',
    },
    { id: 'req-456', createdAt: '2026-11-19T16:30:00.000Z' }
  );

  assert.deepEqual(result, { sent: true, skipped: false, messageId: '<msg-1@gmail.com>' });
  assert.equal(transportOptions.host, 'smtp.gmail.com');
  assert.equal(transportOptions.port, 465);
  assert.equal(transportOptions.secure, true);
  assert.deepEqual(transportOptions.auth, {
    user: 'rtladministracion@gmail.com',
    pass: 'app-password-test',
  });
  assert.equal(sentMessage.to, 'rtladministracion@gmail.com');
  assert.equal(sentMessage.replyTo, 'carlos@clubsur.com');
  assert.match(sentMessage.subject, /Club Sur/);
  assert.equal(escapeHtml('<>&"\''), '&lt;&gt;&amp;&quot;&#39;');
  assert.equal(sanitizeHeader('a\r\nb'), 'a b');
});
