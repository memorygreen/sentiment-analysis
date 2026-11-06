# 05. Supabase 데이터베이스 및 보안

## 1. 저장 정책
이번 버전은 사용자 계정이나 분석 이력 기능을 제공하지 않는다. Supabase는 서비스 운영 지표를 위한 최소 메타데이터 저장에 사용한다.

저장 허용:
- 감성 레이블
- 모델 신뢰도 숫자
- 처리 시간(ms)
- 모델 식별자
- 생성 시각

저장 금지:
- 사용자가 입력한 원문
- 분석 이유 전문
- 이메일, 이름, 전화번호
- IP 주소 및 브라우저 지문
- OpenAI API 키 등 비밀정보

## 2. 테이블 예시
테이블명: `analysis_logs`

| 컬럼 | 타입 | 조건 |
|---|---|---|
| id | uuid | primary key, default gen_random_uuid() |
| sentiment | text | positive/negative/neutral |
| confidence | numeric(5,2) | 0~100 |
| latency_ms | integer | 0 이상 |
| model | text | 모델 식별자 |
| created_at | timestamptz | default now() |

## 3. SQL 초안
```sql
create table if not exists public.analysis_logs (
  id uuid primary key default gen_random_uuid(),
  sentiment text not null
    check (sentiment in ('positive', 'negative', 'neutral')),
  confidence numeric(5,2) not null
    check (confidence >= 0 and confidence <= 100),
  latency_ms integer not null
    check (latency_ms >= 0),
  model text not null,
  created_at timestamptz not null default now()
);

alter table public.analysis_logs enable row level security;

-- 브라우저의 anon/authenticated 역할에 직접 접근 정책을 만들지 않는다.
-- 서버의 Supabase Service Role Key를 이용한 서버 전용 쓰기만 허용한다.
```

## 4. 키 관리
환경변수:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회할 수 있는 고권한 키이므로 서버에서만 사용한다. HTML, CSS, JS, 브라우저 번들, 공개 저장소에 절대 포함하지 않는다. 공개용 anon key가 필요하지 않은 구조이므로 프런트엔드에 Supabase 클라이언트를 둘 필요가 없다.

## 5. 저장 실패 처리
- DB insert가 실패해도 감성 분석 성공 응답을 사용자에게 반환한다.
- 서버 로그에는 저장 실패 코드와 시각 등 최소 정보만 남긴다.
- 원문을 저장 실패 로그에 포함하지 않는다.
- DB 장애가 AI 분석 기능을 중단시키지 않도록 한다.

## 6. 보안 점검
- `.env`는 Git에 커밋하지 않는다.
- `.env.example`에는 변수 이름과 설명만 기록하고 실제 값을 넣지 않는다.
- Vercel 환경변수는 Preview/Production 환경을 구분해 등록한다.
- SQL 테이블은 최소 권한으로 운영한다.
- 운영 중 키가 노출되면 즉시 폐기·재발급한다.

## 7. 완료 기준
- Supabase 테이블 생성 SQL이 제공된다.
- 서버에서만 DB 쓰기가 이뤄진다.
- 브라우저에서 Service Role Key를 찾을 수 없다.
- 원문·이유·개인 식별 정보가 DB에 저장되지 않는다.
- DB 장애 시에도 분석 결과가 반환된다.
