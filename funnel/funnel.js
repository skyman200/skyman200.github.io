/* 인피니티 퍼널 — 신청 폼 제출 스크립트 (의존성 없음)
 *
 * 2단계 추가: 유입 랜딩(/go/) · 상담 필터(/apply/)
 *   - 폼의 data-funnel-type 으로 접수 종류를 구분합니다. (기본값 kit)
 *       <form data-funnel data-funnel-type="kit">   → 시트 DB + 1·3·5·7일차 메일
 *       <form data-funnel data-funnel-type="apply"> → 시트 상담신청 + 관리자 알림
 *   - 폼에 class="funnel--light" 를 주면 밝은 종이 배경용 색으로 바뀝니다.
 *   - 배포 후 아래 endpoint 에 Apps Script 웹앱 URL(.../exec)을 넣으면 접수가 시작됩니다.
 *     비워 두면 메일 앱으로 신청서를 보내는 방식으로 동작합니다(접수 누락 없음).
 */
window.FUNNEL_CONFIG = {
  endpoint: 'https://script.google.com/macros/s/AKfycbyOfmAtGcmRTj2_OwlcFkZ3NFmdR1of8JrgAN8y3xw7wZZCuoohNF7KK6vK0zIte3uC3Q/exec',
  fallbackEmail: 'cdi3477@dit.ac.kr',
  kitUrl: '/starter-kit/',
  applyUrl: '/apply/'
};

(function () {
  var cfg = window.FUNNEL_CONFIG || {};

  function typeOf(form) {
    return (form.getAttribute('data-funnel-type') || 'kit').toLowerCase();
  }

  function sourceOf() {
    var s = location.pathname + location.search;
    try {
      if (document.referrer) s += ' ← ' + new URL(document.referrer).host;
    } catch (e) {}
    return s.slice(0, 300);
  }

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  function isPhone(v) {
    var digits = String(v).replace(/[^0-9]/g, '');
    return digits.length >= 9 && digits.length <= 12;
  }

  function status(form, text, isError) {
    var el = form.querySelector('[data-funnel-status]');
    if (!el) return;
    el.hidden = false;
    el.className = 'funnel__status' + (isError ? ' funnel__status--error' : '');
    el.innerHTML = text;
  }

  function done(form, data, type) {
    var box = form.closest('[data-funnel-box]') || form;
    var mailLink = '<a href="mailto:' + cfg.fallbackEmail + '">' + cfg.fallbackEmail + '</a>';
    var html;

    if (type === 'apply') {
      html =
        '<div class="funnel__done">' +
        '<p class="funnel__done-kicker">접수 완료</p>' +
        '<p class="funnel__done-title">' + (data.name ? data.name + '님, 신청서가 접수되었습니다.' : '신청서가 접수되었습니다.') + '</p>' +
        '<p class="funnel__done-text">보내 주신 내용은 제가 직접 읽습니다. <b>영업일 기준 3일 안에</b> ' +
        (data.phone ? data.phone : data.email) + ' 로 회신드립니다. 회신에는 가능한 범위와 일정, 다음 순서만 적습니다.</p>' +
        '<p class="funnel__done-text funnel__done-text--muted">그동안 궁금한 점이나 급한 일정이 있으면 ' + mailLink + ' 로 메일 주시면 됩니다.</p>' +
        '<p class="funnel__done-action"><a class="funnel__submit" href="/starter-kit/">기다리는 동안 5일 실행팩 보기 →</a></p>' +
        '</div>';
    } else {
      html =
        '<div class="funnel__done">' +
        '<p class="funnel__done-kicker">접수 완료</p>' +
        '<p class="funnel__done-title">' + (data.name ? data.name + '님, 신청이 접수되었습니다.' : '신청이 접수되었습니다.') + '</p>' +
        '<p class="funnel__done-text">1일차 메일이 곧 도착합니다(<b>' + data.email + '</b>). ' +
        '기다리지 마시고 지금 바로 실행팩을 여셔도 됩니다.</p>' +
        '<p class="funnel__done-action"><a class="funnel__submit" href="' + cfg.kitUrl + '">5일 실행팩 열기 →</a></p>' +
        '<p class="funnel__note">메일이 10분 안에 오지 않으면 스팸함을 확인하시고, 그래도 없으면 ' +
        '<a href="mailto:' + cfg.fallbackEmail + '">' + cfg.fallbackEmail + '</a> 로 알려 주세요.</p>' +
        '</div>';
    }

    box.innerHTML = html;
  }

  function field(f, name) {
    var el = f[name];
    return el && el.value ? String(el.value).trim() : '';
  }

  function gather(form) {
    var f = form.elements;
    var type = typeOf(form);
    var data = {
      type: type,
      name: field(f, 'name'),
      email: field(f, 'email').toLowerCase(),
      org: field(f, 'org'),
      interest: field(f, 'interest'),
      consent: f.consent && f.consent.checked ? 'Y' : '',
      website: field(f, 'website'), // 허니팟
      source: sourceOf()
    };

    if (type === 'apply') {
      data.phone = field(f, 'phone');
      data.orgname = field(f, 'orgname');
      data.track = field(f, 'track');
      data.task = field(f, 'task');
      data.timing = field(f, 'timing');
      data.budget = field(f, 'budget');
      data.metric = field(f, 'metric');
    }
    return data;
  }

  function validate(form, data, type) {
    if (!data.name) return '이름을 입력해 주세요.';
    if (!isEmail(data.email)) return '이메일 주소를 확인해 주세요.';
    if (type === 'apply') {
      if (!isPhone(data.phone)) return '연락처를 숫자로 정확히 입력해 주세요.';
      if (!data.org) return '소속 유형을 골라 주세요.';
      if (!data.track) return '희망 트랙을 골라 주세요.';
      if (data.task.length < 10) return '가장 먼저 없애고 싶은 반복 업무를 한 줄로 적어 주세요. (10자 이상)';
      if (!data.timing) return '희망 시기를 골라 주세요.';
    }
    if (data.consent !== 'Y') return type === 'apply'
      ? '신청서 검토를 위한 개인정보 수집·이용에 동의해 주세요.'
      : '자료 발송을 위한 동의에 체크해 주세요.';
    return '';
  }

  function mailBody(data, type) {
    var lines = type === 'apply'
      ? [
          '이름: ' + data.name,
          '이메일: ' + data.email,
          '연락처: ' + data.phone,
          '소속유형: ' + data.org + (data.orgname ? ' (' + data.orgname + ')' : ''),
          '희망트랙: ' + data.track,
          '반복업무: ' + data.task,
          '지금 걸리는 시간: ' + (data.metric || '미기재'),
          '희망시기: ' + data.timing,
          '예산범위: ' + (data.budget || '미정'),
          '유입경로: ' + data.source,
          '',
          '상담·프로젝트 신청서를 보냅니다.'
        ]
      : [
          '이름: ' + data.name,
          '이메일: ' + data.email,
          '소속유형: ' + data.org,
          '관심분야: ' + data.interest,
          '유입경로: ' + data.source,
          '',
          '바이브코딩 실전 스타터 키트를 신청합니다.'
        ];
    return lines.join('\n');
  }

  function submitMailto(data, type) {
    location.href = 'mailto:' + cfg.fallbackEmail +
      '?subject=' + encodeURIComponent((type === 'apply' ? '상담 신청 — ' : '스타터 키트 신청 — ') + data.name) +
      '&body=' + encodeURIComponent(mailBody(data, type));
  }

  function bind(form) {
    var type = typeOf(form);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var data = gather(form);
      var problem = validate(form, data, type);
      if (problem) return status(form, problem, true);
      if (data.website) return; // 봇

      if (!cfg.endpoint) {
        status(form, '메일 앱이 열립니다. <b>보내기</b>만 누르시면 접수됩니다.');
        submitMailto(data, type);
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = '보내는 중…'; }
      status(form, '접수 중입니다…');

      fetch(cfg.endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      }).then(function () {
        done(form, data, type);
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = label; }
        status(form,
          '접수 연결에 실패했습니다. 잠시 뒤 다시 시도하시거나 ' +
          '<a href="mailto:' + cfg.fallbackEmail + '?subject=' + encodeURIComponent((type === 'apply' ? '상담 신청 — ' : '스타터 키트 신청 — ') + data.name) + '">메일로 신청</a>해 주세요.',
          true);
      });
    });
  }

  function init() {
    var forms = document.querySelectorAll('form[data-funnel]');
    for (var i = 0; i < forms.length; i++) bind(forms[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
