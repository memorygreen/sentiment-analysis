/**
 * ==============================================================================
 * Moodly 백엔드 입력 검증 유틸리티 (lib/validation.js)
 * ==============================================================================
 * [역할 및 책임]
 * 1. HTTP 요청 메서드(POST) 검증
 * 2. 요청 본문(JSON) 및 필수 필드(text) 타입 검증
 * 3. 텍스트 길이 제한(1자 이상 5,000자 이하) 검증
 * ==============================================================================
 */

// 최대 허용 텍스트 길이 (5,000자)
export const MAX_TEXT_LENGTH = 5000;

/**
 * 클라이언트로부터 전달받은 요청 데이터를 검증합니다.
 * @param {object} reqBody - 요청 본문 객체
 * @returns {{ isValid: boolean, text?: string, error?: { code: string, message: string, statusCode: number } }}
 */
export function validateAnalyzeRequest(reqBody) {
  // 1) 본문이 객체인지 확인
  if (!reqBody || typeof reqBody !== 'object') {
    return {
      isValid: false,
      error: {
        code: 'INVALID_JSON',
        message: '유효한 JSON 형식의 요청 본문이 필요합니다.',
        statusCode: 400
      }
    };
  }

  const { text } = reqBody;

  // 2) text 필드의 문자열 타입 여부 확인
  if (typeof text !== 'string') {
    return {
      isValid: false,
      error: {
        code: 'INVALID_INPUT',
        message: '분석할 문장은 문자열(string) 형태여야 합니다.',
        statusCode: 400
      }
    };
  }

  // 3) 공백 제거 후 빈 값 확인
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_INPUT',
        message: '분석할 문장을 1~5,000자 이내로 입력해 주세요.',
        statusCode: 400
      }
    };
  }

  // 4) 최대 글자 수 초과 확인
  if (text.length > MAX_TEXT_LENGTH) {
    return {
      isValid: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: `분석 가능한 최대 글자 수(${MAX_TEXT_LENGTH.toLocaleString()}자)를 초과했습니다.`,
        statusCode: 413
      }
    };
  }

  // 검증 통과: 정리된 텍스트 반환
  return {
    isValid: true,
    text: trimmed
  };
}

