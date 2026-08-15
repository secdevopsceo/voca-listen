# voca-listen

> 들으면서 외우는 나만의 단어장

영어·일본어·프랑스어 단어를 **소리로 들으며** 외우고, 시험까지 볼 수 있는 개인용 단어장 앱입니다.
서버도 계정도 없습니다. 모든 데이터는 브라우저 안에만 저장되고, 홈 화면에 설치하면 인터넷 없이도 그대로 쓸 수 있습니다.

---

## 주요 기능

### 📖 단어장

- 언어별(영어·일본어·프랑스어) 단어장을 직접 만들고, 단어·뜻·발음 표기·예문·품사·메모를 관리합니다.
- 첫 실행 때 **글로비시 1500단어**가 품사별 단어장 10개(명사·대명사·동사·조동사·형용사·부사·전치사·전치사구·접속사·관사)로 자동으로 들어갑니다. 단어마다 예문과 난이도·중요도(각 1~5)가 붙어 있습니다.
- 같은 단어를 또 넣으면 「있는 것의 뜻 고치기 / 새로 하나 더 만들기」를 물어봅니다.
- 삭제는 **휴지통**을 거칩니다. 되살릴 수 있고, 완전히 비우는 것은 따로 확인합니다.

### 🎧 듣기 학습

- Web Speech API 로 단어를 읽어 줍니다. 읽는 범위는 네 단계 — 단어만 / +뜻 / +예문 / +예문 뜻.
- 자동으로 이어 듣기, 반복 횟수·항목 사이 간격, 읽기 속도(0.5~2배), 여성/남성 목소리를 설정할 수 있습니다.
- 언어별로 알맞은 음성을 골라 씁니다(영어·일본어·프랑스어·한국어). 못 찾으면 공통 음성으로 물러섭니다.
- **듣는 순서는 알파벳순이 아닙니다.** ① 틀린 적 있는 단어(많이 틀린 순) → ② 한 번도 시험 안 본 단어(중요도 높은 순) → ③ 맞혔던 단어(복습할 때가 이른 순).

### ✅ 시험

세 가지 모드로 10·20·50·100문제를 풉니다. 보기는 4개의 뜻 + 「모른다」 5지선다입니다.

| 모드 | 내용 |
| --- | --- |
| 눈으로 풀기 | 단어와 예문이 보이고, 버튼을 누르면 소리도 들립니다 |
| 듣고 풀기 | 단어를 보여주지 않고 소리만 들려줍니다 |
| 예문 듣고 풀기 | 예문을 소리로만 들려주고, 그 문장의 뜻을 고릅니다 |

채점 뒤에는 틀린 문제를 다시 볼 수 있고, 결과가 단어별 학습 기록에 반영됩니다.

### 📊 통계

- 가진 단어 / 시험 본 단어 / 다 외운 단어 / 오늘 복습할 단어, 전체 정답률, 시험 횟수
- 날짜별 정답률 그래프(Recharts), 최근 시험 목록
- **오답 노트**(틀린 횟수 많은 순), 별표한 단어
- 저장공간 사용량과 경고
- **점수만 지우기** — 시험 기록·맞힘/틀림 횟수·복습 진도·별표만 지우고 단어와 단어장은 남깁니다.

### ⚙️ 설정 · 데이터

- 소리 읽기(속도·목소리·읽는 범위·반복·간격), 화면 테마(밝게/어둡게/기기 설정), 화면 언어(한국어/English)
- **공부할 범위** — 중요도·난이도로 걸러서 듣기·시험·단어장 목록에 한꺼번에 적용합니다.
- **내보내기 / 가져오기**
  - 전체 JSON — 학습 기록·시험 기록까지 포함한 완전 복원용
  - 단어만 CSV — 엑셀에서 고칠 수 있는 형식 (`wordbook, lang, term, meaning, reading, example, exampleMeaning, partOfSpeech, difficulty, importance, memo`)
  - 가져올 때 같은 단어를 만나면 「건너뛰기 / 덮어쓰기」를 고릅니다.

### 📱 PWA · 오프라인

- 홈 화면에 추가하면 앱처럼 전체화면으로 열립니다.
- 앱을 열면 화면 6개를 **알아서 미리 받아 둡니다.** 단어장 화면의 **「준비하기」** 버튼으로 직접 시키고 진척(`화면 n/6 저장됨`)을 확인할 수도 있습니다.
- 데이터가 처음부터 브라우저 안에 있으므로, 오프라인에서도 단어 추가·듣기·시험·통계가 모두 됩니다.

---

## 시작하기

필요한 것: **Node.js 20+**, **pnpm 10+**

```bash
pnpm install
pnpm dev
```

브라우저에서 [http://localhost:3060](http://localhost:3060) 을 엽니다. 첫 화면은 `/ui/wordbooks` 로 넘어갑니다.

### 스크립트

| 명령 | 설명 |
| --- | --- |
| `pnpm dev` | 개발 서버 (Turbopack, 포트 3060). PWA 는 꺼집니다 |
| `pnpm build` | 프로덕션 빌드 (**webpack 고정** — 아래 주의사항 참고) |
| `pnpm start` | 빌드 결과 실행 (포트 3060) |
| `pnpm lint` | ESLint |
| `pnpm test` | Jest (jsdom) |

모든 스크립트는 `TZ=UTC` 로 실행됩니다. 저장되는 시각이 전부 UTC ISO 8601 이라 시간대에 따라 결과가 흔들리지 않게 하기 위함입니다.

---

## 기술 스택

| 분류 | 사용 기술 |
| --- | --- |
| 프레임워크 | Next.js 16 (App Router, RSC) · React 19 |
| 언어 | TypeScript 5 |
| 스타일 | Tailwind CSS 4 · shadcn/ui (`base-nova`) · Base UI · lucide-react |
| 상태 | Redux Toolkit + redux-persist (**화면 상태만**) |
| 검증 | Zod 4 |
| 국제화 | next-intl (쿠키 기반 로케일, URL 경로 없음) |
| 그래프 | Recharts |
| PWA | @ducanh2912/next-pwa (Workbox) |
| 알림 | Sonner |
| 테스트 | Jest 30 + jsdom |

---

## 프로젝트 구조

```
src/
├─ app/
│  ├─ layout.tsx            # 폰트·i18n·Provider 를 거는 최상위 레이아웃
│  ├─ page.tsx              # /ui/wordbooks 로 리다이렉트
│  ├─ manifest.ts           # PWA 매니페스트
│  ├─ ~offline/             # 오프라인 대체 화면 (next-pwa 가 미리 저장)
│  └─ ui/
│     ├─ layout.tsx         # 머리말 + 본문 + 아래 탭 막대
│     ├─ wordbooks/         # 단어장 · 휴지통
│     ├─ listen/            # 듣기 학습
│     ├─ quiz/              # 시험 (준비 → 진행 → 결과)
│     ├─ stats/             # 통계
│     ├─ settings/          # 설정 · 내보내기/가져오기
│     ├─ components/common/ # 화면 공통 조각 (탭·헤더·스피커 버튼 등)
│     └─ i18n/              # ko.json · en.json
├─ components/
│  ├─ providers.tsx         # Redux · 테마 · Tooltip
│  └─ ui/                   # shadcn/ui 컴포넌트
├─ hooks/                   # useTTS · useSettings · useStoredData · useStudyRange …
├─ lib/
│  ├─ storage/              # localStorage 접근 계층 (키·타입·마이그레이션)
│  ├─ services/             # 업무 규칙 계층 (wordbook · word · quiz · stats · backup · reset · seed · review)
│  ├─ seed/                 # 글로비시 1500단어 · 예문 · 등급 · 품사 순서
│  ├─ tts/                  # 읽을 덩어리 만들기 · 언어별 음성 고르기
│  ├─ i18n/                 # 로케일 설정 (쿠키)
│  ├─ study-range.ts        # 공부할 범위 규칙
│  ├─ study-order.ts        # 듣기 순서 규칙
│  └─ offline.ts            # 오프라인 준비
└─ store/                   # Redux (화면 상태 전용)
```

### 계층 규칙

```
화면 (app/ui)  →  hooks  →  services (lib/services)  →  storage (lib/storage)  →  localStorage
```

- **storage** 는 저장·읽기만 합니다. 키 문자열은 `lib/storage/_keys.ts` 한 곳에만 있습니다.
- **services** 는 업무 규칙을 담당하고, **예외를 던지지 않습니다.** 성공/실패를 값으로 돌려줍니다.

  ```ts
  type ServiceResult<T> =
    | { ok: true; data: T }
    | { ok: false; reason: FailureReason; message?: string };
  ```

  실패 사유는 영어 코드(`wordbookNotFound`, `storageFull` …)로 주고, 화면이 그 코드를 i18n 키로 바꿔 사람 말로 보여줍니다. 사용자에게 보이는 문자열은 코드에 하드코딩하지 않습니다.
- **테스트는 원본 파일 바로 옆에** 둡니다 (`quiz.ts` ↔ `quiz.test.ts`). `__tests__` 폴더는 쓰지 않습니다.

---

## 데이터 저장

서버도 DB 도 없습니다. 모든 데이터는 `voca-listen:` 접두사가 붙은 **localStorage** 키에 들어갑니다.

| 키 | 내용 |
| --- | --- |
| `voca-listen:schema-version` | 저장 구조 버전 |
| `voca-listen:wordbooks` | 단어장 |
| `voca-listen:words` | 단어 |
| `voca-listen:word-records` | 단어별 학습 기록 (맞힘/틀림/복습 단계) |
| `voca-listen:quiz-results` | 시험 1회 기록 |
| `voca-listen:settings` | 설정 (1행) |
| `voca-listen:meta` | 시드 버전 표시 |

- 모든 시각은 **UTC ISO 8601 문자열**입니다.
- 삭제는 `deletedAt` 을 채우는 **소프트 삭제**입니다(휴지통). 완전 삭제는 휴지통 비우기에서만 일어납니다.
- Redux + redux-persist 에는 **화면 상태(고른 단어장·필터)만** 남깁니다. 진짜 데이터를 두 벌로 만들지 않습니다.

> 🚨 저장 항목의 모양을 바꾸면 `SCHEMA_VERSION` 을 올리고 `lib/storage/_client.ts` 의 마이그레이션에 항목을 추가해야 합니다. 버전만 올리면 낡은 저장분이 조용히 되살아나 지금 타입과 어긋납니다.

### 망각곡선 복습 규칙

시험에서 맞히면 복습 단계가 1 오르고, 틀리거나 「모른다」를 고르면 **1 단계로 되돌아갑니다.**

| 단계 | 0 | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- |
| 다음 복습까지 | 아직 안 봄 | 1일 | 3일 | 7일 | 14일 | 30일 |

최고 단계(5)에 도달하면 통계에서 **「다 외운 단어」**로 셉니다.

---

## 테스트

```bash
pnpm test
```

- 환경은 **jsdom** 입니다(저장소가 localStorage 라서).
- 변환은 `next/jest`(Next 내장 SWC)를 씁니다. 별도 babel 설정은 두지 않습니다.
- 순수 계산 로직(복습 규칙·듣기 순서·공부할 범위·음성 고르기)과 서비스 계층을 원본 옆의 `*.test.ts` 로 덮습니다.

---

## 주의사항

작업하기 전에 꼭 읽어야 하는 항목들입니다. 자세한 배경은 각 파일의 `🚨` 주석에 적혀 있습니다.

- **`pnpm build` 에서 `--webpack` 을 빼지 마세요.** next-pwa 는 webpack 플러그인이라 Turbopack 빌드에서는 동작하지 않습니다. 플래그를 빼면 서비스 워커가 만들어지지 않아 설치·오프라인이 **조용히** 사라집니다.
- **`workboxOptions.navigateFallback` 을 다시 넣지 마세요.** 이 앱의 화면은 쿠키로 언어를 정하는 동적 렌더링이라 precache 목록에 들어가지 않고, 그 상태에서 `navigateFallback` 을 주면 서비스 워커가 설치 단계에서 throw 해 오프라인이 통째로 죽습니다. 인터넷이 있을 때는 멀쩡해 보여서 원인을 찾기 어렵습니다.
- **개발 중에는 PWA 가 꺼져 있습니다.** 서비스 워커가 캐시를 붙들면 고친 내용이 화면에 나오지 않기 때문입니다. 오프라인 동작을 확인하려면 `pnpm build && pnpm start` 로 확인하세요.
- **화면을 새로 만들면 `lib/offline.ts` 의 `OFFLINE_ROUTES` 에 추가하세요.** 빠뜨린 화면은 오프라인에서 열리지 않습니다.
- **사용자에게 보이는 문자열을 코드에 직접 쓰지 마세요.** `src/app/ui/i18n/{ko,en}.json` 에 넣고 키로 부릅니다.
- **이 저장소의 Next.js 는 일반적인 버전과 다릅니다.** 코드를 쓰기 전에 [AGENTS.md](AGENTS.md) 와 `node_modules/next/dist/docs/` 의 해당 문서를 먼저 확인하세요.

---

## 기타

- 앱 아이콘은 `scripts/make-icons.py` 로 만듭니다 (`public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`).
- 화면 언어는 URL 이 아니라 `NEXT_LOCALE` 쿠키로 정합니다.

## 라이선스

[GNU AGPL v3](LICENSE)
