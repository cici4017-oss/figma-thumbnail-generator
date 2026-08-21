# 썸네일 자동생성 — 파일럿 (LAYOUT_02)

## 목적
기존 Figma 디자인을 전혀 흐트러뜨리지 않고, 자동 생성 파이프라인(core.composePlan → templateMapper → renderer)이
실제로 동작하는지 검증하는 최소 스모크 테스트입니다.

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

## Figma 데스크톱에서 로드하는 방법
> 이 저장소를 준비한 원격 환경에는 Figma 데스크톱 앱이 없어서, 실제 캔버스에서 clone/이미지 교체가
> 동작하는지는 이 세션에서 직접 확인할 수 없습니다. 아래 절차로 **로컬에서** 확인해주세요.

1. `https://www.figma.com/design/v6UalGGplex8w2hzfbqwhI/...` 파일을 Figma 데스크톱 앱으로 엽니다.
2. `Plugins → Development → Import plugin from manifest...` 에서
   `packages/figma-plugin/manifest.json`을 선택합니다.
3. 캔버스에서 `네이버_소고기장조림130_1` 프레임 안의 `image 312` 레이어(또는 다른 소고기장조림 이미지
   레이어)를 선택 → 플러그인 UI에서 상품 키(예: `소고기장조림130g`) 입력 후 "선택한 레이어로 등록".
4. 드롭다운에서 방금 등록한 상품을 선택, 수량 3 확인 후 "결과 프레임 생성" 클릭.
5. `네이버_소고기장조림130_3` 원본 프레임 오른쪽에 `(자동생성 결과)` 프레임이 생기고,
   3개 슬롯에 등록한 이미지가 채워지는지, 원본은 그대로인지 확인합니다.

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
