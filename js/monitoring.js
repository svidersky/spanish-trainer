// Error monitoring with Sentry. index.html loads this file first, then Sentry's Loader Script,
// which downloads the SDK only when an error happens and then calls window.sentryOnLoad
// (https://docs.sentry.io/platforms/javascript/install/loader/). The DSN comes from the loader's key.
// Errors are reported from everywhere, tagged "production" on GitHub Pages and "local" otherwise.
(function (root) {
  const PRODUCTION_HOST = 'svidersky.github.io';

  root.sentryOnLoad = function () {
    root.Sentry.init({
      environment: root.location.hostname === PRODUCTION_HOST ? 'production' : 'local',
      // No IP address, cookies or user data with the reports.
      sendDefaultPii: false,
    });
  };
})(window);
