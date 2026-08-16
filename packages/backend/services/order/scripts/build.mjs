import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
mkdirSync(resolve(root, "dist/handlers"), { recursive: true });

const handlers = ["create", "get"];

for (const handler of handlers) {
  await build({
    entryPoints: [resolve(root, `src/handlers/${handler}.ts`)],
    outfile: resolve(root, `dist/handlers/${handler}.js`),
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    sourcemap: "inline",
    minify: false,
    logLevel: "info",
  });
}

console.log("order service built:", handlers.join(", "));
