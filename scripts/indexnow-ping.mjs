// IndexNow 핑 — 네이버·빙·Yandex 등 IndexNow 참여 검색엔진에
// "이 URL들 재수집해라"를 한 번에 통보한다. (구글은 IndexNow 미지원 → 무시됨)
//
// 왜 안전한가: 실제로 콘텐츠가 바뀐 주기(주간/수동)에만 호출한다.
// 매일 무의미하게 핑하면 스팸 취급이라 역효과 — 크론은 주 1회로 제한.
//
// 엔드포인트는 아무 IndexNow 멤버 하나에 제출하면 서로 공유된다(api.indexnow.org).

const KEY = '854562e3f054d5ed2edb81e73180a48a'
const HOST = 'skyman200.github.io'
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`

const urlList = [
  'https://skyman200.github.io/',
  'https://skyman200.github.io/profcook/',
]

const body = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }

// 여러 엔드포인트에 제출(멤버 간 공유되지만, 이중으로 확실히)
const endpoints = [
  'https://api.indexnow.org/indexnow',
  'https://searchadvisor.naver.com/indexnow', // 네이버 IndexNow
  'https://www.bing.com/indexnow',
]

let anyOk = false
for (const ep of endpoints) {
  try {
    const r = await fetch(ep, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    })
    const txt = await r.text().catch(() => '')
    console.log(`[indexnow] ${ep} → HTTP ${r.status} ${txt.slice(0, 120)}`)
    // 200/202 = 접수, 그 외도 치명적 아님(엔드포인트별 정책 상이)
    if (r.status === 200 || r.status === 202) anyOk = true
  } catch (e) {
    console.log(`[indexnow] ${ep} → ERROR ${e.message}`)
  }
}

console.log(anyOk ? '[indexnow] 최소 1개 엔드포인트 접수 성공' : '[indexnow] 모든 엔드포인트 비2xx (치명적 아님, 로그 확인)')
// 워크플로를 실패로 만들지 않음 — 핑은 best-effort
process.exit(0)
