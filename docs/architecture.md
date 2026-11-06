# 01. 시스템 아키텍처 및 프로젝트 구조

## 1. 구성 요소
- 브라우저: HTML/CSS/Vanilla JS로 입력, 상태, 결과를 표시한다.
- Vercel Function: Node.js 서버 코드로 API 요청을 처리한다.
- OpenAI API: 텍스트의 감성을 분류하고 이유를 생성한다.
- Supabase PostgreSQL: 원문을 제외한 분석 운영 메타데이터를 저장한다.
- Vercel: 정적 프런트엔드와 서버리스 API를 배포한다.

## 2. 데이터 흐름
1. 브라우저에서 입력 검증
2. `POST /api/analyze` 요청
3. 서버에서 타입·길이 검증
4. OpenAI API 호출
5. 응답 JSON 스키마 및 값 검증
6. Supabase에 메타데이터 저장 시도
7. 브라우저에 분석 결과 반환

Supabase 기록 저장은 분석 결과 반환을 막지 않는 부가 작업이다.

## 3. 권장 폴더 구조
```text
moodly/
├─ AGENTS.md
├─ PRD.md
├─ README.md
├─ index.html
├─ assets/
│  ├─ css/
│  │  └─ styles.css
│  ├─ js/
│  │  └─ app.js
│  └─ images/
├─ api/
│  └─ analyze.js
├─ lib/
│  ├─ openai.js
│  ├─ supabase.js
│  └─ validation.js
├─ supabase/
│  └─ schema.sql
├─ docs/
│  ├─ architecture.md
│  ├─ ui-design.md
│  ├─ frontend.md
│  ├─ backend-ai.md
│  ├─ database-security.md
│  └─ testing-deployment.md
├─ package.json
├─ .env.example
└─ .gitignore
```

## 4. 실행 환경
- Node.js LTS 버전을 사용한다.
- 로컬 개발은 Vercel CLI 또는 프로젝트에서 검증된 동등한 로컬 실행 방법을 사용한다.
- `package.json`에 실제 사용하는 의존성만 선언한다.
- 정적 HTML은 루트에서 제공하고 `/api/*`는 Vercel Function으로 처리한다.
- 별도 프레임워크 도입 없이 Vercel의 Node.js Function 규칙을 따른다.

## 5. API 계약
`POST /api/analyze`
- 요청: `{ "text": "분석할 문장" }`
- 성공: `{ "sentiment": "positive|negative|neutral", "confidence": 0, "reason": "설명", "model": "모델 식별자" }`
- 실패: `{ "error": { "code": "ERROR_CODE", "message": "사용자 안내 메시지" } }`

실제 응답에는 내부 디버그 정보나 API 키를 포함하지 않는다.
