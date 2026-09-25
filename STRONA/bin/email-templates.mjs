// Renders the emails that Supabase Auth sends on our behalf into
// supabase/email-templates/, from the same code as the application mail
// (api/_lib/emails.js), so the two can never drift apart by hand-editing.
//
// Supabase keeps its templates in the dashboard, not in this repo. After running
// this, paste each file into Authentication → Emails → <template> (Message body,
// "Source" view) and set the subject printed below.
//
//   node bin/email-templates.mjs

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { partnerResetTemplate } from '../api/_lib/emails.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'email-templates');

const TEMPLATES = [['reset-password.html', 'Reset password', partnerResetTemplate()]];

await mkdir(OUT, { recursive: true });
for (const [file, slot, { subject, html }] of TEMPLATES) {
  await writeFile(join(OUT, file), html);
  console.log(`${slot}: supabase/email-templates/${file}\n  subject: ${subject}`);
}
