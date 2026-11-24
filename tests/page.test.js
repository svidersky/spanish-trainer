// The page shell in index.html. Without a declared icon the browser asks for /favicon.ico at
// the site root (svidersky.github.io/favicon.ico), gets a 404 and logs an error in the console.
// The icon must be a file shipped with the app and linked by a relative path, so it works both
// on GitHub Pages (served under /spanish-trainer/) and when index.html is opened from disk.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

function iconLinks(t) {
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
  t.after(() => dom.window.close());
  const links = [...dom.window.document.head.querySelectorAll('link')];
  return links.filter(l => (l.getAttribute('rel') || '').toLowerCase().split(/\s+/).includes('icon'));
}

test('index.html declares exactly one icon, so the browser does not request /favicon.ico', t => {
  assert.equal(iconLinks(t).length, 1, 'one <link rel="icon"> in <head>');
});

test('the icon is linked by a relative path that works on GitHub Pages and from disk', t => {
  const [link] = iconLinks(t);
  assert.ok(link, 'an icon link exists');
  const href = link.getAttribute('href');
  assert.doesNotMatch(href, /^(\/|[a-z][a-z0-9+.-]*:)/i,
    `href "${href}" is relative: no leading slash, no scheme`);
});

test('the linked icon file exists and is an SVG image', t => {
  const [link] = iconLinks(t);
  assert.ok(link, 'an icon link exists');
  const href = link.getAttribute('href');
  const file = path.join(ROOT, href);
  assert.ok(fs.existsSync(file), `${href} exists in the repository`);
  assert.equal(link.getAttribute('type'), 'image/svg+xml', 'the link declares the SVG type');

  const svg = new JSDOM(fs.readFileSync(file, 'utf8'), { contentType: 'image/svg+xml' });
  t.after(() => svg.window.close());
  const doc = svg.window.document;
  assert.equal(doc.documentElement.localName, 'svg', `${href} is a well-formed SVG document`);
  assert.equal(doc.documentElement.namespaceURI, 'http://www.w3.org/2000/svg', 'in the SVG namespace');
  assert.ok(doc.documentElement.getAttribute('viewBox'), 'with a viewBox, so it scales to any icon size');
});
