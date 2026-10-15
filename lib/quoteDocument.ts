const BUSINESS = {
  name: 'Kingston Energies',
  email: 'kingstonenergygroup@outlook.com',
  phone: '876-338-9958',
  location: 'Kingston, Jamaica',
  instagram: '@kingstonenergies',
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const logoUrl = `${siteUrl}/images/logo-mark.png`

const FONT_HEAD = "'Poppins', Arial, Helvetica, sans-serif"
const FONT_BODY = "Georgia, 'Times New Roman', serif"

/** Accounting-style J$ formatting: always two decimals, negatives in parentheses. */
function fmtAcct(n: number): string {
  const abs = 'J$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `(${abs})` : abs
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

export interface QuoteData {
  customerName: string
  email: string
  phone: string | null
  date: string
  shoppingFor: string | null
  area: string | null
  timeframe: string | null
  items: { name: string; qty: number; price: number }[]
  total: number
}

/** A self-contained, letter-sized HTML quotation — same branding as
 *  buildInvoiceHtml(), minus any payment-status elements since a quote
 *  has no payment state yet. Used for both the emailed copy and the
 *  in-browser "view" page. */
export function buildQuoteHtml(d: QuoteData): string {
  const rows = d.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:11px 0;border-bottom:1px solid #e8ece9;color:#1c2a25">${escapeHtml(i.name)}</td>
          <td style="padding:11px 0;border-bottom:1px solid #e8ece9;text-align:right;color:#5b655f">${fmtAcct(i.price)}</td>
          <td style="padding:11px 0;border-bottom:1px solid #e8ece9;text-align:center;color:#5b655f">${i.qty}</td>
          <td style="padding:11px 0;border-bottom:1px solid #e8ece9;text-align:right;color:#1c2a25;font-weight:600">${fmtAcct(i.price * i.qty)}</td>
        </tr>`,
    )
    .join('')

  const detailBlock = (label: string, value: string | null) =>
    value
      ? `<div style="margin-bottom:16px">
          <div style="font-family:${FONT_HEAD};color:#8a968c;text-transform:uppercase;font-size:9.5px;letter-spacing:.1em;font-weight:700">${label}</div>
          <div style="color:#1c2a25;margin-top:5px;white-space:pre-line">${escapeHtml(value)}</div>
        </div>`
      : ''

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quotation for ${escapeHtml(d.customerName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: letter; margin: 0; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #eef1ee; font-family: ${FONT_BODY}; }
    @media print {
      html, body { background: #fff; }
      .sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; min-height: 0 !important; }
    }
    .sheet {
      width: 8.5in;
      min-height: 11in;
      margin: 28px auto;
      background: #fff;
      box-shadow: 0 1px 3px rgba(20,30,24,.08), 0 12px 32px -16px rgba(20,30,24,.25);
      display: flex;
      flex-direction: column;
    }
  </style></head>
  <body>
    <div class="sheet">
      <div style="background:linear-gradient(120deg,#173d29,#0d1714);padding:28px 46px;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:16px">
          <img src="${logoUrl}" width="64" height="64" alt="" style="display:block;object-fit:contain;flex-shrink:0" />
          <div>
            <div style="font-family:${FONT_HEAD};color:#fff;font-size:22px;font-weight:800;letter-spacing:.01em">${BUSINESS.name}</div>
            <div style="color:#a9c2ae;font-size:11px;margin-top:4px;letter-spacing:.03em">Powering Progress, <span style="font-style:italic">Charging Initiatives</span></div>
          </div>
        </div>
        <div style="text-align:right;color:#c9d8cd;font-size:11.5px;line-height:1.6">
          <div>${BUSINESS.location}</div>
          <div>${BUSINESS.phone}</div>
          <div>${BUSINESS.email}</div>
        </div>
      </div>

      <div style="padding:34px 46px 0;flex:1">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:26px;border-bottom:1px solid #e8ece9">
          <div>
            <div style="font-family:${FONT_HEAD};font-size:26px;font-weight:800;color:#0d1714;letter-spacing:-.01em">Quotation</div>
            <div style="color:#8a968c;font-size:12.5px;margin-top:6px">${d.date}</div>
          </div>
          <div style="text-align:right">
            <div style="font-family:${FONT_HEAD};display:inline-block;margin-top:9px;padding:3px 11px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.04em;background:#fdeccd;color:#9a6b12">INDICATIVE — NOT A TAX INVOICE</div>
          </div>
        </div>

        <div style="display:flex;gap:36px;padding:26px 0;border-bottom:1px solid #e8ece9">
          <div style="flex:1.1;min-width:0">
            ${detailBlock('Prepared for', d.customerName)}
            ${detailBlock('Contact', [d.email, d.phone].filter(Boolean).join(' · ') || null)}
          </div>
          <div style="width:240px;flex-shrink:0;background:#f5f8f5;border:1px solid #e8ece9;border-radius:12px;padding:18px 20px">
            ${d.shoppingFor ? `<div style="display:flex;justify-content:space-between;font-size:12.5px;color:#5b655f;padding:5px 0"><span style="font-family:${FONT_HEAD};font-weight:600">Shopping for</span><span style="color:#1c2a25;font-weight:600">${escapeHtml(d.shoppingFor)}</span></div>` : ''}
            ${d.area ? `<div style="display:flex;justify-content:space-between;font-size:12.5px;color:#5b655f;padding:5px 0"><span style="font-family:${FONT_HEAD};font-weight:600">Area</span><span style="color:#1c2a25;font-weight:600">${escapeHtml(d.area)}</span></div>` : ''}
            ${d.timeframe ? `<div style="display:flex;justify-content:space-between;font-size:12.5px;color:#5b655f;padding:5px 0"><span style="font-family:${FONT_HEAD};font-weight:600">Timeframe</span><span style="color:#1c2a25;font-weight:600">${escapeHtml(d.timeframe)}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;padding-top:11px;margin-top:6px;border-top:1px solid #e0e6e1">
              <span style="font-family:${FONT_HEAD};font-weight:800;color:#0d1714;font-size:13px">Indicative total</span>
              <span style="font-family:${FONT_HEAD};font-weight:800;color:#0d1714;font-size:16px">${fmtAcct(d.total)}</span>
            </div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-top:22px">
          <thead><tr style="font-family:${FONT_HEAD}">
            <th style="text-align:left;padding:0 0 9px;border-bottom:2px solid #0d1714;color:#8a968c;font-size:10px;letter-spacing:.09em;text-transform:uppercase;font-weight:700">Description</th>
            <th style="text-align:right;padding:0 0 9px;border-bottom:2px solid #0d1714;color:#8a968c;font-size:10px;letter-spacing:.09em;text-transform:uppercase;font-weight:700">Price</th>
            <th style="text-align:center;padding:0 0 9px;border-bottom:2px solid #0d1714;color:#8a968c;font-size:10px;letter-spacing:.09em;text-transform:uppercase;font-weight:700">Qty</th>
            <th style="text-align:right;padding:0 0 9px;border-bottom:2px solid #0d1714;color:#8a968c;font-size:10px;letter-spacing:.09em;text-transform:uppercase;font-weight:700">Amount</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>

        <table style="width:100%;margin-top:4px;font-size:13px"><tr>
          <td></td>
          <td style="text-align:right;width:240px;padding-top:14px">
            <div style="display:flex;justify-content:space-between;padding:10px 0 0;margin-top:6px;border-top:2px solid #0d1714">
              <span style="font-family:${FONT_HEAD};font-weight:800;color:#0d1714">Indicative total</span>
              <span style="font-family:${FONT_HEAD};font-weight:800;color:#0d1714;font-size:17px">${fmtAcct(d.total)}</span>
            </div>
          </td>
        </tr></table>
      </div>

      <div style="margin-top:44px;background:linear-gradient(120deg,#173d29,#0d1714);padding:32px 46px 26px">
        <div style="display:flex;gap:30px">
          <div style="flex:1">
            <div style="font-family:${FONT_HEAD};color:#8fbf9c;text-transform:uppercase;font-size:9.5px;letter-spacing:.1em;font-weight:700">Questions?</div>
            <div style="color:#dbe6dd;font-size:12px;margin-top:7px;line-height:1.7">
              ${BUSINESS.phone}<br />${BUSINESS.email}<br />${BUSINESS.instagram}
            </div>
          </div>
          <div style="flex:1">
            <div style="font-family:${FONT_HEAD};color:#8fbf9c;text-transform:uppercase;font-size:9.5px;letter-spacing:.1em;font-weight:700">About this quotation</div>
            <div style="color:#dbe6dd;font-size:12px;margin-top:7px;line-height:1.7">
              Prices are indicative and subject to stock and confirmation.<br />
              This is not a tax invoice.
            </div>
          </div>
        </div>

        <div style="margin-top:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,.12);color:#a9c2ae;font-size:11.5px;text-align:center">
          Thank you for considering ${BUSINESS.name}
        </div>
      </div>
    </div>
  </body></html>`
}
