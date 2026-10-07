// ====================================================================
// SEO / AEO build step — runs before esbuild in `npm run build`.
//
// The app renders entirely client-side, so the raw HTML that crawlers
// fetch used to contain an empty <div id="root"> and nothing else.
// Google renders JavaScript and saw the real page; most answer-engine
// crawlers (GPTBot, ClaudeBot, PerplexityBot, CCBot) do not, and saw
// a title and zero words.
//
// This script derives everything a crawler needs from src/data.js — the
// same source the app renders — so the two can never drift apart:
//
//   index.html   seo:head block   canonical, llms.txt link, JSON-LD
//   index.html   seo:static block a semantic HTML mirror of the page,
//                                 inside #root. React replaces it on
//                                 mount; the `js` class set pre-paint
//                                 hides it first, so there is no flash.
//   sitemap.xml                   the page plus the published papers
//   llms.txt                      a Markdown profile (llmstxt.org)
//
// Output is deterministic (no timestamps), so re-running it on
// unchanged data leaves the working tree clean. Only edit the content
// between the seo:* markers through this script — it is overwritten.
// ====================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { AK_DATA as d } from '../src/data.js';

// Single source of truth for the public URL. If the site moves to a
// custom domain, change it here and in index.html's og:/twitter: tags.
const SITE_URL = 'https://aakarkale.github.io/ClaudeDesignPortfolio/';

const abs = (path) => new URL(path, SITE_URL).href;

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Experience bullets are either strings or { text, link: { label, href } };
// mirror ExpBullet in sections.jsx (the first occurrence of label is linked).
const bulletText = (b) => (typeof b === 'string' ? b : b.text);
function bulletHtml(b) {
  if (typeof b === 'string') return esc(b);
  const { text = '', link } = b;
  const i = link && link.label ? text.indexOf(link.label) : -1;
  if (i < 0) return esc(text);
  return (
    esc(text.slice(0, i)) +
    `<a href="${esc(link.href)}">${esc(link.label)}</a>` +
    esc(text.slice(i + link.label.length))
  );
}

const MONTHS = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
const isoMonth = (s) => {
  const m = /^([A-Z][a-z]{2}) (\d{4})$/.exec(s || '');
  return m && MONTHS[m[1]] ? `${m[2]}-${MONTHS[m[1]]}` : undefined;
};

const projects = d.projects; // secretProject is a hidden easter egg — excluded on purpose
const contact = d.contact || {};
const sameAs = [contact.linkedin, contact.x, contact.youtube].filter(Boolean);
const current = d.experience.find((e) => /present/i.test(e.period));

// ─── JSON-LD ────────────────────────────────────────────────────────
// One @graph so the page, the site and the person are linked entities
// rather than three disconnected blobs.
const personId = `${SITE_URL}#person`;
const graph = [
  {
    '@type': 'WebSite',
    '@id': `${SITE_URL}#website`,
    url: SITE_URL,
    name: d.name,
    inLanguage: 'en',
  },
  {
    '@type': 'ProfilePage',
    '@id': `${SITE_URL}#profile`,
    url: SITE_URL,
    name: `${d.name} — ${d.role}`,
    isPartOf: { '@id': `${SITE_URL}#website` },
    mainEntity: { '@id': personId },
    about: { '@id': personId },
  },
  {
    '@type': 'Person',
    '@id': personId,
    name: d.name,
    url: SITE_URL,
    jobTitle: d.role,
    description: d.tagline,
    ...(current && { worksFor: { '@type': 'Organization', name: current.company } }),
    homeLocation: { '@type': 'Place', name: d.location },
    birthPlace: d.origin ? { '@type': 'Place', name: d.origin } : undefined,
    ...(contact.email && { email: `mailto:${contact.email}` }),
    sameAs,
    alumniOf: d.education.map((e) => ({
      '@type': 'CollegeOrUniversity',
      name: e.school,
      ...(e.url && { url: e.url }),
    })),
    hasCredential: [
      ...d.education.map((e) => ({
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'degree',
        name: e.degree,
        recognizedBy: { '@type': 'CollegeOrUniversity', name: e.school },
      })),
      ...d.certifications.map((c) => ({
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'certification',
        name: c.name,
        ...(c.year && { dateCreated: c.year }),
        ...(c.url && { url: c.url }),
      })),
    ],
    knowsAbout: d.skills.flatMap((g) => g.items),
  },
  {
    '@type': 'ItemList',
    '@id': `${SITE_URL}#work`,
    name: 'Selected work',
    itemListElement: projects.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'CreativeWork',
        name: p.title,
        description: p.oneLiner,
        ...(p.url && { url: p.url }),
        keywords: p.tags.join(', '),
      },
    })),
  },
  ...(d.papers || []).map((p) => ({
    '@type': 'ScholarlyArticle',
    headline: p.title,
    author: { '@id': personId },
    url: abs(p.url),
    ...(isoMonth(p.year) && { datePublished: isoMonth(p.year) }),
    ...(p.pub && { isPartOf: { '@type': 'Periodical', name: p.pub.split(' · ')[0] } }),
  })),
];

// JSON.stringify drops undefined keys; escaping "<" keeps any "</script>"
// in the data from terminating the tag early.
const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2)
  .replace(/</g, '\\u003c');

const headBlock = [
  `<link rel="canonical" href="${SITE_URL}" />`,
  `<link rel="alternate" type="text/markdown" href="llms.txt" title="${esc(d.name)} — profile for LLMs" />`,
  `<script type="application/ld+json">`,
  jsonLd,
  `</script>`,
].join('\n');

// ─── Static HTML mirror ─────────────────────────────────────────────
// Plain semantic markup with no ids, so nothing can collide with the
// app's own section ids before React replaces it.
const I = (n) => '  '.repeat(n);
const staticBlock = [
  `<div class="seo-static">`,
  `${I(1)}<header>`,
  `${I(2)}<h1>${esc(d.name)}</h1>`,
  `${I(2)}<p>${esc(d.role)} · ${esc(d.location)}</p>`,
  `${I(2)}<p>${esc(d.tagline)}</p>`,
  `${I(1)}</header>`,
  `${I(1)}<section>`,
  `${I(2)}<h2>About</h2>`,
  ...d.about.map((p) => `${I(2)}<p>${esc(p)}</p>`),
  `${I(2)}<ul>`,
  ...d.stats.map((s) => `${I(3)}<li>${esc(s.num)} ${esc(s.label)}</li>`),
  `${I(2)}</ul>`,
  `${I(1)}</section>`,
  `${I(1)}<section>`,
  `${I(2)}<h2>Selected work</h2>`,
  ...projects.flatMap((p) => [
    `${I(2)}<article>`,
    `${I(3)}<h3>${p.url ? `<a href="${esc(p.url)}">${esc(p.title)}</a>` : esc(p.title)}</h3>`,
    `${I(3)}<p>${esc(p.oneLiner)}</p>`,
    `${I(3)}<p>${p.tags.map(esc).join(' · ')}</p>`,
    `${I(2)}</article>`,
  ]),
  `${I(1)}</section>`,
  `${I(1)}<section>`,
  `${I(2)}<h2>Experience</h2>`,
  ...d.experience.flatMap((e) => [
    `${I(2)}<article>`,
    `${I(3)}<h3>${esc(e.role)}, ${esc(e.company)}</h3>`,
    `${I(3)}<p>${esc(e.place)} · ${esc(e.period)}</p>`,
    `${I(3)}<ul>`,
    ...e.bullets.map((b) => `${I(4)}<li>${bulletHtml(b)}</li>`),
    `${I(3)}</ul>`,
    `${I(2)}</article>`,
  ]),
  `${I(1)}</section>`,
  `${I(1)}<section>`,
  `${I(2)}<h2>Skills</h2>`,
  `${I(2)}<dl>`,
  ...d.skills.flatMap((g) => [
    `${I(3)}<dt>${esc(g.group)}</dt>`,
    `${I(3)}<dd>${g.items.map(esc).join(', ')}</dd>`,
  ]),
  `${I(2)}</dl>`,
  `${I(1)}</section>`,
  `${I(1)}<section>`,
  `${I(2)}<h2>Education</h2>`,
  `${I(2)}<ul>`,
  ...d.education.map((e) => `${I(3)}<li>${esc(e.degree)}, ${esc(e.school)} (${esc(e.period)})</li>`),
  `${I(2)}</ul>`,
  `${I(1)}</section>`,
  `${I(1)}<section>`,
  `${I(2)}<h2>Certifications</h2>`,
  `${I(2)}<ul>`,
  ...d.certifications.map((c) => `${I(3)}<li>${esc(c.name)}${c.year ? ` (${esc(c.year)})` : ''}</li>`),
  `${I(2)}</ul>`,
  `${I(1)}</section>`,
  ...((d.papers || []).length
    ? [
        `${I(1)}<section>`,
        `${I(2)}<h2>Publications</h2>`,
        `${I(2)}<ul>`,
        ...d.papers.map((p) =>
          `${I(3)}<li><a href="${esc(p.url)}">${esc(p.title)}</a>, ${esc(p.pub)}, ${esc(p.year)}</li>`),
        `${I(2)}</ul>`,
        `${I(1)}</section>`,
      ]
    : []),
  `${I(1)}<section>`,
  `${I(2)}<h2>Contact</h2>`,
  `${I(2)}<ul>`,
  ...(contact.email ? [`${I(3)}<li><a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a></li>`] : []),
  ...(contact.linkedin ? [`${I(3)}<li><a href="${esc(contact.linkedin)}">LinkedIn</a></li>`] : []),
  ...(contact.x ? [`${I(3)}<li><a href="${esc(contact.x)}">X</a></li>`] : []),
  ...(contact.youtube ? [`${I(3)}<li><a href="${esc(contact.youtube)}">YouTube</a></li>`] : []),
  `${I(2)}</ul>`,
  `${I(1)}</section>`,
  `</div>`,
].join('\n');

// ─── llms.txt ───────────────────────────────────────────────────────
const md = [
  `# ${d.name}`,
  '',
  `> ${d.tagline}`,
  '',
  `${d.role} based in ${d.location}${d.origin ? `, originally from ${d.origin}` : ''}.`,
  '',
  ...d.about.flatMap((p) => [p, '']),
  '## Experience',
  '',
  ...d.experience.flatMap((e) => [
    `- **${e.role}**, ${e.company}, ${e.place} (${e.period})`,
    ...e.bullets.map((b) => `  - ${bulletText(b)}`),
  ]),
  '',
  '## Selected work',
  '',
  ...projects.map((p) => (p.url ? `- [${p.title}](${p.url}): ${p.oneLiner}` : `- ${p.title}: ${p.oneLiner}`)),
  '',
  '## Skills',
  '',
  ...d.skills.map((g) => `- ${g.group}: ${g.items.join(', ')}`),
  '',
  '## Education',
  '',
  ...d.education.map((e) => `- ${e.degree}, ${e.school} (${e.period})`),
  '',
  '## Certifications',
  '',
  ...d.certifications.map((c) => `- ${c.name}${c.year ? ` (${c.year})` : ''}`),
  '',
  ...((d.papers || []).length
    ? ['## Publications', '', ...d.papers.map((p) => `- [${p.title}](${abs(p.url)}): ${p.pub}, ${p.year}`), '']
    : []),
  '## Contact',
  '',
  ...(contact.email ? [`- Email: ${contact.email}`] : []),
  ...sameAs.map((u) => `- ${u}`),
  `- Portfolio: ${SITE_URL}`,
  '',
].join('\n');

// ─── sitemap.xml ────────────────────────────────────────────────────
const urls = [SITE_URL, ...(d.papers || []).map((p) => abs(p.url))];
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`),
  '</urlset>',
  '',
].join('\n');

// ─── Write ──────────────────────────────────────────────────────────
function replaceBlock(html, name, content, indent) {
  const start = `<!-- seo:${name}:start -->`;
  const end = `<!-- seo:${name}:end -->`;
  const a = html.indexOf(start);
  const b = html.indexOf(end);
  if (a < 0 || b < 0 || b < a) throw new Error(`index.html is missing the ${start} … ${end} markers`);
  const body = content.split('\n').map((l) => (l ? indent + l : l)).join('\n');
  return html.slice(0, a + start.length) + '\n' + body + '\n' + indent + html.slice(b);
}

let html = readFileSync('index.html', 'utf8');
html = replaceBlock(html, 'head', headBlock, '');
html = replaceBlock(html, 'static', staticBlock, '    ');
writeFileSync('index.html', html);
writeFileSync('llms.txt', md);
writeFileSync('sitemap.xml', sitemap);

console.log(`seo: index.html (head + ${staticBlock.split('\n').length}-line static mirror), llms.txt, sitemap.xml (${urls.length} urls)`);
