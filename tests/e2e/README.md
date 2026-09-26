# Live browser regression checks

Run against a local HTTP server or the immutable PR preview. Requires a real browser with public catalog/market-data access. Never calls application functions or injects results.

In Codex's browser REPL, after selecting a tab:

```js
const {runBrowserFlows} = await import('/absolute/path/to/tests/e2e/browser-flows.mjs');
const page = {
  goto: url => tab.goto(url),
  locator: selector => tab.playwright.locator(selector),
  getByRole: (role, options) => tab.playwright.getByRole(role, options),
};
const home = await runBrowserFlows(page, previewURL, 'home');
const checker = await runBrowserFlows(page, previewURL, 'checker');
```

The same function accepts a standard Playwright Page directly. `home` and `checker` groups allow bounded runs and separate failure reports. Each result contains the rendered output; failures throw. Inspect browser error logs and screenshots as part of the run. The live two-sale Echo assertion intentionally signals data changes that need review rather than silently loosening expectations.
