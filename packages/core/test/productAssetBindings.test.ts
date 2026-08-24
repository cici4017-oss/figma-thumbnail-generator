import assert from 'node:assert/strict';
import {
  resolveProductAssetKey,
  resolveProductAssetVariant,
  DEFAULT_PRODUCT_ASSET_KIND,
  DOMAIN_PRODUCTS,
  PRODUCTS,
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
  assert.equal(DOMAIN_PRODUCTS.length, 33, '확인된 asset binding이 있는 상품(기존 3 + 신규 30)만 포함');
  console.log('  ✓ DOMAIN_PRODUCTS/composePlan 파이프라인은 package 기준 assetKey로 변경 없이 동작');
}

// 6) Product Registry 확장: 신규 등록 30개는 _TBD 코드 없이, capacity가 null이 아닌
//    실제 값으로 등록되어야 한다(용량이 이름에 명시된 것만 이번 배치에 포함했다).
{
  assert.equal(PRODUCTS.length, 35, '기존 5(placeholder 2 포함) + 신규 30');
  const newCodes = [
    'SIMPLE_BEEF_QUAIL_JANGJORIM_150', 'SIMPLE_BEEF_JANGJORIM_300', 'SIMPLE_MINI_BEEF_JANGJORIM_70',
    'SIMPLE_MINI_BUTTER_BEEF_JANGJORIM_70', 'SIMPLE_MINI_BUTTER_POTATO_JANGJORIM_75',
    'SIMPLE_QUAIL_JANGJORIM_1000', 'SIMPLE_QUAIL_JANGJORIM_600',
    'SIMPLE_CHUEOTANG_700', 'SIMPLE_GALBIJJIM_700', 'SIMPLE_DOGANITANG_700', 'SIMPLE_YUKGAEJANG_640',
    'SIMPLE_HEALTHY_ABALONE_SAMGYE_JUK_330', 'SIMPLE_HEALTHY_BEEF_ROOT_VEG_JUK_330',
    'SIMPLE_HANWOO_SEOLLEONGTANG_450', 'SIMPLE_YANGJI_SUYUK_100', 'SIMPLE_SIGNATURE_ABALONE_JUK_200',
    'SIMPLE_SIGNATURE_PUMPKIN_JUK_200', 'SIMPLE_SIGNATURE_BEEF_JUK_200',
    'SIMPLE_SIGNATURE_SPICY_OCTOPUS_KIMCHI_JUK_200', 'SIMPLE_SIGNATURE_SWEET_BLACK_BEAN_80',
    'SIMPLE_SIGNATURE_SPICY_PERILLA_LEAF_80', 'SIMPLE_SIGNATURE_CRISPY_LOTUS_ROOT_80',
    'SIMPLE_SIGNATURE_SHREDDED_SQUID_60', 'BABY_KIDS_MIXED_VEGETABLE_JUK_170',
    'BABY_KIDS_NUTRITION_CHICKEN_JUK_170', 'BABY_KIDS_ABALONE_JUK_170', 'BABY_KIDS_HANWOO_VEGETABLE_JUK_170',
    'BABY_ORGANIC_RICE_PUFF_RED_30', 'BABY_ORGANIC_RICE_PUFF_YELLOW_30', 'BABY_ORGANIC_RICE_PUFF_PURPLE_30',
  ];
  assert.equal(newCodes.length, 30);
  for (const code of newCodes) {
    const entry = PRODUCTS.find((p) => p.code === code);
    assert.ok(entry, `${code}가 PRODUCTS에 등록되어 있어야 함`);
    assert.ok(!code.includes('_TBD'), `${code}는 _TBD 코드를 쓰지 않아야 함`);
    assert.ok(entry!.capacity !== null, `${code}는 이름에 용량이 명시되어 capacity가 null이 아니어야 함`);
    assert.equal(resolveProductAssetKey(code), code, `${code}는 package asset이 confirmed로 등록되어 DOMAIN_PRODUCTS에 포함되어야 함`);
  }
  console.log('  ✓ 신규 30개 모두 _TBD 없이, capacity 확인된 값으로, package asset과 함께 등록됨');
}

console.log('productAssetBindings.test.ts: 모든 검증 통과');
