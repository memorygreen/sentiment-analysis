/**
 * ==============================================================================
 * Moodly 감성 분석 서버리스 API 엔드포인트 (api/analyze.js)
 * ==============================================================================
 * [역할 및 규격]
 * - 엔드포인트: POST /api/analyze
 * - Vercel Serverless Function (Node.js LTS)
 * - 입력 검증 -> AI 감성 분석 호출 -> 메타데이터 DB 저장(비동기) -> 응답 반환
 * - 보안 지침: 에러 응답에 스택 트레이스나 API 키 등 내부 정보를 절대 노출하지 않음
 * ==============================================================================
 */

import { validateAnalyzeRequest } from '../lib/validation.js';
import { analyzeSentimentWithAI } from '../lib/openai.js';
import { logAnalysisMetadata } from '../lib/supabase.js';

/**
 * Vercel Serverless Function 메인 핸들러
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export default async function handler(req, res) {
  // 1) HTTP 메서드 검증 (POST만 허용)
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'POST 요청만 지원하는 엔드포인트입니다.'
      }
    });
  }

  // 2) Content-Type 헤더 확인 및 본문 파싱 보장
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({
        error: {
          code: 'INVALID_JSON',
          message: '유효한 JSON 형식의 요청 본문이 아닙니다.'
        }
      });
    }
  }

  // 3) 입력값 유효성 검증
  const validation = validateAnalyzeRequest(body);
  if (!validation.isValid) {
    return res.status(validation.error.statusCode).json({
      error: {
        code: validation.error.code,
        message: validation.error.message
      }
    });
  }

  // 처리 시작 시각 측정 (성능 지표 로깅용)
  const startTime = Date.now();

  try {
    // 4) OpenAI API 감성 분석 호출
    const result = await analyzeSentimentWithAI(validation.text);
    const latencyMs = Date.now() - startTime;

    // 5) Supabase에 운영 메타데이터 비동기 저장 시도 (원문 저장 금지)
    // DB 저장 실패가 분석 결과 반환을 지연시키거나 실패시키지 않도록 비동기 처리
    logAnalysisMetadata({
      sentiment: result.sentiment,
      confidence: result.confidence,
      latencyMs: latencyMs,
      model: result.model
    }).catch((err) => {
      console.error('[Background Log Error]', err.message);
    });

    // 6) 정상 분석 결과 반환
    return res.status(200).json({
      sentiment: result.sentiment,
      confidence: result.confidence,
      reason: result.reason,
      model: result.model
    });

  } catch (err) {
    // 7) 안전한 에러 핸들링
    const statusCode = err.statusCode || 500;
    const errorCode = err.code || 'INTERNAL_ERROR';
    const errorMessage = err.message || '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';

    console.error(`[API Error] [${errorCode}] ${errorMessage}`);

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message: errorMessage
      }
    });
  }
}

