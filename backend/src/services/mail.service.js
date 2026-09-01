import nodemailer from 'nodemailer';

import { env } from '../config/env.js';
import {
  detailTable,
  paragraphs,
  renderEmail
} from './email-template.js';

let transporter = null;

/**
 * Mail is optional infrastructure: if SMTP is not configured the API still
 * works and simply logs instead. An unconfigured mailbox must never cost
 * the site a contact enquiry.
 */
const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  if (!env.mail.host || !env.mail.user || !env.mail.pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.secure,
    auth: { user: env.mail.user, pass: env.mail.pass }
  });

  return transporter;
};

const send = async options => {
  const mailer = getTransporter();

  if (!mailer) {
    console.warn('[mail] SMTP not configured — skipped:', options.subject);
    return { skipped: true };
  }

  try {
    const info = await mailer.sendMail({ from: env.mail.from, ...options });
    return { messageId: info.messageId };
  } catch (error) {
    // Never let a mail failure turn into a failed request for the visitor.
    console.error('[mail] send failed:', error.message);
    return { failed: true };
  }
};

const TYPE_LABELS = {
  branding: 'Branding',
  'web-design': 'Web design',
  campaign: 'Campaign',
  production: 'Production',
  other: 'Other'
};

/**
 * Tells the studio a new enquiry landed.
 *
 * `replyTo` is the visitor, so hitting reply in any client answers them
 * directly rather than the no-reply sender.
 */
export const sendContactNotification = async request =>
  send({
    to: env.admin.email || env.mail.user,
    replyTo: request.email,
    subject: `New enquiry — ${request.name} (${TYPE_LABELS[request.projectType] ?? request.projectType})`,

    text: [
      `New enquiry from ${request.name}`,
      '',
      `Email:  ${request.email}`,
      `Phone:  ${request.phone}`,
      `Type:   ${TYPE_LABELS[request.projectType] ?? request.projectType}`,
      '',
      request.message,
      '',
      `Open the portal: ${env.clientUrl}/admin/contact-requests`
    ].join('\n'),

    html: renderEmail({
      preheader: `${request.name} — ${request.phone} — ${String(request.message).slice(0, 90)}`,
      title: 'New enquiry',
      intro: `${request.name} just sent a message through the site.`,
      body:
        detailTable([
          { label: 'Name', value: request.name },
          { label: 'Email', value: request.email, href: `mailto:${request.email}` },
          {
            label: 'Phone',
            value: request.phone,
            // tel: needs the punctuation stripped or some dialers choke.
            href: `tel:${String(request.phone).replace(/[^\d+]/g, '')}`
          },
          {
            label: 'Project type',
            value: TYPE_LABELS[request.projectType] ?? request.projectType
          }
        ]) +
        `<div style="margin-top:8px;padding:20px;background:rgba(0,0,0,0.25);border-left:2px solid #e85b17;border-radius:4px;">
           <p style="margin:0 0 10px;font:400 10px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;letter-spacing:2px;color:rgba(242,238,232,0.4);text-transform:uppercase;">Message</p>
           ${paragraphs(request.message)}
         </div>`,
      cta: {
        label: 'Open in the portal',
        url: `${env.clientUrl}/admin/contact-requests`
      }
    })
  });

/** Confirms to the sender that a person will read it. */
export const sendContactAcknowledgement = async request =>
  send({
    to: request.email,
    subject: "We received your message — EAST HOOD",

    text: [
      `${request.name},`,
      '',
      "Your brand called. We'll answer.",
      '',
      'Thank you for reaching out to EAST HOOD. Someone from the studio will',
      'come back to you shortly — usually within one working day.',
      '',
      'For reference, this is what you sent:',
      '',
      request.message,
      '',
      '— EAST HOOD'
    ].join('\n'),

    html: renderEmail({
      preheader: "Your brand called. We'll answer — someone will be in touch within one working day.",
      title: "Your brand called.",
      intro: `${request.name}, thank you for reaching out. Someone from the studio will come back to you — usually within one working day.`,
      body: `<div style="padding:20px;background:rgba(0,0,0,0.25);border-left:2px solid rgba(255,255,255,0.15);border-radius:4px;">
               <p style="margin:0 0 10px;font:400 10px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;letter-spacing:2px;color:rgba(242,238,232,0.4);text-transform:uppercase;">What you sent</p>
               ${paragraphs(request.message)}
             </div>`,
      cta: { label: 'See our work', url: `${env.siteUrl}/work` },
      footnote:
        'No reply needed. If anything changes in the meantime, just answer this email.'
    })
  });

/**
 * The password-reset code.
 *
 * No link to click, by design: a reset link in an email is one more thing
 * to phish, and a code the user retypes cannot be triggered by a click.
 */
export const sendPasswordResetCode = async ({ email, name, code, minutes }) =>
  send({
    to: email,
    subject: `${code} is your EAST HOOD verification code`,

    text: [
      `${name || 'Hello'},`,
      '',
      'Use this code to reset your EAST HOOD password:',
      '',
      `    ${code}`,
      '',
      `It expires in ${minutes} minutes and can be used once.`,
      '',
      'If you did not ask to reset your password, ignore this email —',
      'nothing has changed, and the code is useless on its own.',
      '',
      '— EAST HOOD'
    ].join('\n'),

    html: renderEmail({
      preheader: `Your verification code expires in ${minutes} minutes.`,
      title: 'Verification code',
      intro: `${name || 'Hello'}, use this code to reset your password.`,
      body: `<div style="padding:26px 20px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:8px;text-align:center;">
               <div style="font:500 34px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;letter-spacing:10px;color:#f2eee8;direction:ltr;unicode-bidi:isolate;">${code}</div>
             </div>`,
      footnote: `It expires in ${minutes} minutes and can be used once. If you did not ask to reset your password, ignore this email — nothing has changed, and the code is useless on its own.`
    })
  });

/** Sent after a successful reset, so a hijacked account is noticed. */
export const sendPasswordChangedNotice = async ({ email, name }) =>
  send({
    to: email,
    subject: 'Your EAST HOOD password was changed',

    text: [
      `${name || 'Hello'},`,
      '',
      'Your EAST HOOD admin password was just changed.',
      '',
      'If this was you, nothing more to do.',
      'If it was not, reply to this email immediately.',
      '',
      '— EAST HOOD'
    ].join('\n'),

    html: renderEmail({
      preheader: 'Your admin password was just changed.',
      title: 'Password changed',
      intro: `${name || 'Hello'}, your EAST HOOD admin password was just changed.`,
      footnote:
        'If this was you, there is nothing more to do. If it was not, reply to this email immediately — someone else has access to your account.',
      cta: { label: 'Sign in', url: `${env.clientUrl}/admin/login` }
    })
  });
