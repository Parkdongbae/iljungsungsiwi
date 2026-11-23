// 일성정시의 빌드.  실행: npm install (처음 한 번) → node build.mjs  →  ../index.html
import * as esbuild from 'esbuild'; import fs from 'fs';
const r = await esbuild.build({ entryPoints: ['app.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', charset: 'utf8' });
const safe = s => s.replace(/<\/script/g, '<\\/script');
const js = safe(r.outputFiles[0].text);
const rd = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
let tpl = rd('template.html');
tpl = tpl.replace('%%LEAFCSS%%', () => rd('leaflet.css')).replace('%%ANGCSS%%', () => rd('ang.css')).replace('%%SHELLCSS%%', () => rd('shell.css'));
const frag = tpl.replace('%%SCRIPT%%', () => js).replace('%%SHELLJS%%', () => safe(rd('shell.js')));
const t = frag.indexOf('<main');
const full = '<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + frag.slice(0, t) + '</head><body>\n' + frag.slice(t) + '\n</body></html>\n';
fs.writeFileSync('../index.html', full);
console.log('js', js.length, 'index.html', full.length);
