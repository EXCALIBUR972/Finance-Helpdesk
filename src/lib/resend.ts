import { Resend } from 'resend';

// Solo lanzar error si realmente intentamos usarlo sin la key, 
// no al momento de inicializar el cliente para evitar el pantallazo de error.
const resendApiKey = process.env.RESEND_API_KEY || 're_missing_key_placeholder';
export const resend = new Resend(resendApiKey);
