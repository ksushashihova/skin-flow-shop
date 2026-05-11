import nodemailer from "nodemailer";

let _transporter: nodemailer.Transporter | undefined;

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
  _transporter = nodemailer.createTransport({
    host, port, secure,
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
  return t.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}
