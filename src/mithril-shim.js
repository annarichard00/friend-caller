// Lets `import m from "mithril"` work in the browser with no build step.
// index.html loads vendor/mithril.min.js (which sets window.m) and an
// import map points "mithril" here. A bundler-based app shell can ignore
// this file and resolve "mithril" from node_modules as usual.
export default window.m;
