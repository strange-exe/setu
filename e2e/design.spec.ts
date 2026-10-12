import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const schemes = ["light", "dark"] as const;
const SHOTS = "e2e/shots/after";

// Third-party CDNs are a real dependency of this page (three.js, Google Fonts). A failure
// there is worth seeing, so it is reported rather than muted — but it must not mask a
// same-origin regression, which is what the assertion is actually guarding.
function watch(page: Page) {
  const sameOrigin: string[] = [];
  const thirdParty: string[] = [];
  const bucket = (url: string, msg: string) =>
    (url.includes("127.0.0.1:5177") ? sameOrigin : thirdParty).push(msg);

  page.on("console", (m) => m.type() === "error" && sameOrigin.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => sameOrigin.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) =>
    bucket(r.url(), `failed: ${r.url()} ${r.failure()?.errorText}`),
  );
  page.on("response", (r) => r.status() >= 400 && bucket(r.url(), `${r.status()} ${r.url()}`));
  return { sameOrigin, thirdParty };
}

async function ready(page: Page) {
  // Wait on state, never on wording: the ranking is rendered by the scoring pass.
  await page.waitForFunction(() => document.querySelectorAll("#rank .rk").length === 16);
  // The intake pipeline reveals its eight stages on a 110ms stagger. Screenshotting before it
  // settles captures a half-lit trace and quietly misrepresents the UI in every review shot.
  await page.waitForFunction(
    () =>
      document.querySelectorAll("#pipe .stage").length > 0 &&
      document.querySelectorAll("#pipe .stage").length ===
        document.querySelectorAll("#pipe .stage.on").length,
  );
}

for (const vp of viewports) {
  for (const scheme of schemes) {
    test(`console ${vp.name} ${scheme}`, async ({ page }) => {
      const errs = watch(page);
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize(vp);
      await page.goto("/");
      await ready(page);

      // Primary action of the default view is visible without scrolling.
      await expect(
        page.getByRole("button", { name: /process request/i }),
      ).toBeInViewport();

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow, "horizontal page overflow").toBe(false);

      await page.screenshot({
        path: `${SHOTS}/intake-${vp.name}-${scheme}.png`,
        fullPage: true,
        animations: "disabled",
      });

      if (errs.thirdParty.length) console.log("third-party:", errs.thirdParty);
      expect(errs.sameOrigin).toEqual([]);
    });
  }
}

// Each tab is its own screen; a console is judged per panel, not just on its landing view.
const PANELS = [
  ["hotspots", "Demand map"],
  ["priority", "Priority engine"],
  ["blindspot", "Voice gap"],
  ["impact", "Impact"],
  ["build", "Build"],
] as const;

for (const [slug, label] of PANELS) {
  test(`panel ${slug} desktop dark`, async ({ page }) => {
    const errs = watch(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize(viewports[0]);
    await page.goto("/");
    await ready(page);

    await page.getByRole("tab", { name: new RegExp(label, "i") }).click();
    await expect(page.locator(`#p-${slug}`)).toBeVisible();
    await page.waitForTimeout(900); // let the globe settle before capture

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow on ${slug}`).toBe(false);

    await page.screenshot({
      path: `${SHOTS}/${slug}-desktop-dark.png`,
      fullPage: true,
      animations: "disabled",
    });
    expect(errs.sameOrigin).toEqual([]);
  });
}

for (const scheme of schemes) {
  test(`a11y + hierarchy ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.setViewportSize(viewports[0]);
    await page.goto("/");
    await ready(page);

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const summary = axe.violations.map(
      (v) => `${v.id} (${v.impact}): ${v.nodes.length} — ${v.nodes[0]?.target}`,
    );
    expect(summary, `axe violations [${scheme}]`).toEqual([]);

    // Hierarchy: the intended reading order must survive with hue and detail removed.
    for (const [name, filter] of [
      ["gray", "grayscale(1)"],
      ["blur", "blur(6px)"],
    ] as const) {
      const tag = await page.addStyleTag({ content: `html{filter:${filter}}` });
      await page.screenshot({
        path: `${SHOTS}/hierarchy-${scheme}-${name}.png`,
        animations: "disabled",
      });
      await tag.evaluate((el) => el.remove());
    }
  });
}

test("axe on every panel (dark)", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.setViewportSize(viewports[0]);
  await page.goto("/");
  await ready(page);

  const found: string[] = [];
  for (const [slug, label] of PANELS) {
    await page.getByRole("tab", { name: new RegExp(label, "i") }).click();
    await expect(page.locator(`#p-${slug}`)).toBeVisible();
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    for (const v of axe.violations) {
      found.push(`${slug}: ${v.id} (${v.impact}) x${v.nodes.length} — ${v.nodes[0]?.target}`);
    }
  }
  expect(found).toEqual([]);
});

test("reduced motion stops the globe and the live counter", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.setViewportSize(viewports[0]);
  await page.goto("/");
  await ready(page);
  await page.getByRole("tab", { name: /demand map/i }).click();

  const before = await page.locator("#ingest").innerText();
  await page.waitForTimeout(3200);
  const after = await page.locator("#ingest").innerText();
  expect(after, "live counter must not tick under reduced motion").toBe(before);

  // The status pulse is a CSS keyframe loop; under reduced motion it must be off entirely.
  const pulse = await page
    .locator(".pulse")
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(pulse, "status pulse must not loop under reduced motion").toBe("none");
});

test("no WebGL falls back to the analytic table", async ({ page }) => {
  // Simulate a device without WebGL. The console must degrade to the data table,
  // never to an empty box.
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: any[]) {
      if (String(type).includes("webgl")) return null;
      return (orig as any).call(this, type, ...rest);
    } as any;
  });
  await page.setViewportSize(viewports[0]);
  await page.goto("/");
  await ready(page);
  await page.getByRole("tab", { name: /demand map/i }).click();

  await expect(page.locator(".nogl")).toBeVisible();
  await expect(page.locator("table.heat tbody tr")).toHaveCount(16);
  await page.screenshot({ path: `${SHOTS}/fallback-nowebgl.png`, animations: "disabled" });
});

test("declared icons resolve and are the real thing", async ({ page, request }) => {
  // A browser requests a favicon out of band, so nothing else in this suite would notice the
  // links rotting. They are relative on purpose — the live deployment is a project page under
  // /setu/ — which makes them exactly the kind of path a move or a rename breaks silently.
  await page.goto("/");

  const declared = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]')].map(
      (l) => ({ rel: l.rel, attr: l.getAttribute("href"), resolved: l.href }),
    ),
  );
  expect(declared.map((d) => d.rel).sort()).toEqual(["apple-touch-icon", "icon"]);
  for (const d of declared) {
    expect(d.attr, `${d.rel} must stay relative to survive the /setu/ subpath`).not.toMatch(/^\//);

    const res = await request.get(d.resolved);
    expect(res.status(), `${d.rel} -> ${d.attr}`).toBe(200);

    // Status 200 is not proof: a static host happily returns the 200 of an index page for a
    // missing asset. Check the bytes are the format the link claims.
    const body = await res.body();
    if (d.rel === "icon") {
      expect(body.toString("utf8").trimStart().startsWith("<svg"), "favicon must be SVG").toBe(true);
    } else {
      expect(body.subarray(1, 4).toString("ascii"), "touch icon must be PNG").toBe("PNG");
      // iOS asks for 180x180 and scales anything else, so assert the raster from the IHDR
      // rather than trusting the filename.
      expect(
        [body.readUInt32BE(16), body.readUInt32BE(20)],
        "apple-touch-icon must be 180x180",
      ).toEqual([180, 180]);
    }
  }
});

test("LCP and weight reported against the §4 budget", async ({ page }) => {
  await page.setViewportSize(viewports[0]);

  let transferred = 0;
  page.on("response", async (r) => {
    try {
      const len = Number((await r.allHeaders())["content-length"] ?? 0);
      transferred += Number.isFinite(len) ? len : 0;
    } catch {}
  });

  await page.goto("/");
  await ready(page);
  const lcp = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let v = 0;
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) v = e.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => resolve(v), 1500);
      }),
  );
  console.log(`LCP ${Math.round(lcp)}ms (budget 2500ms) | transferred ~${(transferred / 1024).toFixed(0)}KB`);
  expect(lcp, "LCP budget").toBeLessThan(2500);
});
