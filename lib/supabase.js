/**
 * ==============================================================================
 * Moodly Supabase 연동 모듈 (lib/supabase.js)
 * ==============================================================================
 * [역할 및 책임]
 * 1. Supabase 관리자 클라이언트(Service Role Key) 초기화
 * 2. 분석 운영 메타데이터 비동기 로깅 (analysis_logs 테이블)
 * 3. 보안 정책 준수:
 *    - 사용자 텍스트 원문, 이유 전문, IP 주소, 개인정보 저장 절대 금지
 *    - DB 저장 실패가 발생하더라도 사용자 대상 AI 감성 분석 결과 반환은 절대 중단되지 않음
 * ==============================================================================
 */

import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

/**
 * 서버 측 Supabase 클라이언트를 반환합니다.
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 설정값이 없거나 기본 플레이스홀더인 경우 null 반환
  if (!supabaseUrl || !serviceRoleKey ||
      supabaseUrl.includes('your-project-id') ||
      serviceRoleKey.includes('your_supabase_service_role_key_here')) {
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    return supabaseClient;
  } catch (err) {
    console.error('[Supabase Init Warning] 클라이언트 초기화 실패:', err.message);
    return null;
  }
}

/**
 * 분석 운영 메타데이터를 Supabase에 안전하게 기록합니다.
 * @param {object} params
 * @param {'positive' | 'negative' | 'neutral'} params.sentiment - 감성 레이블
 * @param {number} params.confidence - 신뢰도 (0~100)
 * @param {number} params.latencyMs - 처리 소요 시간 (ms)
 * @param {string} params.model - 모델 식별자
 */
export async function logAnalysisMetadata({ sentiment, confidence, latencyMs, model }) {
  const client = getSupabaseClient();

  // Supabase가 설정되지 않았더라도 서비스는 계속 동작해야 함
  if (!client) {
    return;
  }

  try {
    // 개인정보나 원문은 전혀 포함하지 않고 운영 지표만 insert
    const { error } = await client
      .from('analysis_logs')
      .insert([
        {
          sentiment: sentiment,
          confidence: confidence,
          latency_ms: latencyMs,
          model: model
        }
      ]);

    if (error) {
      // 오류 코드는 서버에만 최소한으로 기록하고 클라이언트로는 전파하지 않음
      console.error('[Supabase Log Warning] 메타데이터 기록 실패:', error.message);
    }
  } catch (err) {
    // DB 장애가 분석 결과 반환을 가로막지 않도록 예외를 삼킵니다.
    console.error('[Supabase Unexpected Error]', err.message);
  }
}

