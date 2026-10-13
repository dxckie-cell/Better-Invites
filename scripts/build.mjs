import { build } from "esbuild";
import { copyFile, mkdir, readFile, writeFile } from "fs/promises";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const outDir = `dist/builds/${manifest.id}`;

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

await mkdir(outDir, { recursive: true });

await build({
    entryPoints: ["src/index.tsx"],
    outfile: `${outDir}/index.js`,
    bundle: true,
    format: "iife",
    globalName: "plugin",
    target: "es2019",
    jsx: "transform",
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
    legalComments: "none",
    plugins: [globalsShim]
});

await copyFile("manifest.json", `${outDir}/manifest.json`);
await writeFile("dist/repo.json", JSON.stringify({
    $meta: { name: "BetterInvites", description: manifest.display.description },
    [manifest.id]: { version: manifest.version }
}, null, 4));

console.log(`Built ${manifest.id}@${manifest.version} into dist/`);
