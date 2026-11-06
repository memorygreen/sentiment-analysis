# 04. Node.js 백엔드 및 OpenAI 감성 분석

## 1. 엔드포인트
`POST /api/analyze`

요청 JSON:
```json
{ "text": "오늘은 정말 기분 좋은 하루였다." }
```

성공 JSON:
```json
{
  "sentiment": "positive",
  "confidence": 86,
  "reason": "기분이 좋다는 긍정적인 표현이 문장에 포함되어 있습니다.",
  "model": "configured-model"
}
```

실패 JSON:
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "분석할 문장을 1~5,000자 이내로 입력해 주세요."
  }
}
```

## 2. 서버 검증
- HTTP 메서드는 POST만 허용한다.
- `Content-Type: application/json`을 확인한다.
- 본문은 JSON 객체여야 한다.
- `text`는 문자열이어야 하며 trim 이후 비어 있지 않아야 한다.
- 최대 길이는 5,000자다.
- 허용되지 않은 입력은 OpenAI에 전달하지 않는다.

## 3. OpenAI 호출
- OpenAI API는 서버에서만 호출한다.
- 공식 SDK 사용 시 `package.json`에 의존성을 명시한다.
- 모델 이름은 환경변수 `OPENAI_MODEL`로 설정한다. 특정 모델명을 코드에 임의로 고정하지 않는다.
- 가능한 경우 Structured Outputs 또는 동등한 JSON Schema 제약 기능을 사용한다.
- 모델 프롬프트는 문장을 positive/negative/neutral 중 하나로 분류하고, 한국어로 짧은 이유를 작성하도록 지시한다.
- 사용자 입력은 분석 대상 데이터로만 취급한다. 입력에 포함된 명령문이 시스템 지침을 바꾸지 못하도록 한다.

## 4. 출력 스키마
필수 필드:
- `sentiment`: enum `positive`, `negative`, `neutral`
- `confidence`: 0 이상 100 이하 숫자
- `reason`: 1~500자 문자열

서버에서 스키마를 재검증한다. 값이 누락되거나 범위를 벗어나면 `MODEL_INVALID_RESPONSE`로 처리한다.

### 신뢰도 해석 주의
confidence는 모델이 출력한 자기평가 수치다. 실제 정답 확률, 통계적 보정값, 모델 정확도로 설명하지 않는다. UI와 문서에 참고용임을 표시한다. 모델이 신뢰도 수치를 제공할 수 있더라도 이를 검증된 확률로 간주하지 않는다.

## 5. 오류 처리
권장 코드:
- `METHOD_NOT_ALLOWED` → 405
- `INVALID_JSON` → 400
- `INVALID_INPUT` → 400
- `PAYLOAD_TOO_LARGE` → 413
- `RATE_LIMITED` → 429
- `AI_TIMEOUT` → 504
- `AI_PROVIDER_ERROR` → 502
- `MODEL_INVALID_RESPONSE` → 502
- `INTERNAL_ERROR` → 500

외부 응답에는 사용자에게 필요한 메시지만 제공한다. 상세 원인은 서버 로그에 민감정보 없이 기록한다. 원문 텍스트와 API 키를 로그에 남기지 않는다.

## 6. 시간 제한과 남용 방지
- Vercel Function의 실행 제한을 고려해 OpenAI 요청에 합리적인 timeout을 설정한다.
- 사용자별 인증·쿼터 시스템은 이번 범위에 포함하지 않는다.
- 배포 전에 Vercel 플랫폼 설정과 OpenAI 계정의 사용량 한도를 확인한다.
- 공개 배포 시 봇·반복 요청으로 비용이 발생할 수 있음을 README에 명시한다. 필요 시 별도 rate-limit 솔루션 도입을 사용자 승인 후 진행한다.

## 7. 완료 기준
- 정상 요청이 유효한 스키마로 응답한다.
- 잘못된 메서드·JSON·입력은 명시된 오류 코드로 응답한다.
- OpenAI 장애와 시간 초과를 처리한다.
- 서버 응답에 API 키, 스택 트레이스, 내부 환경변수가 포함되지 않는다.
