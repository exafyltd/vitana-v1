/**
 * VTID-NAV-02: Build-time SPA route extractor.
 *
 * Walks src/App.tsx with the TypeScript compiler API (typescript is already
 * a devDependency — no extra tooling required), collects every
 * <Route path="...">, tags whether it is wrapped in <AuthGuard> or
 * <ProtectedRoute requiredRole="...">, and emits
 * src/generated/spa-routes.json.
 *
 * Wired into `npm run prebuild` so every Vite build ships a fresh inventory
 * that the Admin Navigator coverage endpoint reads. Run manually with
 * `npm run extract-routes`.
 */

import ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_FILE = path.resolve(__dirname, "..", "src", "App.tsx");
const DEFAULT_OUT = path.resolve(__dirname, "..", "src", "generated", "spa-routes.json");

/**
 * @param {string} source
 * @param {string} filename
 * @returns {Array<{path: string, requires_auth: boolean, requires_role?: string, file: string}>}
 */
function extractRoutesFromSource(source, filename) {
  const sf = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = [];

  function collectFromJsx(node, ancestors) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const tagName = opening.tagName.getText(sf);
      const nextAncestors = [...ancestors, tagName];

      if (tagName === "Route") {
        const attrs = opening.attributes.properties;
        let routePath = null;
        for (const attr of attrs) {
          if (!ts.isJsxAttribute(attr)) continue;
          const name = attr.name.getText(sf);
          if (name === "path" && attr.initializer && ts.isStringLiteral(attr.initializer)) {
            routePath = attr.initializer.text;
          }
        }

        if (routePath) {
          const guardTags = new Set();
          let requiredRole;
          node.forEachChild(function walk(child) {
            if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
              const ch = ts.isJsxElement(child) ? child.openingElement : child;
              const chTag = ch.tagName.getText(sf);
              guardTags.add(chTag);
              if (chTag === "ProtectedRoute") {
                for (const a of ch.attributes.properties) {
                  if (
                    ts.isJsxAttribute(a) &&
                    a.name.getText(sf) === "requiredRole" &&
                    a.initializer &&
                    ts.isStringLiteral(a.initializer)
                  ) {
                    requiredRole = a.initializer.text;
                  }
                }
              }
            }
            child.forEachChild(walk);
          });

          out.push({
            path: routePath,
            requires_auth:
              guardTags.has("AuthGuard") ||
              guardTags.has("ProtectedRoute") ||
              guardTags.has("AdminGuard"),
            requires_role: requiredRole,
            file: filename,
          });
        }
      }

      node.forEachChild((c) => collectFromJsx(c, nextAncestors));
      return;
    }
    node.forEachChild((c) => collectFromJsx(c, ancestors));
  }

  collectFromJsx(sf, []);

  const seen = new Set();
  return out.filter((r) => {
    const key = `${r.path}::${r.requires_role || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function main() {
  const argOutIdx = process.argv.indexOf("--out");
  const outPath = argOutIdx >= 0 ? process.argv[argOutIdx + 1] : DEFAULT_OUT;

  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`[extract-routes] source not found: ${SOURCE_FILE}`);
    process.exit(1);
  }

  const src = fs.readFileSync(SOURCE_FILE, "utf8");
  const routes = extractRoutesFromSource(src, "src/App.tsx");

  const result = {
    generated_at: new Date().toISOString(),
    source: "src/App.tsx",
    count: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`[extract-routes] wrote ${routes.length} routes → ${outPath}`);
}

main();
