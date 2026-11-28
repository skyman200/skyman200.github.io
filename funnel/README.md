# 인피니티 퍼널 — 프런트엔드

```
index.html            홈 「무료 스타터 키트」 섹션 (신청 폼)
starter-kit/          리드 마그넷 실물 (5일 실행팩 · 진단 · 신청 폼 · 공유 블록 · PDF)
go/                   SNS 댓글·프로필 유입용 3초 랜딩 (1화면 · noindex)
apply/                고관여자 필터링 상담·프로젝트 신청서 (noindex)
vibe-coding/*/        각 칼럼 하단 CTA 배너 (22편 + 허브) — 주요 5편은 /apply/ 한 줄 더
funnel/funnel.css     폼·배너 공통 스타일 (밝은 배경용 .funnel--light, 공유 블록 .share)
funnel/funnel.js      폼 제출 · 공유 버튼 복사 · GA4/커스텀 이벤트 훅 (kit/apply 두 종류)
gas/                  Apps Script 백엔드 (시트·6단계 메일·대시보드·맞춤타겟)
```

## 배포 후 30초 작업

`funnel/funnel.js` 상단:

```js
window.FUNNEL_CONFIG = {
  endpoint: 'https://script.google.com/macros/s/.../exec',  // Apps Script 웹앱 URL
  fallbackEmail: 'cdi3477@dit.ac.kr',   // 접수 실패 시 메일 폴백
  kitUrl: '/starter-kit/',
  applyUrl: '/apply/'
};
```

`endpoint`가 비어 있는 동안에는 제출 시 메일 앱으로 신청서가 열립니다(접수 누락 없음).
값이 있으면 시트 접수 + 자동 메일로 바뀝니다.

## 폼 두 종류

| 폼 | 표시 | 백엔드 |
| --- | --- | --- |
| 스타터 키트 신청 | `<form data-funnel>` 또는 `data-funnel-type="kit"` | `DB` 탭 + 1·3·5·7·14·30일차 메일 |
| 상담·프로젝트 신청 | `<form data-funnel data-funnel-type="apply">` | `상담신청` 탭 + 관리자 알림 |

- 밝은 종이 배경에 폼을 놓을 때는 `class="funnel funnel--light"` 를 붙입니다.
- apply 폼의 필수 항목: `name` `email` `phone` `org` `track` `task`(10자 이상) `timing` `consent`.
- 선택 항목: `orgname` `metric` `budget`. 허니팟 `website` 는 모든 폼에 그대로 둡니다.
- 제출이 끝나면 `[data-funnel-box]` 안이 완료 안내로 바뀝니다. 폼을 감싼 요소에 그 속성을 두세요.
- 제출이 끝나면 kit 완료 화면에는 공유 블록(`.share`)이 함께 붙습니다.

## 공유 블록 (3단계 — 구전 모먼트)

```html
<div class="share share--paper"><!-- 다크 배경이면 class="share" 만 -->
  <p class="share__kicker">동료에게 넘기기</p>
  <p class="share__title">동료 교수·센터 대표에게 5일 실행팩을 넘겨 주세요</p>
  <p class="share__text">링크 한 줄이면 됩니다. 받는 분도 이름과 이메일만 남기면 같은 실행팩을 받습니다.</p>
  <div class="share__actions">
    <button type="button" class="share__btn" data-share-copy="link">링크 복사<span class="share__sub">skyman200.github.io/go/?ref=share</span></button>
    <button type="button" class="share__btn" data-share-copy="text">추천 멘트 복사<span class="share__sub">카카오톡·문자용 2줄</span></button>
  </div>
  <p class="share__status" data-share-status hidden></p>
</div>
```

- 버튼은 `.share__btn`, 상태 문구는 `[data-share-status]`. `funnel.js` 가 document 에 위임해 처리하므로
  완료 화면처럼 innerHTML 로 다시 그려지는 곳에도 그대로 동작합니다.
- 복사되는 링크는 `FUNNEL_CONFIG.shareUrl` = `https://skyman200.github.io/go/?ref=share`.
  `ref=share` 는 시트 `유입경로` 에 남고, `대시보드` 탭의 `공유 유입` 줄에서 셀 수 있습니다.
- 멘트는 `FUNNEL_CONFIG.shareText` + 줄바꿈 + 링크 2줄입니다.

## 계측 훅 (3단계)

`gtag` 또는 `dataLayer` 가 페이지에 있으면 자동으로 보내고, 없으면 조용히 넘어갑니다.
지금 사이트에는 GA4 태그가 없어서 **아무것도 전송되지 않습니다** — 나중에 GA4 를 붙이면 그때부터 집계됩니다.

| 이벤트 | 언제 | 파라미터 |
| --- | --- | --- |
| `funnel_view` | 페이지 로드 | `page` · `ref_code` · `form` |
| `funnel_submit` | 제출 직전 | `form` · `org` · `interest` |
| `funnel_done` | 접수 완료 | `form` · `org` · `interest` |
| `funnel_error` | 검증 실패·네트워크 실패 | `form` · `reason` |
| `funnel_mailto` | endpoint 없이 메일 앱 폴백 | `form` |
| `share_copy_link` / `share_copy_text` | 공유 버튼 | `page` |
| `funnel_link` | `/go/` · `/apply/` · `/starter-kit/` 이동 클릭 | `to` · `from` |

이름·이메일·연락처는 이벤트에 넣지 않습니다(소속유형·관심분야까지만).

## 칼럼을 새로 쓸 때 (배너 붙이기)

`vibe-coding/{슬러그}/index.html` 의 `<div class="author-bio">` 바로 위에 붙입니다.

```html
<a class="kit-cta" href="/starter-kit/">
  <span class="k">무료 스타터 키트</span>
  <span class="t">이 글에서 쓴 방식을 그대로 복사할 수 있게 정리했습니다 — 대학 행정 × 센터 자동화 5일 실행팩</span>
  <span class="d">5일 실행표 · Apps Script 템플릿 4종 · 프롬프트 12개 · 배포 전 체크리스트 10문항. 이름과 이메일로 신청하면 7일 안내 메일로 이어집니다.</span>
  <span class="go">실행팩 받기 →</span>
</a>
```

`</head>` 앞에는 `<link rel="stylesheet" href="/funnel/funnel.css?v=YYYYMMDD" />` 한 줄.
배너 아래에 더 깊은 경로를 한 줄 더 두려면(주요 칼럼·시리즈 허브에 적용되어 있음):

```html
<p class="kit-next">없애고 싶은 업무가 이미 한 가지로 정해져 있다면 — <a href="/apply/">상담·프로젝트 신청서</a> (먼저 거절하는 경우를 적어 두었습니다)</p>
```

## 스타일을 고쳤을 때

GitHub Pages는 CSS를 10분간 캐시합니다. `funnel.css?v=` 뒤의 날짜를 올리면 방문자 브라우저도 새 파일을 받습니다.
`funnel.js` 도 같은 이유로 필요하면 `?v=` 를 붙여 부르세요(홈·starter-kit 은 현재 버전 없는 `src`).
