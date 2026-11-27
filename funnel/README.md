# 인피니티 퍼널 1단계 — 프런트엔드

```
index.html            홈 「무료 스타터 키트」 섹션 (신청 폼)
starter-kit/          리드 마그넷 실물 (5일 실행팩 · 진단 · 신청 폼 · PDF)
vibe-coding/*/        각 칼럼 하단 CTA 배너 (21편 + 허브)
funnel/funnel.css     폼·배너 공통 스타일
funnel/funnel.js      폼 제출 (GAS 웹앱 URL 한 곳에 연결)
gas/                  Apps Script 백엔드 (시트·메일 시퀀스)
```

## 배포 후 30초 작업

`funnel/funnel.js` 7번째 줄:

```js
window.FUNNEL_CONFIG = {
  endpoint: '',                 // ← Apps Script 웹앱 URL(.../exec)을 넣습니다
  fallbackEmail: 'cdi3477@dit.ac.kr',
  kitUrl: '/starter-kit/'
};
```

`endpoint`가 비어 있는 동안에는 제출 시 메일 앱으로 신청서가 열립니다(접수 누락 없음).
값을 넣고 커밋하면 그때부터 시트 접수 + 1·3·5·7일차 자동 메일로 바뀝니다.

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
