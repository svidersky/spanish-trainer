// Error monitoring with Sentry: index.html loads Sentry's Loader Script, configured by
// js/monitoring.js through window.sentryOnLoad. Errors are reported from everywhere, tagged
// with an environment: "production" on GitHub Pages, "local" anywhere else (a file opened
// from disk, a local server).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// Runs js/monitoring.js on a page at the given address, then plays the Loader Script's part:
// once the SDK is there, it calls window.sentryOnLoad. Returns the options passed to Sentry.init.
function sentryOptions(t, url) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url, runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window;
  w.eval(read('js/monitoring.js'));
  assert.equal(typeof w.sentryOnLoad, 'function', 'js/monitoring.js defines window.sentryOnLoad');

  const calls = [];
  w.Sentry = { init: options => calls.push(options) };
  w.sentryOnLoad();
  assert.equal(calls.length, 1, 'sentryOnLoad initialises Sentry exactly once');
  return calls[0];
}

test('on GitHub Pages errors are reported as production', t => {
  const options = sentryOptions(t, 'https://svidersky.github.io/spanish-trainer/#/');
  assert.equal(options.environment, 'production');
});

test('index.html opened from disk reports errors as local', t => {
  const options = sentryOptions(t, 'file:///C:/Repos/spanish-trainer/index.html');
  assert.equal(options.environment, 'local');
});

test('a local web server reports errors as local, not production', t => {
  const options = sentryOptions(t, 'http://localhost:8080/');
  assert.equal(options.environment, 'local');
});

test('no personal data is sent with error reports', t => {
  const options = sentryOptions(t, 'https://svidersky.github.io/spanish-trainer/');
  assert.equal(options.sendDefaultPii, false);
});

test('index.html configures and loads Sentry before any app script', () => {
  const html = read('index.html');
  const scripts = Array.from(html.matchAll(/<script\b[^>]*>/g), m => m[0]);
  const config = scripts.findIndex(s => /src="js\/monitoring\.js"/.test(s));
  const loader = scripts.findIndex(s => /src="https:\/\/js\.sentry-cdn\.com\/[0-9a-f]{32}\.min\.js"/.test(s));

  assert.notEqual(config, -1, 'index.html loads js/monitoring.js');
  assert.notEqual(loader, -1, 'index.html loads the Sentry Loader Script');
  assert.match(scripts[loader], /crossorigin="anonymous"/, 'the Loader Script is loaded with crossorigin="anonymous"');
  // window.sentryOnLoad must exist before the Loader Script runs (Sentry's Loader Script docs),
  // and the loader must come before the app so it catches errors from every app script.
  assert.equal(config, 0, 'js/monitoring.js is the first script');
  assert.equal(loader, 1, 'the Loader Script comes right after it, before the app scripts');
});
