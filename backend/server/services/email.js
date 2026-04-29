import nodemailer from "nodemailer";

const MAIL_HOST = process.env.SMTP_HOST || "smtp.mailersend.net";
const MAIL_PORT = Number(process.env.SMTP_PORT || 587);
const MAIL_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const MAIL_USER = process.env.SMTP_USER || "";
const MAIL_PASS = process.env.SMTP_PASS || "";
const MAIL_FROM = process.env.SMTP_FROM || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "";
const MAIL_FROM_NAME = process.env.SMTP_FROM_NAME || "Geras";
const MAIL_CONNECTION_TIMEOUT_MS = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000);
const MAIL_GREETING_TIMEOUT_MS = Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000);
const MAIL_SOCKET_TIMEOUT_MS = Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 15000);
const MAIL_SEND_TIMEOUT_MS = Number(process.env.SMTP_SEND_TIMEOUT_MS || 15000);

function normalizeBaseUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "http://localhost:5173";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  return `https://${raw}`;
}

const FRONTEND_BASE_URL = normalizeBaseUrl(process.env.FRONTEND_BASE_URL || "http://localhost:5173");

let transporter = null;

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} excedeu o tempo limite de ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

function extractEmailAddress(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  const bracketMatch = raw.match(/<([^>]+)>/);
  const candidate = (bracketMatch?.[1] || raw).trim();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : "";
}

function resolveFromAddress() {
  const address = extractEmailAddress(MAIL_FROM);

  if (!address) {
    return null;
  }

  return {
    name: MAIL_FROM_NAME,
    address,
  };
}

const FROM_ADDRESS = resolveFromAddress();

function getTransporter() {
  if (!MAIL_USER || !MAIL_PASS || !FROM_ADDRESS) {
    return null;
  }

  if (!transporter) {
    console.log("Configurando transporte SMTP:", {
      host: MAIL_HOST,
      port: MAIL_PORT,
      secure: MAIL_SECURE,
      userConfigured: Boolean(MAIL_USER),
      fromConfigured: Boolean(FROM_ADDRESS),
    });

    transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: MAIL_PORT,
      secure: MAIL_SECURE,
      connectionTimeout: MAIL_CONNECTION_TIMEOUT_MS,
      greetingTimeout: MAIL_GREETING_TIMEOUT_MS,
      socketTimeout: MAIL_SOCKET_TIMEOUT_MS,
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
    throw new Error(
      "Servico de e-mail nao configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM com um e-mail valido (ex: Geras <noreply@seudominio.com>)."
    );
  }

  await withTimeout(
    transport.sendMail({
      from: FROM_ADDRESS,
      to,
      subject,
      text,
      html,
    }),
    MAIL_SEND_TIMEOUT_MS,
    "Envio de e-mail"
  );
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
