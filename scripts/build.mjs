// GitHub Pages 배포용 빌드: _site 생성
// - 사이트 파일 복사 (.github, scripts, node_modules 등 제외 / preview/는 그대로 포함)
// - 참조 이미지마다 표시용 webp 2종 (가로 600 / 1600, 확대 안 함) → _img/<원본 경로>.w600.webp
// - 이미지 크기 표(dims), 데이터 분할(data/index.json, data/works/<id>.json)
// - 변환 결과는 .cache/webp 에 파일 내용 해시로 캐시 (GitHub Actions의 actions/cache가 보관)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUT = path.join(ROOT, '_site');
const CACHE = path.join(ROOT, '.cache', 'webp');
const WIDTHS = [600, 1600];
const QUALITY = { 600: 78, 1600: 82 };
const VERSION = 'v1'; // 변환 설정을 바꾸면 올린다 (캐시 무효화)
const EXCLUDE = new Set(['.git', '.github', 'scripts', 'node_modules', '_site', '.cache', 'package.json', 'package-lock.json', '.gitignore']);

sharp.cache(false);
const t0 = Date.now();

// 1) 사이트 파일 복사
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const e of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (EXCLUDE.has(e.name)) continue;
  fs.cpSync(path.join(ROOT, e.name), path.join(OUT, e.name), { recursive: true });
}

// 2) 데이터 읽기
const worksText = fs.readFileSync(path.join(ROOT, 'works.json'), 'utf8');
const works = (JSON.parse(worksText).works) || [];

const isLocal = p => p && !/^(https?:)?\/\//.test(p) && !p.startsWith('/');
function thumbOf(w) {
  if (w.thumbnail) return w.thumbnail;
  const f = (w.final && w.final.result_images || []).filter(Boolean);
  if (f.length) return f[0];
  const s = (w.steps || []).map(x => (x && x.result_images || []).filter(Boolean)).filter(a => a.length);
  return s.length ? s[s.length - 1][0] : '';
}
function imagesOf(w) {
  const out = [];
  if (w.thumbnail) out.push(w.thumbnail);
  for (const s of [...(w.steps || []), w.final].filter(Boolean)) {
    for (const k of ['result_images', 'input_images']) for (const p of (s[k] || [])) if (p) out.push(p);
  }
  return [...new Set(out)];
}
const refs = [...new Set(works.flatMap(imagesOf))].filter(isLocal);

// 3) webp 변환 (캐시 사용)
fs.mkdirSync(CACHE, { recursive: true });
const used = new Set();
const dims = {};
const missing = [];
let made = 0, cached = 0;
const pending = new Map(); // 내용이 같은 이미지는 한 번만 변환

async function encode(h, buf) {
  const metaFile = path.join(CACHE, h + '.json');
  if (fs.existsSync(metaFile) && WIDTHS.every(w => fs.existsSync(path.join(CACHE, `${h}.w${w}.webp`)))) {
    cached++; return JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  }
  const m = await sharp(buf, { failOn: 'none', limitInputPixels: false }).metadata();
  const rot = (m.orientation || 1) >= 5;
  const meta = { w: rot ? m.height : m.width, h: rot ? m.width : m.height };
  for (const w of WIDTHS) {
    await sharp(buf, { failOn: 'none', limitInputPixels: false })
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: QUALITY[w], effort: 5 })
      .toFile(path.join(CACHE, `${h}.w${w}.webp`));
  }
  fs.writeFileSync(metaFile, JSON.stringify(meta));
  made++;
  return meta;
}

async function convert(p) {
  const abs = path.join(ROOT, p);
  if (!fs.existsSync(abs)) { missing.push(p); return; }
  const buf = fs.readFileSync(abs);
  const h = crypto.createHash('sha1').update(VERSION).update(buf).digest('hex');
  used.add(h + '.json'); WIDTHS.forEach(w => used.add(`${h}.w${w}.webp`));
  if (!pending.has(h)) pending.set(h, encode(h, buf));
  const meta = await pending.get(h);
  dims[p] = [meta.w, meta.h];
  for (const w of WIDTHS) {
    const dst = path.join(OUT, '_img', `${p}.w${w}.webp`);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(CACHE, `${h}.w${w}.webp`), dst);
  }
}

let next = 0;
const conc = Math.max(1, Math.min(4, os.cpus().length));
await Promise.all(Array.from({ length: conc }, async () => {
  while (next < refs.length) {
    const p = refs[next++];
    try { await convert(p); } catch (e) { console.warn('변환 실패(원본으로 표시됨):', p, String(e)); }
  }
}));

// 이번 빌드에서 쓰지 않은 캐시 항목 정리 (캐시가 계속 커지지 않도록)
for (const f of fs.readdirSync(CACHE)) if (!used.has(f)) fs.rmSync(path.join(CACHE, f));

// 4) 데이터 분할
// 빌드 번호: works.json + 이미지 크기 표(경로 순 정렬)가 같으면 같은 번호 → 브라우저 캐시 유지
const dimHash = crypto.createHash('sha1').update(VERSION).update(worksText)
  .update(JSON.stringify(Object.keys(dims).sort().map(k => [k, dims[k]]))).digest('hex');
const BUILD = dimHash.slice(0, 10);
const pick = (w, i) => {
  const t = thumbOf(w);
  const d = dims[t];
  return { id: w.id, key: w.id || String(i), title: w.title, category: w.category, date: w.date, steps: (w.steps || []).length, thumb: t, tw: d ? d[0] : 0, th: d ? d[1] : 0 };
};
fs.mkdirSync(path.join(OUT, 'data', 'works'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'data', 'index.json'), JSON.stringify({ build: BUILD, works: works.map(pick) }));
const seen = new Set();
works.forEach((w, i) => {
  const key = w.id || String(i);
  if (seen.has(key)) return; // 같은 코드가 겹치면 기존 화면과 같이 첫 항목만 사용
  seen.add(key);
  const d = {};
  for (const p of imagesOf(w)) if (dims[p]) d[p] = dims[p];
  fs.writeFileSync(path.join(OUT, 'data', 'works', encodeURIComponent(key) + '.json'), JSON.stringify({ build: BUILD, work: w, dims: d }));
});

// 5) HTML에 빌드 번호 기록 (분할 데이터·webp 사용 신호 겸 캐시 깨기)
for (const f of ['index.html', 'work.html']) {
  const fp = path.join(OUT, f);
  const html = fs.readFileSync(fp, 'utf8');
  const stamped = html.replace('<meta name="build" content="">', `<meta name="build" content="${BUILD}">`);
  if (stamped === html) console.warn(`${f}: build 메타 자리를 찾지 못함 (원본 이미지·works.json으로 표시됨)`);
  fs.writeFileSync(fp, stamped);
}

console.log(`build ${BUILD} · 이미지 ${refs.length} (새로 변환 ${made}, 캐시 ${cached}, 없음 ${missing.length}) · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (missing.length) console.warn('파일 없음:', missing.join(', '));
