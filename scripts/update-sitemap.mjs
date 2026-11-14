// sitemap.xml의 lastmod를 "그 URL의 파일이 실제로 마지막 커밋된 날짜"로 맞춘다.
//
// 이전 버전은 실행일(오늘)을 모든 <lastmod>에 일괄로 덮어썼다. 매주 월요일
// 모든 URL이 같은 날짜가 되면 검색엔진은 lastmod 신호를 신뢰하지 않는다.
// 그래서 지금은 URL → 파일 경로를 매핑해 `git log -1 --format=%cs -- <file>`로
// 그 파일을 마지막으로 바꾼 커밋 날짜(KST 작성일)만 반영한다.
// - 다른 저장소에서 배포하는 URL(/profcook/, /aid-lab/, /master/ 등)은 이 저장소에
//   파일이 없으므로 손대지 않고 기존 lastmod를 그대로 둔다.
// - 바뀐 것이 없으면 파일을 쓰지 않는다(워크플로 커밋도 발생하지 않는다).
//
// 사용법: node scripts/update-sitemap.mjs [--dry-run]

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, relative } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const smPath = resolve(root, 'sitemap.xml')
const SITE = 'https://skyman200.github.io/'
const dryRun = process.argv.includes('--dry-run')

/** URL → 이 저장소 안의 파일 경로 (없으면 null) */
function locToFile(loc) {
  if (!loc.startsWith(SITE)) return null
  const rel = loc.slice(SITE.length).split('?')[0].split('#')[0]
  const file = rel === '' || rel.endsWith('/') ? `${rel}index.html` : rel
  const abs = resolve(root, file)
  return existsSync(abs) ? abs : null
}

/** 그 파일을 마지막으로 바꾼 커밋의 작성일(YYYY-MM-DD). 없으면 null */
function gitDate(abs) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', relative(root, abs)], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null
  } catch {
    return null
  }
}

let xml = readFileSync(smPath, 'utf8')
const urlRe = /<url>[\s\S]*?<\/url>/g
let urls = 0
let changed = 0
const notes = []

xml = xml.replace(urlRe, (block) => {
  urls += 1
  const loc = (block.match(/<loc>([^<]+)<\/loc>/) || [])[1]
  if (!loc) return block
  const file = locToFile(loc)
  if (!file) return block // 다른 저장소에서 배포하는 URL — 그대로 둔다

  const dated = gitDate(file)
  if (!dated) return block
  if (!block.includes('<lastmod>')) return block

  const current = (block.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1]
  if (current === dated) return block

  notes.push(`${loc}  ${current ?? '(없음)'} → ${dated}`)
  changed += 1
  return block.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${dated}</lastmod>`)
})

if (changed > 0 && !dryRun) {
  writeFileSync(smPath, xml)
}

console.log(`[sitemap] 검사 ${urls}개 URL · 갱신 ${changed}개${dryRun ? ' (dry-run, 저장 안 함)' : ''}`)
for (const n of notes) console.log(`  - ${n}`)
if (changed === 0) console.log('[sitemap] 실제 변경 없음 — lastmod를 건드리지 않았습니다.')
