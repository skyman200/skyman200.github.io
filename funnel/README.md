# 인피니티 퍼널 — 프런트엔드

```
index.html            홈 「무료 스타터 키트」 섹션 (신청 폼)
starter-kit/          리드 마그넷 실물 (5일 실행팩 · 진단 · 신청 폼 · PDF)
go/                   SNS 댓글·프로필 유입용 3초 랜딩 (1화면 · noindex)
apply/                고관여자 필터링 상담·프로젝트 신청서 (noindex)
vibe-coding/*/        각 칼럼 하단 CTA 배너 (21편 + 허브)
funnel/funnel.css     폼·배너 공통 스타일 (밝은 배경용 .funnel--light 포함)
funnel/funnel.js      폼 제출 (GAS 웹앱 URL 한 곳에 연결 · kit/apply 두 종류)
gas/                  Apps Script 백엔드 (시트·메일 시퀀스·상담 알림)
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
| 스타터 키트 신청 | `<form data-funnel>` 또는 `data-funnel-type="kit"` | `DB` 탭 + 1·3·5·7일차 메일 |
| 상담·프로젝트 신청 | `<form data-funnel data-funnel-type="apply">` | `상담신청` 탭 + 관리자 알림 |

- 밝은 종이 배경에 폼을 놓을 때는 `class="funnel funnel--light"` 를 붙입니다.
- apply 폼의 필수 항목: `name` `email` `phone` `org` `track` `task`(10자 이상) `timing` `consent`.
- 선택 항목: `orgname` `metric` `budget`. 허니팟 `website` 는 모든 폼에 그대로 둡니다.
- 제출이 끝나면 `[data-funnel-box]` 안이 완료 안내로 바뀝니다. 폼을 감싼 요소에 그 속성을 두세요.

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

## 스타일을 고쳤을 때

GitHub Pages는 CSS를 10분간 캐시합니다. `funnel.css?v=` 뒤의 날짜를 올리면 방문자 브라우저도 새 파일을 받습니다.
`funnel.js` 도 같은 이유로 필요하면 `?v=` 를 붙여 부르세요(홈·starter-kit 은 현재 버전 없는 `src`).
