# 썸네일 자동생성 — 파일럿 (LAYOUT_02)

## 빌드 없이 테스트하기 (회사 PC용 — GitHub 웹 ZIP)

회사 PC에서 GitHub Desktop이나 로컬 npm 빌드를 쓰기 어려운 경우를 위해, `dist/code.js`,
`dist/ui.html`(빌드 산출물)을 예외적으로 이 저장소에 커밋해 두었습니다. 아래 순서만으로
빌드 없이 바로 Figma에서 플러그인을 실행할 수 있습니다.

1. GitHub 웹에서 이 저장소의 해당 브랜치(`claude/figma-node-structure-rxlryu`) 페이지로 이동합니다.
2. `Code` 버튼 → `Download ZIP` 클릭.
3. 압축을 풉니다.
4. Figma 데스크톱 앱에서 `Plugins → Development → Import plugin from manifest...` 선택 →
   압축을 푼 폴더 안의 `packages/figma-plugin/manifest.json`을 선택합니다.
5. 바로 실행됩니다. `npm install`, `npm run build` 등 아무것도 실행할 필요가 없습니다.

**주의**: `dist/`는 소스가 바뀔 때마다 다시 빌드해서 커밋해야 최신 상태가 유지됩니다
(이 저장소에서는 소스를 고칠 때마다 `npm run build:plugin`을 실행하고 `dist/`까지 함께
커밋·푸시하는 것을 규칙으로 합니다). ZIP으로 받는 쪽에서 직접 `dist`를 만들 필요는 없습니다.

## 목적
기존 Figma 디자인을 전혀 흐트러뜨리지 않고, 자동 생성 파이프라인(core.composePlan → templateMapper → renderer)이
실제로 동작하는지 검증하는 최소 스모크 테스트입니다.

## mock으로 검증하기 (기본 개발/테스트 방법)

회사 Figma 파일/데스크톱 앱 없이, 아래 명령 하나로 templateMapper/renderer/assetResolver(에셋
매핑 구조)를 자동 검증할 수 있습니다.

```bash
npm run test --workspace=@thumbnail-generator/figma-plugin
```

`src/mock/mockFigma.ts`가 실제 Figma 전역 API(`figma.*`)의 필요한 부분만 흉내낸 인메모리 구현이고,
`src/mock/mockTemplate.ts`가 **실제 회사 파일과 같은 구조**(프레임 안에 이미지 슬롯 레이어 여러 개 +
`PRODUCT_ASSETS` 페이지)를 갖되 이름/이미지는 전부 가짜인 mock 문서를 조립합니다.
`renderer.ts`/`assetResolver.ts`는 이 테스트를 위해 코드를 전혀 바꾸지 않습니다 — 테스트 대상
코드와 실제 배포 코드가 100% 동일합니다. `packages/figma-plugin/test/assetMapping.test.ts`가
성공 케이스(3슬롯 채우기 + 원본 미변경) + 실패 케이스 2가지(레이어 없음, 미등록 asset)를 검증합니다.

아래의 "Figma 데스크톱에서 로드하는 방법"은 **선택 사항**입니다 — 실제 화면에서 눈으로 확인하고
싶을 때만 쓰고, 그때도 회사 파일이 아니라 개인 Figma 계정에 같은 구조로 만든 파일을 사용하세요.
`FIGMA_TEMPLATE_BINDINGS`(templateMapper.ts)에 있는 실제 회사 프레임/레이어 이름은 개발 단계
검증 대상이 아니라, 별도 승인을 거친 배포 단계에서만 실제로 사용됩니다.

## 파일럿 범위
- Layout: `LAYOUT_02` (대표 frame: `네이버_소고기장조림130_3`, node `69:417`)
- 상품: 1종 × 3개 구성만 지원
- 채널: 네이버 1000×1000 하나만 지원
- 상품 이미지는 **로컬 파일 업로드가 아니라 현재 파일의 `PRODUCT_ASSETS` 페이지**에서 가져옴
- 로고 / 딱지 / 보관라벨 / 채널 전환 / Excel / PNG export 는 구현하지 않음
- 슬롯 레이어 또는 이미지 asset을 찾지 못하면 결과를 만들지 않고 오류 메시지만 표시

## 상품 asset 등록 방식 (`PRODUCT_ASSETS`)
로컬 PNG 업로드 대신, **현재 파일 안에 이미 있는 이미지 레이어를 재사용**한다.

- `PRODUCT_ASSETS`라는 이름의 페이지 아래에 상품별 노드를 둔다. 노드 이름이 곧 상품 키(assetKey)다.
- 새 이미지를 업로드하지 않고, 기존 썸네일 안의 상품 이미지 레이어(예: `네이버_소고기장조림130_1` 프레임의
  `image 312`)를 캔버스에서 선택한 뒤 플러그인 UI의 "선택한 레이어로 등록"을 누르면, 그 레이어가 가진
  기존 `imageHash`를 그대로 재사용해 `PRODUCT_ASSETS`에 새 노드를 만든다 (이미지 데이터 자체는 복제되지 않음).
- `PRODUCT_ASSETS` 페이지가 아직 없으면 등록 시 플러그인이 자동으로 만든다.
- 간편식/영유아처럼 파일이 분리된 경우, 각 파일에 자기 `PRODUCT_ASSETS`를 두고 동일한 플러그인이
  "현재 열려 있는 파일"의 `PRODUCT_ASSETS`만 읽는다.

## 동작 방식
1. **(최초 1회) 등록**: 캔버스에서 기존 상품 이미지 레이어를 선택 → UI에 상품 키(예: `소고기장조림130g`)를
   입력하고 "선택한 레이어로 등록" 클릭. `PRODUCT_ASSETS` 페이지에 해당 이미지를 재사용하는 노드가 생긴다.
2. UI가 `PRODUCT_ASSETS`에 등록된 상품 목록을 드롭다운으로 보여준다. 상품과 수량(기본값 3)을 선택하고
   "결과 프레임 생성" 클릭.
3. `code.ts`가 `core.composePlan()`으로 `CompositionPlan`(슬롯 3개, 모두 같은 productKey/assetKey)을 만든다.
4. `renderer.ts`가 원본 프레임(`네이버_소고기장조림130_3`, node `69:417`)을 찾아 **clone**하고 원본 옆
   (오른쪽으로 120px)에 배치한 뒤, `image 313`/`image 409`/`image 410` 레이어를 찾아
   `assetResolver.resolveProductAsset()`으로 얻은 이미지로 fill만 교체한다.
5. 레이어/등록된 asset을 못 찾거나 수량이 슬롯 수(3)와 다르면, 즉시 clone을 제거하고 오류만 표시한다
   (부분 실패 상태를 남기지 않음 — fallback 없음).

원본 프레임은 어떤 경우에도 수정하지 않습니다 — 오직 `clone()`된 새 프레임과 `PRODUCT_ASSETS`
페이지에 새로 추가되는 등록 노드만 변경됩니다.

## 빌드
```bash
npm install
npm run build:plugin
```
`packages/figma-plugin/dist/code.js`, `dist/ui.html`이 생성됩니다.

## Figma 데스크톱에서 로드하는 방법 (선택 사항 — 개인 Figma 계정)

이 저장소를 준비한 원격 환경에는 Figma 데스크톱 앱이 없어서, 실제 캔버스에서 clone/이미지 교체가
동작하는지는 이 세션에서 직접 확인할 수 없습니다. 자동 mock 테스트(위)로 로직은 이미 검증되므로
이 절차는 필수가 아니지만, 눈으로 직접 보고 싶다면 **회사 파일이 아니라 개인 Figma 계정**에
아래와 같은 구조의 프레임을 하나 만들어서 확인하세요:
- 임의 이름의 FRAME 하나, 그 안에 이미지 fill이 있는 레이어 3개
- `PRODUCT_ASSETS`라는 이름의 페이지, 그 안에 이미지 fill이 있는 노드 몇 개(각 노드 이름이 상품 키)

그다음 `templateMapper.ts`의 `FIGMA_TEMPLATE_BINDINGS`를 그 프레임/레이어 이름에 맞게 임시로
고쳐서 빌드하면(회사 값으로 되돌리는 것을 잊지 마세요), 아래 순서로 확인할 수 있습니다.

1. `Plugins → Development → Import plugin from manifest...` 에서
   `packages/figma-plugin/manifest.json`을 선택합니다.
2. 캔버스에서 이미지가 있는 레이어를 선택 → 플러그인 UI에서 상품 키를 입력하고 "선택한 레이어로 등록".
3. 드롭다운에서 방금 등록한 상품을 선택, 수량을 슬롯 수에 맞춰 확인 후 "결과 프레임 생성" 클릭.
4. 원본 프레임 오른쪽에 `(자동생성 결과)` 프레임이 생기고, 슬롯에 등록한 이미지가 채워지는지,
   원본은 그대로인지 확인합니다.

## 실패 케이스 확인 방법
- 수량을 3이 아닌 값으로 바꿔서 생성 → `NO_LAYOUT_WITH_MATCHING_SLOT_COUNT` 오류가 뜨는지 확인 (fallback 없음 정책 검증).
- `packages/figma-plugin/src/templateMapper.ts`의 `layerName` 값을 일부러 존재하지 않는 이름으로 바꾼 뒤
  빌드/재로드하면, 결과 프레임이 생성되지 않고 오류 메시지만 뜨는지 확인할 수 있습니다.
- `PRODUCT_ASSETS`에 아무것도 등록하지 않은 상태에서 "결과 프레임 생성"을 시도하면 목록이 비어 있어
  버튼이 비활성화되는지 확인합니다.

## Excel 일괄 검증 탭 (신규)

플러그인 UI 상단의 "Excel 일괄 검증" 탭에서 `templates/썸네일_자동화_요청서.xlsx` 형식의 파일을
선택하면, `01_작업요청`을 작업ID 기준으로 묶어 정상(valid) / 검토필요(reviewRequired) / 오류(error)
상태를 표로 보여줍니다. **아직 Figma 생성과는 연결되어 있지 않습니다** — 읽기·검증·미리보기까지만
동작합니다.

- 상품군/채널/딱지여부가 목록에 없거나, 같은 작업ID 안에서 서로 다르거나, 상품코드를 찾지
  못하거나, 수량이 유효하지 않으면 `error`.
- 비고가 있으면(등록된 문구인지와 무관하게) `reviewRequired`.
- 위 문제가 전혀 없으면 `valid`.

이 UI는 `@thumbnail-generator/core/import`(`readWorkOrderSheet`, `parseWorkOrderRows`)를 그대로
사용합니다. Excel 파싱에 쓰는 `exceljs`는 UI(iframe) 번들에만 들어가고, Figma 메인 스레드
번들(`code.ts` → `dist/code.js`)에는 포함되지 않도록 `@thumbnail-generator/core`의 메인 진입점과
`./import` 서브패스를 분리해 두었습니다 — `code.ts`에서는 절대 `@thumbnail-generator/core/import`를
import하지 마세요 (다시 code.js가 부풀어 오릅니다).
