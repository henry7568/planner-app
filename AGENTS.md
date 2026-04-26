# Codex 작업 규칙

## 0. 작업 시작 전 승인 필수
Codex는 코드를 수정하기 전에 반드시 먼저 작업 계획을 작성하고 사용자 승인을 받아야 한다.

작업 계획에는 반드시 다음을 포함한다.

1. 수정 목적
2. 수정 대상 파일
3. 건드릴 함수/섹션
4. 기존 기능 중 영향 받을 수 있는 부분
5. 모바일 UI 대응 방식
6. 테스트 체크리스트

사용자가 “진행해”, “바로 진행”, “수정해” 등으로 승인하기 전까지 실제 코드 수정 금지.

---

## 1. 기존 기능 보존 원칙
새 기능을 추가하거나 버그를 수정할 때 기존 기능을 삭제하거나 약화시키면 안 된다.

특히 다음 기능은 명시적 요청 없이는 제거 금지.

- 로그인 / 로그아웃 / Firebase 연동
- 오프라인 로컬 저장
- GitHub Pages 대응 캐시
- 일정 / 할일 추가, 수정, 삭제
- 반복 작업 생성 및 마스터 승계
- 달력 표시
- 선택 날짜 팝업
- 프로젝트 / Inbox
- 자산 홈
- 가계부 / 거래 등록
- 캡처 OCR / 캡처 채우기
- 모바일 대응 CSS
- 서비스 워커 / manifest / PWA 관련 코드

기존 코드를 정리할 때도 동일한 동작이 유지되는지 확인해야 한다.

---

## 2. 파일 길이 제한
특별한 사유가 없으면 각 JS 파일은 최대 500줄을 넘기지 않는다.

파일이 500줄을 넘을 것 같으면 기능 단위로 분리한다.

예시:

- 반복 관련: `repeat.js`
- 일정/할일 저장 로직: `plannerItems.js`
- 달력 렌더링: `calendar.js`
- 대시보드 렌더링: `dashboard.js`
- 자산/가계부: `finance.js`
- OCR/캡처 분석: `financeOcr.js`
- UI 제어: `plannerUI.js`
- 공통 유틸: `utils.js`

단, `index.html`, `style.css`처럼 구조상 길어질 수 있는 파일은 예외로 하되, 가능한 섹션 주석으로 나눈다.

---

## 3. 모바일 UI 필수 대응
모든 UI 변경은 모바일 화면 기준으로도 반드시 확인한다.

필수 기준:

- 화면 가로 스크롤 금지
- 카드, 버튼, 입력창이 화면 밖으로 넘치면 안 됨
- 버튼 텍스트가 세로로 한 글자씩 깨지면 안 됨
- 긴 텍스트는 줄바꿈 또는 말줄임 처리
- 팝업은 모바일에서 화면 안에 들어와야 함
- 팝업 내부는 필요 시 스크롤 가능해야 함
- 하단 탭바와 콘텐츠가 겹치면 안 됨
- 터치 가능한 버튼은 최소 높이 40px 이상 권장

CSS 작성 시 다음 원칙을 지킨다.

```css
* {
  box-sizing: border-box;
}

html,
body {
  overflow-x: clip;
}

img,
video,
canvas {
  max-width: 100%;
}

button,
input,
select,
textarea {
  min-width: 0;
  font: inherit;
}

.card,
.panel,
.modal,
.popup {
  max-width: 100%;
}
```

## 4. 디자인 일관성 규칙

폰트, 카드, 버튼, 입력창 크기가 제각각이 되지 않게 기존 디자인 토큰을 우선 사용한다.

기본 기준:

본문 폰트: 기존 body 폰트 상속
카드 radius: 기존 .card 기준
버튼 radius: 기존 .primary-btn, .secondary-btn 기준
입력창 높이/패딩: 기존 .form-group input/select 기준
색상: 기존 CSS 변수 또는 기존 버튼 색상 사용
새 색상을 무분별하게 추가하지 않음

새 버튼을 만들 때는 가능한 기존 클래스를 재사용한다.

주요 행동: .primary-btn
보조 행동: .secondary-btn
삭제 행동: .delete-btn
수정 행동: .edit-btn

새 패널/카드는 가능한 .card 기반으로 만든다.

## 5. 비동기 메시지 오류 방지

다음 콘솔 오류가 반복적으로 발생하지 않게 방어한다.

A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received

이 오류는 브라우저 확장 프로그램 또는 비동기 메시지 채널에서 자주 발생할 수 있으므로 앱 동작을 방해하지 않게 처리한다.

index.html에는 다음 방어 코드를 유지한다.

window.addEventListener("unhandledrejection", (event) => {
const message = String(event.reason?.message || event.reason || "");
if (
message.includes("A listener indicated an asynchronous response") &&
message.includes("message channel closed before a response was received")
) {
event.preventDefault();
}
});

(이미 현재 프로젝트에도 동일한 방어 코드가 적용되어 있음 )

단, 이 코드는 앱 내부 오류를 숨기기 위한 용도로 남용하지 않는다.
앱 코드에서 발생한 오류는 반드시 원인을 찾아 수정한다.

## 6. 수정 범위 제한

요청받은 기능과 직접 관련 없는 파일은 수정하지 않는다.

예외:

여러 UI에 공통 적용되는 기능
저장 구조 변경
CSS 공통 규칙 수정
서비스 워커 캐시 갱신

수정 범위가 넓어질 경우 사전 승인 필요.

## 7. 반복 작업 보호 규칙

반복 작업은 반드시 아래 규칙을 유지한다.

완료/미완료 시 다음 사이클 생성
기존 항목은 기록 유지
새 항목이 마스터가 됨
중복 생성 금지
repeatGroupId / isRepeatMaster 삭제 금지
종료일 이후 생성 금지

## 8. 데이터 보호 규칙

저장 구조 변경 시:

기존 필드 삭제 금지
새 필드는 기본값 제공
null/undefined 방어
배열/객체 타입 검증 필수

## 9. DOM 안정성
id 중복 금지
optional chaining 사용
이벤트 바인딩 전 존재 체크
label-for 연결 필수
폼 필드는 접근 가능한 이름을 반드시 제공한다.
`input`, `select`, `textarea`는 `<label for="id">`로 연결하거나, 동적 생성 필드라면 `aria-label`을 제공한다.
라벨처럼 보이는 제목만 필요할 때는 연결되지 않은 `<label>`을 쓰지 말고 `.form-label` 같은 일반 요소를 사용한다.
로그인/회원가입을 제외한 일반 입력 필드는 `autocomplete="off"`를 기본으로 둔다.
로그인 이메일은 `autocomplete="username"`, 로그인 비밀번호는 `autocomplete="current-password"`, 가입/확인 비밀번호는 `autocomplete="new-password"`를 사용한다.

## 10. 이벤트 중복 방지
이벤트 위임 우선 사용
초기화 함수 1회 실행
중복 바인딩 금지

## 10-1. 모듈 분리 / 중복 선언 방지

JS 함수를 다른 파일로 분리하거나 import/export를 수정한 경우 반드시 아래를 확인한다.

- 같은 식별자가 같은 파일 안에서 `function`, `const`, `let`, `class`, `import`로 중복 선언되지 않게 한다.
- 분리한 함수를 삭제하기 전에 해당 이름을 `rg`로 전체 검색해서 다른 모듈 설정 콜백, 이벤트 핸들러, 템플릿 문자열에서 여전히 참조하는지 확인한다.
- `node --check`는 구문 오류만 잡으므로, 콜백 참조 누락 같은 런타임 오류를 막기 위해 분리한 식별자별로 잔여 참조 목록을 확인한다.
- 모듈로 옮긴 함수가 앱 상태를 필요로 하면 직접 전역을 읽지 말고 `configure...Module({ get..., set..., refs })` 형태로 의존성을 주입한다.
- 분리 후에는 최소한 다음 검사를 실행한다.

```powershell
rg -n "분리한함수명|분리한상태명" js index.html
rg --files -g "*.js" js | ForEach-Object { node --check $_ }
git diff --check
```

## 11. GitHub Pages 캐시 규칙

수정 시 반드시:

CACHE_VERSION 증가
JS 파일 리스트 반영
style.css 버전 변경

## 12. 테스트 체크리스트
기본
Live Server 정상
콘솔 오류 없음
로그인 정상
오프라인 정상
기능
할일/일정 CRUD
반복 생성 정상
달력 정상
자산/가계부 정상
모바일
가로 스크롤 없음
버튼 깨짐 없음
팝업 정상
탭바 겹침 없음

## 13. 응답 형식 규칙

작업 전:
→ 반드시 계획 먼저

작업 후:

수정 요약
변경 파일
변경 함수 전체
CSS 변경
테스트 체크리스트
changelog
commit 메시지
