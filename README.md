# Moodly (AI 문장 감성 분석 웹 서비스)

> 사용자가 입력한 한국어 또는 영어 문장의 감성을 **긍정(positive)**, **부정(negative)**, **중립(neutral)** 중 하나로 분류하고, AI 신뢰도와 판단 근거를 직관적으로 제공하는 웹 애플리케이션입니다.

---

## 1. 주요 기능 및 특징

1. **감성 3분류 & AI 신뢰도**:
   - 문장의 뉘앙스를 분석하여 `긍정`, `부정`, `중립`으로 분류
   - 0~100% 범위의 참고용 AI 자기평가 신뢰도 표시
   - 판단 근거가 된 핵심 표현과 맥락을 한국어 1~3문장으로 설명
2. **엄격한 보안 및 개인정보 보호**:
   - 브라우저에 OpenAI API 키 및 Supabase 비밀키를 일체 노출하지 않음 (서버 전용 처리)
   - **사용자가 입력한 문장 원문과 분석 이유 전문은 데이터베이스에 절대 저장하지 않음**
   - Supabase에는 순수 운영 통계 지표(감성, 신뢰도, 소요 시간, 모델명, 생성 시각)만 안전하게 기록
   - 데이터베이스 저장 실패가 발생하더라도 AI 감성 분석 결과 반환은 중단되지 않음
3. **가볍고 빠른 프런트엔드**:
   - 별도의 무거운 프레임워크 없이 순수 **HTML5, CSS3, Vanilla JavaScript**로 구현
   - XSS 방지를 위한 철저한 `textContent` 렌더링
   - 데스크톱부터 모바일(360px)까지 완벽 지원하는 반응형 디자인

---

## 2. 프로젝트 폴더 구조

```text
workspace-anti/
├─ index.html                 # 메인 화면 (시맨틱 HTML5 구조)
├─ assets/
│  ├─ css/styles.css          # 디자인 시스템 및 반응형 CSS
│  ├─ js/app.js               # 프런트엔드 상태 제어 및 API 통신
│  └─ images/                 # 이미지 에셋
├─ api/
│  └─ analyze.js              # Vercel Serverless Function (POST /api/analyze)
├─ lib/
│  ├─ validation.js           # 요청 검증 유틸리티 (1~5,000자 제한)
│  ├─ openai.js               # OpenAI API 연동 (Structured Outputs)
│  └─ supabase.js             # Supabase 메타데이터 비동기 로깅
├─ supabase/
│  └─ migrations/
│     └─ 001_create_analysis_logs_table.sql # RLS 보안 적용 테이블 DDL
├─ test/
│  └─ test-analyze.js         # 자동화 검증 테스트 스크립트
├─ dev-server.js              # 로컬 개발 서버 (Vercel 환경 에뮬레이션)
├─ package.json               # 프로젝트 설정 및 의존성
├─ .env                       # 로컬 환경변수 파일 (Git 추적 제외)
├─ .env.example               # 환경변수 템플릿 파일
└─ .gitignore                 # 보안 차단 규칙
```

---

## 3. 시작하기 (로컬 실행 방법)

### 사전 준비
- [Node.js](https://nodejs.org/) LTS 버전 설치 필요
- 루트 디렉터리의 `.env` 파일에 발급받은 키 입력 완료

### 1) 의존성 설치
```bash
npm install
```

### 2) Supabase 테이블 생성
Supabase 대시보드의 **SQL Editor**에서 아래 파일의 쿼리를 복사하여 실행합니다:
- `supabase/migrations/001_create_analysis_logs_table.sql`

### 3) 로컬 개발 서버 실행
```bash
npm start
```
서버가 시작되면 웹 브라우저를 열고 **`http://localhost:3000`**에 접속합니다.

---

## 4. 테스트 및 검증 실행

`docs/testing-deployment.md`에 명시된 15개 요구사항을 바탕으로 자동화된 기능 및 API 규격 테스트를 수행합니다.

```bash
npm test
```

### 검증 항목 요약:
- ✅ **T-01~03**: 긍정/부정/중립 정상 분석 및 스키마 검증
- ✅ **T-04**: 빈 문자열 차단 (400 INVALID_INPUT)
- ✅ **T-05**: 공백만 입력된 텍스트 차단 (400 INVALID_INPUT)
- ✅ **T-06~07**: 5,001자 초과 텍스트 차단 (413 PAYLOAD_TOO_LARGE)
- ✅ **T-08**: 비정상 JSON 형식 차단 (400 INVALID_JSON)
- ✅ **T-09**: GET 등 허용되지 않은 HTTP 메서드 차단 (405 METHOD_NOT_ALLOWED)
- ✅ **T-10**: API 키 및 서버 내부 정보의 클라이언트 노출 차단
- ✅ **T-13**: Supabase DB 저장 장애 시에도 AI 분석 결과 정상 반환

---

## 5. Vercel 배포 방법

1. GitHub 저장소에 코드를 푸시합니다 (`.env`는 자동으로 제외됩니다).
2. [Vercel](https://vercel.com)에 로그인 후 해당 저장소를 Import합니다.
3. Vercel 프로젝트 설정의 **Environment Variables** 메뉴에서 다음 환경변수를 등록합니다:
   - `OPENAI_API_KEY`: OpenAI API 비밀키
   - `OPENAI_MODEL`: `gpt-4o-mini`
   - `SUPABASE_URL`: Supabase 프로젝트 URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase 서비스 롤 비밀키
4. **Deploy** 버튼을 누르면 정적 페이지와 `/api/analyze` 서버리스 함수가 자동으로 배포됩니다.

