import { PRODUCT_ASSET_BINDINGS, type ProductAssetBinding, type ProductAssetVariant } from '@thumbnail-generator/core';

/**
 * "assetKey"(core에서는 불투명한 문자열)를 실제 Figma 이미지로 해석하는 계층.
 *
 * V1 원래 설계는 "PRODUCT_ASSETS 페이지에 상품마다 노드를 하나씩 사람이 수동 등록"이었지만,
 * 실사용 진단 결과 이 페이지가 애초에 만들어진 적이 없어 모든 render가 asset lookup 단계에서
 * 실패하는 것으로 확인됐다(회사 파일 35개 상품을 하나씩 등록시키는 것도 비현실적). 대신
 * core의 ProductAssetBindings(productAssetBindings.ts)에 이미 있는 confirmed source
 * 정보(component-variant/image-node의 confirmedNodeId)를 1차 source of truth로 쓴다 —
 * 이 데이터는 실제 Figma 조사로 이미 확인된 것이라 별도 등록 없이 바로 쓸 수 있다.
 *
 * 우선순위:
 * 1) PRODUCT_ASSET_BINDINGS에서 assetKey가 일치하는 variant를 찾고, source의
 *    confirmedNodeId로 figma.getNodeByIdAsync() 조회 → 그 노드(또는 자손)의 IMAGE fill 사용.
 * 2) 위가 없거나(바인딩 자체가 없음/confirmedNodeId 없음/노드를 못 찾음/이미지 fill 없음)
 *    실패하면, 기존 방식(PRODUCT_ASSETS 페이지에서 이름=assetKey인 노드 조회)으로 폴백한다 —
 *    PRODUCT_ASSETS 페이지가 아예 없어도 1)이 성공하면 정상 렌더된다.
 * 3) 둘 다 실패하면 두 시도의 실패 사유를 모두 포함한 메시지로 명확히 실패한다.
 */

export const PRODUCT_ASSETS_PAGE_NAME = 'PRODUCT_ASSETS';

export type ResolveAssetResult = { ok: true; imageHash: string } | { ok: false; message: string };
export type RegisterAssetResult = { ok: true } | { ok: false; message: string };

function findProductAssetsPage(): PageNode | undefined {
  return figma.root.children.find(
    (p): p is PageNode => p.type === 'PAGE' && p.name === PRODUCT_ASSETS_PAGE_NAME,
  );
}

function getImageFill(node: BaseNode): ImagePaint | undefined {
  if (!('fills' in node)) return undefined;
  const fills = (node as unknown as { fills: ReadonlyArray<Paint> | typeof figma.mixed }).fills;
  if (fills === figma.mixed || !Array.isArray(fills)) return undefined;
  return fills.find((f): f is ImagePaint => f.type === 'IMAGE' && !!f.imageHash);
}

/** node 자신에게 IMAGE fill이 없으면 자손을 DFS로 훑어 처음 발견되는 IMAGE fill을 쓴다. */
function findImageHashDeep(node: BaseNode): string | undefined {
  const direct = getImageFill(node);
  if (direct?.imageHash) return direct.imageHash;
  if ('children' in node) {
    for (const child of (node as unknown as ChildrenMixin).children) {
      const found = findImageHashDeep(child);
      if (found) return found;
    }
  }
  return undefined;
}

function findAssetVariantByKey(
  assetKey: string,
  bindings: ProductAssetBinding[],
): ProductAssetVariant | undefined {
  for (const binding of bindings) {
    const variant = binding.variants.find((v) => v.assetKey === assetKey);
    if (variant) return variant;
  }
  return undefined;
}

/** ProductAssetBinding의 confirmed source(component-variant/image-node)로 직접 조회한다. */
async function resolveFromConfirmedBinding(variant: ProductAssetVariant): Promise<ResolveAssetResult | null> {
  const source = variant.source;
  const nodeId = source.kind === 'component-variant' ? source.confirmedNodeId : source.nodeId;
  if (!nodeId) return null; // confirmedNodeId가 없으면 이 경로로는 판단할 수 없음 -> legacy로

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    return {
      ok: false,
      message: `ProductAssetBinding에 등록된 source node(${nodeId})를 이 파일에서 찾을 수 없습니다(assetKey "${variant.assetKey}").`,
    };
  }

  const imageHash = findImageHashDeep(node);
  if (!imageHash) {
    return {
      ok: false,
      message: `source node(${nodeId}, "${node.name}")와 그 하위에서 IMAGE fill을 찾을 수 없습니다(assetKey "${variant.assetKey}").`,
    };
  }

  return { ok: true, imageHash };
}

async function resolveFromLegacyProductAssetsPage(productKey: string): Promise<ResolveAssetResult> {
  const page = findProductAssetsPage();
  if (!page) {
    return {
      ok: false,
      message: `"${PRODUCT_ASSETS_PAGE_NAME}" 페이지를 이 파일에서 찾을 수 없습니다.`,
    };
  }
  await page.loadAsync();

  const node = page.children.find((n) => n.name === productKey);
  if (!node) {
    return { ok: false, message: `"${PRODUCT_ASSETS_PAGE_NAME}"에서 상품 "${productKey}"를 찾을 수 없습니다.` };
  }

  const imageFill = getImageFill(node);
  if (!imageFill) {
    return { ok: false, message: `상품 노드 "${productKey}"에 이미지 fill이 없습니다.` };
  }

  return { ok: true, imageHash: imageFill.imageHash! };
}

/** 등록된 상품 키 목록 (플러그인 UI에 상품 목록으로 보여주기 위함) — legacy PRODUCT_ASSETS 페이지 기준. */
export async function listProductAssets(): Promise<string[]> {
  const page = findProductAssetsPage();
  if (!page) return [];
  await page.loadAsync();
  return page.children.filter((n) => getImageFill(n)).map((n) => n.name);
}

/**
 * productKey(=core CompositionPlanSlot.assetKey) → 실제 Figma 이미지 hash.
 * 1) ProductAssetBinding의 confirmed source를 먼저 시도하고, 2) 실패하면 legacy
 * PRODUCT_ASSETS 페이지로 폴백한다. 위 클래스 주석의 우선순위를 그대로 구현한다.
 * bindings는 테스트에서 mock binding 목록을 주입하기 위함 — 생략하면 실제 프로덕션 데이터
 * (core의 PRODUCT_ASSET_BINDINGS)를 쓴다.
 */
export async function resolveProductAsset(
  productKey: string,
  bindings: ProductAssetBinding[] = PRODUCT_ASSET_BINDINGS,
): Promise<ResolveAssetResult> {
  const variant = findAssetVariantByKey(productKey, bindings);
  let bindingFailureMessage: string | null = null;

  if (variant) {
    const bindingResult = await resolveFromConfirmedBinding(variant);
    if (bindingResult?.ok) return bindingResult;
    bindingFailureMessage =
      bindingResult?.message ?? `ProductAssetBinding(assetKey "${productKey}")에 confirmedNodeId가 없습니다.`;
  }

  const legacyResult = await resolveFromLegacyProductAssetsPage(productKey);
  if (legacyResult.ok) return legacyResult;

  if (bindingFailureMessage) {
    return {
      ok: false,
      message: `ProductAssetBinding 기반 조회 실패: ${bindingFailureMessage} / legacy PRODUCT_ASSETS 조회도 실패: ${legacyResult.message}`,
    };
  }
  return legacyResult;
}

/**
 * 관리자용: 캔버스에서 현재 선택된 노드(기존 썸네일 안에서 쓰이던 상품 이미지 레이어 등)의
 * 이미지를 그대로 재사용해서 PRODUCT_ASSETS 페이지에 새 상품으로 등록한다.
 * 이미지를 다시 업로드하지 않고 기존 imageHash만 참조하므로 원본 데이터가 중복되지 않는다.
 */
export async function registerProductAssetFromSelection(productKey: string): Promise<RegisterAssetResult> {
  const trimmedKey = productKey.trim();
  if (!trimmedKey) {
    return { ok: false, message: '상품 키를 입력해주세요.' };
  }

  const [selected] = figma.currentPage.selection;
  if (!selected) {
    return { ok: false, message: '캔버스에서 재사용할 이미지 레이어를 먼저 선택해주세요.' };
  }

  const imageFill = getImageFill(selected);
  if (!imageFill) {
    return { ok: false, message: `선택한 레이어 "${selected.name}"에 이미지 fill이 없습니다.` };
  }

  let page = findProductAssetsPage();
  if (!page) {
    page = figma.createPage();
    page.name = PRODUCT_ASSETS_PAGE_NAME;
  }
  await page.loadAsync();

  if (page.children.some((n) => n.name === trimmedKey)) {
    return { ok: false, message: `"${trimmedKey}"는 이미 "${PRODUCT_ASSETS_PAGE_NAME}"에 등록되어 있습니다.` };
  }

  const rect = figma.createRectangle();
  rect.name = trimmedKey;
  rect.resize(400, 400);
  rect.fills = [{ type: 'IMAGE', imageHash: imageFill.imageHash!, scaleMode: 'FILL' }];

  const index = page.children.length;
  rect.x = (index % 5) * 450;
  rect.y = Math.floor(index / 5) * 450;

  page.appendChild(rect);

  return { ok: true };
}
