/* 인피니티 퍼널 1단계 — 신청 폼 제출 스크립트 (의존성 없음)
 *
 * 배포 후 아래 endpoint 에 Apps Script 웹앱 URL(.../exec)을 넣으면 시트 접수 + 자동 메일이 시작됩니다.
 * 비워 두면 메일 앱으로 신청서를 보내는 방식으로 동작합니다(접수 누락 없음).
 */
window.FUNNEL_CONFIG = {
  endpoint: '',
  fallbackEmail: 'cdi3477@dit.ac.kr',
  kitUrl: '/starter-kit/'
};

(function () {
  var cfg = window.FUNNEL_CONFIG || {};

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

  function status(form, text, isError) {
    var el = form.querySelector('[data-funnel-status]');
    if (!el) return;
    el.hidden = false;
    el.className = 'funnel__status' + (isError ? ' funnel__status--error' : '');
    el.innerHTML = text;
  }

  function done(form, data) {
    var box = form.closest('[data-funnel-box]') || form;
    var html =
      '<p class="funnel__label">접수 완료</p>' +
      '<p style="margin:0 0 10px;font-size:1.05rem;font-weight:700;color:#ecf1fa;line-height:1.5">' +
      (data.name ? data.name + '님, 신청이 접수되었습니다.' : '신청이 접수되었습니다.') + '</p>' +
      '<p style="margin:0 0 16px;font-size:.94rem;line-height:1.75;color:rgba(236,241,250,.75);word-break:keep-all">' +
      '1일차 메일이 곧 도착합니다(<b style="color:#ecf1fa">' + data.email + '</b>). ' +
      '기다리지 마시고 지금 바로 실행팩을 여셔도 됩니다.</p>' +
      '<p style="margin:0"><a class="funnel__submit" href="' + cfg.kitUrl + '" style="text-decoration:none">5일 실행팩 열기 →</a></p>' +
      '<p class="funnel__note">메일이 10분 안에 오지 않으면 스팸함을 확인하시고, 그래도 없으면 ' +
      '<a href="mailto:' + cfg.fallbackEmail + '" style="color:rgba(157,183,255,.9)">' + cfg.fallbackEmail + '</a> 로 알려 주세요.</p>';
    box.innerHTML = html;
  }

  function gather(form) {
    var f = form.elements;
    return {
      name: (f.name && f.name.value || '').trim(),
      email: (f.email && f.email.value || '').trim().toLowerCase(),
      org: (f.org && f.org.value || '').trim(),
      interest: (f.interest && f.interest.value || '').trim(),
      consent: (f.consent && f.consent.checked) ? 'Y' : '',
      website: (f.website && f.website.value || '').trim(), // 허니팟
      source: sourceOf()
    };
  }

  function submitMailto(data) {
    var body = [
      '이름: ' + data.name,
      '이메일: ' + data.email,
      '소속유형: ' + data.org,
      '관심분야: ' + data.interest,
      '유입경로: ' + data.source,
      '',
      '바이브코딩 실전 스타터 키트를 신청합니다.'
    ].join('\n');
    location.href = 'mailto:' + cfg.fallbackEmail +
      '?subject=' + encodeURIComponent('스타터 키트 신청 — ' + data.name) +
      '&body=' + encodeURIComponent(body);
  }

  function bind(form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var data = gather(form);

      if (!data.name) return status(form, '이름을 입력해 주세요.', true);
      if (!isEmail(data.email)) return status(form, '이메일 주소를 확인해 주세요.', true);
      if (data.consent !== 'Y') return status(form, '자료 발송을 위한 동의에 체크해 주세요.', true);
      if (data.website) return; // 봇

      if (!cfg.endpoint) {
        status(form, '메일 앱이 열립니다. <b>보내기</b>만 누르시면 접수됩니다.');
        submitMailto(data);
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = '보내는 중…'; }
      status(form, '접수 중입니다…');

      var payload = JSON.stringify(data);
      fetch(cfg.endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payload
      }).then(function () {
        done(form, data);
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = label; }
        status(form,
          '접수 연결에 실패했습니다. 잠시 뒤 다시 시도하시거나 ' +
          '<a href="mailto:' + cfg.fallbackEmail + '?subject=' + encodeURIComponent('스타터 키트 신청 — ' + data.name) + '">메일로 신청</a>해 주세요.',
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
