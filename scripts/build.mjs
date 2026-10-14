import { build } from "esbuild";
import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));

const globalsShim = {
    name: "bunny-globals",
    setup(b) {
        const shims = {
            react: "bunny.metro.common.React",
            "react-native": "bunny.metro.common.ReactNative",
            moment: 'bunny.metro.findByProps("isMoment")'
        };
        b.onResolve({ filter: /^(react|react-native|moment)$/ }, args => ({ path: args.path, namespace: "bunny-globals" }));
        b.onLoad({ filter: /.*/, namespace: "bunny-globals" }, args => ({ contents: `module.exports = ${shims[args.path]};`, loader: "js" }));
    }
};

const result = await build({
    entryPoints: ["src/index.tsx"],
    bundle: true,
    write: false,
    format: "iife",
    globalName: "__plugin",
    target: "es2019",
    jsx: "transform",
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
    legalComments: "none",
    plugins: [globalsShim]
});

// The loader evaluates `return <file>`, so the file must be a single expression starting on the first line.
const code = result.outputFiles[0].text.replace(/^"use strict";\n/, "");
const js = `(function(){${code}\nreturn __plugin.default || __plugin;})()`;

await mkdir("dist", { recursive: true });
await writeFile("dist/index.js", js);
await writeFile("dist/manifest.json", JSON.stringify({ ...manifest, hash: createHash("sha256").update(js).digest("hex") }, null, 4));
console.log("Built dist/manifest.json and dist/index.js");
