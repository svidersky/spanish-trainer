// Mutation testing with StrykerJS (https://stryker-mutator.io/docs/stryker-js/configuration/).
// Stryker changes the app's code one small edit (a "mutant") at a time and reruns the tests;
// a mutant that no test notices "survives" and points at a missing or too weak assertion.
//
// CI runs it on the lines a pull request changed (tools/stryker-changed.mjs) and fails below
// the break threshold. The weekly whole-project run sets STRYKER_REPORT_ONLY and only reports.
// tests/helpers/dom.js hands Stryker's state to the jsdom window, where the UI tests run the app.

// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: 'tap',
  tap: { testFiles: ['tests/*.test.js', 'tests/*.test.mjs'] },
  mutate: ['js/**/*.js'],
  coverageAnalysis: 'perTest',
  // 100 is not reachable in general: some mutants behave exactly like the original code.
  thresholds: { high: 90, low: 80, break: process.env.STRYKER_REPORT_ONLY ? null : 80 },
  reporters: ['clear-text', 'progress', 'html'],
};

export default config;
