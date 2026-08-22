import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";

const src = ".vercel/output/static";
const dest = "dist";
if (!existsSync(src)) {
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
if (!existsSync(`${dest}/index.html`)) {
  const o = String.fromCharCode(60);
  const c = String.fromCharCode(62);
  writeFileSync(
    `${dest}/index.html`,
    `${o}!doctype html${c}${o}html lang="en"${c}${o}head${c}${o}meta charset="utf-8"${c}${o}meta name="viewport" content="width=device-width, initial-scale=1"${c}${o}title${c}Drapé Collective${o}/title${c}${o}style${c}html,body{margin:0;min-height:100%;background:#F6F1EA;color:#2C241C;font-family:Georgia,serif}main{display:flex;min-height:100dvh;align-items:center;justify-content:center;padding:2rem;text-align:center}p{letter-spacing:.22em;text-transform:uppercase;font-size:11px;color:#8A7A68}${o}/style${c}${o}/head${c}${o}body${c}${o}main${c}${o}div${c}${o}h1${c}Drapé Collective${o}/h1${c}${o}p${c}The house is opening${o}/p${c}${o}/div${c}${o}/main${c}${o}/body${c}${o}/html${c}`,
  );
}
