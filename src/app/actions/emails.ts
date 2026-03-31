"use server";
import { resend } from '@/lib/resend';

export async function sendAperturaEmail(email: string, nombre: string, radicado: string, titulo: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.includes('re_123')) {
    console.warn('Resend API Key no configurada. Email no enviado.');
    return;
  }

  try {
    await resend.emails.send({
      from: 'Finance Helpdesk <onboarding@resend.dev>', // Cambiar por dominio propio en producción
      to: [email],
      subject: `Ticket Abierto: ${radicado} - ${titulo}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #334155;">
          <h1 style="color: #4f46e5;">¡Hola, ${nombre}!</h1>
          <p>Hemos recibido tu solicitud y se ha generado un nuevo ticket de soporte.</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <p><strong>Número de Radicado:</strong> ${radicado}</p>
            <p><strong>Asunto:</strong> ${titulo}</p>
          </div>
          <p style="margin-top: 20px;">Un agente de nuestro equipo revisará tu caso pronto.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Finance Helpdesk - Automatización de Soporte</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Error enviando email apertura:', error);
  }
}

export async function sendCierreEmail(email: string, nombre: string, radicado: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.includes('re_123')) {
    console.warn('Resend API Key no configurada. Email no enviado.');
    return;
  }

  try {
    await resend.emails.send({
      from: 'Finance Helpdesk <onboarding@resend.dev>',
      to: [email],
      subject: `Ticket Cerrado: ${radicado}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #334155;">
          <h1 style="color: #059669;">¡Tu caso ha sido resuelto!</h1>
          <p>Hola, ${nombre}. Te informamos que el ticket <strong>${radicado}</strong> ha sido marcado como cerrado.</p>
          <p>Si tienes más dudas sobre este tema, puedes abrir un nuevo requerimiento.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Gracias por confiar en el equipo de Finance Helpdesk.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Error enviando email cierre:', error);
  }
}

export async function sendAsignacionEmail(email: string, nombre: string, radicado: string, titulo: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.includes('re_123')) {
    console.warn('Resend API Key no configurada. Email no enviado.');
    return;
  }

  try {
    await resend.emails.send({
      from: 'Finance Helpdesk <onboarding@resend.dev>',
      to: [email],
      subject: `Nuevo Ticket Asignado: ${radicado}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #334155;">
          <h1 style="color: #4f46e5;">Hola, ${nombre}</h1>
          <p>Se te ha asignado un nuevo ticket de soporte para tu gestión.</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <p><strong>Número de Radicado:</strong> ${radicado}</p>
            <p><strong>Asunto:</strong> ${titulo}</p>
          </div>
          <p style="margin-top: 20px;">Por favor revisa la plataforma para más detalles y da inicio a la atención del caso resolviendo a la brevedad posible.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Finance Helpdesk - Sistema de Asignaciones</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Error enviando email asignación:', error);
  }
}
