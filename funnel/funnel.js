/* 인피니티 퍼널 — 신청 폼 제출 스크립트 (의존성 없음)
 *
 * 2단계 추가: 유입 랜딩(/go/) · 상담 필터(/apply/)
 *   - 폼의 data-funnel-type 으로 접수 종류를 구분합니다. (기본값 kit)
 *       <form data-funnel data-funnel-type="kit">   → 시트 DB + 1·3·5·7·14·30일차 메일
 *       <form data-funnel data-funnel-type="apply"> → 시트 상담신청 + 관리자 알림
 *   - 폼에 class="funnel--light" 를 주면 밝은 종이 배경용 색으로 바뀝니다.
 *   - 배포 후 아래 endpoint 에 Apps Script 웹앱 URL(.../exec)을 넣으면 접수가 시작됩니다.
 *     비워 두면 메일 앱으로 신청서를 보내는 방식으로 동작합니다(접수 누락 없음).
 *
 * 3단계 추가: 구전 모먼트 + 계측
 *   - 신청 완료 화면에 「링크 복사 / 추천 멘트 복사」 블록을 붙입니다([data-share-copy]).
 *     /starter-kit/ 에 같은 마크업을 두면 이 스크립트가 그대로 동작합니다.
 *   - gtag 또는 dataLayer 가 있으면 funnel_view · funnel_submit · funnel_done ·
 *     share_copy_link · share_copy_text · funnel_link 이벤트를 보냅니다(없으면 조용히 넘어감).
 *     개인정보(이름·이메일·연락처)는 이벤트에 넣지 않습니다 — 소속유형·관심분야까지만.
 */
window.FUNNEL_CONFIG = {
  endpoint: 'https://script.google.com/macros/s/AKfycbyOfmAtGcmRTj2_OwlcFkZ3NFmdR1of8JrgAN8y3xw7wZZCuoohNF7KK6vK0zIte3uC3Q/exec',
  fallbackEmail: 'cdi3477@dit.ac.kr',
  kitUrl: '/starter-kit/',
  applyUrl: '/apply/',
  shareUrl: 'https://skyman200.github.io/go/?ref=share',
  shareText: '김강훈 교수(동의과학대)가 대학 행정·센터의 반복 업무를 5일 안에 없애는 실행팩을 무료로 풀었습니다. 프롬프트 12개 · Apps Script 템플릿 4종 · 배포 전 체크리스트 10문항이고, 759개 과목·52개 학과 사례가 들어 있습니다.'
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

  function escHtml(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** gtag(GA4) 또는 dataLayer 가 있을 때만 이벤트를 보냅니다. 둘 다 없으면 아무 일도 하지 않습니다. */
  function track(name, params) {
    var p = params || {};
    try {
      if (typeof window.gtag === 'function') window.gtag('event', name, p);
      if (window.dataLayer && typeof window.dataLayer.push === 'function') {
        var push = { event: name };
        for (var k in p) {
          if (Object.prototype.hasOwnProperty.call(p, k)) push[k] = p[k];
        }
        window.dataLayer.push(push);
      }
    } catch (e) {}
  }

  function status(form, text, isError) {
    var el = form.querySelector('[data-funnel-status]');
    if (!el) return;
    el.hidden = false;
    el.className = 'funnel__status' + (isError ? ' funnel__status--error' : '');
    el.innerHTML = text;
  }

  function shareUrl() {
    return cfg.shareUrl || 'https://skyman200.github.io/go/?ref=share';
  }

  function shareMessage() {
    return (cfg.shareText || '') + '\n' + shareUrl();
  }

  /** 구전 모먼트 — 광고가 아니라 링크 한 줄. 버튼은 흑백 테두리만 씁니다(그라데이션·이모지 없음). */
  function shareBlock() {
    var url = shareUrl();
    return '' +
      '<div class="share">' +
      '<p class="share__kicker">동료에게 넘기기</p>' +
      '<p class="share__title">동료 교수·센터 대표에게 5일 실행팩을 넘겨 주세요</p>' +
      '<p class="share__text">링크 한 줄이면 됩니다. 받는 분도 이름과 이메일만 남기면 같은 실행팩을 받습니다.</p>' +
      '<div class="share__actions">' +
      '<button type="button" class="share__btn" data-share-copy="link">링크 복사<span class="share__sub">' +
      escHtml(url.replace(/^https?:\/\//, '')) + '</span></button>' +
      '<button type="button" class="share__btn" data-share-copy="text">추천 멘트 복사<span class="share__sub">카카오톡·문자용 2줄</span></button>' +
      '</div>' +
      '<p class="share__status" data-share-status hidden></p>' +
      '</div>';
  }

  function done(form, data, type) {
    var box = form.closest('[data-funnel-box]') || form;
    var mailLink = '<a href="mailto:' + cfg.fallbackEmail + '">' + cfg.fallbackEmail + '</a>';
    var html;

    if (type === 'apply') {
      html =
        '<div class="funnel__done">' +
        '<p class="funnel__done-kicker">접수 완료</p>' +
        '<p class="funnel__done-title">' + (data.name ? escHtml(data.name) + '님, 신청서가 접수되었습니다.' : '신청서가 접수되었습니다.') + '</p>' +
        '<p class="funnel__done-text">보내 주신 내용은 제가 직접 읽습니다. <b>영업일 기준 3일 안에</b> ' +
        escHtml(data.phone ? data.phone : data.email) + ' 로 회신드립니다. 회신에는 가능한 범위와 일정, 다음 순서만 적습니다.</p>' +
        '<p class="funnel__done-text funnel__done-text--muted">그동안 궁금한 점이나 급한 일정이 있으면 ' + mailLink + ' 로 메일 주시면 됩니다.</p>' +
        '<p class="funnel__done-action"><a class="funnel__submit" href="/starter-kit/">기다리는 동안 5일 실행팩 보기 →</a></p>' +
        '</div>';
    } else {
      html =
        '<div class="funnel__done">' +
        '<p class="funnel__done-kicker">접수 완료</p>' +
        '<p class="funnel__done-title">' + (data.name ? escHtml(data.name) + '님, 신청이 접수되었습니다.' : '신청이 접수되었습니다.') + '</p>' +
        '<p class="funnel__done-text">1일차 메일이 곧 도착합니다(<b>' + escHtml(data.email) + '</b>). ' +
        '기다리지 마시고 지금 바로 실행팩을 여셔도 됩니다.</p>' +
        '<p class="funnel__done-action"><a class="funnel__submit" href="' + cfg.kitUrl + '">5일 실행팩 열기 →</a></p>' +
        '<p class="funnel__note">메일이 10분 안에 오지 않으면 스팸함을 확인하시고, 그래도 없으면 ' +
        '<a href="mailto:' + cfg.fallbackEmail + '">' + cfg.fallbackEmail + '</a> 로 알려 주세요.</p>' +
        '</div>' +
        shareBlock();
    }

    box.innerHTML = html;
    track('funnel_done', { form: type, org: data.org || '', interest: data.interest || '' });
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

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  function copyText(text, onDone) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onDone).catch(function () { fallbackCopy(text); onDone(); });
    } else {
      fallbackCopy(text);
      onDone();
    }
  }

  /**
   * 공유 버튼 한 곳에서 처리합니다. 완료 화면은 innerHTML 로 다시 그려지므로
   * 버튼마다 리스너를 달지 않고 document 에 위임합니다.
   */
  function bindShare() {
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      var btn = t && t.closest ? t.closest('[data-share-copy]') : null;
      if (!btn) return;
      if (ev.preventDefault) ev.preventDefault();

      var kind = btn.getAttribute('data-share-copy');
      var text = kind === 'text' ? shareMessage() : shareUrl();

      copyText(text, function () {
        var box = btn.closest ? btn.closest('.share') : null;
        var st = box ? box.querySelector('[data-share-status]') : null;
        if (st) {
          st.hidden = false;
          st.className = 'share__status';
          st.textContent = kind === 'text'
            ? '추천 멘트를 복사했습니다. 카카오톡이나 문자에 붙여 넣으세요.'
            : '링크를 복사했습니다. ' + shareUrl();
        }
        track(kind === 'text' ? 'share_copy_text' : 'share_copy_link', { page: location.pathname });
      });
    });

    // 퍼널 안쪽 이동(/go/ · /apply/ · /starter-kit/)은 계측이 없어도 조용히 넘어갑니다.
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      var a = t && t.closest ? t.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (/(^|\/)(go|apply|starter-kit)\//.test(href)) {
        track('funnel_link', { to: href, from: location.pathname });
      }
    });
  }

  function bind(form) {
    var type = typeOf(form);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var data = gather(form);
      var problem = validate(form, data, type);
      if (problem) {
        status(form, problem, true);
        track('funnel_error', { form: type, reason: 'validation' });
        return;
      }
      if (data.website) return; // 봇

      if (!cfg.endpoint) {
        status(form, '메일 앱이 열립니다. <b>보내기</b>만 누르시면 접수됩니다.');
        track('funnel_mailto', { form: type, org: data.org || '', interest: data.interest || '' });
        submitMailto(data, type);
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = '보내는 중…'; }
      status(form, '접수 중입니다…');
      track('funnel_submit', { form: type, org: data.org || '', interest: data.interest || '' });

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
        track('funnel_error', { form: type, reason: 'network' });
      });
    });
  }

  function init() {
    var forms = document.querySelectorAll('form[data-funnel]');
    for (var i = 0; i < forms.length; i++) bind(forms[i]);
    bindShare();

    var m = /[?&]ref=([^&]+)/.exec(location.search || '');
    track('funnel_view', {
      page: location.pathname,
      ref_code: m ? m[1] : '',
      form: forms.length ? typeOf(forms[0]) : 'none'
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
