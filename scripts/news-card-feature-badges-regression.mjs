/**
 * News card feature-badge regression.
 *
 * Bundles and server-renders the real VitanaRecommendationHeader so the test
 * covers its public feature API, localized labels, Lucide icons, and Tailwind
 * treatment without needing a browser or a duplicate test-only component.
 */
import { build } from "esbuild";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadHeader() {
  const output = await build({
    stdin: {
      contents: `
        import { VitanaRecommendationHeader } from "@/components/vitana/VitanaRecommendationHeader";
        export { VitanaRecommendationHeader };
      `,
      loader: "tsx",
      resolveDir: repoRoot,
      sourcefile: "news-card-feature-badges-entry.tsx",
    },
    bundle: true,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    packages: "external",
    write: false,
    define: {
      "import.meta.env.DEV": "false",
    },
    plugins: [
      {
        name: "src-alias",
        setup(buildApi) {
          // Vite's production i18n index uses import.meta.glob, which Node's
          // server renderer cannot execute. Keep the real component under
          // test and replace only its catalog lookup boundary; the real JSON
          // catalogs are asserted independently below.
          buildApi.onResolve({ filter: /^@\/lib\/i18n-toast$/ }, () => ({
            path: "i18n-toast",
            namespace: "test-i18n",
          }));
          buildApi.onLoad({ filter: /.*/, namespace: "test-i18n" }, () => ({
            contents: `
              const labels = {
                'screens.vitanaIdentity.vitana': 'Vitana',
                'screens.vitanaIdentity.orbAlt': 'Vitana',
                'screens.vitanaIdentity.vitanaIndex': 'Vitana Index',
                'screens.vitanaIdentity.guidedJourney': 'Meine Reise',
                'screens.vitanaIdentity.findAMatch': 'Match finden',
              };
              export const t = (key) => labels[key] ?? key;
            `,
            loader: "js",
          }));
          buildApi.onResolve({ filter: /^@\// }, (args) => {
            const basePath = resolve(repoRoot, "src", args.path.slice(2));
            const path = [
              basePath,
              `${basePath}.ts`,
              `${basePath}.tsx`,
              `${basePath}.js`,
              `${basePath}.jsx`,
              `${basePath}.json`,
              resolve(basePath, "index.ts"),
              resolve(basePath, "index.tsx"),
              resolve(basePath, "index.js"),
            ].find((candidate) => existsSync(candidate) && statSync(candidate).isFile());

            return path ? { path } : undefined;
          });
        },
      },
    ],
  });

  const cacheRoot = resolve(repoRoot, "node_modules", ".cache");
  mkdirSync(cacheRoot, { recursive: true });
  const tempDir = mkdtempSync(resolve(cacheRoot, "news-card-features-"));
  const bundlePath = resolve(tempDir, "header.mjs");
  writeFileSync(bundlePath, output.outputFiles[0].text);
  return import(pathToFileURL(bundlePath).href);
}

const failures = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    return;
  }

  failures.push(message);
  console.error(`  ✗ ${message}`);
}

console.log("\n[news-card-features] shared Vitana feature header");

const { VitanaRecommendationHeader } = await loadHeader();

const cases = [
  ["vitana-index", "Vitana Index", "lucide-activity"],
  ["guided-journey", "Meine Reise", "lucide-zap"],
  ["find-a-match", "Match finden", "lucide-users"],
];

for (const [feature, label, iconClass] of cases) {
  const html = renderToStaticMarkup(
    createElement(VitanaRecommendationHeader, { feature }),
  );

  assert(html.includes(label), `${feature} renders ${label}`);
  assert(html.includes(iconClass), `${feature} renders its navigation icon`);
  assert(
    html.includes("bg-blue-100") && html.includes("text-blue-700"),
    `${feature} uses the shared bright-blue badge`,
  );
  assert(!html.includes("lucide-sparkles"), `${feature} omits the old sparkle`);
}

console.log("\n[news-card-features] localized feature copy");

const deIdentity = JSON.parse(
  readFileSync(resolve(repoRoot, "src/i18n/de/screens.json"), "utf8"),
).screens.vitanaIdentity;
const enIdentity = JSON.parse(
  readFileSync(resolve(repoRoot, "src/i18n/en/screens.json"), "utf8"),
).screens.vitanaIdentity;

const expectedGerman = {
  vitanaIndex: "Vitana Index",
  guidedJourney: "Meine Reise",
  findAMatch: "Match finden",
  viewIndex: "Index ansehen",
  viewJourney: "Meine Reise ansehen",
  viewMatch: "Match ansehen",
};
const expectedEnglish = {
  vitanaIndex: "Vitana Index",
  guidedJourney: "Guided Journey",
  findAMatch: "Find a Match",
  viewIndex: "View Index",
  viewJourney: "View My Journey",
  viewMatch: "View Match",
};

for (const [key, value] of Object.entries(expectedGerman)) {
  assert(deIdentity[key] === value, `German ${key} copy is ${value}`);
}
for (const [key, value] of Object.entries(expectedEnglish)) {
  assert(enIdentity[key] === value, `English ${key} copy is ${value}`);
}

console.log("\n[news-card-features] News card assignments and actions");

const indexCardSource = readFileSync(
  resolve(repoRoot, "src/components/home/VitanaIndexCard.tsx"),
  "utf8",
);
const dykSource = readFileSync(
  resolve(repoRoot, "src/components/proactive/DidYouKnowCard.tsx"),
  "utf8",
);
const journeyCardSource = readFileSync(
  resolve(repoRoot, "src/components/home/LongevityJourneyCard.tsx"),
  "utf8",
);
const feedSource = readFileSync(
  resolve(repoRoot, "src/components/home/NewsFeedItemCard.tsx"),
  "utf8",
);

assert(
  indexCardSource.includes('feature="vitana-index"'),
  "Vitana Index card declares Vitana Index",
);
assert(
  indexCardSource.includes("t('screens.vitanaIdentity.viewIndex')"),
  "Vitana Index card uses Index ansehen",
);
assert(
  dykSource.includes('feature="vitana-index"'),
  "did-you-know card declares Vitana Index",
);
assert(
  journeyCardSource.includes('feature="guided-journey"'),
  "Longevity Journey card declares Guided Journey",
);
assert(
  journeyCardSource.includes("t('screens.vitanaIdentity.viewJourney')"),
  "Longevity Journey card uses Meine Reise ansehen",
);
assert(
  feedSource.includes('feature="find-a-match"'),
  "match cards declare Find a Match",
);
assert(
  feedSource.includes('t("screens.vitanaIdentity.viewMatch")'),
  "match card uses Match ansehen",
);

if (failures.length > 0) {
  console.error(`\nFAILED: ${failures.length} assertion(s) failed.`);
  process.exit(1);
}

console.log("\n✓ News card feature-badge checks passed");
