/**
 * ==============================================================================
 * Moodly 프런트엔드 애플리케이션 스크립트 (app.js)
 * ==============================================================================
 * [역할 및 책임]
 * 1. 문장 입력 글자 수 실시간 계산 및 검증 (최대 5,000자)
 * 2. 백엔드 API (POST /api/analyze) 비동기 통신
 * 3. 4가지 화면 상태 제어: 대기(Empty), 로딩(Loading), 성공(Success), 오류(Error)
 * 4. 보안 지침: XSS 방지를 위해 모든 텍스트는 innerHTML 대신 textContent로 안전하게 삽입
 * ==============================================================================
 */

// 페이지 DOM이 완전히 로드된 후 스크립트 실행
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // ----------------------------------------------------------------------------
  // 1. 주요 DOM 엘리먼트 참조 선언
  // ----------------------------------------------------------------------------
  const form = document.getElementById('sentiment-form');
  const textarea = document.getElementById('sentence-input');
  const charCounter = document.getElementById('char-counter');
  const inputFeedback = document.getElementById('input-feedback');
  const submitBtn = document.getElementById('submit-btn');
  const clearBtn = document.getElementById('clear-btn');
  const retryBtn = document.getElementById('retry-btn');
  const btnSpinner = submitBtn.querySelector('.btn-spinner');
  const btnText = submitBtn.querySelector('.btn-text');

  // 상태 카드 엘리먼트 (대기, 로딩, 성공, 오류)
  const stateEmpty = document.getElementById('state-empty');
  const stateLoading = document.getElementById('state-loading');
  const stateSuccess = document.getElementById('state-success');
  const stateError = document.getElementById('state-error');

  // 성공 결과 바인딩 엘리먼트
  const sentimentBadge = document.getElementById('sentiment-badge');
  const sentimentIcon = document.getElementById('sentiment-icon');
  const sentimentLabel = document.getElementById('sentiment-label');
  const confidenceValue = document.getElementById('confidence-value');
  const confidenceBar = document.getElementById('confidence-bar');
  const reasonText = document.getElementById('reason-text');
  const resultModel = document.getElementById('result-model');
  const errorMessage = document.getElementById('error-message');

  // 최대 허용 글자 수 상수
  const MAX_TEXT_LENGTH = 5000;

  // 감성 레이블 매핑 (영문 -> 한글 및 아이콘)
  const SENTIMENT_MAP = {
    positive: { label: '긍정', icon: '😊', class: 'positive' },
    negative: { label: '부정', icon: '😔', class: 'negative' },
    neutral:  { label: '중립', icon: '😐', class: 'neutral' }
  };

  // ----------------------------------------------------------------------------
  // 2. 글자 수 갱신 및 입력 검증 함수
  // ----------------------------------------------------------------------------
  /**
   * 실시간으로 글자 수를 계산하고 카운터에 반영합니다.
   */
  function updateCharCount() {
    const currentLength = textarea.value.length;
    charCounter.textContent = `${currentLength.toLocaleString()} / ${MAX_TEXT_LENGTH.toLocaleString()}자`;

    if (currentLength > MAX_TEXT_LENGTH) {
      charCounter.style.color = 'var(--sentiment-negative)';
    } else {
      charCounter.style.color = 'var(--text-secondary)';
    }
  }

  /**
   * 입력값의 유효성을 검사합니다.
   * @param {string} text - 검증할 텍스트
   * @returns {boolean} - 유효 여부
   */
  function validateInput(text) {
    const trimmed = text.trim();

    // 1) 빈 문자열 및 공백만 입력된 경우
    if (trimmed.length === 0) {
      showInputFeedback('분석할 문장을 1자 이상 입력해 주세요.');
      textarea.focus();
      return false;
    }

    // 2) 5,000자 초과 입력된 경우
    if (text.length > MAX_TEXT_LENGTH) {
      showInputFeedback(`입력 가능한 최대 글자 수(${MAX_TEXT_LENGTH.toLocaleString()}자)를 초과했습니다.`);
      textarea.focus();
      return false;
    }

    // 통과 시 피드백 숨김
    clearInputFeedback();
    return true;
  }

  function showInputFeedback(msg) {
    inputFeedback.textContent = msg;
    inputFeedback.hidden = false;
  }

  function clearInputFeedback() {
    inputFeedback.textContent = '';
    inputFeedback.hidden = true;
  }

  // ----------------------------------------------------------------------------
  // 3. UI 상태 전환 함수
  // ----------------------------------------------------------------------------
  /**
   * 4가지 상태 카드 중 지정된 상태만 표시하고 나머지는 확실하게 숨깁니다.
   * @param {'empty' | 'loading' | 'success' | 'error'} targetState
   */
  function switchState(targetState) {
    console.log(`[Moodly UI] 상태 전환 -> ${targetState}`);

    // hidden 속성 적용
    stateEmpty.hidden = (targetState !== 'empty');
    stateLoading.hidden = (targetState !== 'loading');
    stateSuccess.hidden = (targetState !== 'success');
    stateError.hidden = (targetState !== 'error');
  }

  /**
   * 분석 요청 중 버튼과 스피너 상태를 제어합니다.
   * @param {boolean} isLoading
   */
  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    clearBtn.disabled = isLoading;
    textarea.disabled = isLoading;

    if (isLoading) {
      btnSpinner.hidden = false;
      btnText.textContent = '분석 중...';
      switchState('loading');
    } else {
      btnSpinner.hidden = true;
      btnText.textContent = '감성 분석하기';
    }
  }

  // ----------------------------------------------------------------------------
  // 4. 감성 분석 API 호출 및 결과 렌더링
  // ----------------------------------------------------------------------------
  /**
   * 백엔드 API (POST /api/analyze)에 분석을 요청합니다.
   */
  async function requestAnalysis() {
    const rawText = textarea.value;

    // 프런트엔드 유효성 검사 수행
    if (!validateInput(rawText)) {
      return;
    }

    const payloadText = rawText.trim();
    setLoading(true);

    try {
      console.log('[Moodly API] 서버 분석 요청 시작...');

      // 서버리스 API 호출
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: payloadText })
      });

      console.log(`[Moodly API] 응답 상태 코드: ${response.status}`);
      const data = await response.json().catch(() => null);

      // HTTP 상태 코드 검사
      if (!response.ok || !data) {
        const errorMsg = (data && data.error && data.error.message)
          ? data.error.message
          : '서버와 통신하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
        displayError(errorMsg);
        return;
      }

      // 서버가 보낸 결과 데이터 유효성 검사
      const { sentiment, confidence, reason, model } = data;
      console.log('[Moodly API] 분석 결과 도착:', data);

      if (!SENTIMENT_MAP[sentiment]) {
        throw new Error('올바르지 않은 감성 분류 결과입니다.');
      }

      const numConfidence = Math.round(Number(confidence));
      if (isNaN(numConfidence) || numConfidence < 0 || numConfidence > 100) {
        throw new Error('올바르지 않은 신뢰도 수치입니다.');
      }

      // 화면에 성공 결과 렌더링
      displaySuccess({
        sentiment,
        confidence: numConfidence,
        reason: typeof reason === 'string' ? reason : '',
        model: typeof model === 'string' ? model : 'AI 분석기'
      });

    } catch (err) {
      console.error('[Moodly Error]', err);
      displayError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.');
    } finally {
      // 요청 종료 시 로딩 상태 반드시 해제
      setLoading(false);
    }
  }

  /**
   * 성공 결과를 화면 요소에 안전하게 바인딩합니다.
   */
  function displaySuccess({ sentiment, confidence, reason, model }) {
    const meta = SENTIMENT_MAP[sentiment];

    // 1) 감성 뱃지 및 스타일
    sentimentBadge.className = `sentiment-badge ${meta.class}`;
    sentimentIcon.textContent = meta.icon;
    sentimentLabel.textContent = meta.label;

    // 2) 신뢰도 백분율 및 프로그레스 바
    confidenceValue.textContent = `${confidence}%`;
    confidenceBar.style.width = `${confidence}%`;
    confidenceBar.className = `confidence-bar ${meta.class}`;

    // 3) 판단 이유 (XSS 방지를 위해 textContent 사용)
    reasonText.textContent = reason || '분석 결과가 도출되었습니다.';

    // 4) 모델 식별자
    resultModel.textContent = model;

    // 성공 상태 화면 활성화
    switchState('success');
  }

  /**
   * 오류 메시지를 표시합니다.
   * @param {string} msg
   */
  function displayError(msg) {
    // XSS 방지를 위해 textContent로 출력
    errorMessage.textContent = msg;
    switchState('error');
  }

  // ----------------------------------------------------------------------------
  // 5. 이벤트 리스너 등록
  // ----------------------------------------------------------------------------
  // 폼 제출 이벤트
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    requestAnalysis();
  });

  // textarea 입력 시 실시간 글자 수 갱신 및 에러 초기화
  textarea.addEventListener('input', () => {
    updateCharCount();
    clearInputFeedback();
  });

  // 초기화 버튼 클릭 이벤트
  clearBtn.addEventListener('click', () => {
    textarea.value = '';
    updateCharCount();
    clearInputFeedback();
    switchState('empty');
    textarea.focus();
  });

  // 오류 상태에서 다시 시도 버튼 클릭 이벤트
  retryBtn.addEventListener('click', () => {
    requestAnalysis();
  });

  // 키보드 단축키 지원: Ctrl + Enter 또는 Cmd + Enter 입력 시 바로 분석 요청
  textarea.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      requestAnalysis();
    }
  });

  // 초기 글자 수 표시 갱신
  updateCharCount();
});
