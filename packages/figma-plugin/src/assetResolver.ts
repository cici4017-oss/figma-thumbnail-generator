/**
 * "assetKey"(core에서는 불투명한 문자열)를 실제 Figma 이미지로 해석하는 계층.
 * 로컬 파일 업로드에 의존하지 않고, 현재 열려 있는 파일의 `PRODUCT_ASSETS` 페이지를 source로 쓴다.
 *
 * - 상품 asset은 PRODUCT_ASSETS 페이지 아래의 노드로 존재하고, 노드 이름 = assetKey(상품 키)로 식별한다.
 * - 노드가 가진 기존 IMAGE fill의 imageHash를 그대로 재사용한다 (새로 업로드/복제하지 않음).
 * - 간편식/영유아처럼 파일이 분리된 경우, 같은 플러그인이 "현재 열려 있는 파일"의 PRODUCT_ASSETS만 본다.
 */

export const PRODUCT_ASSETS_PAGE_NAME = 'PRODUCT_ASSETS';

export type ResolveAssetResult = { ok: true; imageHash: string } | { ok: false; message: string };
export type RegisterAssetResult = { ok: true } | { ok: false; message: string };

function findProductAssetsPage(): PageNode | undefined {
  return figma.root.children.find(
    (p): p is PageNode => p.type === 'PAGE' && p.name === PRODUCT_ASSETS_PAGE_NAME,
  );
}

function getImageFill(node: SceneNode): ImagePaint | undefined {
  if (!('fills' in node)) return undefined;
  const fills = node.fills;
  if (fills === figma.mixed || !Array.isArray(fills)) return undefined;
  return fills.find((f): f is ImagePaint => f.type === 'IMAGE' && !!f.imageHash);
}

/** 등록된 상품 키 목록 (플러그인 UI에 상품 목록으로 보여주기 위함) */
export async function listProductAssets(): Promise<string[]> {
  const page = findProductAssetsPage();
  if (!page) return [];
  await page.loadAsync();
  return page.children.filter((n) => getImageFill(n)).map((n) => n.name);
}

/** productKey(=core CompositionPlanSlot.assetKey) → 실제 Figma 이미지 hash */
export async function resolveProductAsset(productKey: string): Promise<ResolveAssetResult> {
  const page = findProductAssetsPage();
  if (!page) {
    return {
      ok: false,
      message: `"${PRODUCT_ASSETS_PAGE_NAME}" 페이지를 이 파일에서 찾을 수 없습니다. 먼저 상품을 등록해주세요.`,
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
