// sitemap.xml의 lastmod를 오늘 날짜(KST)로 갱신한다.
// 주의: 이건 "가짜 신선도"가 아니라, 워크플로가 실제로 재검토/재핑하는 시점을
// 정직하게 기록하는 것. 내용이 안 바뀌면 검색엔진이 알아서 무시한다.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const smPath = resolve(__dirname, '..', 'sitemap.xml')

// KST(UTC+9) 기준 YYYY-MM-DD
const kst = new Date(Date.now() + 9 * 3600 * 1000)
const today = kst.toISOString().slice(0, 10)

let xml = readFileSync(smPath, 'utf8')
const before = xml
xml = xml.replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`)

if (xml !== before) {
  writeFileSync(smPath, xml)
  console.log(`[sitemap] lastmod → ${today} 갱신`)
} else {
  console.log(`[sitemap] 변경 없음 (이미 ${today})`)
}
