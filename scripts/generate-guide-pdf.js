/**
 * generate-guide-pdf.js
 * Generates the "5 Ways to Get Paid Faster" guide PDF using pdfkit.
 * Output: /public/guides/5-ways-get-paid-faster.pdf
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'guides');
const OUTPUT_FILE = path.join(OUTPUT_DIR, '5-ways-get-paid-faster.pdf');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 60, bottom: 60, left: 60, right: 60 },
  info: {
    Title: '5 Ways to Get Paid Faster',
    Author: 'InvoiceFlow',
    Subject: 'Actionable strategies for freelancers to get paid faster',
  },
});

const writeStream = fs.createWriteStream(OUTPUT_FILE);
doc.pipe(writeStream);

// ── Helpers ──────────────────────────────────────────────────────────

const DARK = '#1a1a2e';
const ACCENT = '#e05d2e';
const GRAY = '#555555';
const LIGHT_GRAY = '#888888';
const LINE_GAP = 18;

function sectionTitle(num, title) {
  doc.moveDown(1.5);
  doc.fontSize(13)
     .font('Helvetica-Bold')
     .fillColor(ACCENT)
     .text(`${num}. ${title}`, { continued: false });
  doc.moveDown(0.3);
}

function bodyText(text) {
  doc.fontSize(10.5)
     .font('Helvetica')
     .fillColor(DARK)
     .text(text, { lineGap: 4 });
}

function addDivider() {
  doc.moveDown(0.5);
  const y = doc.y;
  doc.strokeColor('#e0e0e0')
     .lineWidth(1)
     .moveTo(doc.page.margins.left, y)
     .lineTo(doc.page.width - doc.page.margins.right, y)
     .stroke();
  doc.moveDown(0.5);
}

// ── Content ───────────────────────────────────────────────────────────

// --- Title Page ---
doc.moveDown(4);
doc.fontSize(28)
   .font('Helvetica-Bold')
   .fillColor(DARK)
   .text('5 Ways to Get', { align: 'center' });
doc.fontSize(28)
   .font('Helvetica-Bold')
   .fillColor(ACCENT)
   .text('Paid Faster', { align: 'center' });

doc.moveDown(0.8);
doc.fontSize(13)
   .font('Helvetica')
   .fillColor(GRAY)
   .text('Actionable strategies for freelancers', { align: 'center' });

doc.moveDown(1.5);
doc.fontSize(11)
   .font('Helvetica')
   .fillColor(LIGHT_GRAY)
   .text('InvoiceFlow — Free Guide', { align: 'center' });

// --- Introduction ---
doc.moveDown(3);
addDivider();
doc.moveDown(0.5);

sectionTitle('', 'Introduction');
bodyText('Late payments are the #1 killer of freelance cash flow. Studies show that 40% of invoices are paid late, and the average freelancer spends 5 hours per month chasing payments. That\'s time you could be billing clients.');
doc.moveDown(0.3);
bodyText('This guide covers five proven strategies to get paid faster — without damaging your client relationships or spending hours on admin work.');

// --- Strategies ---
sectionTitle('1', 'Send Invoices Immediately');
bodyText('Don\'t wait until end of month. Send your invoice the moment work is complete — or better yet, have it auto-generate from Stripe. The faster the invoice lands, the faster you get paid.');

sectionTitle('2', 'Automate Payment Reminders');
bodyText('Stop sending awkward "just checking in" emails. Set up an automated reminder sequence: Day 1 (friendly nudge), Day 3 (polite reminder), Day 7 (final notice). Automation removes the emotional friction.');

sectionTitle('3', 'Offer Multiple Payment Methods');
bodyText('Stripe, PayPal, bank transfer, card — give clients every option. The fewer clicks it takes to pay, the faster they\'ll do it. Offering multiple methods increases on-time payment rates by over 30%.');

sectionTitle('4', 'Use a Professional Invoice Template');
bodyText('A branded, professional invoice signals legitimacy and gets prioritized. Include your logo, clear payment terms (Net-15 or due on receipt), itemised services, and payment links. Templates beat plain-text invoices every time — clients pay faster when it looks official.');

sectionTitle('5', 'Charge Late Fees (and Mean It)');
bodyText('A 1.5–5% monthly late fee is standard and enforceable in most jurisdictions. State it clearly on every invoice. Even if you rarely enforce it, having the policy on paper reduces late payments by up to 30%. Clients pay on time to avoid the fee.');

// --- CTA / Closing ---
doc.moveDown(2);
addDivider();
doc.moveDown(1);

doc.fontSize(14)
   .font('Helvetica-Bold')
   .fillColor(ACCENT)
   .text('Want to automate all of this?', { align: 'center' });

doc.moveDown(0.4);
doc.fontSize(10.5)
   .font('Helvetica')
   .fillColor(DARK)
   .text('InvoiceFlow auto-generates invoices, sends reminders, and tracks payments — so you never chase a dime.', { align: 'center' });
doc.moveDown(0.4);
doc.fontSize(11)
   .font('Helvetica-Bold')
   .fillColor(ACCENT)
   .text('Start free at invoiceflow.com', { align: 'center' });

doc.moveDown(2);
doc.fontSize(9)
   .font('Helvetica')
   .fillColor(LIGHT_GRAY)
   .text('© 2026 InvoiceFlow. All rights reserved.', { align: 'center' });

// ── Finalize ──────────────────────────────────────────────────────────
// IMPORTANT: Do NOT call doc.addPage() at the end — that causes a blank last page.
doc.end();

writeStream.on('finish', () => {
  console.log(`✅ PDF generated: ${OUTPUT_FILE}`);
  console.log(`   Size: ${fs.statSync(OUTPUT_FILE).size} bytes`);
});
