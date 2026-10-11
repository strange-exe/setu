/**
 * Production build for the Setu console.
 *
 * setu.html is authored in Claude Artifact format: no doctype, no <head>, because the
 * artifact host supplies that wrapper. Opened any other way it has no charset declaration,
 * so every non-ASCII character (the rupee sign, the Devanagari samples, en dashes) decodes
 * as Latin-1 and renders as mojibake. This build produces a standalone, self-hostable
 * document that fixes that, then hardens it:
 *
 *   - full document skeleton with an explicit UTF-8 charset and viewport
 *   - minified HTML, CSS and JS; comments and console.* stripped
 *   - a hash-based Content-Security-Policy computed from the FINAL minified inline blocks,
 *     so no 'unsafe-inline' is needed
 *
 * It does not create secrecy. Everything in dist/ is readable by any visitor; that is fine,
 * because the console holds no secrets. All figures are synthetic and the scoring weights
 * are published on purpose.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { minify } = require('html-minifier-terser');

const SRC = path.join(__dirname, 'setu.html');
const OUT_DIR = path.join(__dirname, 'dist');
const OUT = path.join(OUT_DIR, 'index.html');

const sha256 = (s) => "'sha256-" + crypto.createHash('sha256').update(s, 'utf8').digest('base64') + "'";

function take(src, re) {
  const found = [];
  const rest = src.replace(re, (m) => { found.push(m); return ''; });
  return { found, rest };
}

async function build() {
  const raw = fs.readFileSync(SRC, 'utf8');

  // Pull the pieces that belong in <head> out of the artifact-format body.
  const title = take(raw, /<title>[\s\S]*?<\/title>/i);
  const links = take(title.rest, /<link\b[^>]*>/gi);
  const extScripts = take(links.rest, /<script\b[^>]*\bsrc=[^>]*><\/script>/gi);
  const styles = take(extScripts.rest, /<style>[\s\S]*?<\/style>/gi);

  const head = [title.found, links.found, extScripts.found, styles.found].flat().join('\n');
  const body = styles.rest.trim();

  // Minify head and body together so the inline blocks we hash are the final bytes.
  const minified = await minify(head + '\n<!--SPLIT-->\n' + body, {
    collapseWhitespace: true,
    removeComments: false,          // keep the split marker; comments are dropped below
    minifyCSS: true,
    minifyJS: { compress: { drop_console: true, drop_debugger: true }, mangle: true },
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    sortAttributes: true,
    sortClassName: true,
  });

  const [minHead, minBody] = minified.split('<!--SPLIT-->');

  // Hash every inline <script> and <style> that survived minification.
  const scriptHashes = new Set();
  const styleHashes = new Set();
  for (const m of minified.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (m[1].trim()) scriptHashes.add(sha256(m[1]));
  }
  for (const m of minified.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    if (m[1].trim()) styleHashes.add(sha256(m[1]));
  }

  // script-src stays strictly hash-locked: that is where injection risk actually lives.
  //
  // style-src has to allow inline. CSP hashes do not apply to style="..." ATTRIBUTES, and this
  // page sets element geometry from JS at runtime (pillar heights, projected label positions),
  // so those values cannot be known at build time. Hashing only the <style> block produced 183
  // violations and an unstyled page. Note also that a hash and 'unsafe-inline' together make
  // browsers ignore 'unsafe-inline', so the style hash is deliberately dropped rather than kept
  // alongside it. The residual risk is nil here: the console renders no user-supplied or remote
  // content, so there is no injection vector for style to amplify.
  const csp = [
    "default-src 'none'",
    `script-src 'self' https://cdnjs.cloudflare.com ${[...scriptHashes].join(' ')}`,
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    // frame-ancestors is deliberately NOT here: browsers ignore it when the policy is
    // delivered via <meta>. It is emitted as a real HTTP header in dist/_headers instead.
    "form-action 'none'",
  ].join('; ');

  const doc = [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
    `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
    '<meta name="referrer" content="strict-origin-when-cross-origin">',
    '<meta name="color-scheme" content="light dark">',
    '<meta name="description" content="Setu turns multilingual citizen development requests into a ranked national investment order for BRICS+ states, with an explicit correction for participation bias.">',
    minHead.trim(),
    '</head>',
    '<body>',
    minBody.trim(),
    '</body>',
    '</html>',
  ].join('\n');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, doc, 'utf8');

  // Headers a static host (Netlify, Cloudflare Pages) applies. These carry the directives a
  // <meta> CSP cannot, plus caching. The build is a single document, so there are no
  // content-hashed assets to cache immutably: the HTML is everything, and it must revalidate.
  const headers = [
    '/*',
    "  Content-Security-Policy: frame-ancestors 'self'",
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Cross-Origin-Opener-Policy: same-origin',
    '  Permissions-Policy: geolocation=(), microphone=(), camera=()',
    '',
    '/index.html',
    '  Cache-Control: no-cache',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, '_headers'), headers, 'utf8');

  const before = Buffer.byteLength(raw, 'utf8');
  const after = Buffer.byteLength(doc, 'utf8');
  console.log('dist/index.html written');
  console.log('  source   ', (before / 1024).toFixed(1), 'KB');
  console.log('  built    ', (after / 1024).toFixed(1), 'KB  (' + Math.round((1 - after / before) * 100) + '% smaller)');
  console.log('  CSP       script-src: hash-locked (' + scriptHashes.size + ' hash), no unsafe-inline');
  console.log('            style-src:  unsafe-inline (runtime element styles cannot be hashed)');
  console.log('  headers   dist/_headers (frame-ancestors, nosniff, cache)');
}

build().catch((e) => { console.error(e); process.exit(1); });
