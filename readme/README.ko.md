# ASCII Canvas

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | 한국어

React와 TypeScript로 구축된 브라우저 기반 ASCII 아트 에디터입니다. 직관적인 캔버스 인터페이스로 ASCII 드로잉을 생성할 수 있으며, 다양한 그리기 도구, 실행 취소/다시 실행 지원 및 실시간 렌더링 기능을 제공합니다.

## 기능

- **다양한 그리기 도구**: 선택, 브러시, 선, 상자, 지우개, 채우기 도구
- **텍스트 입력 모드**: 커서 탐색이 가능한 직접 텍스트 입력
- **선택 및 클립보드**: 영역 선택, ASCII 콘텐츠 복사/잘라내기/붙여넣기
- **실행 취소/다시 실행**: Yjs 및 Zundo 기반의 완전한 히스토리 관리
- **캔버스 탐색**: 마우스/터치 제스처로 이동 및 확대/축소
- **내보내기**: 작품을 클립보드에 복사
- **전각 문자 지원**: 전각 문자(CJK)를 올바르게 처리

## 기술 스택

- **프레임워크**: React 19 + TypeScript
- **빌드 도구**: Vite
- **상태 관리**: Zustand with Zundo (실행 취소/다시 실행용)
- **스타일링**: Tailwind CSS
- **UI 컴포넌트**: Radix UI 프리미티브
- **알림**: Sonner
- **제스처**: @use-gesture/react
- **협업 지원**: Yjs 공유 데이터 구조

## 프로젝트 구조

```
src/
├── components/
│   ├── AsciiCanvas/          # 메인 캔버스 컴포넌트
│   │   ├── hooks/            # useCanvasInteraction, useCanvasRenderer
│   │   └── index.tsx
│   ├── Toolbar.tsx           # 그리기 도구 UI
│   └── ui/                   # Radix UI 컴포넌트
├── store/
│   └── canvasStore.ts        # Zustand 스토어 (캔버스 상태)
├── utils/
│   ├── char.ts               # 문자 너비 감지
│   ├── export.ts             # 문자열로 내보내기
│   ├── shapes.ts             # 선/상자 그리기 알고리즘
│   ├── selection.ts          # 선택 영역 경계 계산
│   └── math.ts               # 그리드/스크린 좌표 변환
├── lib/
│   ├── constants.ts          # 앱 상수 (확대/축소 제한 등)
│   ├── yjs-setup.ts          # Yjs 구성
│   └── utils.ts              # 공통 유틸리티
└── types/
    └── index.ts              # TypeScript 타입 정의
```

## 시작하기

### 사전 요구사항

- Node.js (버전 18 이상 권장)
- npm 또는 yarn

### 설치

```bash
# 저장소 복제
git clone <repository-url>
cd ascii-canvas

# 의존성 설치
npm install
```

### 개발

```bash
# 핫 리로드가 포함된 개발 서버 시작
npm run dev
```

브라우저에서 [http://localhost:5173](http://localhost:5173)을 엽니다.

### 빌드

```bash
# 타입 체크 및 프로덕션 빌드
npm run build

# 프로덕션 빌드 미리보기
npm run preview
```

### 린팅

```bash
# ESLint 실행
npm run lint

# Knip으로 사용하지 않는 내보내기 찾기
npm run knip
```

## 사용법

### 그리기 도구

- **선택**: 클릭하여 텍스트 커서 배치, 드래그하여 선택 영역 생성
- **브러시**: 현재 브러시 문자로 자유 그리기
- **선**: 직선 그리기
- **상자**: 직사각형 윤곽 그리기
- **채우기**: 선택한 영역을 문자로 채우기
- **지우개**: 캔버스에서 문자 제거

### 키보드 단축키

- `Ctrl/Cmd + Z`: 실행 취소
- `Ctrl/Cmd + Shift + Z` 또는 `Ctrl/Cmd + Y`: 다시 실행
- `Ctrl/Cmd + C`: 선택 영역 복사
- `Ctrl/Cmd + X`: 선택 영역 잘라내기
- `Ctrl/Cmd + V`: 붙여넣기
- `Delete` 또는 `Backspace`: 선택 영역 삭제
- `Esc`: 텍스트 입력 모드 종료
- 화살표 키: 텍스트 커서 이동

### 캔버스 탐색

- **이동**: 마우스로 클릭 및 드래그
- **확대/축소**: 마우스 휠 또는 핀치 제스처

## 아키텍처 하이라이트

### 상태 관리

이 앱은 Yjs를 기본 데이터 구조로 사용하여 Zustand로 상태를 관리합니다. 이를 통해 다음이 가능합니다:

- Yjs 트랜잭션을 통한 효율적인 실행 취소/다시 실행
- 실시간 협업 가능성
- 불변 업데이트 패턴

### 렌더링

캔버스는 HTML5 Canvas API와 커스텀 렌더러(`useCanvasRenderer`)를 사용합니다:

- 성능을 위해 보이는 그리드 셀만 렌더링
- 그리기 중 미리보기를 위한 스크래치 레이어 지원
- 전각 문자(CJK)를 올바르게 처리

### 그리기 알고리즘

- **선**: Bresenham의 직선 알고리즘
- **상자**: 모서리 간 직사각형 그리기
- **선택**: 경계 계산을 포함한 다중 영역 지원

## 기여

기여를 환영합니다! 이슈나 풀 리퀘스트를 자유롭게 제출해 주세요.

## 라이선스

MIT
