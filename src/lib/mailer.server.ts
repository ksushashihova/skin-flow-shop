import nodemailer from "nodemailer";

let _transporter: nodemailer.Transporter | undefined;

const DEFAULT_SMTP_TIMEOUT_MS = 12_000;

function smtpTimeoutMs() {
  const configured = Number(process.env.SMTP_TIMEOUT_MS || DEFAULT_SMTP_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_SMTP_TIMEOUT_MS;
}

function resetTransporter() {
  try { _transporter?.close(); } catch { /* ignore */ }
  _transporter = undefined;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      resetTransporter();
      reject(new Error(message));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
    if (timedOut) resetTransporter();
  }
}

function getTransporter() {
  if (_transporter) return _transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = (process.env.SMTP_SECURE ?? "true") === "true";
  if (!host || !user || !pass) {
    throw new Error("SMTP не сконфигурирован: задайте SMTP_HOST/SMTP_USER/SMTP_PASS");
  }
  const timeout = smtpTimeoutMs();
  _transporter = nodemailer.createTransport({
    host, port, secure,
    connectionTimeout: timeout,
    greetingTimeout: timeout,
    socketTimeout: timeout,
    dnsTimeout: Math.min(timeout, 10_000),
    auth: { user, pass },
  });
  return _transporter;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  const t = getTransporter();
  const timeout = smtpTimeoutMs();
  return withTimeout(t.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  }), timeout + 1_000, `SMTP не ответил за ${Math.round((timeout + 1_000) / 1000)} сек.`);
}
