// 캐시 무효화용 버전 갱신 스크립트
// 사용법: node tools/bump-version.mjs
//
// index.html 의 css/js 주소와 모든 JS 파일의 import 경로 뒤에 ?v=<버전> 을 붙입니다.
// 배포(push) 전에 실행하면 모바일 브라우저도 캐시된 예전 파일 대신 새 파일을 받습니다.
// 모든 파일에 같은 버전을 붙여야 같은 모듈이 두 번 로드되지 않습니다.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const version = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

function listJs(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return listJs(p);
    return p.endsWith(".js") ? [p] : [];
  });
}

let changed = 0;

function rewrite(file, pattern, replacer) {
  const before = readFileSync(file, "utf8");
  const after = before.replace(pattern, replacer);
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
  }
}

// index.html: <link href="css/...css"> / <script src="js/...js">
rewrite(
  join(root, "index.html"),
  /((?:href|src)=")((?:css|js)\/[^"?]+\.(?:css|js))(?:\?v=[^"]*)?(")/g,
  (_, a, path, b) => `${a}${path}?v=${version}${b}`
);

// JS: import ... from "./x.js" / "../x.js"
for (const file of listJs(join(root, "js"))) {
  rewrite(
    file,
    /(\bfrom\s+["'])(\.{1,2}\/[^"'?]+\.js)(?:\?v=[^"']*)?(["'])/g,
    (_, a, path, b) => `${a}${path}?v=${version}${b}`
  );
}

console.log(`version=${version} (${changed} files updated)`);
