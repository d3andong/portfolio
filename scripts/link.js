#!/usr/bin/env node
/**
 * link.js — welcome-mat link generator
 *
 * Usage:
 *   node scripts/link.js <slug> --name "Display Name" [options]
 *
 * Required:
 *   --name <display>     Display name (e.g. "CoreWeave") — always required
 *
 * Options:
 *   --person <slug>      Person slug (e.g. "jane-smith")
 *   --domain <domain>    Override domain (default: <slug>.com)
 *   --base <url>         Override base URL (default: https://deaneyolfson.com)
 *   --no-copy            Don't copy to clipboard
 *   --no-log             Don't write to leads.json
 *   -h, --help           Show help
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const BASE_URL_DEFAULT = 'https://deaneyolfson.com';
const LEADS_PATH = path.join(__dirname, '..', 'leads.json');

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { args.help = true; continue; }
    if (a === '--no-copy') { args.noCopy = true; continue; }
    if (a === '--no-log') { args.noLog = true; continue; }
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (val === undefined || val.startsWith('--')) {
        console.error(`Error: --${key} requires a value`);
        process.exit(1);
      }
      args[key] = val;
      i++;
      continue;
    }
    args._.push(a);
  }
  return args;
}

function printHelp() {
  console.log(`
link.js — welcome-mat link generator

Usage:
  node scripts/link.js <company-slug> --name "Display Name" [options]

Required:
  --name <display>     Display name, e.g. "CoreWeave" (always required)

Options:
  --person <slug>      Person slug, e.g. "jane-smith"
  --domain <domain>    Override domain (default: <slug>.com)
  --base <url>         Override base URL (default: ${BASE_URL_DEFAULT})
  --no-copy            Don't copy to clipboard
  --no-log             Don't write to leads.json
  -h, --help           Show help

Examples:
  node scripts/link.js coreweave --name "CoreWeave"
  node scripts/link.js coreweave --name "CoreWeave" --person jane-smith
  node scripts/link.js fly --name "Fly" --domain fly.io
`);
}

function copyToClipboard(text) {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      const r = spawnSync('pbcopy', { input: text });
      return r.status === 0;
    }
    if (platform === 'win32') {
      const r = spawnSync('clip', { input: text, shell: true });
      return r.status === 0;
    }
    for (const [cmd, args] of [
      ['xclip', ['-selection', 'clipboard']],
      ['xsel', ['--clipboard', '--input']],
      ['wl-copy', []]
    ]) {
      try {
        const r = spawnSync(cmd, args, { input: text });
        if (r.status === 0) return true;
      } catch (_) { /* try next */ }
    }
    return false;
  } catch (_) {
    return false;
  }
}

function appendLead(entry) {
  let db = { leads: [] };
  try {
    if (fs.existsSync(LEADS_PATH)) {
      const raw = fs.readFileSync(LEADS_PATH, 'utf8');
      db = JSON.parse(raw || '{"leads":[]}');
      if (!Array.isArray(db.leads)) db.leads = [];
    }
  } catch (_) {
    try {
      const backup = LEADS_PATH + '.corrupt.' + Date.now();
      fs.copyFileSync(LEADS_PATH, backup);
      console.warn(`Warning: leads.json was unreadable, backed up to ${backup}`);
    } catch (_) { /* ignore */ }
    db = { leads: [] };
  }
  db.leads.push(entry);
  fs.writeFileSync(LEADS_PATH, JSON.stringify(db, null, 2) + '\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args._.length === 0) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  if (!args.name) {
    console.error('Error: --name "Display Name" is required.\n');
    printHelp();
    process.exit(1);
  }

  const rawCompany = args._[0];
  const slug = slugify(rawCompany);
  if (!slug) {
    console.error('Error: could not derive a slug from that input.');
    process.exit(1);
  }

  const displayName = args.name;
  const domain = (args.domain || `${slug}.com`).toLowerCase();
  const personSlug = args.person ? slugify(args.person) : null;
  const baseUrl = (args.base || BASE_URL_DEFAULT).replace(/\/+$/, '');

  const pathPart = personSlug ? `/hi/${slug}/${personSlug}` : `/hi/${slug}`;
  const qs = new URLSearchParams();
  qs.set('n', displayName);
  if (args.domain) qs.set('d', domain);
  const url = `${baseUrl}${pathPart}?${qs.toString()}`;

  const distinctId = personSlug ? `${slug}-${personSlug}` : slug;

  if (!args.noLog) {
    try {
      appendLead({
        created_at: new Date().toISOString(),
        slug,
        display_name: displayName,
        domain,
        person_slug: personSlug,
        distinct_id: distinctId,
        url
      });
    } catch (err) {
      console.warn(`Warning: could not write to leads.json — ${err.message}`);
    }
  }

  let copied = false;
  if (!args.noCopy) copied = copyToClipboard(url);

  const DIM = '\x1b[2m';
  const BOLD = '\x1b[1m';
  const ACCENT = '\x1b[38;5;166m';
  const RESET = '\x1b[0m';

  console.log('');
  console.log(`${ACCENT}${BOLD}${url}${RESET}`);
  console.log('');
  console.log(`${DIM}display name   ${RESET}${displayName}`);
  console.log(`${DIM}slug           ${RESET}${slug}`);
  console.log(`${DIM}domain         ${RESET}${domain}`);
  if (personSlug) console.log(`${DIM}person         ${RESET}${personSlug}`);
  console.log(`${DIM}distinct_id    ${RESET}${distinctId}`);
  console.log('');
  if (copied) {
    console.log(`${DIM}✓ copied to clipboard${RESET}`);
  } else if (!args.noCopy) {
    console.log(`${DIM}(clipboard unavailable — copy manually)${RESET}`);
  }
  if (!args.noLog) {
    console.log(`${DIM}✓ logged to leads.json${RESET}`);
  }
  console.log('');
}

main();
