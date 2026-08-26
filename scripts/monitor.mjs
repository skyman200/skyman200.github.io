// 색인/노출 상태 모니터링 — 워크플로 로그에 사람이 읽는 리포트를 남긴다.
// (구글/네이버 순위 API는 공개되지 않으므로, 여기서는 "우리 쪽이 정상인지"
//  = 크롤러가 읽을 수 있는 상태인지를 점검한다. 순위 자체는 서치콘솔에서 확인.)

const checks = [
  { name: '루트',        url: 'https://skyman200.github.io/' },
  { name: '프로필',      url: 'https://skyman200.github.io/profcook/' },
  { name: 'robots',      url: 'https://skyman200.github.io/robots.txt' },
  { name: 'sitemap',     url: 'https://skyman200.github.io/sitemap.xml' },
  { name: 'IndexNow키',  url: 'https://skyman200.github.io/854562e3f054d5ed2edb81e73180a48a.txt' },
  { name: '네이버인증',  url: 'https://skyman200.github.io/naverdb6ea8f8fba954563745ce969b9f7651.html' },
  { name: '구글인증',    url: 'https://skyman200.github.io/google840d686bf29d89c0.html' },
]

const KEYWORDS = ['김강훈', '부산', '근골격계', '허리디스크', '동의과학대', 'AI']

let fail = 0
console.log(`\n=== SEO 상태 점검 · ${new Date().toISOString()} ===`)
for (const c of checks) {
  try {
    const r = await fetch(c.url, { redirect: 'follow' })
    const ok = r.status === 200
    if (!ok) fail++
    console.log(`  ${ok ? 'OK ' : 'XX '} [${r.status}] ${c.name.padEnd(10)} ${c.url}`)
  } catch (e) {
    fail++
    console.log(`  XX [ERR] ${c.name.padEnd(10)} ${e.message}`)
  }
}

try {
  const html = await (await fetch('https://skyman200.github.io/profcook/')).text()
  const body = html.split('<body>')[1] || ''
  const text = body.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')
  const kw = KEYWORDS.map((k) => `${k}${text.includes(k) ? '✓' : '✗'}`).join(' ')
  const ldCount = (html.match(/application\/ld\+json/g) || []).length
  console.log(`  본문 키워드: ${kw}`)
  console.log(`  본문 길이: ${body.length}자 · JSON-LD 블록: ${ldCount}개`)
  if (KEYWORDS.some((k) => !text.includes(k))) fail++
} catch (e) {
  fail++
  console.log(`  XX 프로필 본문 점검 실패: ${e.message}`)
}

console.log(fail === 0 ? '\n✅ 전부 정상 — 검색엔진이 읽을 수 있는 상태' : `\n⚠️ ${fail}건 이상 — 위 XX 항목 확인 필요`)
process.exit(0)
