// lib/emailVerification.ts
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

export function generateVerificationCode(length = 6): string {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
}
export function generateCode(length = 6): string {
    return generateVerificationCode(length);
}

export function hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
}

export async function sendVerificationEmail(email: string, code: string) {

    if (!resend) {
        console.log(`Código de verificación para ${email}: ${code}`);
        return;
    }


    await resend.emails.send({
        from: 'YigiCoin <no-reply@yigicoin.com>', // ajusta dominio cuando valides uno
        to: [email],
        subject: 'Código de verificación de YigiCoin',
        text: `Tu código de verificación es: ${code}`,
        html: `
      <div style="font-family: sans-serif; line-height: 1.5;">
        <h2>Verificación de correo</h2>
        <p>Tu código de verificación para YigiCoin es:</p>
        <p style="font-size: 24px; font-weight: bold;">${code}</p>
        <p>Este código expira en 10 minutos.</p>
      </div>
    `,
    });
}

export async function sendPasswordResetEmail(email: string, code: string) {

    if (!resend) {
        console.log(`Código de recuperación de contraseña para ${email}: ${code}`);
        return;
    }


    await resend.emails.send({
        from: 'YigiCoin <no-reply@yigicoin.com>', // ajusta dominio cuando valides uno
        to: [email],
        subject: 'Recuperación de contraseña - YigiCoin',
        text: `Tu código de recuperación de contraseña es: ${code}`,
        html: `
      <div style="font-family: sans-serif; line-height: 1.5; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6; margin-bottom: 10px;">🔐 Recuperación de Contraseña</h1>
        </div>
        <div style="background-color: #f3f4f6; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">Código de Verificación</h2>
          <p style="color: #4b5563; font-size: 16px;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de YigiCoin.</p>
          <p style="color: #4b5563; font-size: 16px;">Tu código de verificación es:</p>
          <div style="background-color: white; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="font-size: 32px; font-weight: bold; color: #3b82f6; margin: 0; letter-spacing: 5px;">${code}</p>
          </div>
          <p style="color: #ef4444; font-size: 14px; margin-top: 20px;">
            <strong>⏰ Este código expira en 10 minutos.</strong>
          </p>
        </div>
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            <strong>⚠️ Nota de Seguridad:</strong> Si no solicitaste este cambio, ignora este correo. Tu cuenta permanecerá segura.
          </p>
        </div>
        <div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p>© ${new Date().getFullYear()} YigiCoin - Todos los derechos reservados</p>
          <p>Este es un correo automático, por favor no responder.</p>
        </div>
      </div>
    `,
    });
}
