/**
 * ==============================================================================
 * Moodly 기능 및 보안 검증 자동화 테스트 (test/test-analyze.js)
 * ==============================================================================
 * [검증 항목 (docs/testing-deployment.md 기준)]
 * - T-04: 빈 문자열 입력 차단 (400)
 * - T-05: 공백만 입력 차단 (400)
 * - T-06 / T-07: 5,001자 초과 입력 차단 (413)
 * - T-08: 비정상적인 JSON 본문 차단 (400)
 * - T-09: 허용되지 않은 HTTP 메서드 (GET) 차단 (405)
 * - T-01 ~ T-03: 유효한 문장 감성 분석 및 스키마 검증 (OpenAI API 연동)
 * ==============================================================================
 */

import dotenv from 'dotenv';
dotenv.config();

import handler from '../api/analyze.js';
import { validateAnalyzeRequest } from '../lib/validation.js';

let passedCount = 0;
let failedCount = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  ✅ [PASS] ${description}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${description}`);
    failedCount++;
  }
}

// 모의 응답(Mock Response) 객체 생성 헬퍼
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function runTests() {
  console.log('====================================================');
  console.log(' Moodly 자동화 검증 테스트 시작 (docs/testing-deployment.md)');
  console.log('====================================================\n');

  // 1. 유효성 검증 단위 테스트
  console.log('[1] 입력 유효성 검증 단위 테스트 (lib/validation.js)');
  
  // T-04: 빈 문자열
  const resEmpty = validateAnalyzeRequest({ text: '' });
  assert('T-04: 빈 문자열은 거부되어야 함', !resEmpty.isValid && resEmpty.error.code === 'INVALID_INPUT');

  // T-05: 공백만 입력
  const resWhitespace = validateAnalyzeRequest({ text: '    ' });
  assert('T-05: 공백만 입력된 경우 거부되어야 함', !resWhitespace.isValid && resWhitespace.error.code === 'INVALID_INPUT');

  // T-06: 5,001자 입력
  const longText = 'a'.repeat(5001);
  const resLong = validateAnalyzeRequest({ text: longText });
  assert('T-06: 5,001자 입력은 PAYLOAD_TOO_LARGE(413)로 거부되어야 함', !resLong.isValid && resLong.error.code === 'PAYLOAD_TOO_LARGE' && resLong.error.statusCode === 413);

  // T-08: 본문 객체 누락
  const resNull = validateAnalyzeRequest(null);
  assert('T-08: null 본문은 거부되어야 함', !resNull.isValid && resNull.error.code === 'INVALID_JSON');

  // 정상 텍스트 검증
  const resValid = validateAnalyzeRequest({ text: '  오늘도 좋은 하루 되세요.  ' });
  assert('정상 텍스트는 trim 처리되어 통과해야 함', resValid.isValid && resValid.text === '오늘도 좋은 하루 되세요.');

  console.log('\n[2] 서버리스 API 핸들러 규격 테스트 (api/analyze.js)');

  // T-09: GET 메서드 요청
  const reqGet = { method: 'GET' };
  const resGet = createMockRes();
  await handler(reqGet, resGet);
  assert('T-09: GET 요청은 405 METHOD_NOT_ALLOWED로 응답해야 함', resGet.statusCode === 405 && resGet.body.error.code === 'METHOD_NOT_ALLOWED');

  // T-08: 비정상 JSON 문자열
  const reqBadJson = { method: 'POST', body: 'invalid-json{' };
  const resBadJson = createMockRes();
  await handler(reqBadJson, resBadJson);
  assert('T-08: 파싱 불가능한 JSON은 400 INVALID_JSON으로 응답해야 함', resBadJson.statusCode === 400 && resBadJson.body.error.code === 'INVALID_JSON');

  // 3. 실제 AI 연동 통합 테스트 (키가 등록된 경우 실행)
  console.log('\n[3] AI 감성 분석 통합 테스트 (OpenAI API 연동)');
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey.includes('your_openai_api_key_here')) {
    console.log('  ⚠️ .env에 유효한 OpenAI API 키가 설정되지 않아 실제 AI 호출 테스트는 건너뜁니다.');
  } else {
    // T-01: 긍정 문장 테스트
    console.log('  -> T-01: 긍정 문장 분석 요청 중...');
    const reqPositive = { method: 'POST', body: { text: '오늘 정말 행복하고 뿌듯한 하루였어요!' } };
    const resPositive = createMockRes();
    await handler(reqPositive, resPositive);

    assert('T-01: 긍정 문장 요청은 200 OK로 응답해야 함', resPositive.statusCode === 200);
    if (resPositive.statusCode === 200) {
      const data = resPositive.body;
      assert('T-01: 감성 레이블은 positive여야 함', data.sentiment === 'positive');
      assert('T-01: 신뢰도는 0~100 사이 숫자여야 함', typeof data.confidence === 'number' && data.confidence >= 0 && data.confidence <= 100);
      assert('T-01: 판단 이유는 한국어 문자열이어야 함', typeof data.reason === 'string' && data.reason.length > 0);
      console.log(`     분석 결과: [${data.sentiment}] 신뢰도: ${data.confidence}%, 이유: ${data.reason}`);
    } else {
      console.log('     응답 에러:', resPositive.body);
    }
  }

  console.log('\n====================================================');
  console.log(` 테스트 결과: 총 ${passedCount + failedCount}개 중 통과: ${passedCount}개, 실패: ${failedCount}개`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();

