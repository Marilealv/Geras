import nodemailer from "nodemailer";

const MAIL_HOST = process.env.SMTP_HOST || "smtp.mailersend.net";
const MAIL_PORT = Number(process.env.SMTP_PORT || 587);
const MAIL_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const MAIL_USER = process.env.SMTP_USER || "";
const MAIL_PASS = process.env.SMTP_PASS || "";
const MAIL_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || "";
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "http://localhost:5173";

let transporter = null;

function getTransporter() {
  if (!MAIL_USER || !MAIL_PASS || !MAIL_FROM) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: MAIL_PORT,
      secure: MAIL_SECURE,
      auth: {
        user: MAIL_USER,
        pass: MAIL_PASS,
      },
    });
  }

  return transporter;
}

export function isEmailServiceConfigured() {
  return Boolean(getTransporter());
}

async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();

  if (!transport) {
    throw new Error("Servico de e-mail nao configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM.");
  }

  await transport.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}

function buildUrl(pathname, token) {
  const url = new URL(pathname, FRONTEND_BASE_URL);
  url.searchParams.set("token", token);
  return url.toString();
}

export function buildVerificationUrl(token) {
  return buildUrl("/verificar-email", token);
}

export function buildResetPasswordUrl(token) {
  return buildUrl("/redefinir-senha", token);
}

export async function sendEmailVerificationMessage({ to, nome, verificationUrl }) {
  const safeName = String(nome || "usuario");

  await sendEmail({
    to,
    subject: "Verifique seu e-mail no Geras",
    text: `Ola, ${safeName}.\n\nPara verificar seu e-mail, acesse: ${verificationUrl}\n\nSe voce nao criou esta conta, ignore esta mensagem.`,
    html: `
      <p>Ola, ${safeName}.</p>
      <p>Para verificar seu e-mail no Geras, clique no link abaixo:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>Se voce nao criou esta conta, ignore esta mensagem.</p>
    `,
  });
}

export async function sendResetPasswordMessage({ to, nome, resetUrl }) {
  const safeName = String(nome || "usuario");

  await sendEmail({
    to,
    subject: "Redefinicao de senha - Geras",
    text: `Ola, ${safeName}.\n\nRecebemos uma solicitacao para redefinir sua senha.\nUse este link (valido por 30 minutos): ${resetUrl}\n\nSe voce nao solicitou, ignore esta mensagem.`,
    html: `
      <p>Ola, ${safeName}.</p>
      <p>Recebemos uma solicitacao para redefinir sua senha.</p>
      <p>Use este link (valido por 30 minutos):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Se voce nao solicitou, ignore esta mensagem.</p>
    `,
  });
}
