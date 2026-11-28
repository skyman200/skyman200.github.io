/**
 * 인피니티 퍼널 · 시퀀스 메일 4종 (1·3·5·7일차)
 * buildMail_(stage, ctx) → { subject, html, text }
 * subjectFor_(stage)      → 제목 한 줄 (Code.gs 로그·발송에서 함께 씀)
 *
 * 2단계 스팸 패치 (2026-11-28)
 *   - 버튼형 CTA 박스·색 블록·다수 링크를 걷어내고, 사람이 쓴 편지처럼 한 단으로 읽히게 바꿨습니다.
 *   - 링크는 메일당 2~3개(본문 링크 1~2 + 수신거부 1)로 줄이고, 링크 글자에 주소를 그대로 노출했습니다.
 *   - HTML과 같은 내용의 plain-text를 항상 함께 보냅니다(HTML 없는 사람에게도 같은 정보).
 *   - 제목의 대괄호·느낌표·과장어를 빼고, 보낸 사람 이름이 보이게 했습니다.
 *   문구를 고치려면 이 파일만 수정하면 됩니다. 숫자·링크는 실제 연재 기록과 맞춰 두었습니다.
 */

function buildMail_(stage, ctx) {
  if (stage === 1) return mailDay1_(ctx);
  if (stage === 3) return mailDay3_(ctx);
  if (stage === 5) return mailDay5_(ctx);
  if (stage === 7) return mailDay7_(ctx);
  return mailDay1_(ctx);
}

function subjectFor_(stage) {
  var map = {
    1: '신청하신 5일 실행팩입니다 — 김강훈',
    3: '3일차 · 759개 과목과 52개 학과 — 같은 일을 두 번 하지 않은 방법',
    5: '5일차 · 복사해서 쓰는 프롬프트 3개',
    7: '마지막 메일 · 이 방식이 맞지 않는 경우'
  };
  return map[Number(stage)] || '김강훈 · 바이브코딩 스타터 키트';
}

/* ───────────────────────── 공통 조각 ───────────────────────── */

var INK = '#161616';
var SOFT = '#35352d';
var MUTED = '#5f6368';
var LINK = '#1b4fd8';
var RULE = '#e6e3db';

function esc_(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function p_(html) {
  return '<p style="margin:0 0 15px;font-size:16px;line-height:1.78;color:' + INK + '">' + html + '</p>';
}
function small_(html) {
  return '<p style="margin:0 0 12px;font-size:14px;line-height:1.72;color:' + MUTED + '">' + html + '</p>';
}
function h_(text) {
  return '<p style="margin:26px 0 10px;font-size:16px;line-height:1.6;font-weight:700;color:' + INK + '">' + esc_(text) + '</p>';
}
function a_(href, text) {
  return '<a href="' + href + '" style="color:' + LINK + ';text-decoration:underline">' + esc_(text) + '</a>';
}
function rule_() {
  return '<p style="margin:24px 0;border-top:1px solid ' + RULE + ';font-size:0;line-height:0">&nbsp;</p>';
}
function list_(items) {
  return '<ul style="margin:0 0 16px;padding-left:19px;color:' + INK + ';font-size:16px;line-height:1.78">' +
    items.map(function (t) { return '<li style="margin:0 0 8px">' + t + '</li>'; }).join('') + '</ul>';
}
function quote_(html) {
  return '<p style="margin:0 0 16px;padding:2px 0 2px 14px;border-left:2px solid #cfccc1;font-size:15px;line-height:1.78;color:' + SOFT + '">' + html + '</p>';
}
/** 링크 한 줄 — 글자에 주소를 그대로 보여 줍니다(스팸 필터가 싫어하는 '버튼형 링크'를 피합니다). */
function linkLine_(url, label, note) {
  return '<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:' + INK + '">' +
    (label ? esc_(label) + '<br>' : '') +
    '<a href="' + url + '" style="color:' + LINK + ';text-decoration:underline;word-break:break-all">' + esc_(url) + '</a>' +
    (note ? '<br><span style="font-size:14px;color:' + MUTED + '">' + note + '</span>' : '') +
    '</p>';
}
function code_(text) {
  return '<pre style="margin:0 0 16px;padding:13px 15px;background:#f7f6f2;border:1px solid ' + RULE + ';color:' + INK +
    ';font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;line-height:1.7;white-space:pre-wrap;word-break:break-word">' + esc_(text) + '</pre>';
}

function wrap_(ctx, subject, preheader, content) {
  var s = ctx.settings || {};
  var unsub = ctx.unsubUrl || (s['사이트주소'] || 'https://skyman200.github.io/');
  var site = s['사이트주소'] || 'https://skyman200.github.io/';
  var reply = s['회신주소'] || '';
  return '' +
  '<!doctype html><html lang="ko"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc_(subject) + '</title></head>' +
  '<body style="margin:0;padding:0;background:#ffffff;">' +
  '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">' + esc_(preheader) + '</div>' +
  '<div style="max-width:560px;margin:0 auto;padding:34px 22px 30px;' +
  'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',system-ui,\'Malgun Gothic\',sans-serif;color:' + INK + ';line-height:1.78">' +
  '<p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:' + MUTED + '">김강훈 · 동의과학대학교 물리치료과</p>' +
  content +
  '<p style="margin:26px 0 0;font-size:16px;line-height:1.7;color:' + INK + '">김강훈</p>' +
  '<p style="margin:2px 0 0;font-size:13px;line-height:1.7;color:' + MUTED + '">동의과학대학교 물리치료과 교수·학과장<br>DIT AI 허브센터 팀장</p>' +
  '<p style="margin:8px 0 0;font-size:13px;line-height:1.7;color:' + MUTED + '">' + a_(site, site.replace(/^https?:\/\//, '').replace(/\/$/, '')) +
  (reply ? ' · ' + esc_(reply) : '') + '</p>' +
  '<p style="margin:24px 0 0;padding-top:14px;border-top:1px solid ' + RULE + ';font-size:12px;line-height:1.75;color:#8a8d91">' +
  '이 메일은 skyman200.github.io 에서 자료를 신청하신 분께 보냈습니다. 더 받지 않으시려면 ' +
  a_(unsub, '수신거부') + ' 를 누르시거나 이 메일에 그대로 회신해 주세요.</p>' +
  '</div></body></html>';
}

function interestLine_(ctx) {
  var i = ctx.interest || '';
  if (i === '구축 외주') return '업무 하나를 골라 2~4주 안에 실제로 돌아가는 형태로 만드는 일을 하고 있습니다. 이번 주에 하고 싶은 업무가 정해져 있다면 이 메일에 한 줄로 알려 주세요.';
  if (i === 'B2B 솔루션') return '센터·병원에서 쓰는 예약·기록·매출 대시보드를 실제로 납품하는 형태도 하고 있습니다. 지금 쓰는 프로그램과 불편한 지점을 알려 주시면 그 자리부터 보겠습니다.';
  return '기관·대학 연수는 90분 실습형(참석자 각자가 자기 업무용 앱 하나를 배포하고 끝냅니다)으로 진행합니다. 일정과 인원만 정해 주시면 그에 맞춰 구성을 짭니다.';
}

/* ───────────────────────── 1일차 ───────────────────────── */

function mailDay1_(ctx) {
  var name = ctx.name || '선생님';
  var s = ctx.settings || {};
  var kit = s['스타터키트주소'] || 'https://skyman200.github.io/starter-kit/';
  var site = s['사이트주소'] || 'https://skyman200.github.io/';
  var subject = subjectFor_(1);

  var body = '' +
    p_(esc_(name) + '님, 안녕하세요. 김강훈입니다. 신청해 주셔서 고맙습니다.') +
    p_('보내드리는 것은 강의자료가 아니라 <b>실행표</b>입니다. 읽고 나서 "좋네요"로 끝나는 문서를 만들지 않으려고, 하루 15~30분씩 5일로 잘라 두었습니다.') +
    linkLine_(kit, '5일 실행팩', '5일 실행표 · Apps Script 템플릿 4종 · 프롬프트 12개 · 배포 전 체크리스트 10문항') +
    rule_() +
    h_('오늘 15분 — 반복 업무 하나를 한 문장으로') +
    p_('첫날 할 일은 코드를 만지는 게 아닙니다. 지금 손으로 반복하는 일 하나를 아래 형식의 한 문장으로 적는 것입니다.') +
    quote_('<b>누가 · 무엇을 · 얼마나 자주</b><br>' +
      '예: "매 학기 37개 학과 강의계획서를 열어, AI 관련 내용이 4주 이상 들어갔는지 눈으로 센다."<br>' +
      '예: "전화 예약을 수첩에 옮겨 적고, 오늘 오기로 한 사람을 아침에 다시 확인한다."') +
    p_('이 문장이 없으면 AI는 예쁜 쓰레기를 만듭니다. 반대로 이 문장이 있으면 AI가 만든 것이 맞는지 아닌지를 본인이 판정할 수 있습니다. 자동화의 품질은 모델이 아니라 <b>판정 기준</b>에서 갈립니다.') +
    rule_() +
    h_('왜 체크리스트부터 넣었나 — 지난주에 8시간을 태운 이야기') +
    p_('지난주에 학과 협업 캘린더를 데스크톱 앱으로 감싸 배포하려고 했습니다. 8시간 53분 동안 커밋 30개, 태그 16개를 만들었고, 16번째 태그에서 그 앱을 스스로 부쉈습니다. 마지막 버전은 25줄을 더하고 619줄을 지웠습니다. 첫 커밋 하나가 전체 삽입의 94.2%였고, 진짜 기능은 밤 11시에 시작됐습니다.') +
    linkLine_(site + 'vibe-coding/physio-dashboard/', '그 하룻밤의 계측 (21편)', '무엇을 잘못했고, 어디서 회수했는지까지 적어 두었습니다.') +
    p_('AI는 대신 만들어 주지만 대신 책임지지는 않습니다. 그래서 키트의 마지막 장에 <b>배포 전 체크리스트 10문항</b>을 넣었습니다. 이 10문항이 그 8시간을 아껴 줄 겁니다.') +
    rule_() +
    h_('3일 뒤에 보내드릴 것') +
    p_('실제로 돌아가고 있는 시스템 두 개를 숫자로 보여 드립니다. 759개 과목을 5일 만에 처리한 강의계획서 점검, 52개 학과가 같은 양식 보고서를 마감 안에 낸 이야기입니다.') +
    p_('<b>오늘은 한 문장만 적어 두시면 됩니다.</b> 답장으로 그 문장을 보내 주셔도 됩니다.') +
    small_(interestLine_(ctx));

  var text = [
    name + '님, 안녕하세요. 김강훈입니다. 신청해 주셔서 고맙습니다.',
    '',
    '보내드리는 것은 강의자료가 아니라 실행표입니다. 하루 15~30분씩 5일로 잘라 두었습니다.',
    '',
    '5일 실행팩: ' + kit,
    '(5일 실행표 · Apps Script 템플릿 4종 · 프롬프트 12개 · 배포 전 체크리스트 10문항)',
    '',
    '[오늘 15분] 반복 업무 하나를 한 문장으로',
    '누가 · 무엇을 · 얼마나 자주',
    '예: 매 학기 37개 학과 강의계획서를 열어 AI 관련 내용이 4주 이상 들어갔는지 눈으로 센다.',
    '예: 전화 예약을 수첩에 옮겨 적고, 오늘 오기로 한 사람을 아침에 다시 확인한다.',
    '',
    '이 문장이 없으면 AI는 예쁜 쓰레기를 만듭니다. 자동화의 품질은 판단 기준에서 갈립니다.',
    '',
    '[왜 체크리스트부터 넣었나]',
    '지난주 학과 협업 캘린더를 데스크톱 앱으로 감싸려고 8시간 53분, 커밋 30개, 태그 16개를 썼고 16번째 태그에서 스스로 부쉈습니다. 마지막 버전은 +25/−619줄, 첫 커밋이 전체 삽입의 94.2%.',
    '그 기록: ' + site + 'vibe-coding/physio-dashboard/',
    '',
    'AI는 대신 만들어 주지만 대신 책임지지는 않습니다. 그래서 키트 마지막 장에 배포 전 체크리스트 10문항을 넣었습니다.',
    '',
    '3일 뒤에는 759개 과목, 52개 학과 사례를 숫자로 보내드립니다.',
    '오늘은 한 문장만 적어 두세요. 답장으로 보내 주셔도 됩니다.',
    '',
    interestLine_(ctx),
    '',
    '김강훈',
    '동의과학대학교 물리치료과 교수·학과장 / DIT AI 허브센터 팀장',
    site,
    '',
    '이 메일은 skyman200.github.io 에서 자료를 신청하신 분께 보냈습니다.',
    '더 받지 않으시려면 이 메일에 회신하시거나 아래 주소를 열어 주세요.',
    ctx.unsubUrl || ''
  ].join('\n');

  return { subject: subject, html: wrap_(ctx, subject, '오늘 15분, 반복 업무 하나를 한 문장으로. 5일 실행팩 주소 포함.', body), text: text };
}

/* ───────────────────────── 3일차 ───────────────────────── */

function mailDay3_(ctx) {
  var name = ctx.name || '선생님';
  var s = ctx.settings || {};
  var site = s['사이트주소'] || 'https://skyman200.github.io/';
  var subject = subjectFor_(3);

  var univ = '' +
    h_('① 37개 학과 759개 과목 — 5일') +
    p_('강의계획서에 AI 관련 내용이 4주 이상 들어갔는지 확인해야 했습니다. 759개 파일을 열어 눈으로 세는 일이었습니다. 판정 기준을 코드로 먼저 옮기고, 미비한 과목만 다시 보게 만들었습니다. 확정은 사람이 누르고, 확정본만 PDF로 남습니다.') +
    linkLine_(site + 'vibe-coding/syllabus/', '4편 · 37개 학과 759개 과목을 5일 만에 바꾼 방법', '무엇을 먼저 정했는지, 어디서 틀렸는지까지 적어 두었습니다.') +
    h_('② 52개 학과 결과보고서 — 마감 안에') +
    p_('52개 학과가 같은 양식의 보고서를 같은 날까지 내야 했습니다. 새 양식을 만들지 않고, 완성된 한 부를 <b>골든 템플릿</b>으로 세워 글자와 표 행만 갈아끼웠습니다. 커밋 30개, 355개 파일, 36,472줄. 162개 표 가운데 행을 늘릴 수 있는 것은 63개(38.9%)뿐이었고, 그 63개만 프로그램이 만지게 했습니다.') +
    p_('숫자는 AI에게 맡기지 않았습니다. 숫자를 만드는 순간 보고서는 거짓말이 됩니다.') +
    linkLine_(site + 'vibe-coding/curriculum-report/', '20편 · 표 162개, 행을 늘릴 수 있는 건 63개뿐');

  var center = '' +
    h_('① 예약·기록 — 센터의 병목은 대개 여기입니다') +
    p_('센터에서 시간을 잡아먹는 것은 상담이 아니라 기록과 알림입니다. 실습일지·SOAP 기록·터치 서명·루브릭 학점을 한 줄기로 묶은 PT SMART를 43일 동안 프롬프트 164개로 만들었습니다. 1,084개 검사 DB가 SOAP의 O 문장을 만들고, 병원 담당자는 계정 없이 서명만 합니다.') +
    linkLine_(site + 'vibe-coding/pt-smart/', '8편 · 흩어진 임상실습을 한 줄기로', '역할 3개 구조가 핵심이었습니다.') +
    h_('② 입구에서 90초 — 직원 손을 덜어 준 것') +
    p_('센터 입구에서 정면·옆모습·1분 스쿼트를 90초에 재고 결과는 QR로 넘기는 키오스크를 만들었습니다. Rust 측정 엔진과 Go 서버로 20시간 32분, 33커밋. 어려운 부분은 측정이 아니라 <b>프레임을 남기지 않는 설계</b>였습니다.') +
    linkLine_(site + 'vibe-coding/bodyscan/', '13편 · 90초 바디 스캔 키오스크', '카메라 기울기 4.7°를 자동으로 잡은 이야기까지.');

  var first = ctx.org === '센터·병원' ? center : univ;
  var second = ctx.org === '센터·병원' ? univ : center;

  var body = '' +
    p_(esc_(name) + '님, 3일째입니다. 오늘은 사례를 숫자로 보여 드립니다.') +
    p_('공통점은 하나입니다. <b>사람이 판정하고, 프로그램이 반복한다.</b> 이 순서를 뒤집으면 자동화가 아니라 사고가 됩니다.') +
    rule_() +
    first +
    rule_() +
    h_('다른 쪽 현장에서도 같은 구조였습니다') +
    second +
    rule_() +
    h_('오늘 30분 — 측정부터') +
    p_('시트 하나에 열 5개만 만드세요. 날짜, 대상, 걸린 시간, 누가 했는지, 결과. 그리고 최근 3일치를 손으로 채웁니다.') +
    p_('측정하지 않고 자동화하면 <b>없는 문제를 아주 정교하게 푸는</b> 일이 됩니다. 8시간을 태운 제가 그랬습니다.') +
    p_('5일째에는 실제 프롬프트 문장과 구축 화면을 보내드립니다.') +
    small_(interestLine_(ctx));

  var text = [
    name + '님, 3일째입니다. 오늘은 사례를 숫자로 보여 드립니다.',
    '공통점은 하나입니다. 사람이 판정하고, 프로그램이 반복합니다.',
    '',
    (ctx.org === '센터·병원' ? '① 예약·기록 — PT SMART, 43일·프롬프트 164개·검사 DB 1,084개' : '① 37개 학과 759개 과목 — 판정 기준을 코드로 먼저 옮겼습니다. 5일'),
    (ctx.org === '센터·병원' ? '   ' + site + 'vibe-coding/pt-smart/' : '   ' + site + 'vibe-coding/syllabus/'),
    (ctx.org === '센터·병원' ? '② 입구에서 90초 — 바디스캔 키오스크, Rust+Go 20시간 32분·33커밋' : '② 52개 학과 결과보고서 — 골든 템플릿, 30커밋·355파일·36,472줄, 162개 표 중 63개만 행 확장'),
    (ctx.org === '센터·병원' ? '   ' + site + 'vibe-coding/bodyscan/' : '   ' + site + 'vibe-coding/curriculum-report/'),
    '',
    '[오늘 30분] 시트 하나, 열 5개, 최근 3일치를 손으로 채우기',
    '측정 없이 자동화하면 없는 문제를 정교하게 풉니다.',
    '',
    '5일째에는 실제 프롬프트와 구축 화면을 보내드립니다.',
    '',
    interestLine_(ctx),
    '',
    '김강훈',
    '동의과학대학교 물리치료과 교수·학과장 / DIT AI 허브센터 팀장',
    site,
    '',
    '이 메일은 skyman200.github.io 에서 자료를 신청하신 분께 보냈습니다.',
    '더 받지 않으시려면 이 메일에 회신하시거나 아래 주소를 열어 주세요.',
    ctx.unsubUrl || ''
  ].join('\n');

  return { subject: subject, html: wrap_(ctx, subject, '사람이 판정하고, 프로그램이 반복한다 — 759개 과목과 52개 학과 사례.', body), text: text };
}

/* ───────────────────────── 5일차 ───────────────────────── */

function mailDay5_(ctx) {
  var name = ctx.name || '선생님';
  var s = ctx.settings || {};
  var site = s['사이트주소'] || 'https://skyman200.github.io/';
  var kit = s['스타터키트주소'] || 'https://skyman200.github.io/starter-kit/';
  var video = (s['5일차영상주소'] || '').trim();
  var subject = subjectFor_(5);

  var videoBlock = video
    ? h_('오늘의 영상 — 처음부터 끝까지 구축하는 화면') +
      p_('말로 설명한 것과 실제로 화면에서 일어나는 일은 다릅니다. 한 업무를 골라 처음부터 배포까지 가는 과정을 그대로 찍었습니다. 1~2시간 분량이고, 배속으로 보셔도 됩니다.') +
      linkLine_(video, '구축 전 과정 보기') +
      rule_()
    : h_('오늘의 영상 — 준비 중입니다') +
      p_('구축 전 과정을 한 편의 긴 영상으로 찍고 있습니다. 아직 올리지 못했습니다. 대신 같은 지점을 글로 보실 수 있게 다섯 편을 골라 두었습니다 — 4편(759개 과목), 20편(52개 학과 보고서), 8편(PT SMART), 13편(바디스캔), 21편(8시간 53분의 실패).') +
      linkLine_(site + 'vibe-coding/', '연재 전편 목록') +
      p_('영상이 올라가면 이 자리에 링크가 들어갑니다.') +
      rule_();

  var body = '' +
    p_(esc_(name) + '님, 5일째입니다. 오늘은 그대로 복사해서 쓰는 문장을 드립니다.') +
    p_('제가 쓰는 프롬프트는 길지 않습니다. 대신 <b>판정 기준</b>이 들어 있습니다. 기준 없는 지시는 AI를 성실한 낭비꾼으로 만듭니다.') +
    rule_() +
    h_('프롬프트 1 — 병목 정의 (첫 10분)') +
    code_('나는 [소속]에서 [업무]를 맡고 있다.\n지금 이 업무는 [누가] [무엇을] [얼마나 자주] 반복한다.\n한 번 처리하는 데 [분]이 걸리고, 실수하면 [결과]가 난다.\n\n이 업무를 자동화하려고 한다. 바로 코드를 쓰지 말고, 먼저 다음 3개를 물어봐라.\n1) 이 업무에서 사람이 반드시 판정해야 하는 지점은 어디인가\n2) 자동화하면 안 되는 부분은 무엇인가\n3) 무엇을 측정하면 개선됐는지 알 수 있는가\n내 답을 받은 뒤에 설계를 제안해라.') +
    h_('프롬프트 2 — 데이터 구조 (둘째 날)') +
    code_('이 업무에 필요한 데이터를 구글 시트 한 장으로 설계해라.\n조건:\n- 열은 8개 이하\n- 사람이 손으로 채우는 열과 프로그램이 채우는 열을 구분해서 표시\n- 날짜·시간 열은 시간대를 Asia/Seoul로 고정\n- 중복 판정에 쓸 열을 하나 정하고 이유를 설명\n먼저 표로 보여주고, 내가 승인한 뒤에만 Apps Script 코드를 써라.') +
    h_('프롬프트 3 — 검증 (배포 전)') +
    code_('아래 코드를 배포하기 전에, 이 코드가 조용히 잘못될 수 있는 경우를 10개 찾아라.\n각 항목마다 (1) 어떤 입력에서 (2) 무엇이 잘못되고 (3) 사용자는 그것을 알아챌 수 있는지 적어라.\n그 다음, 그 10개 중 실제로 확인할 수 있는 것만 골라 테스트 코드를 써라.\n"문제 없습니다"라고 먼저 말하지 마라.') +
    rule_() +
    videoBlock +
    h_('오늘 30분 — 배포 전 체크리스트 10문항') +
    p_('키트 마지막 장에 있는 10문항에 답해 보세요. 8개 이상 "예"가 나오지 않으면 배포하지 않는 편이 낫습니다. 저는 그 10문항을 만들기 전에 8시간을 태웠습니다.') +
    linkLine_(kit, '체크리스트가 들어 있는 5일 실행팩', 'PDF로 저장해 인쇄해 두시면 편합니다.') +
    p_('7일째에 마지막 메일을 보냅니다. 좋은 말이 아니라, <b>이 방식이 맞지 않는 경우</b>를 먼저 적어 보내겠습니다.') +
    small_(interestLine_(ctx));

  var text = [
    name + '님, 5일째입니다. 오늘은 그대로 복사해서 쓰는 문장을 드립니다.',
    '제 프롬프트는 길지 않습니다. 대신 판정 기준이 들어 있습니다.',
    '',
    '[프롬프트 1 — 병목 정의]',
    '나는 [소속]에서 [업무]를 맡고 있다. 지금 이 업무는 [누가] [무엇을] [얼마나 자주] 반복한다.',
    '한 번 처리하는 데 [분]이 걸리고, 실수하면 [결과]가 난다.',
    '바로 코드를 쓰지 말고 1) 사람이 판정할 지점 2) 자동화하면 안 되는 부분 3) 개선 측정 지표를 먼저 물어봐라.',
    '',
    '[프롬프트 2 — 데이터 구조]',
    '구글 시트 한 장, 열 8개 이하, 손으로 채우는 열과 프로그램이 채우는 열 구분, Asia/Seoul 고정, 중복 판정 열 1개와 이유. 표를 먼저 보여주고 승인 뒤에 코드.',
    '',
    '[프롬프트 3 — 검증]',
    '배포 전에 조용히 잘못될 경우 10개를 찾고, 각각 (입력/증상/사용자가 알 수 있는지)를 적은 뒤, 확인 가능한 것만 테스트 코드로 써라.',
    '',
    video ? '[영상] ' + video : '[영상] 구축 전 과정 영상을 준비 중입니다. 그동안 전편 목록: ' + site + 'vibe-coding/',
    '',
    '[오늘 30분] 배포 전 체크리스트 10문항 — 5일 실행팩: ' + kit,
    '8개 이상 "예"가 아니면 배포하지 마세요.',
    '',
    '7일째에는 이 방식이 맞지 않는 경우를 먼저 적어 보내겠습니다.',
    '',
    interestLine_(ctx),
    '',
    '김강훈',
    '동의과학대학교 물리치료과 교수·학과장 / DIT AI 허브센터 팀장',
    site,
    '',
    '이 메일은 skyman200.github.io 에서 자료를 신청하신 분께 보냈습니다.',
    '더 받지 않으시려면 이 메일에 회신하시거나 아래 주소를 열어 주세요.',
    ctx.unsubUrl || ''
  ].join('\n');

  return { subject: subject, html: wrap_(ctx, subject, '복사해서 쓰는 프롬프트 3개와 배포 전 체크리스트 10문항.', body), text: text };
}

/* ───────────────────────── 7일차 ───────────────────────── */

function mailDay7_(ctx) {
  var name = ctx.name || '선생님';
  var s = ctx.settings || {};
  var site = s['사이트주소'] || 'https://skyman200.github.io/';
  var diag = s['7일차진단주소'] || (site + 'starter-kit/#diagnosis');
  var subject = subjectFor_(7);

  var body = '' +
    p_(esc_(name) + '님, 오늘로 일곱 번째이자 마지막 메일입니다.') +
    p_('세일즈 메일에서 흔히 "마지막 기회"라고 합니다. 저는 반대로 쓰겠습니다. <b>지금 이 방식이 맞지 않는 경우</b>를 먼저 적습니다. 시간을 아끼시는 데 도움이 되면 좋겠습니다.') +
    rule_() +
    h_('이 키트를 접으셔도 되는 신호') +
    list_([
      '지난 6일 동안 시트를 한 번도 열지 않으셨다. — 의지의 문제가 아닙니다. 지금 업무에서 이 일이 우선순위가 아니라는 뜻입니다.',
      '결정권자가 따로 있어서, 승인 없이 시트 하나도 만들 수 없다. — 자동화는 권한이 있는 사람이 직접 만들 때 가장 빠릅니다.',
      '한 달 안에 성과를 내야 하는데, 지금 반복 업무를 정리할 여유가 없다. — 이 경우 도구가 아니라 사람이 먼저 필요합니다.'
    ]) +
    p_('세 가지 중 하나라도 해당되면, 지금은 도입하지 마세요. 대신 나중에 필요해질 때를 위해 이 메일만 남겨 두시면 됩니다.') +
    rule_() +
    h_('반대로, 두 가지 이상 해당되면 — 사전 진단을 권합니다') +
    list_([
      '반복 업무가 이미 한 문장으로 적혀 있고, 얼마나 걸리는지 숫자로 말할 수 있다.',
      '시트나 문서를 직접 만들 수 있는 권한이 있다.',
      '한 번 만든 것이 매 학기·매달 다시 쓰인다.'
    ]) +
    p_('이 세 가지가 맞으면, 5일 실행팩을 끝까지 가는 편이 좋습니다. 어디서 막히실지 먼저 확인할 수 있게 <b>사전 진단 5문항</b>을 만들어 두었습니다. 3분이면 끝나고, 결과는 그 자리에서 바로 나옵니다.') +
    linkLine_(diag, '사전 진단 5문항 (3분)', '가입도 결제도 없습니다. 결과는 브라우저에서 바로 계산됩니다.') +
    rule_() +
    h_('앞으로 이 주소로 보내는 것') +
    p_('7일 시퀀스는 여기서 끝입니다. 앞으로는 새 실전기가 나올 때만, 한 달에 한두 번 보내겠습니다. 그 사이에 궁금한 것이 생기면 이 메일에 그대로 회신해 주세요.') +
    p_('7일 동안 읽어 주셔서 고맙습니다. 연재는 계속 쌓이고 있습니다.') +
    linkLine_(site + 'vibe-coding/', '바이브 코딩 실전기 전편') +
    small_(interestLine_(ctx));

  var text = [
    name + '님, 오늘로 일곱 번째이자 마지막 메일입니다.',
    '',
    '세일즈 메일은 보통 "마지막 기회"라고 합니다. 저는 반대로, 지금 이 방식이 맞지 않는 경우를 먼저 적습니다.',
    '',
    '[접으셔도 되는 신호]',
    '1. 지난 6일 동안 시트를 한 번도 열지 않으셨다 — 우선순위가 아니라는 뜻입니다.',
    '2. 결정권자가 따로 있어 승인 없이 시트 하나도 못 만든다 — 권한 있는 사람이 직접 만들 때 가장 빠릅니다.',
    '3. 한 달 안에 성과를 내야 해서 반복 업무를 정리할 여유가 없다 — 도구가 아니라 사람이 먼저 필요합니다.',
    '하나라도 해당되면 지금은 도입하지 마세요. 이 메일만 남겨 두시면 됩니다.',
    '',
    '[두 가지 이상 해당되면]',
    '반복 업무가 한 문장으로 적혀 있고 / 시트를 만들 권한이 있고 / 매 학기 다시 쓰인다',
    '→ 사전 진단 5문항(3분): ' + diag,
    '',
    '7일 시퀀스는 여기서 끝입니다. 앞으로는 새 실전기가 나올 때만 한 달에 한두 번 보내겠습니다.',
    '궁금한 점은 이 메일에 회신해 주세요. 연재 전편: ' + site + 'vibe-coding/',
    '',
    interestLine_(ctx),
    '',
    '김강훈',
    '동의과학대학교 물리치료과 교수·학과장 / DIT AI 허브센터 팀장',
    site,
    '',
    '이 메일은 skyman200.github.io 에서 자료를 신청하신 분께 보냈습니다.',
    '더 받지 않으시려면 이 메일에 회신하시거나 아래 주소를 열어 주세요.',
    ctx.unsubUrl || ''
  ].join('\n');

  return { subject: subject, html: wrap_(ctx, subject, '맞지 않는 경우를 먼저 적었습니다. 3분 사전 진단 포함.', body), text: text };
}
