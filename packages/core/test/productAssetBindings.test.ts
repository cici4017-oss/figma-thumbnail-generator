import assert from 'node:assert/strict';
import {
  resolveProductAssetKey,
  resolveProductAssetVariant,
  DEFAULT_PRODUCT_ASSET_KIND,
  DOMAIN_PRODUCTS,
} from '../src/index';

/**
 * 한 상품이 여러 종류의 asset(package/plated-side/plated-top)을 가질 수 있는 구조와,
 * V1 basic이 실제로 'package'만 쓴다는 정책(DEFAULT_PRODUCT_ASSET_KIND)을 검증한다.
 */

// 1) 기본 kind는 'package'
{
  assert.equal(DEFAULT_PRODUCT_ASSET_KIND, 'package');
  console.log('  ✓ DEFAULT_PRODUCT_ASSET_KIND = package (V1 basic 검증된 썸네일 조사 결과)');
}

// 2) kind를 생략하면 package variant가 조회됨 (기존 단일-assetKey 시절과 동일한 값 유지)
{
  assert.equal(resolveProductAssetKey('SIMPLE_BEEF_JANGJORIM_130'), 'SIMPLE_BEEF_JANGJORIM_130');
  assert.equal(resolveProductAssetKey('SIMPLE_QUAIL_JANGJORIM_180'), 'SIMPLE_QUAIL_JANGJORIM_180');
  assert.equal(resolveProductAssetKey('SIMPLE_CHIVE_KKOMAK_240'), 'SIMPLE_CHIVE_KKOMAK_240');
  console.log('  ✓ kind 생략 시 package variant의 assetKey를 반환 (기존 파이프라인 하위호환)');
}

// 3) plated-side variant는 명시적으로 kind를 지정해야 조회됨
{
  const beefPlated = resolveProductAssetVariant('SIMPLE_BEEF_JANGJORIM_130', 'plated-side');
  assert.ok(beefPlated);
  assert.equal(beefPlated!.status, 'code-fallback');
  assert.equal(beefPlated!.source.kind, 'component-variant');

  const chivePlated = resolveProductAssetVariant('SIMPLE_CHIVE_KKOMAK_240', 'plated-side');
  assert.ok(chivePlated);
  assert.equal(chivePlated!.status, 'confirmed');
  console.log('  ✓ plated-side variant는 kind를 명시해야 조회되고, package와 독립적으로 상태를 가짐');
}

// 4) 등록되지 않은 kind(plated-top)는 undefined
{
  assert.equal(resolveProductAssetVariant('SIMPLE_BEEF_JANGJORIM_130', 'plated-top'), undefined);
  console.log('  ✓ 등록되지 않은 asset kind는 undefined (임의로 다른 kind를 대신 반환하지 않음)');
}

// 5) DOMAIN_PRODUCTS는 여전히 package 기준 단일 assetKey를 쓴다 (파이프라인 변경 없음 확인)
{
  const beef = DOMAIN_PRODUCTS.find((p) => p.id === 'SIMPLE_BEEF_JANGJORIM_130');
  assert.ok(beef);
  assert.equal(beef!.assetKey, 'SIMPLE_BEEF_JANGJORIM_130');
  assert.equal(DOMAIN_PRODUCTS.length, 3, '아직 확인된 asset binding이 있는 상품 3개만 포함');
  console.log('  ✓ DOMAIN_PRODUCTS/composePlan 파이프라인은 package 기준 assetKey로 변경 없이 동작');
}

console.log('productAssetBindings.test.ts: 모든 검증 통과');
