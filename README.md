# 썸네일 자동화 (figma-thumbnail-generator)

Excel 작업지시서를 읽어 검증하고, 여러 채널·상품 구성에 맞는 Figma 썸네일을 자동 생성하기 위한
저장소. 상세 설계 배경은 커밋 히스토리를 참고.

## 구조

```
packages/
  core/           Figma·Web 어디에도 의존하지 않는 순수 로직 (타입, selectLayout/composePlan
                   엔진, Excel parser/batch validation)
  figma-plugin/   core를 소비하는 Figma 렌더러. UI(React) + Figma 플러그인 메인 스레드 코드.
templates/
  썸네일_자동화_요청서.xlsx   V1 표준 입력 규격 (작업지시 Excel)
```

## 개발 단계 vs 배포 단계 (중요)

실제 회사 환경에서는 개발 중인 플러그인 파일을 자유롭게 반입하거나, 회사 Figma 파일을
외부로 반출할 수 없다. 그래서 이 저장소는 두 단계를 명확히 분리한다.

### 개발 단계 (지금, 집/외부 환경)

- **회사 Figma 파일이나 데스크톱 앱 설치를 전제로 하지 않는다.**
- Excel parser, batch validation, layout selection, asset mapping(templateMapper/renderer/
  assetResolver) 구조는 전부 **mock 데이터로 로컬(Node)에서 자동 테스트**한다:
  - `packages/core/test/` — Excel parser, batch validation(작업ID 그룹핑/valid·reviewRequired·
    error 판정), layout selection(selectLayout)을 합성 데이터로 검증.
  - `packages/figma-plugin/test/` — `src/mock/mockFigma.ts`(실제 Figma 전역 API의 필요한
    부분만 흉내낸 인메모리 구현)와 `src/mock/mockTemplate.ts`(실제 회사 파일과 **같은 구조**를
    갖되 이름·이미지는 전부 가짜인 mock 템플릿/PRODUCT_ASSETS)로 asset mapping을 검증.
    renderer.ts/assetResolver.ts는 이 테스트를 위해 코드를 전혀 바꾸지 않는다 — 실제 배포
    코드와 테스트 대상 코드가 100% 동일하다.
- 실행:
  ```bash
  npm install
  npm run test        # core + figma-plugin 테스트 전부
  npm run typecheck
  ```
- 플러그인 UI를 직접 눌러보고 싶으면(선택 사항), 회사 파일이 아닌 개인 Figma 계정에 같은
  구조의 파일을 만들어서 확인한다. `packages/figma-plugin/README.md`의 "빌드 없이 테스트하기"
  절차로 GitHub 웹 ZIP만으로 로드할 수 있다.

### 배포 단계 (개발 완료 후, 별도 승인)

- `packages/figma-plugin/src/templateMapper.ts`의 `FIGMA_TEMPLATE_BINDINGS`는 실제 회사 Figma
  파일(프레임 이름, node id, 레이어 이름)을 가리키는 **PRODUCTION 전용 데이터**다. 이 바인딩이
  실제로 동작하는지는 회사 Figma 파일에 접근할 수 있는 환경(=배포 단계)에서만 검증된다.
- 회사 Figma에 실제로 설치·적용하는 것은 이 저장소의 자동 테스트 범위가 아니라, 개발이 끝난
  뒤 별도의 승인 절차를 거쳐 진행한다.

## 패키지별 문서

- `packages/figma-plugin/README.md` — 플러그인 빌드/로드 방법, mock 테스트, 실패 케이스 확인법.
- `templates/README.md` — 표준 요청서 Excel 템플릿 설명 및 재생성 방법.
