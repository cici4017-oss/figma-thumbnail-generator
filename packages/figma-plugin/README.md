# 썸네일 자동생성 — 파일럿 (LAYOUT_02)

## 목적
기존 Figma 디자인을 전혀 흐트러뜨리지 않고, 자동 생성 파이프라인(core.composePlan → templateMapper → renderer)이
실제로 동작하는지 검증하는 최소 스모크 테스트입니다.

## 파일럿 범위
- Layout: `LAYOUT_02` (대표 frame: `네이버_소고기장조림130_3`, node `69:417`)
- 상품: 1종 × 3개 구성만 지원
- 채널: 네이버 1000×1000 하나만 지원
- 로고 / 딱지 / 보관라벨 / 채널 전환 / Excel / PNG export 는 구현하지 않음
- 슬롯 레이어 또는 이미지 asset을 찾지 못하면 결과를 만들지 않고 오류 메시지만 표시

## 동작 방식
1. UI에서 이미지 1장을 선택하고 "결과 프레임 생성"을 누릅니다.
2. `code.ts`가 이미지를 `figma.createImage()`로 등록해 `assetKey`(image hash)를 만들고,
   `core.composePlan()`으로 `CompositionPlan`(슬롯 3개, 모두 같은 assetKey)을 만듭니다.
3. `renderer.ts`가 현재 파일에서 원본 프레임(`네이버_소고기장조림130_3`, node `69:417`)을 찾아 **clone**하고,
   원본 옆(오른쪽으로 120px)에 배치합니다.
4. clone 안에서 `image 313` / `image 409` / `image 410` 레이어를 찾아 이미지 fill만 교체합니다.
5. 레이어를 못 찾거나 asset이 없으면 즉시 clone을 제거하고 오류만 표시합니다 (부분 실패 상태를 남기지 않음).

원본 프레임은 어떤 경우에도 수정하지 않습니다 — 오직 `clone()`된 새 프레임만 변경됩니다.

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
3. 플러그인을 실행하고 이미지를 선택 → "결과 프레임 생성" 클릭.
4. `네이버_소고기장조림130_3` 원본 프레임 오른쪽에 `(자동생성 결과)` 프레임이 생기고,
   3개 슬롯에 선택한 이미지가 채워지는지, 원본은 그대로인지 확인합니다.

## 실패 케이스 확인 방법
- `packages/figma-plugin/src/templateMapper.ts`의 `layerName` 값을 일부러 존재하지 않는 이름으로 바꾼 뒤
  빌드/재로드하면, 결과 프레임이 생성되지 않고 오류 메시지만 뜨는지 확인할 수 있습니다.
