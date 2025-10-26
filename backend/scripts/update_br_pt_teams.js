/*
  Update Brazil/Portugal teams in teams.json:
  - Replace coachName from Wikipedia infobox (Manager/Head coach)
  - Replace players with parsed Current/First-team squad (football-squad tables)
  - Normalize "SA o Paulo" -> "São Paulo"
  - Process in two small batches with brief sleeps

  Usage: node backend/scripts/update_br_pt_teams.js
*/

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, '../src/data/teams.json');
const BACKUP_FILE = path.resolve(__dirname, '../src/data/teams.backup.before_br_pt_final.json');

const TARGETS = [
  // Batch 1
  { matchSlug: 'flamengo', wiki: 'Clube_de_Regatas_do_Flamengo', finalName: 'Flamengo' },
  { matchSlug: 'palmeiras', wiki: 'Sociedade_Esportiva_Palmeiras', finalName: 'Palmeiras' },
  { matchSlug: 'corinthians', wiki: 'Sport_Club_Corinthians_Paulista', finalName: 'Corinthians' },
  // Batch 2
  { matchSlug: 'sao-paulo', wiki: 'São_Paulo_FC', finalName: 'São Paulo' },
  { matchSlug: 'sporting-cp', wiki: 'Sporting_CP', finalName: 'Sporting CP' },
  { matchSlug: 'fc-porto', wiki: 'FC_Porto', finalName: 'FC Porto' },
];

function slugify(s) {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'MatchdayDataBot/1.0 (+https://example.com)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function decodeHtmlEntities(str) {
  if (!str) return str;
  // Minimal HTML entity decode
  const map = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
  return str.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => map[m] || m);
}

function stripTags(html) {
  if (!html) return '';
  return decodeHtmlEntities(html
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<span[^>]*class=\"reference\"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ').trim();
}

function cleanName(name) {
  if (!name) return name;
  let n = name;
  // remove disambiguation like (footballer, born 1997)
  n = n.replace(/\s*\((?:footballer|soccer player|born|on loan)[^)]*\)\s*$/i, '').trim();
  // fix soft hyphen and odd control chars
  n = n.replace(/[\u00AD\u200B\uFEFF]/g, '');
  // try to fix common mojibake (latin1 decoded as utf8)
  try {
    const fixed = Buffer.from(n, 'latin1').toString('utf8');
    if (/Ã|Â|�/.test(n) && !/Ã|Â|�/.test(fixed)) n = fixed;
  } catch {}
  // percent-decoding if present
  if (/%[0-9A-Fa-f]{2}/.test(n)) {
    try { n = decodeURIComponent(n); } catch {}
  }
  // normalize accents
  n = n.normalize('NFC');
  return n;
}

function mapPos(posAbbr) {
  const p = (posAbbr || '').toUpperCase();
  if (p.includes('GK')) return 'GK';
  if (p.includes('DF')) return 'DF';
  if (p.includes('MF')) return 'MF';
  if (p.includes('FW') || p.includes('ST') || p.includes('ATT')) return 'AT';
  return 'MF';
}

function extractCoach(html) {
  // Find infobox and then Manager/Head coach row
  const infoboxIdx = html.indexOf('<table class="infobox');
  if (infoboxIdx === -1) return null;
  const infobox = html.slice(infoboxIdx, html.indexOf('</table>', infoboxIdx) + 8);
  const m = infobox.match(/<th[^>]*>\s*(?:Head coach|Manager)\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  if (!m) return null;
  const cell = m[1];
  // Prefer anchor text if present
  const a = cell.match(/<a [^>]*>([\s\S]*?)<\/a>/i);
  const text = stripTags(a ? a[1] : cell);
  return cleanName(text);
}

function extractSquad(html) {
  // Locate First-team or Current squad section
  let start = html.indexOf('<h3 id="First-team_squad"');
  if (start === -1) start = html.indexOf('<h3 id="Current_squad"');
  if (start === -1) return [];
  // Take content until next h2 or h3 heading
  let end = html.indexOf('<div class="mw-heading mw-heading3"', start + 1);
  const altEnd = html.indexOf('<div class="mw-heading mw-heading2"', start + 1);
  if (end === -1 || (altEnd !== -1 && altEnd < end)) end = altEnd;
  if (end === -1) end = start + 30000; // cap
  const section = html.slice(start, end);

  // Collect rows from all football-squad tables
  const players = [];
  const tableRe = /<table class=\"wikitable football-squad[\s\S]*?<\/table>/gi;
  let t;
  while ((t = tableRe.exec(section)) !== null) {
    const tableHtml = t[0];
    // Row regex (skip header rows)
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let r; let rowIdx = 0;
    while ((r = rowRe.exec(tableHtml)) !== null) {
      const rowHtml = r[1];
      // Heuristic: data rows have <td>
      if (!/<td/i.test(rowHtml)) { rowIdx++; continue; }
      // Extract columns
      const tds = rowHtml.split(/<td[^>]*>/i).slice(1).map(s => s.split('</td>')[0]);
      if (tds.length < 4) { rowIdx++; continue; }
      const posHtml = tds[1];
      const natHtml = tds[2];
      const nameHtml = tds[3];

      // Position abbr inside <abbr> or text
      let pos = mapPos((posHtml.match(/<abbr[^>]*>([^<]+)<\/abbr>/i) || [,''])[1] || stripTags(posHtml));

      // Nation: try final anchor text like POR, BRA, etc.
      let natCode = null;
      const natAnchors = [...natHtml.matchAll(/<a [^>]*>([^<]{2,4})<\/a>/gi)].map(m => stripTags(m[1]));
      for (const code of natAnchors.reverse()) {
        if (/^[A-Z]{3}$/.test(code)) { natCode = code; break; }
      }
      if (!natCode) {
        // Fallback: country name first anchor title
        const m = natHtml.match(/title=\"([^\"]+)\"/i);
        natCode = m ? m[1] : 'Unknown';
      }

      // Player name: inside <span class="fn"><a>...
      let name = (nameHtml.match(/<span[^>]*class=\"fn\"[^>]*>\s*(?:<a [^>]*>)?([\s\S]*?)(?:<\/a>)?\s*<\/span>/i) || [,''])[1];
      if (!name) {
        // fallback to first anchor text
        name = (nameHtml.match(/<a [^>]*>([\s\S]*?)<\/a>/i) || [,''])[1];
      }
      name = cleanName(stripTags(name));
      // Remove trailing loan notes in italics present in same cell
      name = name.replace(/\s*\(on loan.*\)$/i, '').trim();

      if (!name) { rowIdx++; continue; }
      players.push({ position: pos, name, nationality: natCode, behavior: 4 });
      rowIdx++;
    }
  }
  // Deduplicate by name keeping first occurrence
  const seen = new Set();
  const unique = [];
  for (const p of players) {
    const key = p.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }
  return unique;
}

async function updateOne(team, teams) {
  const url = `https://en.wikipedia.org/wiki/${encodeURI(team.wiki)}`;
  const html = await fetchHtml(url);
  const coach = extractCoach(html);
  const squad = extractSquad(html);

  // Find team by slugified name
  const idx = teams.findIndex(t => slugify(t.name) === team.matchSlug);
  if (idx === -1) throw new Error(`Team not found in teams.json (slug ${team.matchSlug})`);

  // Normalize team name if finalName provided
  if (team.finalName && teams[idx].name !== team.finalName) {
    teams[idx].name = team.finalName;
  }

  if (coach) teams[idx].coachName = coach;
  if (Array.isArray(squad) && squad.length >= 11) {
    teams[idx].players = squad;
  }
}

async function main() {
  // Load data
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const data = JSON.parse(raw);
  const teams = data.teams;

  // Ensure backup exists (do not overwrite)
  if (!fs.existsSync(BACKUP_FILE)) {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('Backup created at', BACKUP_FILE);
  } else {
    console.log('Backup already exists at', BACKUP_FILE);
  }

  // Batch 1
  const batch1 = TARGETS.slice(0, 3);
  for (const t of batch1) {
    console.log('Updating', t.nameInFile);
    await updateOne(t, teams);
    await delay(1500);
  }

  // Brief sleep between batches
  console.log('Sleeping between batches...');
  await delay(2500);

  // Batch 2
  const batch2 = TARGETS.slice(3);
  for (const t of batch2) {
    console.log('Updating', t.nameInFile);
    await updateOne(t, teams);
    await delay(1500);
  }

  // Save file (UTF-8 without BOM)
  const out = JSON.stringify({ teams }, null, 2);
  fs.writeFileSync(DATA_FILE, out, 'utf8');
  console.log('Saved', DATA_FILE);
}

// Node 18+ has global fetch; fallback if missing
if (typeof fetch === 'undefined') {
  global.fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
}

main().catch(err => {
  console.error('Update failed:', err.message);
  process.exit(1);
});
