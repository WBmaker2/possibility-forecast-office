import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the possibility forecast office instead of the starter skeleton", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>가능성 예보국 \| 자료로 예보 다시 보기<\/title>/);
  assert.match(html, /가능성 예보국/);
  assert.match(html, /첫 자료로 예보하고, 새 자료로 다시 살펴봐요/);
  assert.match(html, /property="og:image" content="\/og\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site|react-loading-skeleton|codex-preview/);
});

test("keeps the learning app self-contained and removes the disposable starter", async () => {
  const [page, layout, packageJson, office] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/forecast/ForecastOffice.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /<ForecastOffice \/>/);
  assert.match(layout, /lang="ko"/);
  assert.match(layout, /가능성 예보국/);
  assert.match(layout, /url: "\/og\.png"/);
  assert.match(packageJson, /"name": "possibility-forecast-office"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(office, /localStorage|sessionStorage|cookie|fetch\(/i);
});
