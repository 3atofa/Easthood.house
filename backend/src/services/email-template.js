import { env } from '../config/env.js';

/**
 * EAST HOOD email layout.
 *
 * Email is not the web. The rules this file is built around:
 *
 *  - TABLES, not flexbox or grid. Outlook renders through Word's engine and
 *    ignores modern layout entirely.
 *  - INLINE styles. Gmail strips <style> blocks on forwarded mail and in
 *    several mobile clients, so anything load-bearing must be on the element.
 *  - A 600px fixed width with width="100%" on the outer table. That is the
 *    long-standing safe width, and it degrades to full width on phones.
 *  - Real text, never an image of text. Images are blocked by default in
 *    most clients, so an image-only email arrives blank.
 *  - A preheader — the grey line clients show next to the subject. Left
 *    empty it gets filled with whatever text comes first, usually "View in
 *    browser" or a bare URL.
 */

const INK = '#f2eee8';
const BLACK = '#050505';
const PANEL = '#131316';
const ACCENT = '#e85b17';
const MUTED = 'rgba(242,238,232,0.55)';
const LINE = 'rgba(255,255,255,0.10)';

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif";

export const escapeHtml = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Preserves the paragraph breaks a visitor typed. */
const paragraphs = text =>
  String(text ?? '')
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(
      part =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:${INK};">${escapeHtml(
          part
        ).replace(/\n/g, '<br />')}</p>`
    )
    .join('');

/** A label/value row. `href` makes the value tappable (mailto:, tel:). */
const detailRow = ({ label, value, href }) => {
  if (!value) {
    return '';
  }

  const shown = escapeHtml(value);

  const inner = href
    ? `<a href="${escapeHtml(href)}" style="color:${ACCENT};text-decoration:none;">${shown}</a>`
    : shown;

  return `
    <tr>
      <td style="padding:0 0 4px;font:400 10px/1.4 ${FONT};letter-spacing:2px;color:rgba(242,238,232,0.4);text-transform:uppercase;">${escapeHtml(
        label
      )}</td>
    </tr>
    <tr>
      <td style="padding:0 0 18px;font:400 15px/1.5 ${FONT};color:${INK};">${inner}</td>
    </tr>`;
};

export const detailTable = rows =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
     ${rows.map(detailRow).join('')}
   </table>`;

/**
 * The shell every EAST HOOD email uses.
 *
 * @param {object}  o
 * @param {string}  o.preheader  Inbox preview line. Always set it.
 * @param {string}  o.title      Big heading.
 * @param {string}  [o.intro]    Plain sentence under the heading.
 * @param {string}  [o.body]     Raw HTML block (detailTable, a code, …).
 * @param {object}  [o.cta]      { label, url }
 * @param {string}  [o.footnote] Small print above the footer rule.
 */
export const renderEmail = ({
  preheader,
  title,
  intro = '',
  body = '',
  cta = null,
  footnote = ''
}) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="dark" />
<title>${escapeHtml(title)}</title>
<style>
  /* Progressive only — every critical style is also inline below. */
  @media (max-width:620px){
    .eh-wrap{width:100% !important;}
    .eh-pad{padding-left:24px !important;padding-right:24px !important;}
    .eh-title{font-size:26px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BLACK};">

  <!-- Preheader: the grey line beside the subject. Hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BLACK};">
    <tr>
      <td align="center" style="padding:32px 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="eh-wrap" style="width:600px;max-width:600px;">

          <!-- Wordmark -->
          <tr>
            <td class="eh-pad" style="padding:0 40px 24px;font:500 13px/1 ${FONT};letter-spacing:3px;color:${INK};">
              EAST HOOD
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:${PANEL};border:1px solid ${LINE};border-radius:12px;">

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">

                <!-- Accent rule -->
                <tr><td style="height:3px;background:${ACCENT};font-size:0;line-height:0;border-radius:12px 12px 0 0;">&nbsp;</td></tr>

                <tr>
                  <td class="eh-pad" style="padding:36px 40px 8px;">
                    <h1 class="eh-title" style="margin:0;font:500 30px/1.15 ${FONT};letter-spacing:-0.5px;color:${INK};">
                      ${escapeHtml(title)}
                    </h1>
                  </td>
                </tr>

                ${
                  intro
                    ? `<tr><td class="eh-pad" style="padding:14px 40px 0;font:400 15px/1.7 ${FONT};color:${MUTED};">${escapeHtml(
                        intro
                      )}</td></tr>`
                    : ''
                }

                ${
                  body
                    ? `<tr><td class="eh-pad" style="padding:28px 40px 0;">${body}</td></tr>`
                    : ''
                }

                ${
                  cta
                    ? `<tr><td class="eh-pad" style="padding:28px 40px 0;">
                         <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                           <tr>
                             <td style="background:${INK};border-radius:2px;">
                               <a href="${escapeHtml(cta.url)}"
                                  style="display:inline-block;padding:14px 28px;font:500 11px/1 ${FONT};letter-spacing:2px;color:${BLACK};text-decoration:none;text-transform:uppercase;">
                                 ${escapeHtml(cta.label)}
                               </a>
                             </td>
                           </tr>
                         </table>
                       </td></tr>`
                    : ''
                }

                ${
                  footnote
                    ? `<tr><td class="eh-pad" style="padding:28px 40px 0;font:400 13px/1.65 ${FONT};color:rgba(242,238,232,0.4);">${footnote}</td></tr>`
                    : ''
                }

                <tr><td class="eh-pad" style="padding:32px 40px 36px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr><td style="height:1px;background:${LINE};font-size:0;line-height:0;">&nbsp;</td></tr>
                  </table>
                  <p style="margin:20px 0 0;font:400 12px/1.6 ${FONT};color:rgba(242,238,232,0.3);">
                    EAST HOOD — branding, strategy and production.<br />
                    <a href="${escapeHtml(env.siteUrl)}" style="color:rgba(242,238,232,0.45);text-decoration:none;">${escapeHtml(
                      env.siteUrl.replace(/^https?:\/\//, '')
                    )}</a>
                  </p>
                </td></tr>

              </table>

            </td>
          </tr>

          <tr>
            <td class="eh-pad" style="padding:20px 40px 0;font:400 11px/1.6 ${FONT};color:rgba(242,238,232,0.25);">
              You are receiving this because of activity on ${escapeHtml(
                env.siteUrl.replace(/^https?:\/\//, '')
              )}.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

export { paragraphs };
