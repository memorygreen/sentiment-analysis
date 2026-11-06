-- ==============================================================================
-- 001_create_analysis_logs_table.sql
-- Moodly 분석 메타데이터 테이블 생성 및 RLS 보안 정책 설정
-- ==============================================================================
-- [보안 및 개인정보 보호 지침]
-- 1. 본 테이블에는 사용자의 입력 원문이나 분석 이유 전문을 절대 저장하지 않습니다.
-- 2. 순수 운영 통계 지표(감성 레이블, 신뢰도, 소요 시간, 모델 식별자, 생성 시각)만 저장됩니다.
-- 3. Row Level Security(RLS)를 활성화하여 외부 브라우저(익명 사용자 anon)의 직접적인 조회/삽입을 전면 차단합니다.
-- 4. 오직 백엔드 서버(service_role 키)를 통해서만 안전하게 메타데이터가 기록됩니다.
-- ==============================================================================

-- 1. analysis_logs 테이블 생성
CREATE TABLE IF NOT EXISTS public.analysis_logs (
    -- 고유 식별자 (UUID v4 자동 생성)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 감성 분류 결과: positive(긍정), negative(부정), neutral(중립) 3가지만 허용
    sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),

    -- 모델이 산출한 신뢰도 백분율 (0.00 ~ 100.00)
    confidence NUMERIC(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),

    -- API 처리 소요 시간 (밀리초 단위, 0 이상)
    latency_ms INTEGER NOT NULL CHECK (latency_ms >= 0),

    -- 분석에 사용된 AI 모델 식별자 (예: gpt-4o-mini)
    model TEXT NOT NULL,

    -- 로그 생성 시각 (기본값: 현재 UTC 시각)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 테이블 설명 및 컬럼 주석 추가
COMMENT ON TABLE public.analysis_logs IS 'Moodly 감성 분석 운영 메타데이터 (원문 및 개인정보 저장 금지)';
COMMENT ON COLUMN public.analysis_logs.id IS '로그 고유 식별자 (UUID)';
COMMENT ON COLUMN public.analysis_logs.sentiment IS '감성 분류 결과 (positive/negative/neutral)';
COMMENT ON COLUMN public.analysis_logs.confidence IS '모델 자기평가 신뢰도 수치 (0~100)';
COMMENT ON COLUMN public.analysis_logs.latency_ms IS 'AI 호출 및 처리 소요 시간(ms)';
COMMENT ON COLUMN public.analysis_logs.model IS '사용된 AI 모델 이름';
COMMENT ON COLUMN public.analysis_logs.created_at IS '분석 생성 일시';

-- 2. 행 단위 보안 (Row Level Security, RLS) 활성화
ALTER TABLE public.analysis_logs ENABLE ROW LEVEL SECURITY;

-- 3. 보안 정책:
-- 브라우저(익명 anon / 인증 authenticated)의 직접 SELECT/INSERT/UPDATE/DELETE 정책을 생성하지 않습니다.
-- 정책이 존재하지 않으므로 일반 클라이언트는 접근이 완전 차단되며,
-- 오직 서버 측의 SUPABASE_SERVICE_ROLE_KEY를 통한 안전한 쓰기만 허용됩니다.

