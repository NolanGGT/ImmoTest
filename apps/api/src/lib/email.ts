import { Resend } from 'resend'
import { logger } from './logger'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'ImmoSafe <noreply@immosafe.fr>',
      to: params.to,
      subject: params.subject,
      html: params.html,
    })
    logger.info({ to: params.to, subject: params.subject }, 'Email envoyé')
  } catch (error) {
    logger.error({ error, to: params.to }, 'Échec envoi email')
  }
}
