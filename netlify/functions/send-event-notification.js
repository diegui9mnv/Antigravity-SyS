import nodemailer from 'nodemailer';

const responseHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

const buildTextBody = ({ obra = {}, evento = {}, eventType = 'visita' }) => {
  const tipoLabel = eventType === 'reunion' ? 'Reunion' : 'Visita';
  return [
    `Se ha generado una notificacion de ${tipoLabel.toLowerCase()} para la obra:`,
    '',
    `- Denominacion obra: ${obra.denominacion || '-'}`,
    `- Codigo obra: ${obra.codigoObra || '-'}`,
    `- Expediente: ${obra.expediente || '-'}`,
    `- Municipio / Lugar: ${evento.ubicacion || obra.municipio || '-'}`,
    `- Titulo ${tipoLabel.toLowerCase()}: ${evento.titulo || '-'}`,
    `- Fecha planificada: ${formatDate(evento.fechaPlanificada)}`,
    `- Fecha fin: ${formatDate(evento.fechaFin)}`,
    `- Fecha y hora: ${formatDate(evento.fechaHora)}`,
    `- Estado: ${evento.estado || '-'}`,
    '',
    'Se adjunta el documento generado.',
  ].join('\n');
};

const buildHtmlBody = ({ obra = {}, evento = {}, eventType = 'visita' }) => {
  const tipoLabel = eventType === 'reunion' ? 'Reunion' : 'Visita';
  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.45;">
      <h2 style="margin: 0 0 12px 0; color: #0369a1;">Notificacion de ${escapeHtml(tipoLabel)}</h2>
      <p style="margin: 0 0 14px 0;">Se ha generado una notificacion para la obra y se adjunta el acta en PDF.</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 760px;">
        <tbody>
          <tr><td style="padding: 6px 0; font-weight: 700;">Denominacion obra</td><td style="padding: 6px 0;">${escapeHtml(obra.denominacion || '-')}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 700;">Codigo obra</td><td style="padding: 6px 0;">${escapeHtml(obra.codigoObra || '-')}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 700;">Expediente</td><td style="padding: 6px 0;">${escapeHtml(obra.expediente || '-')}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 700;">Municipio / Lugar</td><td style="padding: 6px 0;">${escapeHtml(evento.ubicacion || obra.municipio || '-')}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 700;">Titulo ${escapeHtml(tipoLabel.toLowerCase())}</td><td style="padding: 6px 0;">${escapeHtml(evento.titulo || '-')}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 700;">Fecha planificada</td><td style="padding: 6px 0;">${escapeHtml(formatDate(evento.fechaPlanificada))}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 700;">Fecha fin</td><td style="padding: 6px 0;">${escapeHtml(formatDate(evento.fechaFin))}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 700;">Fecha y hora</td><td style="padding: 6px 0;">${escapeHtml(formatDate(evento.fechaHora))}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: 700;">Estado</td><td style="padding: 6px 0;">${escapeHtml(evento.estado || '-')}</td></tr>
        </tbody>
      </table>
      <p style="margin-top: 16px;">Correo enviado automaticamente desde la plataforma.</p>
    </div>
  `;
};

const parsePayload = (body) => {
  try {
    return JSON.parse(body || '{}');
  } catch {
    return null;
  }
};

const normalizeRecipients = (rawRecipients) => {
  if (!Array.isArray(rawRecipients)) return [];
  return rawRecipients
    .map((recipient) => ({
      name: String(recipient?.name || '').trim(),
      email: String(recipient?.email || '').trim(),
      role: String(recipient?.role || '').trim(),
    }))
    .filter((recipient) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email));
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: responseHeaders,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: responseHeaders,
      body: JSON.stringify({ error: 'Metodo no permitido.' }),
    };
  }

  const payload = parsePayload(event.body);
  if (!payload) {
    return {
      statusCode: 400,
      headers: responseHeaders,
      body: JSON.stringify({ error: 'Body JSON invalido.' }),
    };
  }

  const recipients = normalizeRecipients(payload.recipients);
  if (recipients.length === 0) {
    return {
      statusCode: 400,
      headers: responseHeaders,
      body: JSON.stringify({ error: 'No hay destinatarios validos.' }),
    };
  }

  const attachment = payload.attachment || {};
  if (!attachment.contentBase64) {
    return {
      statusCode: 400,
      headers: responseHeaders,
      body: JSON.stringify({ error: 'No se recibio el documento PDF para adjuntar.' }),
    };
  }

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.office365.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpUser || !smtpPass || !smtpFrom) {
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ error: 'Faltan variables SMTP en el entorno del servidor.' }),
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      requireTLS: smtpPort === 587,
    });

    const eventType = payload.eventType === 'reunion' ? 'reunion' : 'visita';
    const obra = payload.obra || {};
    const evento = payload.evento || {};
    const subject =
      payload.subject ||
      `Notificacion ${eventType === 'reunion' ? 'reunion' : 'visita'} - ${evento.titulo || obra.denominacion || 'Obra'}`;

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: recipients.map((recipient) => recipient.email).join(', '),
      subject,
      text: payload.text || buildTextBody({ obra, evento, eventType }),
      html: payload.html || buildHtmlBody({ obra, evento, eventType }),
      attachments: [
        {
          filename: attachment.filename || 'Acta.pdf',
          content: Buffer.from(String(attachment.contentBase64), 'base64'),
          contentType: attachment.contentType || 'application/pdf',
        },
      ],
    });

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify({
        ok: true,
        messageId: info.messageId,
        accepted: info.accepted || [],
        rejected: info.rejected || [],
      }),
    };
  } catch (error) {
    console.error('Error sending notification email:', error);
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({
        error: 'Error al enviar el correo.',
      }),
    };
  }
};
