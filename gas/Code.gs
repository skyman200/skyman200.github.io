/**
 * 김강훈 교수 · 인피니티 퍼널 백엔드 (1단계 + 2단계 + 3단계)
 * 인피니티퍼널_DB  —  skyman200.github.io 신청 폼 → 시트 저장 → 1·3·5·7·14·30일차 메일 자동 발송
 *                     /apply/ 상담·프로젝트 신청 → 상담신청 탭 저장 → 관리자 알림
 *
 * 최초 1회: 편집기에서 setup() 실행 → 권한 승인 → 배포(웹앱, 액세스: 모든 사용자)
 * 이후      : 시간 기반 트리거(processSequence, 매시)가 3·5·7·14·30일차 메일을 보냅니다.
 *             코드를 새 버전으로 바꿨다면 setup() 을 한 번 다시 실행하세요(기존 행은 그대로, 새 탭·설정 항목만 추가).
 *
 * 3단계 (2026-11-28)
 *   - 대시보드 탭(ensureDashboard_) — 시트 수식만으로 총 DB·오늘/이번 주/이번 달 신규·소속유형별·
 *     관심분야별·유입 채널별·시퀀스 단계별·상담 전환율을 자동 계산합니다.
 *   - 14·30일차 메일로 시퀀스를 늘리고, 30일 뒤 다시 신청하면 1일차부터 재시작합니다(무한 루프).
 *   - exportMetaAudienceCsv() — 메타 맞춤타겟용 이메일 목록(수신거부 제외·중복 제거).
 *
 * 시트 구조
 *   DB       일시 | 이름 | 이메일 | 소속유형 | 관심분야 | 유입경로 | 시퀀스단계 | 상태 | 최근발송 | 메모
 *   상담신청  일시 | 이름 | 이메일 | 연락처 | 소속유형 | 소속명 | 희망트랙 | 반복업무 | 지금걸리는시간 | 희망시기 | 예산범위 | 유입경로 | 상태 | 메모
 *   설정     발신자이름 · 회신주소 · 사이트주소 · 스타터키트주소 · 5일차영상주소 · 7일차진단주소 · 관리자메일 · 관리자알림 · 상담알림 · 시퀀스발송시각
 *   발송로그  일시 | 이메일 | 단계 | 제목 | 결과
 *   대시보드  수식만 있는 집계 탭(setup() 이 다시 그립니다)
 *   맞춤타겟  exportMetaAudienceCsv() 실행 때마다 다시 쓰는 내보내기 탭
 */

var PROP = PropertiesService.getScriptProperties();
var TZ = 'Asia/Seoul';
var SHEET_ID_KEY = 'FUNNEL_SHEET_ID';

var TAB_DB = 'DB';
var TAB_APPLY = '상담신청';
var TAB_SET = '설정';
var TAB_LOG = '발송로그';
var TAB_DASH = '대시보드';
var TAB_TARGET = '맞춤타겟';

var DB_HEADERS = ['일시', '이름', '이메일', '소속유형', '관심분야', '유입경로', '시퀀스단계', '상태', '최근발송', '메모'];
var APPLY_HEADERS = ['일시', '이름', '이메일', '연락처', '소속유형', '소속명', '희망트랙', '반복업무', '지금걸리는시간', '희망시기', '예산범위', '유입경로', '상태', '메모'];
var LOG_HEADERS = ['일시', '이메일', '단계', '제목', '결과'];

var ORG_TYPES = ['대학·기관', '센터·병원', '기업', '개인사업체', '일반'];
var INTERESTS = ['특강·워크숍', '구축 외주', 'B2B 솔루션'];
var TRACKS = ['90분 실습 특강', '업무 자동화 외주', 'B2B 대시보드 납품'];
var APPLY_STATUS = ['신규', '회신완료', '상담중', '진행', '보류', '거절'];

/**
 * 스팸 방지 메모 — 2026-11-28 1일차 테스트 메일이 Gmail 스팸함으로 들어간 뒤 고친 값입니다.
 * 핵심은 하나입니다. Apps Script 는 '배포한 계정' 주소로 메일을 보냅니다.
 * 회신주소를 그 주소와 같게 두면 From/Reply-To 도메인이 일치합니다.
 * 권장: ptkanghoon@gmail.com 계정으로 배포 + 회신주소도 ptkanghoon@gmail.com (Gmail→Gmail).
 * 학교 계정으로 배포한다면 회신주소를 그 계정(cdi3477@aicode.dit.ac.kr)으로 맞추세요.
 */
var DEFAULT_SETTINGS = [
  ['발신자이름', '김강훈'],
  ['회신주소', 'ptkanghoon@gmail.com'],
  ['사이트주소', 'https://skyman200.github.io/'],
  ['스타터키트주소', 'https://skyman200.github.io/starter-kit/'],
  ['5일차영상주소', ''],
  ['7일차진단주소', 'https://skyman200.github.io/starter-kit/#diagnosis'],
  ['관리자메일', 'cdi3477@dit.ac.kr'],
  ['관리자알림', 'Y'],
  ['상담알림', 'Y'],
  ['시퀀스발송시각', '9'],
  ['안내', '위 값을 고치면 다음 발송부터 그대로 반영됩니다. 5일차영상주소를 비워 두면 5일차 메일은 영상 없이 나갑니다.'],
  ['스팸방지', '회신주소는 이 웹앱을 배포한 계정 주소와 같아야 합니다(From/Reply-To 도메인 일치). 권장: ptkanghoon@gmail.com으로 배포하고 회신주소도 같은 주소. 제목·본문은 짧은 편지형으로 유지하세요.']
];

/* ───────────────────────────── 설치 ───────────────────────────── */

/**
 * 최초 1회 실행. 스프레드시트를 만들고 탭·머리글·서식을 세팅한 뒤 트리거를 설치합니다.
 * 이미 만들어 둔 시트를 쓰려면: setSpreadsheetId('시트ID') 실행 후 setup().
 */
function setup() {
  var ss = openOrCreateSpreadsheet_();
  ensureTabs_(ss);
  installTriggers_();
  var url = ss.getUrl();
  Logger.log('인피니티퍼널_DB: ' + url);
  Logger.log('탭: DB · 상담신청 · 설정 · 발송로그 · ' + TAB_DASH + '  (시퀀스: 1·3·5·7·14·30일차)');
  Logger.log('메타 맞춤타겟: 편집기에서 exportMetaAudienceCsv() 실행 → `' + TAB_TARGET + '` 탭 확인');
  Logger.log('다음 단계 — 배포 > 새 배포 > 웹앱, 실행 계정: 나, 액세스 권한: 모든 사용자');
  return url;
}

function setSpreadsheetId(id) {
  if (!id) throw new Error('시트 ID가 비어 있습니다.');
  var ss = SpreadsheetApp.openById(id);
  PROP.setProperty(SHEET_ID_KEY, ss.getId());
  Logger.log('연결됨: ' + ss.getUrl());
  return ss.getUrl();
}

function openOrCreateSpreadsheet_() {
  var id = PROP.getProperty(SHEET_ID_KEY);
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (err) {
      Logger.log('기존 시트를 열 수 없어 새로 만듭니다: ' + err);
    }
  }
  var ss = SpreadsheetApp.create('인피니티퍼널_DB');
  PROP.setProperty(SHEET_ID_KEY, ss.getId());
  return ss;
}

function ensureTabs_(ss) {
  var db = getOrCreateTab_(ss, TAB_DB);
  if (db.getLastRow() === 0) {
    db.getRange(1, 1, 1, DB_HEADERS.length).setValues([DB_HEADERS]);
  }
  styleHeader_(db, DB_HEADERS.length);
  db.setFrozenRows(1);
  setWidths_(db, [150, 90, 220, 110, 120, 260, 90, 80, 150, 220]);
  db.getRange('G2:G2000').setHorizontalAlignment('center');
  db.getRange('H2:H2000').setHorizontalAlignment('center');
  db.getRange('A2:A2000').setNumberFormat('yyyy-mm-dd hh:mm');
  db.getRange('I2:I2000').setNumberFormat('yyyy-mm-dd hh:mm');
  db.getRange('D2:D2000').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(ORG_TYPES, true).setAllowInvalid(true).build()
  );
  db.getRange('E2:E2000').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(INTERESTS, true).setAllowInvalid(true).build()
  );
  db.getRange('H2:H2000').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['활성', '수신거부', '완료', '보류'], true).setAllowInvalid(true).build()
  );

  var set = getOrCreateTab_(ss, TAB_SET);
  if (set.getLastRow() === 0) {
    set.getRange(1, 1, 1, 2).setValues([['항목', '값']]);
    set.getRange(2, 1, DEFAULT_SETTINGS.length, 2).setValues(DEFAULT_SETTINGS);
  }
  styleHeader_(set, 2);
  set.setFrozenRows(1);
  setWidths_(set, [160, 460]);

  // 2단계 — 상담·프로젝트 신청(고관여자) 탭
  var ap = getOrCreateTab_(ss, TAB_APPLY);
  if (ap.getLastRow() === 0) {
    ap.getRange(1, 1, 1, APPLY_HEADERS.length).setValues([APPLY_HEADERS]);
  }
  styleHeader_(ap, APPLY_HEADERS.length);
  ap.setFrozenRows(1);
  setWidths_(ap, [150, 90, 220, 130, 100, 160, 150, 300, 120, 110, 110, 240, 90, 180]);
  ap.getRange('A2:A2000').setNumberFormat('yyyy-mm-dd hh:mm');
  ap.getRange('E2:E2000').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(ORG_TYPES, true).setAllowInvalid(true).build()
  );
  ap.getRange('G2:G2000').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(TRACKS, true).setAllowInvalid(true).build()
  );
  ap.getRange('H2:H2000').setWrap(true);
  ap.getRange('M2:M2000').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(APPLY_STATUS, true).setAllowInvalid(true).build()
  );

  var log = getOrCreateTab_(ss, TAB_LOG);
  if (log.getLastRow() === 0) {
    log.getRange(1, 1, 1, LOG_HEADERS.length).setValues([LOG_HEADERS]);
  }
  styleHeader_(log, LOG_HEADERS.length);
  log.setFrozenRows(1);
  setWidths_(log, [150, 220, 60, 340, 200]);
  log.getRange('A2:A2000').setNumberFormat('yyyy-mm-dd hh:mm');

  // 스팸 패치로 늘어난 설정 항목을 기존 시트에도 채워 넣습니다(기존 값은 건드리지 않음).
  ensureSettingsRows_(set);

  // 3단계 — 수식만으로 돌아가는 집계 탭
  ensureDashboard_(ss);

  // 만들자마자 생기는 기본 탭(시트1)은 정리
  ss.getSheets().forEach(function (s) {
    if (s.getName() === 'Sheet1' && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  ss.setSpreadsheetTimeZone(TZ);
}

function getOrCreateTab_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

/* ─────────────────────── 3단계 · 대시보드 탭 ─────────────────────── */

/**
 * `대시보드` 탭을 수식으로 다시 그립니다. setup() 이 호출하고, 손으로 값을 고쳤을 때는
 * 편집기에서 rebuildDashboard() 를 실행하세요.
 *
 * 원칙: 여기 있는 숫자는 전부 시트 수식이 계산합니다. Apps Script가 주기적으로 돌면서
 * 숫자를 복사해 두지 않습니다(트리거·할당량·실행 기록이 늘지 않게).
 */
function ensureDashboard_(ss) {
  var sh = getOrCreateTab_(ss, TAB_DASH);
  sh.clear(); // 이 탭은 파생 화면입니다. 원본은 DB·상담신청 탭입니다.
  sh.setColumnWidth(1, 240);
  sh.setColumnWidth(2, 120);
  sh.setColumnWidth(3, 110);
  sh.setColumnWidth(4, 110);

  function section_(row, text) {
    sh.getRange(row, 1, 1, 4).merge()
      .setValue(text)
      .setBackground('#111417')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontSize(11)
      .setVerticalAlignment('middle');
    sh.setRowHeight(row, 26);
  }
  function label_(row, text) {
    sh.getRange(row, 1).setValue(text).setFontSize(11).setFontColor('#161616');
  }
  function stat_(row, formula, format) {
    var c = sh.getRange(row, 2).setFormula(formula).setFontSize(11).setFontWeight('bold')
      .setHorizontalAlignment('right').setFontColor('#161616');
    if (format) c.setNumberFormat(format);
  }
  function note_(row, col, text) {
    sh.getRange(row, col).setValue(text).setFontSize(9).setFontColor('#8a8d91');
  }

  sh.getRange(1, 1, 1, 4).merge()
    .setValue('인피니티 퍼널 대시보드')
    .setFontSize(15).setFontWeight('bold').setFontColor('#111417');
  sh.setRowHeight(1, 34);

  label_(2, '기준 시각');
  sh.getRange(2, 2).setFormula('=NOW()').setNumberFormat('yyyy-mm-dd hh:mm').setFontSize(10).setFontColor('#5f6368');
  note_(2, 3, '수식이라 열 때마다 다시 계산됩니다 (수동 새로고침 Ctrl+Shift+F9)');
  label_(3, '원본');
  note_(3, 2, 'DB · 상담신청 탭. 이 탭은 파생 화면입니다.');

  /* 요약 */
  section_(5, '요약  (DB 탭 기준)');
  label_(6, '총 DB 수');
  stat_(6, '=COUNTA(DB!$C$2:$C)', '0');
  label_(7, '활성(발송 중)');
  stat_(7, '=COUNTIF(DB!$H$2:$H,"활성")', '0');
  label_(8, '오늘 신규');
  stat_(8, '=COUNTIFS(DB!$A$2:$A,">="&TODAY(),DB!$A$2:$A,"<"&TODAY()+1)', '0');
  label_(9, '이번 주 신규 (월~일)');
  stat_(9, '=COUNTIFS(DB!$A$2:$A,">="&(TODAY()-WEEKDAY(TODAY(),3)),DB!$A$2:$A,"<"&(TODAY()-WEEKDAY(TODAY(),3)+7))', '0');
  label_(10, '이번 달 신규');
  stat_(10, '=COUNTIFS(DB!$A$2:$A,">="&(EOMONTH(TODAY(),-1)+1),DB!$A$2:$A,"<="&EOMONTH(TODAY(),0))', '0');
  label_(11, '상담신청 수');
  stat_(11, "=COUNTA('상담신청'!$C$2:$C)", '0');
  label_(12, '상담 전환율 (상담신청/DB)');
  stat_(12, "=IFERROR(COUNTUNIQUE('상담신청'!$C$2:$C)/COUNTA(DB!$C$2:$C),0)", '0.0%');
  label_(13, '수신거부');
  stat_(13, '=COUNTIF(DB!$H$2:$H,"수신거부")', '0');
  label_(14, '7일차 도달');
  stat_(14, '=COUNTIF(DB!$G$2:$G,">=7")', '0');
  label_(15, '30일차 도달 (시퀀스 완료)');
  stat_(15, '=COUNTIF(DB!$G$2:$G,">=30")', '0');
  label_(16, '공유 유입 (?ref=share)');
  stat_(16, '=COUNTIF(DB!$F$2:$F,"*ref=share*")', '0');

  /* 소속유형별 */
  section_(18, '소속유형별');
  sh.getRange(19, 1).setFormula(
    '=IF(COUNTA(DB!$C$2:$C)=0,"아직 신청 없음",QUERY(DB!$A$2:$J,"select D, count(D) where C is not null group by D order by count(D) desc label D \'소속유형\', count(D) \'인원\'",0))'
  ).setFontSize(11);

  /* 관심분야별 */
  section_(25, '관심분야별');
  sh.getRange(26, 1).setFormula(
    '=IF(COUNTA(DB!$C$2:$C)=0,"아직 신청 없음",QUERY(DB!$A$2:$J,"select E, count(E) where C is not null group by E order by count(E) desc label E \'관심분야\', count(E) \'인원\'",0))'
  ).setFontSize(11);

  /* 유입 채널 — 유입경로 열에는 경로+쿼리+리퍼러가 원문으로 들어 있어 패턴으로 셉니다. */
  section_(31, '유입 채널  (유입경로 원문 기준)');
  sh.getRange(32, 1).setValue('채널').setFontWeight('bold').setFontSize(10).setFontColor('#5f6368');
  sh.getRange(32, 2).setValue('인원').setFontWeight('bold').setFontSize(10).setFontColor('#5f6368')
    .setHorizontalAlignment('right');
  var channels = [
    ['/go/ 랜딩 (SNS·댓글)', '=COUNTIF(DB!$F$2:$F,"*/go/*")'],
    ['홈 #kit 폼', '=COUNTIF(DB!$F$2:$F,"/")+COUNTIF(DB!$F$2:$F,"/index.html")'],
    ['/starter-kit/ 폼', '=COUNTIF(DB!$F$2:$F,"*/starter-kit/*")'],
    ['vibe-coding 칼럼', '=COUNTIF(DB!$F$2:$F,"*/vibe-coding/*")'],
    ['/apply/ 상담', "=COUNTA('상담신청'!$C$2:$C)"]
  ];
  channels.forEach(function (row, i) {
    var r = 33 + i;
    sh.getRange(r, 1).setValue(row[0]).setFontSize(11).setFontColor('#161616');
    sh.getRange(r, 2).setFormula(row[1]).setFontSize(11).setFontWeight('bold')
      .setHorizontalAlignment('right').setNumberFormat('0');
  });
  label_(38, '그 외 · 직접 입력');
  stat_(38, '=MAX(0,B6-B33-B34-B35-B36)', '0');
  note_(39, 1, '유입경로는 폼이 보낸 경로·쿼리·리퍼러를 그대로 저장합니다. 채널 이름을 바꾸려면 *패턴* 을 고치세요.');

  /* 시퀀스 단계별 — 1·3·5·7·14·30 */
  section_(41, '시퀀스 단계별 분포  (해당 단계까지 받은 사람)');
  sh.getRange(42, 1).setFormula(
    '=IF(COUNTA(DB!$C$2:$C)=0,"아직 신청 없음",QUERY(DB!$A$2:$J,"select G, count(G) where C is not null group by G order by G label G \'시퀀스단계\', count(G) \'인원\'",0))'
  ).setFontSize(11);

  /* 상담신청 트랙별 */
  section_(50, '상담신청 — 희망 트랙별');
  sh.getRange(51, 1).setFormula(
    '=IF(COUNTA(\'상담신청\'!$C$2:$C)=0,"아직 상담신청 없음",QUERY(\'상담신청\'!$A$2:$N,"select G, count(G) where C is not null group by G order by count(G) desc label G \'희망트랙\', count(G) \'인원\'",0))'
  ).setFontSize(11);

  /* 최근 7일 일별 신청 */
  section_(58, '최근 7일 일별 신청');
  sh.getRange(59, 1).setFormula(
    '=IF(COUNTA(DB!$C$2:$C)=0,"아직 신청 없음",QUERY(DB!$A$2:$J,"select toDate(A), count(A) where A is not null group by toDate(A) order by toDate(A) desc limit 7 label toDate(A) \'날짜\', count(A) \'인원\'",0))'
  ).setFontSize(11);

  sh.setFrozenRows(1);
  return sh;
}

/** 대시보드 탭을 코드 기준으로 다시 그립니다(손으로 고친 뒤 되돌릴 때). */
function rebuildDashboard() {
  var ss = openSheet_();
  ensureDashboard_(ss);
  Logger.log('대시보드 갱신 완료: ' + ss.getUrl());
  return ss.getUrl();
}

/* ─────────────────── 3단계 · 메타 맞춤타겟 내보내기 ─────────────────── */

/**
 * SNS가 멈춰도 다시 도달할 수 있는 명단 — 이메일 DB를 메타 맞춤타겟으로 넘길 수 있게 추출합니다.
 * 수신거부·형식 오류·중복은 빼고, 소문자로 통일합니다.
 *
 * 결과는 `맞춤타겟` 탭에 다시 씁니다(A: email, B: 이름, C: 상태, D: 유입경로).
 * CSV 파일을 직접 만들려면 그 탭에서 파일 > 다운로드 > 쉼표로 구분된 값(.csv).
 * (DriveApp 권한을 새로 요구하지 않으려고 파일 생성은 하지 않습니다 — 승인 창이 한 번 더 뜨면
 *  계정 주인이 직접 눌러야 해서, 배포를 막는 일이 생깁니다.) CSV 문자열은 반환값으로도 돌려줍니다.
 */
function exportMetaAudienceCsv(includeNames) {
  var ss = openSheet_();
  var db = ss.getSheetByName(TAB_DB);
  var last = db ? db.getLastRow() : 1;
  var rows = last > 1 ? db.getRange(2, 1, last - 1, DB_HEADERS.length).getValues() : [];

  var seen = {};
  var out = [];
  var skipped = 0;
  for (var i = 0; i < rows.length; i++) {
    var email = clean_(rows[i][2]).toLowerCase();
    var status = clean_(rows[i][7]);
    if (!isEmail_(email) || status === '수신거부' || seen[email]) { skipped++; continue; }
    seen[email] = true;
    out.push([email, clean_(rows[i][1]), status || '활성', clean_(rows[i][5])]);
  }

  var sh = getOrCreateTab_(ss, TAB_TARGET);
  sh.clear();
  sh.getRange(1, 1, 1, 4).setValues([['email', '이름', '상태', '유입경로']]);
  styleHeader_(sh, 4);
  sh.setFrozenRows(1);
  setWidths_(sh, [260, 110, 90, 340]);
  if (out.length) sh.getRange(2, 1, out.length, 4).setValues(out);

  var head = 'email' + (includeNames ? ',name' : '');
  var csv = head + '\n' + out.map(function (r) {
    return r[0] + (includeNames ? ',' + String(r[1] || '').replace(/[,\n\r]/g, ' ') : '');
  }).join('\n');

  Logger.log('맞춤타겟 ' + out.length + '명(제외 ' + skipped + ') — `' + TAB_TARGET + '` 탭에서 파일 > 다운로드 > CSV 로 저장하세요.');
  return csv;
}

/** 스프레드시트에 붙인(컨테이너 바인딩) 프로젝트에서만 메뉴가 보입니다. 스탠드얼론이면 편집기에서 함수를 실행하세요. */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('인피니티 퍼널')
      .addItem('대시보드 다시 만들기', 'rebuildDashboard')
      .addItem('메타 맞춤타겟 내보내기', 'exportMetaAudienceCsv')
      .addItem('시퀀스 한 번 점검', 'processSequence')
      .addToUi();
  } catch (err) {
    Logger.log('메뉴 없음(스탠드얼론 프로젝트): ' + err);
  }
}

function ensureSettingsRows_(sh) {
  var last = sh.getLastRow();
  var have = {};
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) {
      if (r[0]) have[String(r[0]).trim()] = true;
    });
  }
  var missing = DEFAULT_SETTINGS.filter(function (r) { return !have[r[0]]; });
  if (missing.length) {
    sh.getRange(sh.getLastRow() + 1, 1, missing.length, 2).setValues(missing);
    Logger.log('설정 항목 추가: ' + missing.map(function (r) { return r[0]; }).join(', '));
  }
}

function styleHeader_(sh, cols) {
  sh.getRange(1, 1, 1, cols)
    .setBackground('#111417')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setVerticalAlignment('middle');
  sh.setRowHeight(1, 32);
}

function setWidths_(sh, widths) {
  widths.forEach(function (w, i) {
    sh.setColumnWidth(i + 1, w);
  });
}

function installTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'processSequence') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processSequence').timeBased().everyHours(1).create();
}

/* ───────────────────────────── 폼 접수 ───────────────────────────── */

/**
 * 신청 폼 POST 수신.
 * 프런트는 text/plain 으로 JSON을 보냅니다(CORS 프리플라이트 회피). 일반 폼 인코딩도 받습니다.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, error: 'busy' });
  }
  try {
    var data = parsePayload_(e);

    if (data.website) return json_({ ok: true, skipped: 'spam' }); // 허니팟

    // 2단계 — /apply/ 상담·프로젝트 신청은 별도 탭에 받습니다.
    if (String(data.type || '').toLowerCase() === 'apply') return handleApply_(data);

    var name = clean_(data.name).slice(0, 40);
    var email = clean_(data.email).toLowerCase();
    var org = pick_(clean_(data.org), ORG_TYPES, '일반');
    var interest = pick_(clean_(data.interest), INTERESTS, '특강·워크숍');
    var source = clean_(data.source).slice(0, 300) || '직접 입력';
    var consent = clean_(data.consent);

    if (!name) return json_({ ok: false, error: 'name' });
    if (!isEmail_(email)) return json_({ ok: false, error: 'email' });
    if (consent !== 'Y') return json_({ ok: false, error: 'consent' });

    var ss = openSheet_();
    var db = ss.getSheetByName(TAB_DB);
    var rows = db.getLastRow() > 1 ? db.getRange(2, 1, db.getLastRow() - 1, DB_HEADERS.length).getValues() : [];

    var found = null;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][2]).toLowerCase() === email) {
        found = { row: i + 2, values: rows[i] };
        break;
      }
    }

    var now = new Date();
    var settings = getSettings_();

    if (found) {
      // 이미 신청한 이메일 — 중복 발송하지 않습니다.
      // 다만 수신거부했던 사람과 30일 시퀀스를 다 마친 사람이 다시 신청하면 1일차부터 재시작합니다(무한 루프).
      var prevStatus = String(found.values[7]);
      if (prevStatus === '수신거부' || prevStatus === '완료') {
        var againOrg = pick_(clean_(found.values[3]), ORG_TYPES, org);
        var againInterest = pick_(clean_(found.values[4]), INTERESTS, interest);
        var againCtx = {
          name: clean_(found.values[1]) || name,
          email: email,
          org: againOrg,
          interest: againInterest,
          settings: settings,
          unsubUrl: unsubUrl_(email)
        };
        db.getRange(found.row, 4).setValue(againOrg);
        db.getRange(found.row, 5).setValue(againInterest);
        db.getRange(found.row, 6).setValue(source);
        db.getRange(found.row, 7).setValue(1);
        db.getRange(found.row, 8).setValue('활성');
        db.getRange(found.row, 9).setValue(new Date());
        db.getRange(found.row, 10).setValue(withNote_(
          found.values[9],
          (prevStatus === '수신거부' ? '재신청(수신거부 해제) ' : '재시작(30일 완료 후) ') + stamp_(now)
        ));
        var againResult = '완료';
        try {
          sendStage_(1, againCtx);
        } catch (err) {
          againResult = '실패: ' + err;
          Logger.log('1일차 재시작 실패 ' + email + ' — ' + err);
        }
        log_(now, email, 1, '1일차 재시작', againResult);
        return json_({ ok: true, duplicate: true, revived: prevStatus === '수신거부', restarted: prevStatus === '완료' });
      }
      db.getRange(found.row, 10).setValue(withNote_(found.values[9], '중복 신청 ' + stamp_(now)));
      log_(now, email, 0, '중복 신청', '건너뜀');
      return json_({ ok: true, duplicate: true });
    }

    var token = unsubToken_(email);
    db.appendRow([
      now, name, email, org, interest, source, 1, '활성', '', 'token:' + token
    ]);
    var row = db.getLastRow();

    var ctx = {
      name: name,
      email: email,
      org: org,
      interest: interest,
      settings: settings,
      unsubUrl: unsubUrl_(email)
    };

    var sendResult = '실패';
    try {
      sendStage_(1, ctx);
      sendResult = '완료';
      db.getRange(row, 9).setValue(new Date());
    } catch (err) {
      sendResult = '실패: ' + err;
      db.getRange(row, 10).setValue(withNote_('token:' + token, '1일차 발송 실패 — 편집기에서 resendWelcome() 실행'));
      Logger.log('1일차 발송 실패 ' + email + ' — ' + err);
    }
    log_(new Date(), email, 1, '1일차 웰컴+스타터키트', sendResult);

    if (String(settings['관리자알림']).toUpperCase() === 'Y') {
      try {
        MailApp.sendEmail({
          to: settings['관리자메일'] || settings['회신주소'],
          subject: '[퍼널] 새 신청 — ' + name + ' · ' + org + ' · ' + interest,
          body: stamp_(now) + '\n\n이름: ' + name + '\n이메일: ' + email + '\n소속유형: ' + org +
                '\n관심분야: ' + interest + '\n유입경로: ' + source + '\n\n시트: ' + ss.getUrl()
        });
      } catch (err) {
        Logger.log('관리자 알림 실패: ' + err);
      }
    }

    return json_({ ok: true, stage: 1 });
  } catch (err) {
    Logger.log('doPost 오류: ' + err + ' / ' + (err && err.stack));
    return json_({ ok: false, error: 'server' });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 2단계 — 상담·프로젝트 신청 접수.
 * /apply/ 폼이 type:'apply' 로 보낸 내용을 상담신청 탭에 한 줄로 남기고 관리자에게 알립니다.
 * 신청자에게는 시퀀스 메일을 보내지 않습니다(이미 DB에 있는 사람이면 그 시퀀스가 따로 돕니다).
 */
function handleApply_(data) {
  var name = clean_(data.name).slice(0, 40);
  var email = clean_(data.email).toLowerCase();
  var phone = clean_(data.phone).slice(0, 30);
  var org = pick_(clean_(data.org), ORG_TYPES, '일반');
  var orgname = clean_(data.orgname).slice(0, 80);
  var track = pick_(clean_(data.track), TRACKS, '');
  var task = clean_(data.task).slice(0, 600);
  var metric = clean_(data.metric).slice(0, 120);
  var timing = clean_(data.timing).slice(0, 40);
  var budget = clean_(data.budget).slice(0, 60);
  var source = clean_(data.source).slice(0, 300) || '직접 입력';
  var consent = clean_(data.consent);

  if (!name) return json_({ ok: false, error: 'name' });
  if (!isEmail_(email)) return json_({ ok: false, error: 'email' });
  if (!phone) return json_({ ok: false, error: 'phone' });
  if (!track) return json_({ ok: false, error: 'track' });
  if (task.length < 10) return json_({ ok: false, error: 'task' });
  if (!timing) return json_({ ok: false, error: 'timing' });
  if (consent !== 'Y') return json_({ ok: false, error: 'consent' });

  var ss = openSheet_();
  var ap = ss.getSheetByName(TAB_APPLY) || getOrCreateTab_(ss, TAB_APPLY);
  if (ap.getLastRow() === 0) ap.getRange(1, 1, 1, APPLY_HEADERS.length).setValues([APPLY_HEADERS]);

  var now = new Date();
  var settings = getSettings_();

  var last = ap.getLastRow();
  var rows = last > 1 ? ap.getRange(2, 1, last - 1, APPLY_HEADERS.length).getValues() : [];
  var seen = 0;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][2]).toLowerCase() === email) seen++;
  }
  var memo = seen ? '재신청 ' + stamp_(now) + ' (' + seen + '번째 접수)' : '';

  ap.appendRow([now, name, email, phone, org, orgname, track, task, metric, timing, budget, source, '신규', memo]);
  log_(now, email, 'apply', '상담신청 — ' + track, '접수');

  if (String(settings['상담알림'] || 'Y').toUpperCase() === 'Y') {
    try {
      var lines = [
        stamp_(now) + ' 상담·프로젝트 신청이 들어왔습니다.',
        '',
        '이름: ' + name + (seen ? ' (재신청 ' + seen + '회)' : ''),
        '연락처: ' + phone,
        '이메일: ' + email,
        '소속: ' + org + (orgname ? ' / ' + orgname : ''),
        '희망 트랙: ' + track,
        '희망 시기: ' + timing,
        '예산 범위: ' + (budget || '미정'),
        '',
        '[가장 먼저 없애고 싶은 반복 업무]',
        task,
        '',
        '[지금 걸리는 시간]',
        metric || '미기재',
        '',
        '유입경로: ' + source,
        '시트: ' + ss.getUrl()
      ];
      MailApp.sendEmail({
        to: settings['관리자메일'] || settings['회신주소'],
        replyTo: email,
        subject: '[상담신청] ' + name + ' · ' + track + (orgname ? ' · ' + orgname : ''),
        body: lines.join('\n')
      });
    } catch (err) {
      Logger.log('상담 알림 실패: ' + err);
    }
  }

  return json_({ ok: true, apply: true, again: seen > 0 });
}

/**
 * 상태 확인(GET)과 수신거부 링크 처리.
 *   ?action=health  → { ok, count, apply }
 *   ?unsub=이메일&t=토큰 → 수신거부
 */
function doGet(e) {
  var p = (e && e.parameter) || {};

  if (p.unsub) {
    var email = String(p.unsub).toLowerCase();
    var okToken = String(p.t || '') === unsubToken_(email);
    if (!okToken) return html_('수신거부 링크가 올바르지 않습니다.', '링크가 잘렸거나 오래된 주소입니다. 이 메일에 그대로 회신해 주시면 직접 처리하겠습니다.');

    var ss = openSheet_();
    var db = ss.getSheetByName(TAB_DB);
    var last = db.getLastRow();
    var target = 0;
    if (last > 1) {
      var emails = db.getRange(2, 3, last - 1, 1).getValues();
      for (var i = 0; i < emails.length; i++) {
        if (String(emails[i][0]).toLowerCase() === email) { target = i + 2; break; }
      }
    }
    if (target) {
      db.getRange(target, 8).setValue('수신거부');
      log_(new Date(), email, 0, '수신거부', '완료');
    }
    return html_('수신거부가 완료되었습니다.', '이 주소로는 더 이상 안내 메일을 보내지 않습니다. 다시 받으시려면 사이트에서 같은 이메일로 신청하시면 됩니다.');
  }

  var ss = openSheet_();
  var db = ss.getSheetByName(TAB_DB);
  var ap = ss.getSheetByName(TAB_APPLY);
  return json_({
    ok: true,
    service: '인피니티퍼널',
    rows: Math.max(0, db.getLastRow() - 1),
    apply: ap ? Math.max(0, ap.getLastRow() - 1) : 0
  });
}

/* ───────────────────────────── 시퀀스 발송 ───────────────────────────── */

/**
 * 시간 기반 트리거(매시). 설정의 '시퀀스발송시각'(기본 9시)에만 실제로 발송합니다.
 * 접수 후 경과일에 따라 3 → 5 → 7 → 14 → 30일차 메일을 한 번씩 내보냅니다(STAGES).
 * 30일차를 내보낸 사람은 상태=완료로 바뀌고 자동 발송이 멈춥니다. 다시 신청하면 1일차부터 재시작합니다.
 */
function processSequence() {
  var settings = getSettings_();
  var sendHour = Number(settings['시퀀스발송시각'] || 9);
  var now = new Date();
  if (Number(Utilities.formatDate(now, TZ, 'H')) !== sendHour) return;

  var quota = MailApp.getRemainingDailyQuota();
  if (quota < 5) {
    Logger.log('메일 잔여 할당량 부족: ' + quota);
    return;
  }

  var ss = openSheet_();
  var db = ss.getSheetByName(TAB_DB);
  var last = db.getLastRow();
  if (last < 2) return;

  var values = db.getRange(2, 1, last - 1, DB_HEADERS.length).getValues();
  var sent = 0;

  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    if (String(r[7]) !== '활성') continue;
    if (!r[0]) continue;

    var joined = r[0] instanceof Date ? r[0] : new Date(r[0]);
    if (isNaN(joined.getTime())) continue;

    var days = Math.floor((startOfDay_(now) - startOfDay_(joined)) / 86400000);
    var stage = Number(r[6]) || 1;
    var next = nextStage_(stage, days);

    if (!next) continue;

    var ctx = {
      name: String(r[1]),
      email: String(r[2]),
      org: String(r[3]) || '일반',
      interest: String(r[4]) || '특강·워크숍',
      settings: settings,
      unsubUrl: unsubUrl_(String(r[2]))
    };

    try {
      sendStage_(next, ctx);
      db.getRange(i + 2, 7).setValue(next);
      db.getRange(i + 2, 9).setValue(new Date());
      if (next >= 30) db.getRange(i + 2, 8).setValue('완료');
      log_(new Date(), ctx.email, next, subjectOf_(next), '완료');
      sent++;
    } catch (err) {
      log_(new Date(), ctx.email, next, subjectOf_(next), '실패: ' + err);
      Logger.log('발송 실패 ' + ctx.email + ' ' + next + '일차 — ' + err);
    }

    if (sent >= 40) break; // 한 번에 너무 많이 내보내지 않습니다(스팸 평판 보호)
  }
}

function sendStage_(stage, ctx) {
  var mail = buildMail_(stage, ctx);
  MailApp.sendEmail({
    to: ctx.email,
    subject: mail.subject,
    htmlBody: mail.html,
    body: mail.text,
    name: ctx.settings['발신자이름'] || '김강훈',
    replyTo: ctx.settings['회신주소'] || undefined
  });
}

function subjectOf_(stage) {
  if (typeof subjectFor_ === 'function') return subjectFor_(stage);
  return '김강훈 · 바이브코딩 스타터 키트';
}

/**
 * 아직 보내지 않은 다음 단계 하나를 고릅니다. STAGES 는 MailTemplates.gs 의 [1,3,5,7,14,30].
 * 한 번에 한 단계만 내보냅니다 — 오랜 공백 뒤에 메일 5통이 몰려 나가지 않게 하기 위해서입니다.
 */
function nextStage_(current, days) {
  var stages = (typeof STAGES !== 'undefined' && STAGES.length) ? STAGES : [1, 3, 5, 7, 14, 30];
  for (var i = 0; i < stages.length; i++) {
    if (stages[i] > current && days >= stages[i]) return stages[i];
  }
  return 0;
}

/** 1일차 발송이 실패한 사람을 다시 보내려면 실행합니다. */
function resendWelcome() {
  var ss = openSheet_();
  var db = ss.getSheetByName(TAB_DB);
  var last = db.getLastRow();
  if (last < 2) return;
  var settings = getSettings_();
  var values = db.getRange(2, 1, last - 1, DB_HEADERS.length).getValues();
  var done = 0;
  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    if (String(r[7]) !== '활성') continue;
    if (r[8]) continue; // 최근발송이 있으면 이미 나감
    var ctx = { name: String(r[1]), email: String(r[2]), org: String(r[3]) || '일반', interest: String(r[4]) || '특강·워크숍', settings: settings, unsubUrl: unsubUrl_(String(r[2])) };
    try {
      sendStage_(1, ctx);
      db.getRange(i + 2, 9).setValue(new Date());
      log_(new Date(), ctx.email, 1, '1일차 재발송', '완료');
      done++;
    } catch (err) {
      Logger.log('재발송 실패 ' + ctx.email + ' — ' + err);
    }
  }
  Logger.log('재발송 ' + done + '건');
}

/** 특정 주소 한 명에게 원하는 단계의 메일을 미리 보냅니다(문구 확인용). */
function previewMail(email, stage) {
  var settings = getSettings_();
  var mail = buildMail_(Number(stage) || 1, {
    name: '미리보기',
    email: email || Session.getActiveUser().getEmail(),
    org: '센터·병원',
    interest: 'B2B 솔루션',
    settings: settings,
    unsubUrl: unsubUrl_(email || 'preview@example.com')
  });
  MailApp.sendEmail({
    to: email || Session.getActiveUser().getEmail(),
    subject: '[미리보기] ' + mail.subject,
    htmlBody: mail.html,
    body: mail.text,
    name: settings['발신자이름'] || '김강훈',
    replyTo: settings['회신주소'] || undefined
  });
}

/* ───────────────────────────── 도우미 ───────────────────────────── */

function openSheet_() {
  var id = PROP.getProperty(SHEET_ID_KEY);
  if (!id) throw new Error("시트가 연결되지 않았습니다. setup()을 먼저 실행하세요.");
  return SpreadsheetApp.openById(id);
}

function getSettings_() {
  var sh = openSheet_().getSheetByName(TAB_SET);
  var map = {};
  if (!sh || sh.getLastRow() < 2) {
    DEFAULT_SETTINGS.forEach(function (r) { map[r[0]] = r[1]; });
    return map;
  }
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    if (r[0]) map[String(r[0]).trim()] = r[1] === null || r[1] === undefined ? '' : String(r[1]).trim();
  });
  DEFAULT_SETTINGS.forEach(function (r) {
    if (map[r[0]] === undefined) map[r[0]] = r[1];
  });
  return map;
}

function log_(when, email, stage, subject, result) {
  try {
    var sh = openSheet_().getSheetByName(TAB_LOG);
    sh.appendRow([when, email, stage, subject, result]);
  } catch (err) {
    Logger.log('로그 실패: ' + err);
  }
}

function parsePayload_(e) {
  var raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
  var out = {};
  if (raw) {
    try {
      out = JSON.parse(raw);
    } catch (err) {
      raw.split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        out[decodeURIComponent(kv[0] || '')] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
      });
    }
  }
  var p = (e && e.parameter) || {};
  Object.keys(p).forEach(function (k) {
    if (out[k] === undefined) out[k] = p[k];
  });
  return out;
}

function clean_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function pick_(v, allowed, fallback) { return allowed.indexOf(v) >= 0 ? v : fallback; }
function isEmail_(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
function startOfDay_(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function stamp_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd HH:mm'); }
function withNote_(memo, note) {
  var m = clean_(memo);
  return m ? m + ' | ' + note : note;
}
function unsubToken_(email) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email.toLowerCase() + '|인피니티퍼널|skyman200');
  return digest.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('').slice(0, 24);
}
function unsubUrl_(email) {
  var base = ScriptApp.getService().getUrl();
  if (!base) return (getSettings_()['사이트주소'] || '') + 'starter-kit/';
  return base + '?unsub=' + encodeURIComponent(email.toLowerCase()) + '&t=' + unsubToken_(email);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function html_(title, message) {
  return HtmlService.createHtmlOutput(
    '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + title + '</title>' +
    '<body style="margin:0;background:#0a0a0a;color:#ecf1fa;font-family:-apple-system,BlinkMacSystemFont,system-ui,\'Segoe UI\',sans-serif;line-height:1.75">' +
    '<div style="max-width:520px;margin:16vh auto;padding:0 24px">' +
    '<p style="font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(236,241,250,.5);margin:0 0 16px">김강훈 · 인피니티퍼널</p>' +
    '<h1 style="font-size:1.4rem;font-weight:700;margin:0 0 14px">' + title + '</h1>' +
    '<p style="margin:0 0 22px;color:rgba(236,241,250,.8)">' + message + '</p>' +
    '<a href="https://skyman200.github.io/" style="color:#9db7ff;text-decoration:none;border-bottom:1px solid rgba(157,183,255,.4)">skyman200.github.io 로 돌아가기 →</a>' +
    '</div></body></html>'
  ).setTitle(title);
}
