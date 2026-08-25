"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __objRest = (source, exclude) => {
    var target = {};
    for (var prop in source)
      if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
        target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(source)) {
        if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
          target[prop] = source[prop];
      }
    return target;
  };

  // ../core/src/domain/productAsset.ts
  var DEFAULT_PRODUCT_ASSET_KIND = "package";

  // ../core/src/domain/thumbnailType.ts
  var DEFAULT_THUMBNAIL_TYPE = "basic";

  // ../core/src/domain/layout.ts
  function getSaleSlotCount(layout) {
    return layout.slots.filter((s) => s.role !== "gift").length;
  }
  function getGiftSlotCount(layout) {
    return layout.slots.filter((s) => s.role === "gift").length;
  }

  // ../core/src/engine/selectLayout.ts
  function selectLayout(criteria, layouts) {
    const slotCountMatches = layouts.filter(
      (l) => getSaleSlotCount(l) === criteria.totalQuantity && getGiftSlotCount(l) === criteria.giftQuantity
    );
    if (slotCountMatches.length === 0) {
      return {
        ok: false,
        reason: "NO_LAYOUT_WITH_MATCHING_SLOT_COUNT",
        message: `\uD310\uB9E4\uC218\uB7C9 ${criteria.totalQuantity}\uAC1C` + (criteria.giftQuantity > 0 ? ` + \uC99D\uC815 ${criteria.giftQuantity}\uAC1C` : "") + `\uC640 \uC2AC\uB86F \uC218\uAC00 \uC815\uD655\uD788 \uC77C\uCE58\uD558\uB294 Layout\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. (\uCD95\uC18C\xB7\uC0DD\uB7B5\xB7\uC21C\uD658\uBC30\uCE58 \uB4F1\uC758 \uB300\uCCB4 \uCC98\uB9AC\uB294 \uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4)`,
        criteria
      };
    }
    const criteriaMatches = slotCountMatches.filter((l) => {
      const m = l.match;
      if (m.productGroups && !m.productGroups.includes(criteria.productGroup)) return false;
      if (m.compositions && !m.compositions.includes(criteria.composition)) return false;
      if (m.aspectRatioFamilies && !m.aspectRatioFamilies.includes(criteria.aspectRatioFamily)) return false;
      if (m.geometryFamilies && !m.geometryFamilies.includes(criteria.geometryFamily)) return false;
      if (m.channelIds && !m.channelIds.includes(criteria.channelId)) return false;
      if (m.thumbnailTypes && !m.thumbnailTypes.includes(criteria.thumbnailType)) return false;
      return true;
    });
    if (criteriaMatches.length === 0) {
      return {
        ok: false,
        reason: "NO_MATCHING_LAYOUT",
        message: "\uC2AC\uB86F \uC218\uB294 \uC77C\uCE58\uD558\uC9C0\uB9CC productGroup/\uAD6C\uC131/aspectRatio/\uCC44\uB110/\uC378\uB124\uC77C\uC720\uD615 \uC870\uAC74\uC744 \uB9CC\uC871\uD558\uB294 Layout\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
        criteria
      };
    }
    const maxPriority = Math.max(...criteriaMatches.map((l) => l.priority));
    const topLayouts = criteriaMatches.filter((l) => l.priority === maxPriority);
    if (topLayouts.length > 1) {
      return {
        ok: false,
        reason: "AMBIGUOUS_LAYOUT_MATCH",
        message: `\uB3D9\uC77C\uD55C \uC6B0\uC120\uC21C\uC704(${maxPriority})\uB97C \uAC00\uC9C4 Layout\uC774 \uC5EC\uB7EC \uAC1C \uC788\uC5B4 \uC790\uB3D9\uC73C\uB85C \uACB0\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`,
        candidates: topLayouts.map((l) => l.layoutKey),
        criteria
      };
    }
    return { ok: true, layout: topLayouts[0] };
  }

  // ../core/src/engine/assignSlots.ts
  function slotOrderKey(slotKey) {
    const match = slotKey.match(/(\d+)\s*$/);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  }
  function sortBySlotOrder(slots) {
    return [...slots].sort((a, b) => slotOrderKey(a.slotKey) - slotOrderKey(b.slotKey));
  }
  function saleSlotsOf(layout) {
    return sortBySlotOrder(layout.slots.filter((s) => s.role !== "gift"));
  }
  function giftSlotsOf(layout) {
    return sortBySlotOrder(layout.slots.filter((s) => s.role === "gift"));
  }
  function fillSlots(slots, assetKeys) {
    return slots.map((slot, i) => ({ slotKey: slot.slotKey, assetKey: assetKeys[i], role: slot.role }));
  }
  function assignSlots(input) {
    const saleSlots = saleSlotsOf(input.layout);
    const giftSlots = giftSlotsOf(input.layout);
    if (saleSlots.length !== input.saleAssetKeys.length) {
      return {
        ok: false,
        reason: "SALE_SLOT_COUNT_MISMATCH",
        message: `Layout "${input.layout.layoutKey}"\uC758 \uD310\uB9E4 \uC2AC\uB86F \uC218(${saleSlots.length})\uC640 \uC2E4\uC81C \uD310\uB9E4 \uC0C1\uD488 \uC218(${input.saleAssetKeys.length})\uAC00 \uC815\uD655\uD788 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. (\uC77C\uBD80\uB9CC \uCC44\uC6B0\uAC70\uB098 \uACB9\uCCD0 \uB123\uB294 \uB4F1\uC758 \uB300\uCCB4 \uCC98\uB9AC\uB294 \uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4)`
      };
    }
    if (giftSlots.length !== input.giftAssetKeys.length) {
      return {
        ok: false,
        reason: "GIFT_SLOT_COUNT_MISMATCH",
        message: `Layout "${input.layout.layoutKey}"\uC758 \uC99D\uC815 \uC2AC\uB86F \uC218(${giftSlots.length})\uC640 \uC2E4\uC81C \uC99D\uC815 \uC0C1\uD488 \uC218(${input.giftAssetKeys.length})\uAC00 \uC815\uD655\uD788 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.`
      };
    }
    return {
      ok: true,
      slots: [...fillSlots(saleSlots, input.saleAssetKeys), ...fillSlots(giftSlots, input.giftAssetKeys)]
    };
  }

  // ../core/src/data/arrangementFamilyPolicy.ts
  var MAX_GENERATED_SLOT_COUNT = 20;
  var ARRANGEMENT_FAMILY_POLICY = [
    { familyId: "single-center", minSlotCount: 1, maxSlotCount: 1 },
    { familyId: "row-linear", minSlotCount: 2, maxSlotCount: 3 },
    { familyId: "diagonal-cascade", minSlotCount: 4, maxSlotCount: 5 },
    { familyId: "pyramid-stack", minSlotCount: 6, maxSlotCount: 10 },
    { familyId: "grid-cluster", minSlotCount: 11, maxSlotCount: MAX_GENERATED_SLOT_COUNT }
  ];
  function resolveArrangementFamily(slotCount) {
    return ARRANGEMENT_FAMILY_POLICY.find(
      (r) => slotCount >= r.minSlotCount && slotCount <= r.maxSlotCount
    );
  }

  // ../core/src/engine/generateFallbackLayout.ts
  function generateFallbackLayout(input) {
    if (input.slotCount > MAX_GENERATED_SLOT_COUNT) {
      return {
        ok: false,
        reason: "SLOT_COUNT_EXCEEDS_GENERATED_LIMIT",
        message: `\uC2AC\uB86F \uC218 ${input.slotCount}\uAC1C\uB294 generated fallback\uC758 V1 \uCD5C\uB300\uCE58(${MAX_GENERATED_SLOT_COUNT}\uAC1C)\uB97C \uCD08\uACFC\uD569\uB2C8\uB2E4.`
      };
    }
    const range = resolveArrangementFamily(input.slotCount);
    if (!range) {
      return {
        ok: false,
        reason: "NO_ARRANGEMENT_FAMILY_FOR_SLOT_COUNT",
        message: `\uC2AC\uB86F \uC218 ${input.slotCount}\uAC1C\uC5D0 \uB300\uC751\uD558\uB294 \uBC30\uCE58 family\uAC00 \uC815\uCC45 \uB370\uC774\uD130(arrangementFamilyPolicy)\uC5D0 \uC815\uC758\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.`
      };
    }
    const slots = Array.from({ length: input.slotCount }, (_, i) => ({
      slotKey: `slot_${i + 1}`,
      role: "sale"
    }));
    return {
      ok: true,
      layout: {
        layoutKey: `GENERATED_${range.familyId.toUpperCase()}_${input.slotCount}`,
        arrangementKind: range.familyId,
        slots,
        // generated layout은 selectLayout으로 검색되지 않고 resolveLayout이 직접 생성해서
        // 반환하므로 match 조건이 필요 없다.
        match: {},
        priority: 0,
        source: { kind: "generated", params: { familyId: range.familyId, slotCount: input.slotCount } }
      }
    };
  }

  // ../core/src/engine/resolveLayout.ts
  function resolveLayout(criteria, layouts) {
    const verifiedLayouts = layouts.filter((l) => l.source.kind === "verified");
    const selection = selectLayout(criteria, verifiedLayouts);
    if (selection.ok) {
      return { status: "resolved", layout: selection.layout };
    }
    if (selection.reason === "AMBIGUOUS_LAYOUT_MATCH") {
      return { status: "error", reason: "AMBIGUOUS_LAYOUT_MATCH", message: selection.message };
    }
    if (criteria.giftQuantity > 0) {
      return {
        status: "reviewRequired",
        reason: "GIFT_NO_VERIFIED_LAYOUT",
        message: "\uC99D\uC815\uD488\uC774 \uD3EC\uD568\uB41C \uC694\uCCAD\uC740 \uAC80\uC99D\uB41C(verified) Layout\uC774 \uC788\uC744 \uB54C\uB9CC \uC790\uB3D9 \uC0DD\uC131\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uD574\uB2F9 \uC2AC\uB86F \uAD6C\uC131\uC758 \uAC80\uC99D\uB41C Layout\uC774 \uC5C6\uC5B4 \uAC80\uD1A0\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4."
      };
    }
    if (criteria.thumbnailType === "staged") {
      return {
        status: "reviewRequired",
        reason: "STAGED_NO_VERIFIED_LAYOUT",
        message: "staged \uC378\uB124\uC77C\uC740 \uAC80\uC99D\uB41C(verified) Layout\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4(\uC790\uB3D9 \uC0DD\uC131 \uAE08\uC9C0). \uD574\uB2F9 \uC2AC\uB86F \uAD6C\uC131\uC758 \uAC80\uC99D\uB41C Layout\uC774 \uC5C6\uC5B4 \uAC80\uD1A0\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4."
      };
    }
    if (criteria.fallbackPolicy === "verified-only") {
      return {
        status: "reviewRequired",
        reason: "VERIFIED_ONLY_NO_VERIFIED_LAYOUT",
        message: "\uC774 \uCC44\uB110 \uADDC\uACA9\uC740 verified-only \uC815\uCC45\uC774 \uC801\uC6A9\uB418\uC5B4 \uC788\uC5B4(\uCC44\uB110 \uACE0\uC720 \uAD6C\uC870\uB77C generic\uD55C family \uACF5\uC2DD\uC744 \uC801\uC6A9\uD560 \uC218 \uC5C6\uC74C) \uAC80\uC99D\uB41C(verified) Layout\uC774 \uC5C6\uC73C\uBA74 \uC790\uB3D9 \uC0DD\uC131\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uD574\uB2F9 \uC2AC\uB86F \uAD6C\uC131\uC758 \uAC80\uC99D\uB41C Layout\uC774 \uC5C6\uC5B4 \uAC80\uD1A0\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4."
      };
    }
    const fallback = generateFallbackLayout({ slotCount: criteria.totalQuantity });
    if (!fallback.ok) {
      return { status: "error", reason: fallback.reason, message: fallback.message };
    }
    return { status: "resolved", layout: fallback.layout };
  }

  // ../core/src/engine/composePlan.ts
  function expandItems(items) {
    const out = [];
    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) out.push(item.productId);
    }
    return out;
  }
  function composePlan(request, deps) {
    var _a, _b, _c, _d, _e, _f;
    const channelPreset = deps.channelPresets.find((c) => c.id === request.channelPresetId);
    if (!channelPreset) {
      return {
        ok: false,
        reviewRequired: false,
        reason: "CHANNEL_PRESET_NOT_FOUND",
        message: `channelPresetId "${request.channelPresetId}"\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`
      };
    }
    if (request.items.length === 0) {
      return {
        ok: false,
        reviewRequired: false,
        reason: "EMPTY_ITEMS",
        message: "\uD310\uB9E4 \uC0C1\uD488 \uD56D\uBAA9(items)\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4."
      };
    }
    const saleProductIds = expandItems(request.items);
    const giftProductIds = expandItems((_a = request.giftItems) != null ? _a : []);
    const productLookup = new Map(deps.products.map((p) => [p.id, p]));
    for (const id of [...saleProductIds, ...giftProductIds]) {
      if (!productLookup.has(id)) {
        return {
          ok: false,
          reviewRequired: false,
          reason: "PRODUCT_NOT_FOUND",
          message: `productId "${id}"\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`
        };
      }
    }
    const groups = new Set(
      [...saleProductIds, ...giftProductIds].map((id) => productLookup.get(id).productGroup)
    );
    if (groups.size > 1) {
      return {
        ok: false,
        reviewRequired: false,
        reason: "INCONSISTENT_PRODUCT_GROUP",
        message: `\uC694\uCCAD\uC5D0 \uC11C\uB85C \uB2E4\uB978 productGroup\uC774 \uC11E\uC5EC \uC788\uC2B5\uB2C8\uB2E4: ${[...groups].join(", ")}`
      };
    }
    const productGroup = [...groups][0];
    const composition = new Set(request.items.map((i) => i.productId)).size > 1 ? "mixed" : "single";
    const thumbnailType = (_b = request.thumbnailType) != null ? _b : DEFAULT_THUMBNAIL_TYPE;
    const resolution = resolveLayout(
      {
        productGroup,
        composition,
        totalQuantity: saleProductIds.length,
        giftQuantity: giftProductIds.length,
        channelId: channelPreset.channelId,
        aspectRatioFamily: channelPreset.aspectRatioFamily,
        geometryFamily: channelPreset.geometryFamily,
        thumbnailType,
        fallbackPolicy: channelPreset.fallbackPolicy
      },
      deps.layouts
    );
    if (resolution.status === "error") {
      return { ok: false, reviewRequired: false, reason: resolution.reason, message: resolution.message };
    }
    if (resolution.status === "reviewRequired") {
      return { ok: false, reviewRequired: true, reason: resolution.reason, message: resolution.message };
    }
    const layout = resolution.layout;
    const assignment = assignSlots({
      layout,
      saleAssetKeys: saleProductIds.map((id) => productLookup.get(id).assetKey),
      giftAssetKeys: giftProductIds.map((id) => productLookup.get(id).assetKey)
    });
    if (!assignment.ok) {
      return { ok: false, reviewRequired: false, reason: assignment.reason, message: assignment.message };
    }
    const generatedLayout = layout.source.kind === "generated";
    return {
      ok: true,
      plan: {
        layoutKey: layout.layoutKey,
        channelPresetId: channelPreset.id,
        productGroup,
        thumbnailType,
        slots: assignment.slots,
        layoutSource: layout.source,
        generatedLayout,
        // generated fallback으로 만들어진 plan은 향후 AUTO_GENERATED_REVIEW 같은 별도
        // 검토 영역으로 보내야 하므로 항상 reviewRequired=true로 표시한다.
        reviewRequired: generatedLayout,
        options: {
          badge: (_c = request.options) == null ? void 0 : _c.badge,
          storageLabel: (_d = request.options) == null ? void 0 : _d.storageLabel,
          logoVariant: (_f = (_e = request.options) == null ? void 0 : _e.logoVariant) != null ? _f : "red"
        }
      }
    };
  }

  // ../core/src/engine/composeChannelOutputs.ts
  function composeChannelOutputs(request, deps) {
    const _a = request, { channelId } = _a, requestWithoutChannel = __objRest(_a, ["channelId"]);
    const presets = deps.channelPresets.filter((p) => p.channelId === channelId);
    if (presets.length === 0) {
      return {
        ok: false,
        reason: "CHANNEL_NOT_FOUND",
        message: `channelId "${channelId}"\uC5D0 \uB4F1\uB85D\uB41C ChannelPreset\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.`
      };
    }
    const outputs = presets.map((preset) => ({
      channelPresetId: preset.id,
      aspectRatioFamily: preset.aspectRatioFamily,
      frameWidth: preset.frameWidth,
      frameHeight: preset.frameHeight,
      result: composePlan(__spreadProps(__spreadValues({}, requestWithoutChannel), { channelPresetId: preset.id }), deps)
    }));
    return { ok: true, outputs };
  }

  // ../core/src/data/channelPresets.ts
  var CHANNEL_PRESETS = [
    // --- 복수 규격 채널 (square + wide) ---
    {
      id: "naver-1000x1000",
      channelId: "naver",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      id: "kakao-1000x1000",
      channelId: "kakao",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      // 750x422 ≈ 1.78:1 — 실제 조사로 홈앤쇼핑/제이슨딜과 동일한 "N개 균일 슬롯 가로 배치"
      // 구조임을 확인(wide-16x9). 대표: 카카오_750_소고기장조림130_1/3/5 (69:2292/69:2306/69:2322)
      id: "kakao-750x422",
      channelId: "kakao",
      frameWidth: 750,
      frameHeight: 422,
      aspectRatioFamily: "wide",
      geometryFamily: "wide-16x9",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      id: "home-and-shopping-1000x1000",
      channelId: "home-and-shopping",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      // 640x350 ≈ 1.83:1 — 카카오/제이슨딜과 동일 구조 확인(3슬롯, 69:1872). wide-16x9.
      id: "home-and-shopping-640x350",
      channelId: "home-and-shopping",
      frameWidth: 640,
      frameHeight: 350,
      aspectRatioFamily: "wide",
      geometryFamily: "wide-16x9",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      id: "toss-1000x1000",
      channelId: "toss",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      // 600x240 = 2.5:1 — hero 배경 이미지 + 마스크 아이콘 + N개 소형 슬롯이라는 독특한 구조
      // (다른 wide처럼 균일 슬롯 가로 배치가 아님, 69:2553/69:2588/69:2601 조사 결과). 다른
      // wide 규격과 다른 별도 geometryFamily(wide-5x2)로 분리 — verified Layout 미등록.
      // fallbackPolicy를 'verified-only'로 설정 — 채널 고유 구조라 generic family 공식으로
      // generated fallback을 만들면 실제 디자인과 전혀 다른 결과가 나오므로, verified Layout이
      // 없으면 자동 생성하지 않고 reviewRequired로 사람이 수동 처리하게 한다.
      id: "toss-600x240",
      channelId: "toss",
      frameWidth: 600,
      frameHeight: 240,
      aspectRatioFamily: "wide",
      geometryFamily: "wide-5x2",
      fallbackPolicy: "verified-only",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      id: "jasondeal-1000x1000",
      channelId: "jasondeal",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      // 720x400 = 1.8:1 — 카카오/홈앤쇼핑과 동일 구조 확인(3슬롯, 69:1372). wide-16x9.
      id: "jasondeal-720x400",
      channelId: "jasondeal",
      frameWidth: 720,
      frameHeight: 400,
      aspectRatioFamily: "wide",
      geometryFamily: "wide-16x9",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      id: "11st-1000x1000",
      channelId: "11st",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      // 720x360 = 2:1 — 균일 슬롯 가로 배치 구조는 wide-16x9와 비슷하지만 비율이 뚜렷이 달라
      // (2:1 vs ≈1.8:1) 별도 geometryFamily(wide-2x1)로 분리. 다른 채널과 교차 확인은 아직
      // 안 됐음(현재 wide-2x1은 11번가 하나뿐). 대표: 11번가_720_소고기장조림130_1/3/5
      // (69:1952/69:1936/69:1966)
      id: "11st-720x360",
      channelId: "11st",
      frameWidth: 720,
      frameHeight: 360,
      aspectRatioFamily: "wide",
      geometryFamily: "wide-2x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    // --- 단일 규격(1000x1000) 채널 — 프레임 데이터상 예외 없이 정사각형만 확인됨 ---
    {
      id: "ssg-1000x1000",
      channelId: "ssg",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      id: "auction-1000x1000",
      channelId: "auction",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      id: "gmarket-1000x1000",
      channelId: "gmarket",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      id: "sk-stoa-1000x1000",
      channelId: "sk-stoa",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      id: "skt-deal-1000x1000",
      channelId: "skt-deal",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      id: "coupang-1000x1000",
      channelId: "coupang",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      id: "aliexpress-1000x1000",
      channelId: "aliexpress",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      id: "ns-shopping-1000x1000",
      channelId: "ns-shopping",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      // 표본 2개(반례 없음, 신뢰도 낮음) — 추가 확인 전까지는 사용에 주의
      id: "alwayz-1000x1000",
      channelId: "alwayz",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      // 표본 2개(반례 없음, 신뢰도 낮음) — 추가 확인 전까지는 사용에 주의
      id: "eland-mall-1000x1000",
      channelId: "eland-mall",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    },
    {
      // 표본 2개(반례 없음, 신뢰도 낮음) — 추가 확인 전까지는 사용에 주의
      id: "lotte-on-1000x1000",
      channelId: "lotte-on",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      geometryFamily: "square-1x1",
      fallbackPolicy: "verified-or-generated",
      storageLabelSupported: true,
      badgeSupported: true
    }
  ];

  // ../core/src/data/layouts.ts
  var LAYOUTS = [
    {
      // 대표 Figma frame: 네이버_소고기장조림130_1 (node 69:307) — image 312 슬롯 1개 확인
      layoutKey: "LAYOUT_01",
      arrangementKind: "single-center",
      slots: [{ slotKey: "slot_1", role: "sale" }],
      match: {
        productGroups: ["simple-meal"],
        compositions: ["single", "mixed"],
        aspectRatioFamilies: ["square"],
        geometryFamilies: ["square-1x1"],
        thumbnailTypes: ["basic"]
      },
      priority: 100,
      source: { kind: "verified" }
    },
    {
      // 대표 Figma frame: 네이버_소고기장조림130_3 (node 69:417) — image 313/409/410 대각선 3슬롯 확인
      layoutKey: "LAYOUT_02",
      arrangementKind: "triple-cascade",
      slots: [
        { slotKey: "slot_1", role: "sale" },
        { slotKey: "slot_2", role: "sale" },
        { slotKey: "slot_3", role: "sale" }
      ],
      match: {
        productGroups: ["simple-meal"],
        compositions: ["single", "mixed"],
        aspectRatioFamilies: ["square"],
        geometryFamilies: ["square-1x1"],
        thumbnailTypes: ["basic"]
      },
      priority: 100,
      source: { kind: "verified" }
    },
    {
      // 대표 Figma frame: 네이버_소고기장조림130_5 (node 69:442) — 상단 3 + 하단 2 피라미드 배치, 5슬롯 확인
      layoutKey: "LAYOUT_03",
      arrangementKind: "penta-pyramid",
      slots: [
        { slotKey: "slot_1", role: "sale" },
        { slotKey: "slot_2", role: "sale" },
        { slotKey: "slot_3", role: "sale" },
        { slotKey: "slot_4", role: "sale" },
        { slotKey: "slot_5", role: "sale" }
      ],
      match: {
        productGroups: ["simple-meal"],
        compositions: ["single", "mixed"],
        aspectRatioFamilies: ["square"],
        geometryFamilies: ["square-1x1"],
        thumbnailTypes: ["basic"]
      },
      priority: 100,
      source: { kind: "verified" }
    },
    {
      // 대표 Figma frame: 네이버_소고기장조림130_10 (node 69:353) — 중앙 대형 1개(node 69:373,
      // "image 321", 549x549) + 주변 소형 9개(node 69:364~69:372, 각 343~344px 균일 크기)로
      // 구성된 main/sub 비대칭 클러스터. 실제 레이어 이름에는 "main"/"sub" 표기가 없어서(전부
      // "image NNN") slot 자체의 role로 명시한다(LayoutSlotRole = 'sale'|'gift'|'main'|'sub',
      // main/sub는 'sale'의 세부 구분 — getSaleSlotCount/assignSlots는 role!=='gift'를 판매
      // 슬롯으로 취급하므로 10개 전부 정상적으로 판매 슬롯 수에 포함된다).
      // V1 정책: assignSlots는 slot_1부터 순서대로 채우므로, Excel 순번이 가장 빠른 상품이
      // slot_1(main, 중앙 대형)에 배정된다. 실제 Figma 바인딩(templateMapper, 아직 미연결)을
      // 붙일 때 slot_1은 반드시 node 69:373("image 321")에, slot_2~10은 나머지 9개 소형
      // 슬롯에 매핑해야 한다.
      layoutKey: "LAYOUT_04",
      arrangementKind: "grid-cluster-10",
      slots: [
        { slotKey: "slot_1", role: "main" },
        // 중앙 대형(549x549) — node 69:373 "image 321"
        { slotKey: "slot_2", role: "sub" },
        { slotKey: "slot_3", role: "sub" },
        { slotKey: "slot_4", role: "sub" },
        { slotKey: "slot_5", role: "sub" },
        { slotKey: "slot_6", role: "sub" },
        { slotKey: "slot_7", role: "sub" },
        { slotKey: "slot_8", role: "sub" },
        { slotKey: "slot_9", role: "sub" },
        { slotKey: "slot_10", role: "sub" }
      ],
      match: {
        productGroups: ["simple-meal"],
        compositions: ["single", "mixed"],
        aspectRatioFamilies: ["square"],
        geometryFamilies: ["square-1x1"],
        thumbnailTypes: ["basic"]
      },
      priority: 100,
      source: { kind: "verified" }
    },
    // --- wide-16x9 (카카오 750x422 / 홈앤쇼핑 640x350 / 제이슨딜 720x400 공유) ---
    // 세 채널 모두 "N개 균일 크기 슬롯을 가로로 나란히 배치"하는 동일 구조임을 실제
    // screenshot+node 구조로 확인했다(카카오 1/3/5 직접 확인, 홈앤쇼핑/제이슨딜은 3슬롯으로
    // 교차 확인) — main/sub 구분 없음. channelIds를 지정하지 않아 세 채널 모두에서 재사용된다.
    {
      // 대표 frame: 카카오_750_소고기장조림130_1 (node 69:2292) — image 418 슬롯 1개
      layoutKey: "LAYOUT_05",
      arrangementKind: "single-center",
      slots: [{ slotKey: "slot_1", role: "sale" }],
      match: {
        productGroups: ["simple-meal"],
        compositions: ["single", "mixed"],
        aspectRatioFamilies: ["wide"],
        geometryFamilies: ["wide-16x9"],
        thumbnailTypes: ["basic"]
      },
      priority: 100,
      source: { kind: "verified" }
    },
    {
      // 대표 frame: 카카오_750_소고기장조림130_3 (node 69:2306). 교차 확인:
      // 홈앤쇼핑_640_소고기장조림130_3(69:1872), 제이슨딜_720x400_소고기장조림130_3팩(69:1372)
      // — 세 채널 모두 균일 3슬롯 가로 배치.
      layoutKey: "LAYOUT_06",
      arrangementKind: "triple-row",
      slots: [
        { slotKey: "slot_1", role: "sale" },
        { slotKey: "slot_2", role: "sale" },
        { slotKey: "slot_3", role: "sale" }
      ],
      match: {
        productGroups: ["simple-meal"],
        compositions: ["single", "mixed"],
        aspectRatioFamilies: ["wide"],
        geometryFamilies: ["wide-16x9"],
        thumbnailTypes: ["basic"]
      },
      priority: 100,
      source: { kind: "verified" }
    },
    {
      // 대표 frame: 카카오_750_소고기장조림130_5 (node 69:2322) — image 418~422 균일 5슬롯 가로 배치
      layoutKey: "LAYOUT_07",
      arrangementKind: "penta-row",
      slots: [
        { slotKey: "slot_1", role: "sale" },
        { slotKey: "slot_2", role: "sale" },
        { slotKey: "slot_3", role: "sale" },
        { slotKey: "slot_4", role: "sale" },
        { slotKey: "slot_5", role: "sale" }
      ],
      match: {
        productGroups: ["simple-meal"],
        compositions: ["single", "mixed"],
        aspectRatioFamilies: ["wide"],
        geometryFamilies: ["wide-16x9"],
        thumbnailTypes: ["basic"]
      },
      priority: 100,
      source: { kind: "verified" }
    },
    // --- wide-2x1 (11번가 720x360) ---
    // wide-16x9와 배치 스타일(균일 슬롯 가로열)은 비슷하지만 실제 비율이 뚜렷이 달라(2:1 vs
    // ≈1.8:1) 별도 geometryFamily로 분리했다. 현재 wide-2x1 채널은 11번가 하나뿐이라 다른
    // 채널과의 교차 재사용은 아직 확인되지 않았다.
    {
      // 대표 frame: 11번가_720_소고기장조림130_1 (node 69:1952)
      layoutKey: "LAYOUT_08",
      arrangementKind: "single-center",
      slots: [{ slotKey: "slot_1", role: "sale" }],
      match: {
        productGroups: ["simple-meal"],
        compositions: ["single", "mixed"],
        aspectRatioFamilies: ["wide"],
        geometryFamilies: ["wide-2x1"],
        thumbnailTypes: ["basic"]
      },
      priority: 100,
      source: { kind: "verified" }
    },
    {
      // 대표 frame: 11번가_720_소고기장조림130_3 (node 69:1936) — image 412/413/414 균일 3슬롯
      layoutKey: "LAYOUT_09",
      arrangementKind: "triple-row",
      slots: [
        { slotKey: "slot_1", role: "sale" },
        { slotKey: "slot_2", role: "sale" },
        { slotKey: "slot_3", role: "sale" }
      ],
      match: {
        productGroups: ["simple-meal"],
        compositions: ["single", "mixed"],
        aspectRatioFamilies: ["wide"],
        geometryFamilies: ["wide-2x1"],
        thumbnailTypes: ["basic"]
      },
      priority: 100,
      source: { kind: "verified" }
    },
    {
      // 대표 frame: 11번가_720_소고기장조림130_5 (node 69:1966) — image 412~416 균일 5슬롯
      layoutKey: "LAYOUT_10",
      arrangementKind: "penta-row",
      slots: [
        { slotKey: "slot_1", role: "sale" },
        { slotKey: "slot_2", role: "sale" },
        { slotKey: "slot_3", role: "sale" },
        { slotKey: "slot_4", role: "sale" },
        { slotKey: "slot_5", role: "sale" }
      ],
      match: {
        productGroups: ["simple-meal"],
        compositions: ["single", "mixed"],
        aspectRatioFamilies: ["wide"],
        geometryFamilies: ["wide-2x1"],
        thumbnailTypes: ["basic"]
      },
      priority: 100,
      source: { kind: "verified" }
    }
  ];

  // ../core/src/data/productAssetBindings.ts
  var PRODUCT_ASSET_BINDINGS = [
    {
      productCode: "SIMPLE_BEEF_JANGJORIM_130",
      variants: [
        {
          assetKind: "package",
          source: {
            kind: "component-variant",
            componentName: "\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130",
            confirmedNodeId: "2008:3811"
          },
          assetKey: "SIMPLE_BEEF_JANGJORIM_130",
          status: "confirmed",
          note: "screenshot\uC73C\uB85C \uC2E4\uC81C verified \uC378\uB124\uC77C(LAYOUT_01~10)\uC758 \uD328\uD0A4\uC9C0 \uC0AC\uC9C4\uACFC \uB3D9\uC77C\uD568\uC744 \uD655\uC778",
          // 상품별 visible size 비교(2026-08-25): 정사각형 소스 자체는 743x743로 동일하지만,
          // 상단 브랜드/문구 영역이 커서 같은 슬롯에서 시그니처 반찬류보다 패키지가 작아 보임을
          // 실제 3종 동일 슬롯 비교 screenshot으로 확인 → 22% 확대(중앙 기준)로 보정.
          presentation: { visualScale: 1.22, offsetX: 0, offsetY: 0 }
        },
        {
          assetKind: "plated-side",
          source: {
            kind: "component-variant",
            componentName: "\uC1E0\uACE0\uAE30\uC7A5\uC870\uB9BC_\uCE21",
            confirmedNodeId: "2008:3473"
          },
          assetKey: "SIMPLE_BEEF_JANGJORIM_130_PLATED_SIDE",
          status: "code-fallback",
          note: '"\uC1E0\uACE0\uAE30\uC7A5\uC870\uB9BC"(\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC\uACFC \uB3D9\uC77C \uBC1C\uC74C \uD45C\uAE30)_\uCE21 \u2014 \uAC19\uC740 \uC0C1\uD488\uC758 \uD50C\uB808\uC774\uD305 \uCEF7\uC73C\uB85C \uCD94\uC815, 100% \uD655\uC815\uC740 \uC544\uB2D8'
        }
      ]
    },
    {
      productCode: "SIMPLE_QUAIL_JANGJORIM_180",
      variants: [
        {
          assetKind: "package",
          source: {
            kind: "component-variant",
            componentName: "\uBA54\uCD94\uB9AC\uC54C\uC7A5\uC870\uB9BC180",
            confirmedNodeId: "2008:3813"
          },
          assetKey: "SIMPLE_QUAIL_JANGJORIM_180",
          status: "confirmed",
          note: "screenshot\uC73C\uB85C \uC2E4\uC81C verified \uC378\uB124\uC77C(LAYOUT_02, node 69:17172)\uC758 \uD328\uD0A4\uC9C0 \uC0AC\uC9C4\uACFC \uB3D9\uC77C\uD568\uC744 \uD655\uC778",
          // 소고기장조림130과 동일한 패키지 템플릿(상단 브랜드/문구 영역 비중이 큼)이라 동일하게 보정.
          presentation: { visualScale: 1.22, offsetX: 0, offsetY: 0 }
        },
        {
          assetKind: "plated-side",
          source: {
            kind: "component-variant",
            componentName: "\uBA54\uCD94\uB9AC\uC54C_\uCE21",
            confirmedNodeId: "2008:3459"
          },
          assetKey: "SIMPLE_QUAIL_JANGJORIM_180_PLATED_SIDE",
          status: "code-fallback",
          note: "\uC6A9\uB7C9 \uD45C\uAE30\uAC00 \uC5C6\uC5B4 180g \uC0C1\uD488\uACFC \uB3D9\uC77C\uD55C\uC9C0 100% \uD655\uC815\uC740 \uC544\uB2D8"
        }
      ]
    },
    {
      productCode: "SIMPLE_CHIVE_KKOMAK_240",
      variants: [
        {
          assetKind: "package",
          source: {
            kind: "component-variant",
            componentName: "\uBD80\uCD94\uAF2C\uB9C9\uBB34\uCE68240",
            confirmedNodeId: "2008:3861"
          },
          assetKey: "SIMPLE_CHIVE_KKOMAK_240",
          status: "confirmed",
          note: "\uC774\uB984\uC5D0 \uC6A9\uB7C9(240)\uAE4C\uC9C0 \uC815\uD655\uD788 \uC77C\uCE58 \u2014 \uAE30\uC874\uC5D0 \uC2E4\uC81C verified \uC378\uB124\uC77C \uD504\uB808\uC784 \uC790\uCCB4\uB294 \uBABB \uCC3E\uC558\uC9C0\uB9CC, \uD328\uD0A4\uC9C0 asset\uC740 \uD655\uC778\uB428"
        },
        {
          assetKind: "plated-side",
          source: {
            kind: "component-variant",
            componentName: "\uBD80\uCD94\uAF2C\uB9C9\uBB34\uCE68240_\uCE21",
            confirmedNodeId: "2008:3863"
          },
          assetKey: "SIMPLE_CHIVE_KKOMAK_240_PLATED_SIDE",
          status: "confirmed",
          note: "\uC774\uB984/\uC6A9\uB7C9 \uC815\uD655\uD788 \uC77C\uCE58"
        }
      ]
    },
    // BABY_BEEF_PORRIDGE_100 / BABY_PUMPKIN_PORRIDGE_100은 실제 상품명과 불일치하는 것으로
    // 확인된 placeholder이므로 asset binding을 등록하지 않는다(=composePlan 대상에서 제외됨).
    // 보류(등록 안 함): "반찬_측/탑" 섹션의 "꼬막무침"(2008:3385/2008:3372, "부추" 접두어 없음,
    // 용량 표기 없음)은 SIMPLE_CHIVE_KKOMAK_240("부추꼬막무침240")과 동일 상품인지, 아니면
    // 별도 SKU(예: 다른 용량/부추 없는 버전)인지 확인되지 않아 alias로도 연결하지 않는다.
    // --- 아래부터 신규 등록 29개 ---
    // package variant만 등록한다(plated-side/top은 이 29개에 대해 개별적으로 확인되지 않았음).
    // status='confirmed'는 이름+용량+같은 "본죽_시뮬" 최종 자산 갤러리(장조림_측/탑처럼 별도
    // "_측/_탑" 섹션이 아니라 완성 패키지 사진이 모인 프레임) 패턴 일치로 판단한 것이며,
    // 기존 3개(소고기장조림130 등)처럼 개별 screenshot으로 하나하나 재확인하지는 않았다.
    {
      productCode: "SIMPLE_BEEF_QUAIL_JANGJORIM_150",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBCF8\uC8FD\uC7A5\uC870\uB9BC", variantValue: "Property 1=\uBCF8\uC8FD_\uBCF8\uBA54\uCD94\uB9AC\uC54C\uC1E0\uACE0\uAE30\uC7A5\uC870\uB9BC_150g", confirmedNodeId: "2008:3803" },
          assetKey: "SIMPLE_BEEF_QUAIL_JANGJORIM_150",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_BEEF_JANGJORIM_300",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBCF8\uC8FD\uC7A5\uC870\uB9BC", variantValue: "Property 1=\uBCF8\uC8FD_\uBCF8\uC1E0\uACE0\uAE30\uC7A5\uC870\uB9BC_300g", confirmedNodeId: "2008:3805" },
          assetKey: "SIMPLE_BEEF_JANGJORIM_300",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_MINI_BEEF_JANGJORIM_70",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBBF8\uB2C8 \uC7A5\uC870\uB9BC_\uBC15\uC2A4+\uD30C\uC6B0\uCE58", variantValue: "Property 1=\uBBF8\uB2C8_\uC1E0\uACE0\uAE30\uC7A5\uC870\uB9BC_70g", confirmedNodeId: "2008:3788" },
          assetKey: "SIMPLE_MINI_BEEF_JANGJORIM_70",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_MINI_BUTTER_BEEF_JANGJORIM_70",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBBF8\uB2C8 \uC7A5\uC870\uB9BC_\uBC15\uC2A4+\uD30C\uC6B0\uCE58", variantValue: "Property 1=\uBBF8\uB2C8_\uBCF8\uBC84\uD130\uC1E0\uACE0\uAE30\uC7A5\uC870\uB9BC_70g", confirmedNodeId: "2008:3796" },
          assetKey: "SIMPLE_MINI_BUTTER_BEEF_JANGJORIM_70",
          status: "confirmed"
        }
      ]
    },
    {
      // capacity 75g은 사용자가 확인해줌(2026-08-24) — 기존 "상세정보" 프레임 E03(70g) 표기와
      // 충돌해 보류했던 건이지만, 실제 값은 75g으로 확정.
      productCode: "SIMPLE_MINI_BUTTER_POTATO_JANGJORIM_75",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBBF8\uB2C8 \uC7A5\uC870\uB9BC_\uBC15\uC2A4+\uD30C\uC6B0\uCE58", variantValue: "Property 1=\uBBF8\uB2C8_\uBCF8\uBC84\uD130\uAC10\uC790\uC7A5\uC870\uB9BC_75g", confirmedNodeId: "2008:3790" },
          assetKey: "SIMPLE_MINI_BUTTER_POTATO_JANGJORIM_75",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_QUAIL_JANGJORIM_1000",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBA54\uCD94\uB9AC\uC54C \uC7A5\uC870\uB9BC_\uB300\uC6A9\uB7C9", variantValue: "Property 1=\uBCF8\uC8FD_\uBA54\uCD94\uB9AC\uC54C\uC7A5\uC870\uB9BC_1kg", confirmedNodeId: "2008:3761" },
          assetKey: "SIMPLE_QUAIL_JANGJORIM_1000",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_QUAIL_JANGJORIM_600",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBA54\uCD94\uB9AC\uC54C \uC7A5\uC870\uB9BC_\uB300\uC6A9\uB7C9", variantValue: "Property 1=\uBCF8\uC8FD_\uBA54\uCD94\uB9AC\uC54C\uC7A5\uC870\uB9BC_600g", confirmedNodeId: "2008:3767" },
          assetKey: "SIMPLE_QUAIL_JANGJORIM_600",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_CHUEOTANG_700",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uB290\uB9AC\uAC8C\uB9CC\uB4E0", variantValue: "Property 1=\uB290\uB9AC\uAC8C\uB9CC\uB4E0_\uBCF8\uB0A8\uB3C4\uC2DD\uCD94\uC5B4\uD0D5_700g", confirmedNodeId: "2008:3748" },
          assetKey: "SIMPLE_CHUEOTANG_700",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_GALBIJJIM_700",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uB290\uB9AC\uAC8C\uB9CC\uB4E0", variantValue: "Property 1=\uB290\uB9AC\uAC8C\uB9CC\uB4E0_\uAC08\uBE44\uCC1C_700g", confirmedNodeId: "2008:3750" },
          assetKey: "SIMPLE_GALBIJJIM_700",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_DOGANITANG_700",
      variants: [
        {
          // 2026-08-25 asset 진단: node 2008:3752("느리게만든_본도가니탕_700g")를 실제
          // screenshot으로 확인한 결과, 파우치/트레이 누끼샷(package)이 아니라 로고+조리 사진+
          // 상품 카피 문구+상품명+영양정보가 전부 포함된 258x360 세로형 "상세페이지 카드"
          // 이미지였다(11번가 렌더에서 실제로 이 카드 이미지 전체가 정사각형 슬롯에 잘려
          // 들어간 것이 원인). 같은 "느리게만든" 컴포넌트셋의 형제 3개(추어탕/갈비찜/
          // 대파육개장)도 동일한 카드형 구조를 쓰고 있어 같은 문제가 있을 가능성이 높지만, 이번
          // 조사는 본도가니탕만 범위였으므로 그 3개는 건드리지 않았다 — 별도 확인 필요.
          // "시뮬" 페이지, 실제 채널 썸네일 프레임(간편식_요리 등) 전체를 조사했지만 대체할 수
          // 있는 진짜 package 누끼샷은 찾지 못했다. 추측으로 다른 asset을 대신 쓰지 않고, 실제
          // package가 확인될 때까지 렌더 대상에서 제외한다(resolveProductAsset이 이 상태를
          // 보고 명확히 실패 -> checkAssetResolvability가 PRODUCT_ASSET_NOT_RESOLVABLE로
          // reviewRequired 처리).
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uB290\uB9AC\uAC8C\uB9CC\uB4E0", variantValue: "Property 1=\uB290\uB9AC\uAC8C\uB9CC\uB4E0_\uBCF8\uB3C4\uAC00\uB2C8\uD0D5_700g", confirmedNodeId: "2008:3752" },
          assetKey: "SIMPLE_DOGANITANG_700",
          status: "rejected",
          note: "\uC2E4\uC81C package \uB204\uB07C\uC0F7\uC774 \uC544\uB2C8\uB77C \uB85C\uACE0+\uC870\uB9AC\uC0AC\uC9C4+\uC0C1\uD488\uBA85+\uC601\uC591\uC815\uBCF4\uAC00 \uD3EC\uD568\uB41C \uC0C1\uC138\uD398\uC774\uC9C0 \uCE74\uB4DC \uC774\uBBF8\uC9C0(258x360)\uB85C \uD655\uC778\uB428 \u2014 \uB300\uCCB4 package \uBBF8\uD655\uC778, \uB80C\uB354 \uB300\uC0C1\uC5D0\uC11C \uC81C\uC678"
        }
      ]
    },
    {
      productCode: "SIMPLE_YUKGAEJANG_640",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uB290\uB9AC\uAC8C\uB9CC\uB4E0", variantValue: "Property 1=\uB290\uB9AC\uAC8C\uB9CC\uB4E0_\uBCF8\uB300\uD30C\uC721\uAC1C\uC7A5_640g", confirmedNodeId: "2008:3758" },
          assetKey: "SIMPLE_YUKGAEJANG_640",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_HEALTHY_ABALONE_SAMGYE_JUK_330",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uD5EC\uC2DC_\uC8FD_330g", variantValue: "Property 1=\uD5EC\uC2DC_\uC804\uBCF5\uC0BC\uACC4\uC8FD_330g", confirmedNodeId: "2008:3778" },
          assetKey: "SIMPLE_HEALTHY_ABALONE_SAMGYE_JUK_330",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_HEALTHY_BEEF_ROOT_VEG_JUK_330",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uD5EC\uC2DC_\uC8FD_330g", variantValue: "Property 1=\uD5EC\uC2DC_\uC1E0\uACE0\uAE30\uBFCC\uB9AC\uC57C\uCC44\uC8FD_330g", confirmedNodeId: "2008:3776" },
          assetKey: "SIMPLE_HEALTHY_BEEF_ROOT_VEG_JUK_330",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_HANWOO_SEOLLEONGTANG_450",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBCF8\uC124\uB801\uD0D5", variantValue: "Property 1=\uBCF8\uC124\uB801\uD0D5_\uD55C\uC6B0\uC124\uB801\uD0D5_450g", confirmedNodeId: "2008:3838" },
          assetKey: "SIMPLE_HANWOO_SEOLLEONGTANG_450",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_YANGJI_SUYUK_100",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBCF8\uC124\uB801\uD0D5", variantValue: "Property 1=\uBCF8\uC124\uB801\uD0D5_\uC591\uC9C0\uC218\uC721_100g", confirmedNodeId: "2008:3836" },
          assetKey: "SIMPLE_YANGJI_SUYUK_100",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_SIGNATURE_ABALONE_JUK_200",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uC2DC\uADF8\uB2C8\uCC98\uC8FD200/270", variantValue: "Property 1=\uC2DC\uADF8\uB2C8\uCC98_\uC804\uBCF5\uC8FD_200g", confirmedNodeId: "2008:3547" },
          assetKey: "SIMPLE_SIGNATURE_ABALONE_JUK_200",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_SIGNATURE_PUMPKIN_JUK_200",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uC2DC\uADF8\uB2C8\uCC98\uC8FD200/270", variantValue: "Property 1=\uC2DC\uADF8\uB2C8\uCC98_\uB2E8\uD638\uBC15\uC8FD_200g", confirmedNodeId: "2008:3537" },
          assetKey: "SIMPLE_SIGNATURE_PUMPKIN_JUK_200",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_SIGNATURE_BEEF_JUK_200",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uC2DC\uADF8\uB2C8\uCC98\uC8FD200/270", variantValue: "Property 1=\uC2DC\uADF8\uB2C8\uCC98_\uC1E0\uACE0\uAE30\uC8FD_200g", confirmedNodeId: "2008:3541" },
          assetKey: "SIMPLE_SIGNATURE_BEEF_JUK_200",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_SIGNATURE_SPICY_OCTOPUS_KIMCHI_JUK_200",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uC2DC\uADF8\uB2C8\uCC98\uC8FD200/270", variantValue: "Property 1=\uC2DC\uADF8\uB2C8\uCC98_\uC5BC\uD070\uB099\uC9C0\uAE40\uCE58\uC8FD_200g", confirmedNodeId: "2008:3543" },
          assetKey: "SIMPLE_SIGNATURE_SPICY_OCTOPUS_KIMCHI_JUK_200",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_SIGNATURE_SWEET_BLACK_BEAN_80",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBC18\uCC2C", variantValue: "Property 2=\uC2DC\uADF8\uB2C8\uCC98_\uB2EC\uCF64\uAC80\uC740\uCF69\uC790\uBC18_80g", confirmedNodeId: "2008:3731" },
          assetKey: "SIMPLE_SIGNATURE_SWEET_BLACK_BEAN_80",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_SIGNATURE_SPICY_PERILLA_LEAF_80",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBC18\uCC2C", variantValue: "Property 2=\uC2DC\uADF8\uB2C8\uCC98_\uB9E4\uCF64\uAE7B\uC78E\uBB34\uCE68_80g", confirmedNodeId: "2008:3733" },
          assetKey: "SIMPLE_SIGNATURE_SPICY_PERILLA_LEAF_80",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_SIGNATURE_CRISPY_LOTUS_ROOT_80",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBC18\uCC2C", variantValue: "Property 2=\uC2DC\uADF8\uB2C8\uCC98_\uC544\uC0AD\uC5F0\uADFC\uC870\uB9BC_80g", confirmedNodeId: "2008:3741" },
          assetKey: "SIMPLE_SIGNATURE_CRISPY_LOTUS_ROOT_80",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "SIMPLE_SIGNATURE_SHREDDED_SQUID_60",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBC18\uCC2C", variantValue: "Property 2=\uC2DC\uADF8\uB2C8\uCC98_\uCD09\uCD09\uC9C4\uBBF8\uCC44\uBCF6\uC74C_60g", confirmedNodeId: "2008:3743" },
          assetKey: "SIMPLE_SIGNATURE_SHREDDED_SQUID_60",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "BABY_KIDS_MIXED_VEGETABLE_JUK_170",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBCF8\uC8FD\uD0A4\uC988\uC8FD", variantValue: "Property 1=\uBCF8\uC8FD\uD0A4\uC988_\uBAA8\uB460\uC57C\uCC44\uC8FD_170g", confirmedNodeId: "2008:2748" },
          assetKey: "BABY_KIDS_MIXED_VEGETABLE_JUK_170",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "BABY_KIDS_NUTRITION_CHICKEN_JUK_170",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBCF8\uC8FD\uD0A4\uC988\uC8FD", variantValue: "Property 1=\uBCF8\uC8FD\uD0A4\uC988_\uC601\uC591\uB2ED\uC8FD_170g", confirmedNodeId: "2008:2750" },
          assetKey: "BABY_KIDS_NUTRITION_CHICKEN_JUK_170",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "BABY_KIDS_ABALONE_JUK_170",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBCF8\uC8FD\uD0A4\uC988\uC8FD", variantValue: "Property 1=\uBCF8\uC8FD\uD0A4\uC988_\uD2BC\uD2BC\uC804\uBCF5\uC8FD_170g", confirmedNodeId: "2008:2752" },
          assetKey: "BABY_KIDS_ABALONE_JUK_170",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "BABY_KIDS_HANWOO_VEGETABLE_JUK_170",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uBCF8\uC8FD\uD0A4\uC988\uC8FD", variantValue: "Property 1=\uBCF8\uC8FD\uD0A4\uC988_\uD55C\uC6B0\uC57C\uCC44\uC8FD_170g", confirmedNodeId: "2008:2754" },
          assetKey: "BABY_KIDS_HANWOO_VEGETABLE_JUK_170",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "BABY_ORGANIC_RICE_PUFF_RED_30",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uC720\uAE30\uB18D\uC300\uACFC\uC790\uD37C\uD504", variantValue: "Property 1=\uBCA0\uC774\uBE44\uBCF8\uC8FD_\uC720\uAE30\uB18D\uC300\uACFC\uC790\uD37C\uD504_\uB808\uB4DC_30g", confirmedNodeId: "2008:2757" },
          assetKey: "BABY_ORGANIC_RICE_PUFF_RED_30",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "BABY_ORGANIC_RICE_PUFF_YELLOW_30",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uC720\uAE30\uB18D\uC300\uACFC\uC790\uD37C\uD504", variantValue: "Property 1=\uBCA0\uC774\uBE44\uBCF8\uC8FD_\uC720\uAE30\uB18D\uC300\uACFC\uC790\uD37C\uD504_\uC610\uB85C\uC6B0_30g", confirmedNodeId: "2008:2759" },
          assetKey: "BABY_ORGANIC_RICE_PUFF_YELLOW_30",
          status: "confirmed"
        }
      ]
    },
    {
      productCode: "BABY_ORGANIC_RICE_PUFF_PURPLE_30",
      variants: [
        {
          assetKind: "package",
          source: { kind: "component-variant", componentName: "\uC720\uAE30\uB18D\uC300\uACFC\uC790\uD37C\uD504", variantValue: "Property 1=\uBCA0\uC774\uBE44\uBCF8\uC8FD_\uC720\uAE30\uB18D\uC300\uACFC\uC790\uD37C\uD504_\uD37C\uD50C_30g", confirmedNodeId: "2008:2761" },
          assetKey: "BABY_ORGANIC_RICE_PUFF_PURPLE_30",
          status: "confirmed"
        }
      ]
    }
    // --- 애매해서 보류(등록 안 함) — 필요시 다음 배치에서 확인 후 등록 ---
    // - 쇠고기장조림170_코스트코(2008:3807)/그 박스형(2008:3809): 특정 유통사(코스트코) 전용
    //   패키징으로 보여 별도 SKU인지 기존 상품의 포장 변형일 뿐인지 불명확.
    // - 신선집중_메추리알장조림_1kg(2008:3765): 브랜드가 "본죽"이 아니라 "신선집중"이라 이
    //   레지스트리(전부 본죽/베이비본죽) 범위에 포함되는 상품인지 확인 필요.
    // - 미니_본쇠고기장조림_박스_RE(2008:3800): SIMPLE_MINI_BEEF_JANGJORIM_70과 동일 상품의
    //   박스 포장일 가능성이 높으나 용량 표기가 없어 확정하지 않음.
    // - "상세정보" 프레임의 F01~F04/G01~G02(2008:3620~3630, 제주안심/헬시 장조림 120~130g
    //   시리즈)는 데이터는 깨끗하지만 이번 배치 크기(20~30개) 안에서 우선순위상 제외 — 다음
    //   배치 후보로 남겨둔다.
  ];
  function resolveProductAssetVariant(productCode, assetKind = DEFAULT_PRODUCT_ASSET_KIND) {
    var _a;
    return (_a = PRODUCT_ASSET_BINDINGS.find((b) => b.productCode === productCode)) == null ? void 0 : _a.variants.find(
      (v) => v.assetKind === assetKind
    );
  }
  function resolveProductAssetKey(productCode, assetKind = DEFAULT_PRODUCT_ASSET_KIND) {
    var _a;
    return (_a = resolveProductAssetVariant(productCode, assetKind)) == null ? void 0 : _a.assetKey;
  }

  // ../core/src/data/products.ts
  var PRODUCTS = [
    { code: "SIMPLE_BEEF_JANGJORIM_130", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC", capacity: "130g" },
    { code: "SIMPLE_QUAIL_JANGJORIM_180", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uBA54\uCD94\uB9AC\uC54C \uC7A5\uC870\uB9BC", capacity: "180g" },
    { code: "SIMPLE_CHIVE_KKOMAK_240", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uBD80\uCD94 \uAF2C\uB9C9\uBB34\uCE68", capacity: "240g" },
    { code: "BABY_BEEF_PORRIDGE_100", productGroup: "baby-food", brand: "\uBCF8\uC8FD", name: "\uC774\uC720\uC2DD \uC18C\uACE0\uAE30\uC8FD", capacity: "100g" },
    { code: "BABY_PUMPKIN_PORRIDGE_100", productGroup: "baby-food", brand: "\uBCF8\uC8FD", name: "\uC774\uC720\uC2DD \uB2E8\uD638\uBC15\uC8FD", capacity: "100g" },
    // --- 간편식(simple-meal) 신규 22개 ---
    { code: "SIMPLE_BEEF_QUAIL_JANGJORIM_150", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uBCF8 \uBA54\uCD94\uB9AC\uC54C\uC1E0\uACE0\uAE30\uC7A5\uC870\uB9BC", capacity: "150g" },
    { code: "SIMPLE_BEEF_JANGJORIM_300", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uBCF8 \uC1E0\uACE0\uAE30\uC7A5\uC870\uB9BC", capacity: "300g" },
    { code: "SIMPLE_MINI_BEEF_JANGJORIM_70", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uBBF8\uB2C8 \uC1E0\uACE0\uAE30\uC7A5\uC870\uB9BC", capacity: "70g" },
    { code: "SIMPLE_MINI_BUTTER_BEEF_JANGJORIM_70", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uBBF8\uB2C8 \uBCF8\uBC84\uD130\uC1E0\uACE0\uAE30\uC7A5\uC870\uB9BC", capacity: "70g" },
    { code: "SIMPLE_MINI_BUTTER_POTATO_JANGJORIM_75", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uBBF8\uB2C8 \uBCF8\uBC84\uD130\uAC10\uC790\uC7A5\uC870\uB9BC", capacity: "75g" },
    { code: "SIMPLE_QUAIL_JANGJORIM_1000", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uBA54\uCD94\uB9AC\uC54C\uC7A5\uC870\uB9BC \uB300\uC6A9\uB7C9 1kg", capacity: "1kg" },
    { code: "SIMPLE_QUAIL_JANGJORIM_600", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uBA54\uCD94\uB9AC\uC54C\uC7A5\uC870\uB9BC \uB300\uC6A9\uB7C9 600g", capacity: "600g" },
    { code: "SIMPLE_CHUEOTANG_700", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uB290\uB9AC\uAC8C\uB9CC\uB4E0 \uBCF8\uB0A8\uB3C4\uC2DD\uCD94\uC5B4\uD0D5", capacity: "700g" },
    { code: "SIMPLE_GALBIJJIM_700", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uB290\uB9AC\uAC8C\uB9CC\uB4E0 \uAC08\uBE44\uCC1C", capacity: "700g" },
    { code: "SIMPLE_DOGANITANG_700", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uB290\uB9AC\uAC8C\uB9CC\uB4E0 \uBCF8\uB3C4\uAC00\uB2C8\uD0D5", capacity: "700g" },
    { code: "SIMPLE_YUKGAEJANG_640", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uB290\uB9AC\uAC8C\uB9CC\uB4E0 \uBCF8\uB300\uD30C\uC721\uAC1C\uC7A5", capacity: "640g" },
    { code: "SIMPLE_HEALTHY_ABALONE_SAMGYE_JUK_330", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uD5EC\uC2DC \uC804\uBCF5\uC0BC\uACC4\uC8FD", capacity: "330g" },
    { code: "SIMPLE_HEALTHY_BEEF_ROOT_VEG_JUK_330", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uD5EC\uC2DC \uC1E0\uACE0\uAE30\uBFCC\uB9AC\uC57C\uCC44\uC8FD", capacity: "330g" },
    { code: "SIMPLE_HANWOO_SEOLLEONGTANG_450", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uBCF8\uC124\uB801\uD0D5 \uD55C\uC6B0\uC124\uB801\uD0D5", capacity: "450g" },
    { code: "SIMPLE_YANGJI_SUYUK_100", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uBCF8\uC124\uB801\uD0D5 \uC591\uC9C0\uC218\uC721", capacity: "100g" },
    { code: "SIMPLE_SIGNATURE_ABALONE_JUK_200", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uC2DC\uADF8\uB2C8\uCC98 \uC804\uBCF5\uC8FD", capacity: "200g" },
    { code: "SIMPLE_SIGNATURE_PUMPKIN_JUK_200", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uC2DC\uADF8\uB2C8\uCC98 \uB2E8\uD638\uBC15\uC8FD", capacity: "200g" },
    { code: "SIMPLE_SIGNATURE_BEEF_JUK_200", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uC2DC\uADF8\uB2C8\uCC98 \uC1E0\uACE0\uAE30\uC8FD", capacity: "200g" },
    { code: "SIMPLE_SIGNATURE_SPICY_OCTOPUS_KIMCHI_JUK_200", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uC2DC\uADF8\uB2C8\uCC98 \uC5BC\uD070\uB099\uC9C0\uAE40\uCE58\uC8FD", capacity: "200g" },
    { code: "SIMPLE_SIGNATURE_SWEET_BLACK_BEAN_80", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uC2DC\uADF8\uB2C8\uCC98 \uB2EC\uCF64\uAC80\uC740\uCF69\uC790\uBC18", capacity: "80g" },
    { code: "SIMPLE_SIGNATURE_SPICY_PERILLA_LEAF_80", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uC2DC\uADF8\uB2C8\uCC98 \uB9E4\uCF64\uAE7B\uC78E\uBB34\uCE68", capacity: "80g" },
    { code: "SIMPLE_SIGNATURE_CRISPY_LOTUS_ROOT_80", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uC2DC\uADF8\uB2C8\uCC98 \uC544\uC0AD\uC5F0\uADFC\uC870\uB9BC", capacity: "80g" },
    { code: "SIMPLE_SIGNATURE_SHREDDED_SQUID_60", productGroup: "simple-meal", brand: "\uBCF8\uC8FD", name: "\uC2DC\uADF8\uB2C8\uCC98 \uCD09\uCD09\uC9C4\uBBF8\uCC44\uBCF6\uC74C", capacity: "60g" },
    // --- 영유아(baby-food) 신규 7개 ---
    { code: "BABY_KIDS_MIXED_VEGETABLE_JUK_170", productGroup: "baby-food", brand: "\uBCF8\uC8FD", name: "\uBCF8\uC8FD\uD0A4\uC988 \uBAA8\uB460\uC57C\uCC44\uC8FD", capacity: "170g" },
    { code: "BABY_KIDS_NUTRITION_CHICKEN_JUK_170", productGroup: "baby-food", brand: "\uBCF8\uC8FD", name: "\uBCF8\uC8FD\uD0A4\uC988 \uC601\uC591\uB2ED\uC8FD", capacity: "170g" },
    { code: "BABY_KIDS_ABALONE_JUK_170", productGroup: "baby-food", brand: "\uBCF8\uC8FD", name: "\uBCF8\uC8FD\uD0A4\uC988 \uD2BC\uD2BC\uC804\uBCF5\uC8FD", capacity: "170g" },
    { code: "BABY_KIDS_HANWOO_VEGETABLE_JUK_170", productGroup: "baby-food", brand: "\uBCF8\uC8FD", name: "\uBCF8\uC8FD\uD0A4\uC988 \uD55C\uC6B0\uC57C\uCC44\uC8FD", capacity: "170g" },
    { code: "BABY_ORGANIC_RICE_PUFF_RED_30", productGroup: "baby-food", brand: "\uBCA0\uC774\uBE44\uBCF8\uC8FD", name: "\uC720\uAE30\uB18D\uC300\uACFC\uC790\uD37C\uD504 \uB808\uB4DC", capacity: "30g" },
    { code: "BABY_ORGANIC_RICE_PUFF_YELLOW_30", productGroup: "baby-food", brand: "\uBCA0\uC774\uBE44\uBCF8\uC8FD", name: "\uC720\uAE30\uB18D\uC300\uACFC\uC790\uD37C\uD504 \uC610\uB85C\uC6B0", capacity: "30g" },
    { code: "BABY_ORGANIC_RICE_PUFF_PURPLE_30", productGroup: "baby-food", brand: "\uBCA0\uC774\uBE44\uBCF8\uC8FD", name: "\uC720\uAE30\uB18D\uC300\uACFC\uC790\uD37C\uD504 \uD37C\uD50C", capacity: "30g" }
  ];
  function toDomainProduct(entry) {
    const assetKey = resolveProductAssetKey(entry.code);
    if (!assetKey) return null;
    return { id: entry.code, name: entry.name, productGroup: entry.productGroup, assetKey };
  }
  var DOMAIN_PRODUCTS = PRODUCTS.map(toDomainProduct).filter(
    (p) => p !== null
  );

  // src/templateMapper.ts
  var FIGMA_TEMPLATE_BINDINGS = [
    // --- naver-1000x1000 (square-1x1) ---
    {
      layoutKey: "LAYOUT_01",
      channelPresetId: "naver-1000x1000",
      templateFrameName: "\uB124\uC774\uBC84_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_1",
      templateFrameNodeId: "69:307",
      slotBindings: [{ slotKey: "slot_1", layerName: "image 312" }]
    },
    {
      layoutKey: "LAYOUT_02",
      channelPresetId: "naver-1000x1000",
      templateFrameName: "\uB124\uC774\uBC84_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_3",
      templateFrameNodeId: "69:417",
      slotBindings: [
        { slotKey: "slot_1", layerName: "image 313" },
        { slotKey: "slot_2", layerName: "image 409" },
        { slotKey: "slot_3", layerName: "image 410" }
      ]
    },
    {
      layoutKey: "LAYOUT_03",
      channelPresetId: "naver-1000x1000",
      templateFrameName: "\uB124\uC774\uBC84_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_5",
      templateFrameNodeId: "69:442",
      slotBindings: [
        { slotKey: "slot_1", layerName: "image 411" },
        { slotKey: "slot_2", layerName: "image 412" },
        { slotKey: "slot_3", layerName: "image 413" },
        { slotKey: "slot_4", layerName: "image 414" },
        { slotKey: "slot_5", layerName: "image 415" }
      ]
    },
    {
      // slot_1(main, 중앙 대형 549x549) = "image 321"(69:373). slot_2~10(sub, 소형 9개)은
      // 레이어 이름의 숫자 순서(image 312~320)로 결정론적으로 매핑했다 — 물리적 위치가 role별로
      // 구분되어 있지 않아(전부 "sub"), 어떤 소형 슬롯이 어떤 slotKey인지는 배치상 의미가 없다.
      layoutKey: "LAYOUT_04",
      channelPresetId: "naver-1000x1000",
      templateFrameName: "\uB124\uC774\uBC84_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_10",
      templateFrameNodeId: "69:353",
      slotBindings: [
        { slotKey: "slot_1", layerName: "image 321" },
        { slotKey: "slot_2", layerName: "image 312" },
        { slotKey: "slot_3", layerName: "image 313" },
        { slotKey: "slot_4", layerName: "image 314" },
        { slotKey: "slot_5", layerName: "image 315" },
        { slotKey: "slot_6", layerName: "image 316" },
        { slotKey: "slot_7", layerName: "image 317" },
        { slotKey: "slot_8", layerName: "image 318" },
        { slotKey: "slot_9", layerName: "image 319" },
        { slotKey: "slot_10", layerName: "image 320" }
      ]
    },
    // --- kakao-1000x1000 (square-1x1) ---
    {
      // 카카오 square 3슬롯의 실제 frame은 "카카오_1000_소고기장조림130_3"(69:2368)이다
      // (네이버의 69:417과는 별개 frame).
      layoutKey: "LAYOUT_02",
      channelPresetId: "kakao-1000x1000",
      templateFrameName: "\uCE74\uCE74\uC624_1000_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_3",
      templateFrameNodeId: "69:2368",
      slotBindings: [
        { slotKey: "slot_1", layerName: "image 416" },
        { slotKey: "slot_2", layerName: "image 417" },
        { slotKey: "slot_3", layerName: "image 418" }
      ]
    },
    // --- kakao-750x422 (wide-16x9) ---
    {
      layoutKey: "LAYOUT_05",
      channelPresetId: "kakao-750x422",
      templateFrameName: "\uCE74\uCE74\uC624_750_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_1",
      templateFrameNodeId: "69:2292",
      slotBindings: [{ slotKey: "slot_1", layerName: "image 418" }]
    },
    {
      layoutKey: "LAYOUT_06",
      channelPresetId: "kakao-750x422",
      templateFrameName: "\uCE74\uCE74\uC624_750_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_3",
      templateFrameNodeId: "69:2306",
      slotBindings: [
        { slotKey: "slot_1", layerName: "image 418" },
        { slotKey: "slot_2", layerName: "image 419" },
        { slotKey: "slot_3", layerName: "image 420" }
      ]
    },
    {
      layoutKey: "LAYOUT_07",
      channelPresetId: "kakao-750x422",
      templateFrameName: "\uCE74\uCE74\uC624_750_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_5",
      templateFrameNodeId: "69:2322",
      slotBindings: [
        { slotKey: "slot_1", layerName: "image 418" },
        { slotKey: "slot_2", layerName: "image 419" },
        { slotKey: "slot_3", layerName: "image 420" },
        { slotKey: "slot_4", layerName: "image 421" },
        { slotKey: "slot_5", layerName: "image 422" }
      ]
    },
    // --- 11st-720x360 (wide-2x1) ---
    // home-and-shopping/jasondeal(wide-16x9)과 달리 wide-2x1 채널은 11번가 하나뿐이라
    // 다른 채널과의 교차 재사용은 확인되지 않았다(layouts.ts 주석 참고) — 11번가 실제
    // frame만 바인딩한다.
    {
      layoutKey: "LAYOUT_08",
      channelPresetId: "11st-720x360",
      templateFrameName: "11\uBC88\uAC00_720_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_1",
      templateFrameNodeId: "69:1952",
      slotBindings: [{ slotKey: "slot_1", layerName: "image 413" }]
    },
    {
      layoutKey: "LAYOUT_09",
      channelPresetId: "11st-720x360",
      templateFrameName: "11\uBC88\uAC00_720_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_3",
      templateFrameNodeId: "69:1936",
      slotBindings: [
        { slotKey: "slot_1", layerName: "image 412" },
        { slotKey: "slot_2", layerName: "image 413" },
        { slotKey: "slot_3", layerName: "image 414" }
      ]
    },
    {
      layoutKey: "LAYOUT_10",
      channelPresetId: "11st-720x360",
      templateFrameName: "11\uBC88\uAC00_720_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_5",
      templateFrameNodeId: "69:1966",
      slotBindings: [
        { slotKey: "slot_1", layerName: "image 412" },
        { slotKey: "slot_2", layerName: "image 413" },
        { slotKey: "slot_3", layerName: "image 414" },
        { slotKey: "slot_4", layerName: "image 415" },
        { slotKey: "slot_5", layerName: "image 416" }
      ]
    },
    // --- 채널 확장(2026-08-24): SSG/쿠팡/옥션/지마켓/SK스토아/NS홈쇼핑/알리익스프레스/SKT딜/
    // 올웨이즈/이랜드몰/롯데온을 우선순위대로 read-only 조사했다. "썸네일 (Copy)"의 "장조림"/
    // "간편식_요리" 페이지에서 소고기장조림130/메추리알장조림180/부추꼬막무침240 계열의 실제
    // 프레임을 프레임 이름이 아니라 실제 자식 레이어 구조(+screenshot)로 확인한 결과만 아래에
    // 담는다. 이름만 믿고 넘어간 게 아니라, 다음처럼 이름과 실제 구조가 불일치하는 사례를
    // 다수 발견해서 그런 프레임은 전부 제외했다:
    // - SSG_1000_소고기장조림130_3/5, SSG_1000_메추리알장조림180_10: 셋 다 실제 슬롯은
    //   image 312 "1개"뿐이고(screenshot으로 확인 — 실제로는 상품 1개 + "×3/×5/×10" 수량
    //   뱃지 스티커였다), 슬롯이 여러 개가 아니다 → SSG는 이번 배치에서 바인딩하지 않음
    //   (진짜 1/3/5/10 다중 슬롯 프레임이 하나도 확인되지 않음).
    // - 이랜드몰_1000_메추리알장조림180_5/10: 두 프레임이 완전히 동일한 구조(image 312 1개 +
    //   메추리알장조림1808 1개, 총 2개)라 "_5"/"_10"이 실제 슬롯 수와 맞지 않음 → 제외.
    // - 쿠팡_1000_메추리알장조림180_10: "_5"와 완전히 동일한 구조(메추리알장조림1808 5개)라
    //   실제로는 5슬롯인데 "_10"으로 잘못 표기됨 → 제외.
    // - 쿠팡알리_1000_소고기장조림130_5: image 411이 없이 4개 슬롯뿐(screenshot에서도 4개만
    //   보임) → "_5"로 표기됐지만 실제 5슬롯이 아니라서 제외.
    // - SK스토아/NS홈쇼핑/SKT딜: 파일 전체(장조림/간편식_요리/간편식_죽/간편식_채널_믹스/
    //   Page 12/Page 16/시뮬/영유아_* 전 페이지)를 조사했지만, 등록된 3개 상품(소고기장조림130/
    //   메추리알장조림180/부추꼬막무침240) 계열의 실제 프레임을 하나도 찾지 못했다(SK스토아는
    //   완전히 다른 상품 "본케어 고단백 영양죽"의 760x360 wide 프레임만 있음). 이번엔 바인딩
    //   추가 없음.
    //
    // 일부 채널(쿠팡/옥션/롯데온 등)은 슬롯마다 고유 레이어 이름을 쓰지 않고 전부 같은 이름
    // ("메추리알장조림1808"/"image 626")을 재사용한다 — 이 경우 layerIndex(문서 트리 순회
    // 순서, 0-based)로 슬롯을 구분한다(FigmaSlotBinding.layerIndex 참고).
    //
    // "쿠팡알리_..." 프레임은 실제 프레임 이름 자체가 두 채널(쿠팡+알리익스프레스) 공용 디자인임을
    // 선언하고 있어서, 쿠팡에 더 적합한 전용 프레임이 없는 수량(1)에 한해 두 channelPresetId에
    // 동일 노드를 물리적으로 공유해서 바인딩했다 — 네이버 프레임을 다른 채널에 임의로 재사용한
    // 것과는 다르다(그 프레임 자체가 "이 두 채널 공용"이라고 이름으로 확인됨).
    // --- gmarket-1000x1000 (지마켓) ---
    {
      layoutKey: "LAYOUT_01",
      channelPresetId: "gmarket-1000x1000",
      templateFrameName: "\uC9C0\uB9C8\uCF13_1000_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_1",
      templateFrameNodeId: "69:648",
      slotBindings: [{ slotKey: "slot_1", layerName: "image 312" }]
    },
    {
      layoutKey: "LAYOUT_02",
      channelPresetId: "gmarket-1000x1000",
      templateFrameName: "\uC9C0\uB9C8\uCF13_1000_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_3",
      templateFrameNodeId: "69:544",
      slotBindings: [
        { slotKey: "slot_1", layerName: "image 313" },
        { slotKey: "slot_2", layerName: "image 409" },
        { slotKey: "slot_3", layerName: "image 410" }
      ]
    },
    {
      layoutKey: "LAYOUT_03",
      channelPresetId: "gmarket-1000x1000",
      templateFrameName: "\uC9C0\uB9C8\uCF13_1000_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_5",
      templateFrameNodeId: "69:569",
      slotBindings: [
        { slotKey: "slot_1", layerName: "image 411" },
        { slotKey: "slot_2", layerName: "image 412" },
        { slotKey: "slot_3", layerName: "image 413" },
        { slotKey: "slot_4", layerName: "image 414" },
        { slotKey: "slot_5", layerName: "image 415" }
      ]
    },
    // --- auction-1000x1000 (옥션) ---
    {
      layoutKey: "LAYOUT_01",
      channelPresetId: "auction-1000x1000",
      templateFrameName: "\uC625\uC158_1000_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_1",
      templateFrameNodeId: "69:923",
      slotBindings: [{ slotKey: "slot_1", layerName: "image 312" }]
    },
    {
      layoutKey: "LAYOUT_02",
      channelPresetId: "auction-1000x1000",
      templateFrameName: "\uC625\uC158_1000_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_3",
      templateFrameNodeId: "69:871",
      slotBindings: [
        { slotKey: "slot_1", layerName: "image 313" },
        { slotKey: "slot_2", layerName: "image 409" },
        { slotKey: "slot_3", layerName: "image 410" }
      ]
    },
    {
      layoutKey: "LAYOUT_03",
      channelPresetId: "auction-1000x1000",
      templateFrameName: "\uC625\uC158_1000_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_5",
      templateFrameNodeId: "69:896",
      slotBindings: [
        { slotKey: "slot_1", layerName: "image 411" },
        { slotKey: "slot_2", layerName: "image 412" },
        { slotKey: "slot_3", layerName: "image 413" },
        { slotKey: "slot_4", layerName: "image 414" },
        { slotKey: "slot_5", layerName: "image 415" }
      ]
    },
    {
      // 10개 슬롯 전부 동일 레이어 이름("메추리알장조림1808") — layerIndex(0~9, 트리 순회 순서)로 구분.
      layoutKey: "LAYOUT_04",
      channelPresetId: "auction-1000x1000",
      templateFrameName: "\uC625\uC158_1000x1000_\uBA54\uCD94\uB9AC\uC54C\uC7A5\uC870\uB9BC_180_10",
      templateFrameNodeId: "69:18186",
      slotBindings: Array.from({ length: 10 }, (_, i) => ({
        slotKey: `slot_${i + 1}`,
        layerName: "\uBA54\uCD94\uB9AC\uC54C\uC7A5\uC870\uB9BC1808",
        layerIndex: i
      }))
    },
    // --- coupang-1000x1000 (쿠팡) ---
    {
      // 전용 1슬롯 프레임이 없어 "쿠팡알리_..." 공용 프레임(쿠팡+알리익스프레스)을 그대로 쓴다.
      layoutKey: "LAYOUT_01",
      channelPresetId: "coupang-1000x1000",
      templateFrameName: "\uCFE0\uD321\uC54C\uB9AC_1000_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_1",
      templateFrameNodeId: "69:2011",
      slotBindings: [{ slotKey: "slot_1", layerName: "image 312" }]
    },
    {
      // 3슬롯 전부 동일 레이어 이름("메추리알장조림1808") — layerIndex로 구분.
      layoutKey: "LAYOUT_02",
      channelPresetId: "coupang-1000x1000",
      templateFrameName: "\uCFE0\uD321_1000_\uBA54\uCD94\uB9AC\uC54C\uC7A5\uC870\uB9BC180_3",
      templateFrameNodeId: "69:17279",
      slotBindings: [0, 1, 2].map((i) => ({ slotKey: `slot_${i + 1}`, layerName: "\uBA54\uCD94\uB9AC\uC54C\uC7A5\uC870\uB9BC1808", layerIndex: i }))
    },
    {
      layoutKey: "LAYOUT_03",
      channelPresetId: "coupang-1000x1000",
      templateFrameName: "\uCFE0\uD321_1000_\uBA54\uCD94\uB9AC\uC54C\uC7A5\uC870\uB9BC180_5",
      templateFrameNodeId: "69:17307",
      slotBindings: Array.from({ length: 5 }, (_, i) => ({
        slotKey: `slot_${i + 1}`,
        layerName: "\uBA54\uCD94\uB9AC\uC54C\uC7A5\uC870\uB9BC1808",
        layerIndex: i
      }))
    },
    // --- aliexpress-1000x1000 (알리익스프레스) — 전용 프레임 없음, "쿠팡알리_..." 공용 프레임 사용 ---
    {
      layoutKey: "LAYOUT_01",
      channelPresetId: "aliexpress-1000x1000",
      templateFrameName: "\uCFE0\uD321\uC54C\uB9AC_1000_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_1",
      templateFrameNodeId: "69:2011",
      slotBindings: [{ slotKey: "slot_1", layerName: "image 312" }]
    },
    {
      layoutKey: "LAYOUT_02",
      channelPresetId: "aliexpress-1000x1000",
      templateFrameName: "\uCFE0\uD321\uC54C\uB9AC_1000_\uC18C\uACE0\uAE30\uC7A5\uC870\uB9BC130_3",
      templateFrameNodeId: "69:2037",
      slotBindings: [
        { slotKey: "slot_1", layerName: "image 312" },
        { slotKey: "slot_2", layerName: "image 409" },
        { slotKey: "slot_3", layerName: "image 410" }
      ]
    },
    // --- alwayz-1000x1000 (올웨이즈) ---
    {
      layoutKey: "LAYOUT_01",
      channelPresetId: "alwayz-1000x1000",
      templateFrameName: "\uC62C\uC6E8\uC774\uC988_1000_\uBD80\uCD94\uAF2C\uB9C9\uBB34\uCE68240g_1",
      templateFrameNodeId: "69:42563",
      slotBindings: [{ slotKey: "slot_1", layerName: "image 626" }]
    },
    {
      // 3슬롯 전부 동일 레이어 이름("image 626") — layerIndex로 구분.
      layoutKey: "LAYOUT_02",
      channelPresetId: "alwayz-1000x1000",
      templateFrameName: "\uC62C\uC6E8\uC774\uC988_1000_\uBD80\uCD94\uAF2C\uB9C9\uBB34\uCE68240g_3",
      templateFrameNodeId: "69:42612",
      slotBindings: [0, 1, 2].map((i) => ({ slotKey: `slot_${i + 1}`, layerName: "image 626", layerIndex: i }))
    },
    // --- eland-mall-1000x1000 (이랜드몰) — qty1은 실제 프레임 미확인, qty5/10은 실제로는
    // 슬롯이 2개뿐(이름만 "_5"/"_10")이라 제외. qty3만 바인딩. ---
    {
      layoutKey: "LAYOUT_02",
      channelPresetId: "eland-mall-1000x1000",
      templateFrameName: "\uC774\uB79C\uB4DC\uBAB0_1000_\uBD80\uCD94\uAF2C\uB9C9\uBB34\uCE68240g_3",
      templateFrameNodeId: "69:43227",
      slotBindings: [0, 1, 2].map((i) => ({ slotKey: `slot_${i + 1}`, layerName: "image 626", layerIndex: i }))
    },
    // --- lotte-on-1000x1000 (롯데온) ---
    {
      layoutKey: "LAYOUT_01",
      channelPresetId: "lotte-on-1000x1000",
      templateFrameName: "\uB86F\uB370\uC628_1000_\uBD80\uCD94\uAF2C\uB9C9\uBB34\uCE68240g_1",
      templateFrameNodeId: "69:42932",
      slotBindings: [{ slotKey: "slot_1", layerName: "image 626" }]
    },
    {
      layoutKey: "LAYOUT_02",
      channelPresetId: "lotte-on-1000x1000",
      templateFrameName: "\uB86F\uB370\uC628_1000_\uBD80\uCD94\uAF2C\uB9C9\uBB34\uCE68240g_3",
      templateFrameNodeId: "69:42981",
      slotBindings: [0, 1, 2].map((i) => ({ slotKey: `slot_${i + 1}`, layerName: "image 626", layerIndex: i }))
    },
    {
      layoutKey: "LAYOUT_03",
      channelPresetId: "lotte-on-1000x1000",
      templateFrameName: "\uB86F\uB370\uC628_1000_\uBA54\uCD94\uB9AC\uC54C\uC7A5\uC870\uB9BC180_5",
      templateFrameNodeId: "69:18924",
      slotBindings: Array.from({ length: 5 }, (_, i) => ({
        slotKey: `slot_${i + 1}`,
        layerName: "\uBA54\uCD94\uB9AC\uC54C\uC7A5\uC870\uB9BC1808",
        layerIndex: i
      }))
    },
    {
      layoutKey: "LAYOUT_04",
      channelPresetId: "lotte-on-1000x1000",
      templateFrameName: "\uB86F\uB370\uC628_1000_\uBA54\uCD94\uB9AC\uC54C\uC7A5\uC870\uB9BC180_10",
      templateFrameNodeId: "69:18951",
      slotBindings: Array.from({ length: 10 }, (_, i) => ({
        slotKey: `slot_${i + 1}`,
        layerName: "\uBA54\uCD94\uB9AC\uC54C\uC7A5\uC870\uB9BC1808",
        layerIndex: i
      }))
    }
  ];
  function resolveTemplate(layoutKey, channelPresetId, bindings = FIGMA_TEMPLATE_BINDINGS) {
    return bindings.find((b) => b.layoutKey === layoutKey && b.channelPresetId === channelPresetId);
  }

  // src/assetResolver.ts
  var PRODUCT_ASSETS_PAGE_NAME = "PRODUCT_ASSETS";
  function findProductAssetsPage() {
    return figma.root.children.find(
      (p) => p.type === "PAGE" && p.name === PRODUCT_ASSETS_PAGE_NAME
    );
  }
  function getImageFill(node) {
    if (!("fills" in node)) return void 0;
    const fills = node.fills;
    if (fills === figma.mixed || !Array.isArray(fills)) return void 0;
    return fills.find((f) => f.type === "IMAGE" && !!f.imageHash);
  }
  function findImageHashDeep(node) {
    const direct = getImageFill(node);
    if (direct == null ? void 0 : direct.imageHash) return direct.imageHash;
    if ("children" in node) {
      for (const child of node.children) {
        const found = findImageHashDeep(child);
        if (found) return found;
      }
    }
    return void 0;
  }
  function findAssetVariantByKey(assetKey, bindings) {
    for (const binding of bindings) {
      const variant = binding.variants.find((v) => v.assetKey === assetKey);
      if (variant) return variant;
    }
    return void 0;
  }
  async function resolveFromConfirmedBinding(variant) {
    var _a;
    if (variant.status === "rejected") {
      return {
        ok: false,
        message: `assetKey "${variant.assetKey}"\uC758 source\uB294 \uC2E4\uC81C \uD655\uC778 \uACB0\uACFC \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uB294 \uAC83\uC73C\uB85C \uD310\uC815\uB418\uC5B4 \uC81C\uC678\uB418\uC5C8\uC2B5\uB2C8\uB2E4: ${(_a = variant.note) != null ? _a : "\uC0AC\uC720 \uC5C6\uC74C"}`
      };
    }
    const source = variant.source;
    const nodeId = source.kind === "component-variant" ? source.confirmedNodeId : source.nodeId;
    if (!nodeId) return null;
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      return {
        ok: false,
        message: `ProductAssetBinding\uC5D0 \uB4F1\uB85D\uB41C source node(${nodeId})\uB97C \uC774 \uD30C\uC77C\uC5D0\uC11C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4(assetKey "${variant.assetKey}").`
      };
    }
    const imageHash = findImageHashDeep(node);
    if (!imageHash) {
      return {
        ok: false,
        message: `source node(${nodeId}, "${node.name}")\uC640 \uADF8 \uD558\uC704\uC5D0\uC11C IMAGE fill\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4(assetKey "${variant.assetKey}").`
      };
    }
    return { ok: true, imageHash, presentation: variant.presentation };
  }
  async function resolveFromLegacyProductAssetsPage(productKey) {
    const page = findProductAssetsPage();
    if (!page) {
      return {
        ok: false,
        message: `"${PRODUCT_ASSETS_PAGE_NAME}" \uD398\uC774\uC9C0\uB97C \uC774 \uD30C\uC77C\uC5D0\uC11C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`
      };
    }
    await page.loadAsync();
    const node = page.children.find((n) => n.name === productKey);
    if (!node) {
      return { ok: false, message: `"${PRODUCT_ASSETS_PAGE_NAME}"\uC5D0\uC11C \uC0C1\uD488 "${productKey}"\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.` };
    }
    const imageFill = getImageFill(node);
    if (!imageFill) {
      return { ok: false, message: `\uC0C1\uD488 \uB178\uB4DC "${productKey}"\uC5D0 \uC774\uBBF8\uC9C0 fill\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.` };
    }
    return { ok: true, imageHash: imageFill.imageHash };
  }
  async function listProductAssets() {
    const page = findProductAssetsPage();
    if (!page) return [];
    await page.loadAsync();
    return page.children.filter((n) => getImageFill(n)).map((n) => n.name);
  }
  async function resolveProductAsset(productKey, bindings = PRODUCT_ASSET_BINDINGS) {
    var _a;
    const variant = findAssetVariantByKey(productKey, bindings);
    let bindingFailureMessage = null;
    if (variant) {
      const bindingResult = await resolveFromConfirmedBinding(variant);
      if (bindingResult == null ? void 0 : bindingResult.ok) return bindingResult;
      bindingFailureMessage = (_a = bindingResult == null ? void 0 : bindingResult.message) != null ? _a : `ProductAssetBinding(assetKey "${productKey}")\uC5D0 confirmedNodeId\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.`;
    }
    const legacyResult = await resolveFromLegacyProductAssetsPage(productKey);
    if (legacyResult.ok) return legacyResult;
    if (bindingFailureMessage) {
      return {
        ok: false,
        message: `ProductAssetBinding \uAE30\uBC18 \uC870\uD68C \uC2E4\uD328: ${bindingFailureMessage} / legacy PRODUCT_ASSETS \uC870\uD68C\uB3C4 \uC2E4\uD328: ${legacyResult.message}`
      };
    }
    return legacyResult;
  }
  function buildImageFill(imageHash, presentation) {
    var _a, _b, _c;
    const scale = (_a = presentation == null ? void 0 : presentation.visualScale) != null ? _a : 1;
    const offsetX = (_b = presentation == null ? void 0 : presentation.offsetX) != null ? _b : 0;
    const offsetY = (_c = presentation == null ? void 0 : presentation.offsetY) != null ? _c : 0;
    if (scale === 1 && offsetX === 0 && offsetY === 0) {
      return [{ type: "IMAGE", imageHash, scaleMode: "FILL" }];
    }
    const s = 1 / scale;
    const tx = (1 - s) / 2 + offsetX;
    const ty = (1 - s) / 2 + offsetY;
    return [
      {
        type: "IMAGE",
        imageHash,
        scaleMode: "CROP",
        imageTransform: [
          [s, 0, tx],
          [0, s, ty]
        ]
      }
    ];
  }
  async function registerProductAssetFromSelection(productKey) {
    const trimmedKey = productKey.trim();
    if (!trimmedKey) {
      return { ok: false, message: "\uC0C1\uD488 \uD0A4\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694." };
    }
    const [selected] = figma.currentPage.selection;
    if (!selected) {
      return { ok: false, message: "\uCE94\uBC84\uC2A4\uC5D0\uC11C \uC7AC\uC0AC\uC6A9\uD560 \uC774\uBBF8\uC9C0 \uB808\uC774\uC5B4\uB97C \uBA3C\uC800 \uC120\uD0DD\uD574\uC8FC\uC138\uC694." };
    }
    const imageFill = getImageFill(selected);
    if (!imageFill) {
      return { ok: false, message: `\uC120\uD0DD\uD55C \uB808\uC774\uC5B4 "${selected.name}"\uC5D0 \uC774\uBBF8\uC9C0 fill\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.` };
    }
    let page = findProductAssetsPage();
    if (!page) {
      page = figma.createPage();
      page.name = PRODUCT_ASSETS_PAGE_NAME;
    }
    await page.loadAsync();
    if (page.children.some((n) => n.name === trimmedKey)) {
      return { ok: false, message: `"${trimmedKey}"\uB294 \uC774\uBBF8 "${PRODUCT_ASSETS_PAGE_NAME}"\uC5D0 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.` };
    }
    const rect = figma.createRectangle();
    rect.name = trimmedKey;
    rect.resize(400, 400);
    rect.fills = [{ type: "IMAGE", imageHash: imageFill.imageHash, scaleMode: "FILL" }];
    const index = page.children.length;
    rect.x = index % 5 * 450;
    rect.y = Math.floor(index / 5) * 450;
    page.appendChild(rect);
    return { ok: true };
  }

  // src/renderer.ts
  var RESULT_GAP = 120;
  function findTemplateFrame(binding) {
    if (binding.templateFrameNodeId) {
      const byId = figma.getNodeById(binding.templateFrameNodeId);
      if (byId && byId.type === "FRAME") return byId;
    }
    const byName = figma.currentPage.findOne(
      (n) => n.type === "FRAME" && n.name === binding.templateFrameName
    );
    return byName && byName.type === "FRAME" ? byName : null;
  }
  function collectLayersByName(root, name) {
    const out = [];
    if ("children" in root) {
      for (const child of root.children) {
        if (child.name === name) out.push(child);
        out.push(...collectLayersByName(child, name));
      }
    }
    return out;
  }
  function findSlotLayer(clone, slotBinding) {
    var _a;
    if (slotBinding.layerIndex === void 0) {
      return clone.findOne((n) => n.name === slotBinding.layerName);
    }
    const matches = collectLayersByName(clone, slotBinding.layerName);
    return (_a = matches[slotBinding.layerIndex]) != null ? _a : null;
  }
  async function renderPlan(plan, bindings = FIGMA_TEMPLATE_BINDINGS, options = {}) {
    var _a, _b;
    const binding = resolveTemplate(plan.layoutKey, plan.channelPresetId, bindings);
    if (!binding) {
      return {
        ok: false,
        message: `layoutKey "${plan.layoutKey}" + channelPresetId "${plan.channelPresetId}"\uC5D0 \uB300\uD55C \uD15C\uD50C\uB9BF \uB9E4\uD551\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.`
      };
    }
    const templateFrame = findTemplateFrame(binding);
    if (!templateFrame) {
      return {
        ok: false,
        message: `\uC6D0\uBCF8 \uD504\uB808\uC784 "${binding.templateFrameName}"\uC744(\uB97C) \uD604\uC7AC \uD30C\uC77C\uC5D0\uC11C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`
      };
    }
    for (const slot of plan.slots) {
      if (!binding.slotBindings.some((b) => b.slotKey === slot.slotKey)) {
        return { ok: false, message: `\uC2AC\uB86F "${slot.slotKey}"\uC5D0 \uB300\uD55C \uB808\uC774\uC5B4 \uB9E4\uD551\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.` };
      }
    }
    const clone = templateFrame.clone();
    clone.name = `${templateFrame.name} (\uC790\uB3D9\uC0DD\uC131 \uACB0\uACFC)`;
    clone.x = templateFrame.x + templateFrame.width + RESULT_GAP;
    clone.y = templateFrame.y;
    (_a = templateFrame.parent) == null ? void 0 : _a.appendChild(clone);
    for (const slot of plan.slots) {
      const slotBinding = binding.slotBindings.find((b) => b.slotKey === slot.slotKey);
      const layer = findSlotLayer(clone, slotBinding);
      if (!layer) {
        clone.remove();
        const indexNote = slotBinding.layerIndex !== void 0 ? `(layerIndex=${slotBinding.layerIndex})` : "";
        return {
          ok: false,
          message: `\uBCF5\uC81C\uB41C \uD504\uB808\uC784\uC5D0\uC11C \uB808\uC774\uC5B4 "${slotBinding.layerName}"${indexNote}\uC744(\uB97C) \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`
        };
      }
      if (!("fills" in layer)) {
        clone.remove();
        return {
          ok: false,
          message: `\uB808\uC774\uC5B4 "${slotBinding.layerName}"\uC740(\uB294) \uC774\uBBF8\uC9C0 \uCC44\uC6B0\uAE30\uB97C \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uB178\uB4DC\uC785\uB2C8\uB2E4.`
        };
      }
      const resolved = await resolveProductAsset(slot.assetKey);
      if (!resolved.ok) {
        clone.remove();
        return { ok: false, message: resolved.message };
      }
      layer.fills = buildImageFill(resolved.imageHash, resolved.presentation);
    }
    if ((_b = options.select) != null ? _b : true) {
      figma.currentPage.selection = [clone];
      figma.viewport.scrollAndZoomIntoView([clone]);
    }
    return { ok: true, nodeId: clone.id };
  }

  // src/verifiedDerivedGeneratedRenderer.ts
  var VERIFIED_DERIVED_GENERATED_SUPPORT = [
    {
      channelPresetId: "naver-1000x1000",
      targetSlotCount: 2,
      sourceLayoutKey: "LAYOUT_02",
      keepLayerNames: ["image 313", "image 410"]
    },
    {
      channelPresetId: "naver-1000x1000",
      targetSlotCount: 4,
      sourceLayoutKey: "LAYOUT_03",
      keepLayerNames: ["image 411", "image 413", "image 414", "image 415"]
    },
    {
      channelPresetId: "naver-1000x1000",
      targetSlotCount: 6,
      sourceLayoutKey: "LAYOUT_04",
      keepLayerNames: ["image 321", "image 312", "image 313", "image 315", "image 318", "image 319"]
    },
    {
      channelPresetId: "naver-1000x1000",
      targetSlotCount: 7,
      sourceLayoutKey: "LAYOUT_04",
      keepLayerNames: ["image 321", "image 312", "image 313", "image 315", "image 316", "image 318", "image 319"]
    },
    {
      channelPresetId: "naver-1000x1000",
      targetSlotCount: 8,
      sourceLayoutKey: "LAYOUT_04",
      keepLayerNames: [
        "image 321",
        "image 312",
        "image 313",
        "image 315",
        "image 316",
        "image 318",
        "image 319",
        "image 320"
      ]
    },
    {
      channelPresetId: "naver-1000x1000",
      targetSlotCount: 9,
      sourceLayoutKey: "LAYOUT_04",
      keepLayerNames: [
        "image 321",
        "image 312",
        "image 313",
        "image 314",
        "image 315",
        "image 316",
        "image 318",
        "image 319",
        "image 320"
      ]
    }
  ];
  var RESULT_GAP2 = 120;
  var RECENTER_THRESHOLD_RATIO = 0.08;
  function findVerifiedTemplateFrame(binding) {
    if (binding.templateFrameNodeId) {
      const byId = figma.getNodeById(binding.templateFrameNodeId);
      if (byId && byId.type === "FRAME") return byId;
    }
    const byName = figma.currentPage.findOne((n) => n.type === "FRAME" && n.name === binding.templateFrameName);
    return byName && byName.type === "FRAME" ? byName : null;
  }
  function findSupport(plan, support) {
    if (plan.layoutSource.kind !== "generated") return void 0;
    return support.find((s) => s.channelPresetId === plan.channelPresetId && s.targetSlotCount === plan.slots.length);
  }
  async function renderVerifiedDerivedGeneratedPlan(plan, support = VERIFIED_DERIVED_GENERATED_SUPPORT, bindings = FIGMA_TEMPLATE_BINDINGS, options = {}) {
    var _a, _b, _c;
    if (plan.layoutSource.kind !== "generated") {
      return { ok: false, message: "generated plan\uC774 \uC544\uB2D9\uB2C8\uB2E4(verified plan\uC740 renderer.ts\uB97C \uC4F0\uC138\uC694)." };
    }
    const matched = findSupport(plan, support);
    if (!matched) {
      return {
        ok: false,
        message: `channelPresetId "${plan.channelPresetId}"(\uC2AC\uB86F ${plan.slots.length}\uAC1C)\uC5D0 \uB300\uD55C verified-derived \uAE30\uBCF8 \uD15C\uD50C\uB9BF\uC774 \uC544\uC9C1 \uC5C6\uC2B5\uB2C8\uB2E4(GENERATED_BASE_TEMPLATE_NOT_AVAILABLE).`
      };
    }
    if (matched.keepLayerNames.length !== plan.slots.length) {
      return {
        ok: false,
        message: `\uC124\uC815 \uC624\uB958: keepLayerNames \uAC1C\uC218(${matched.keepLayerNames.length})\uC640 plan.slots \uAC1C\uC218(${plan.slots.length})\uAC00 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.`
      };
    }
    const sourceBinding = resolveTemplate(matched.sourceLayoutKey, matched.channelPresetId, bindings);
    if (!sourceBinding) {
      return {
        ok: false,
        message: `\uD30C\uC0DD \uC6D0\uBCF8 layoutKey "${matched.sourceLayoutKey}" + channelPresetId "${matched.channelPresetId}"\uC758 verified template binding\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.`
      };
    }
    const sourceFrame = findVerifiedTemplateFrame(sourceBinding);
    if (!sourceFrame) {
      return { ok: false, message: `\uC6D0\uBCF8 verified \uD504\uB808\uC784 "${sourceBinding.templateFrameName}"\uC744(\uB97C) \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.` };
    }
    const clone = sourceFrame.clone();
    clone.name = `${sourceFrame.name} (generated-v2 ${plan.slots.length} \uC790\uB3D9\uC0DD\uC131 \uACB0\uACFC)`;
    clone.x = sourceFrame.x + sourceFrame.width + RESULT_GAP2;
    clone.y = sourceFrame.y;
    (_a = sourceFrame.parent) == null ? void 0 : _a.appendChild(clone);
    const keepSet = new Set(matched.keepLayerNames);
    for (const b of sourceBinding.slotBindings) {
      if (!keepSet.has(b.layerName)) {
        (_b = clone.findOne((n) => n.name === b.layerName)) == null ? void 0 : _b.remove();
      }
    }
    const keptLayers = [];
    for (let i = 0; i < matched.keepLayerNames.length; i++) {
      const layerName = matched.keepLayerNames[i];
      const layer = clone.findOne((n) => n.name === layerName);
      if (!layer || !("fills" in layer)) {
        clone.remove();
        return { ok: false, message: `\uC720\uC9C0 \uB300\uC0C1 \uB808\uC774\uC5B4 "${layerName}"\uC744(\uB97C) \uBCF5\uC81C\uB41C \uD504\uB808\uC784\uC5D0\uC11C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.` };
      }
      const resolved = await resolveProductAsset(plan.slots[i].assetKey);
      if (!resolved.ok) {
        clone.remove();
        return { ok: false, message: resolved.message };
      }
      layer.fills = buildImageFill(resolved.imageHash, resolved.presentation);
      keptLayers.push(layer);
    }
    const minX = Math.min(...keptLayers.map((n) => n.x));
    const minY = Math.min(...keptLayers.map((n) => n.y));
    const maxX = Math.max(...keptLayers.map((n) => n.x + n.width));
    const maxY = Math.max(...keptLayers.map((n) => n.y + n.height));
    const bboxCenterX = (minX + maxX) / 2;
    const bboxCenterY = (minY + maxY) / 2;
    const frameCenterX = clone.width / 2;
    const frameCenterY = clone.height / 2;
    const dx = frameCenterX - bboxCenterX;
    const dy = frameCenterY - bboxCenterY;
    const lopsided = Math.abs(dx) > clone.width * RECENTER_THRESHOLD_RATIO || Math.abs(dy) > clone.height * RECENTER_THRESHOLD_RATIO;
    if (lopsided) {
      for (const layer of keptLayers) {
        layer.x += dx;
        layer.y += dy;
      }
    }
    if ((_c = options.select) != null ? _c : true) {
      figma.currentPage.selection = [clone];
      figma.viewport.scrollAndZoomIntoView([clone]);
    }
    return { ok: true, nodeId: clone.id, sourceLayoutKey: matched.sourceLayoutKey, slotCount: plan.slots.length, recentered: lopsided };
  }

  // src/renderPreflight.ts
  function parseGeneratedSlotCount(layoutKey) {
    const match = layoutKey.match(/_(\d+)$/);
    return match ? Number(match[1]) : null;
  }
  function checkRenderability(input, bindings = FIGMA_TEMPLATE_BINDINGS, verifiedDerivedSupport = VERIFIED_DERIVED_GENERATED_SUPPORT) {
    if (input.layoutSource === "verified") {
      const binding = resolveTemplate(input.layoutKey, input.channelPresetId, bindings);
      if (!binding) {
        return {
          renderable: false,
          reason: "NO_FIGMA_TEMPLATE_BINDING",
          message: `layoutKey "${input.layoutKey}" + channelPresetId "${input.channelPresetId}"\uC5D0 \uB300\uD55C \uC2E4\uC81C Figma template binding\uC774 \uC5C6\uC5B4 \uC9C0\uAE08\uC740 \uC0DD\uC131\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`
        };
      }
      return { renderable: true };
    }
    const slotCount = parseGeneratedSlotCount(input.layoutKey);
    const supported = verifiedDerivedSupport.some(
      (s) => s.channelPresetId === input.channelPresetId && s.targetSlotCount === slotCount
    );
    if (!supported) {
      return {
        renderable: false,
        reason: "GENERATED_BASE_TEMPLATE_NOT_AVAILABLE",
        message: `channelPresetId "${input.channelPresetId}"(\uC2AC\uB86F ${slotCount != null ? slotCount : "?"}\uAC1C)\uC5D0 \uB300\uD55C verified-derived \uAE30\uBCF8 \uD15C\uD50C\uB9BF\uC774 \uC544\uC9C1 \uC5C6\uC5B4 generated\uB85C \uC0DD\uC131\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`
      };
    }
    return { renderable: true };
  }
  function checkRenderabilityForPlan(plan, bindings = FIGMA_TEMPLATE_BINDINGS, verifiedDerivedSupport = VERIFIED_DERIVED_GENERATED_SUPPORT) {
    return checkRenderability(
      {
        layoutKey: plan.layoutKey,
        channelPresetId: plan.channelPresetId,
        layoutSource: plan.layoutSource.kind,
        arrangementFamily: plan.layoutSource.kind === "generated" ? plan.layoutSource.params.familyId : null,
        productGroup: plan.productGroup,
        thumbnailType: plan.thumbnailType
      },
      bindings,
      verifiedDerivedSupport
    );
  }
  async function checkAssetResolvability(plan, resolveAsset = resolveProductAsset) {
    for (const slot of plan.slots) {
      const result = await resolveAsset(slot.assetKey);
      if (!result.ok) {
        return {
          renderable: false,
          reason: "PRODUCT_ASSET_NOT_RESOLVABLE",
          message: `\uC2AC\uB86F "${slot.slotKey}"(assetKey "${slot.assetKey}")\uC758 \uC0C1\uD488 asset\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${result.message}`
        };
      }
    }
    return { renderable: true };
  }

  // src/batchRenderer.ts
  var AUTO_GENERATED_VERIFIED_PAGE_NAME = "AUTO_GENERATED_VERIFIED";
  var AUTO_GENERATED_REVIEW_PAGE_NAME = "AUTO_GENERATED_REVIEW";
  async function findOrCreatePage(name) {
    const existing = figma.root.children.find((p) => p.type === "PAGE" && p.name === name);
    const page = existing && existing.type === "PAGE" ? existing : figma.createPage();
    if (!existing) page.name = name;
    await page.loadAsync();
    return page;
  }
  function buildFrameName(workOrderId, channelPresetId, layoutKey, source) {
    return `${workOrderId}__${channelPresetId}__${layoutKey}__${source === "verified" ? "VERIFIED" : "GENERATED"}`;
  }
  function buildItems(wo) {
    return wo.lines.map((l) => ({ productId: l.productCode, quantity: l.quantity }));
  }
  async function renderBatch(batch, deps, options = {}, rendererDeps = {}) {
    var _a, _b, _c, _d;
    const includeReviewRequired = (_a = options.includeReviewRequired) != null ? _a : false;
    const bindings = (_b = rendererDeps.bindings) != null ? _b : FIGMA_TEMPLATE_BINDINGS;
    const verifiedDerivedSupport = (_c = rendererDeps.verifiedDerivedSupport) != null ? _c : VERIFIED_DERIVED_GENERATED_SUPPORT;
    const resolveAsset = (_d = rendererDeps.resolveAsset) != null ? _d : resolveProductAsset;
    const verifiedPage = await findOrCreatePage(AUTO_GENERATED_VERIFIED_PAGE_NAME);
    const reviewPage = await findOrCreatePage(AUTO_GENERATED_REVIEW_PAGE_NAME);
    const outputs = [];
    for (const wo of batch.workOrders) {
      if (wo.status !== "valid") continue;
      const fanout = composeChannelOutputs(
        {
          items: buildItems(wo),
          channelId: wo.channelId,
          options: wo.badge === null ? void 0 : { badge: { enabled: wo.badge } }
        },
        deps
      );
      if (!fanout.ok) continue;
      for (const output of fanout.outputs) {
        if (!output.result.ok) {
          outputs.push({
            workOrderId: wo.workId,
            channelLabel: wo.channelLabel,
            channelPresetId: output.channelPresetId,
            frameWidth: output.frameWidth,
            frameHeight: output.frameHeight,
            layoutKey: null,
            source: null,
            outcome: output.result.reviewRequired ? "skippedReviewRequired" : "skippedError",
            message: output.result.message
          });
          continue;
        }
        const plan = output.result.plan;
        const source = plan.layoutSource.kind;
        if (plan.reviewRequired && !includeReviewRequired) {
          outputs.push({
            workOrderId: wo.workId,
            channelLabel: wo.channelLabel,
            channelPresetId: output.channelPresetId,
            frameWidth: output.frameWidth,
            frameHeight: output.frameHeight,
            layoutKey: plan.layoutKey,
            source,
            outcome: "skippedReviewRequired",
            message: "reviewRequired(generated) plan \u2014 includeReviewRequired \uC635\uC158\uC774 \uAEBC\uC838 \uC788\uC5B4 \uAE30\uBCF8\uC801\uC73C\uB85C \uC0DD\uC131\uD558\uC9C0 \uC54A\uC74C"
          });
          continue;
        }
        const renderability = checkRenderabilityForPlan(plan, bindings, verifiedDerivedSupport);
        if (!renderability.renderable) {
          outputs.push({
            workOrderId: wo.workId,
            channelLabel: wo.channelLabel,
            channelPresetId: output.channelPresetId,
            frameWidth: output.frameWidth,
            frameHeight: output.frameHeight,
            layoutKey: plan.layoutKey,
            source,
            outcome: "skippedNotRenderable",
            message: renderability.message
          });
          continue;
        }
        const assetResolvability = await checkAssetResolvability(plan, resolveAsset);
        if (!assetResolvability.renderable) {
          outputs.push({
            workOrderId: wo.workId,
            channelLabel: wo.channelLabel,
            channelPresetId: output.channelPresetId,
            frameWidth: output.frameWidth,
            frameHeight: output.frameHeight,
            layoutKey: plan.layoutKey,
            source,
            outcome: "skippedNotRenderable",
            message: assetResolvability.message
          });
          continue;
        }
        const renderResult = source === "verified" ? await renderPlan(plan, bindings, { select: false }) : await renderVerifiedDerivedGeneratedPlan(plan, verifiedDerivedSupport, bindings, { select: false });
        if (!renderResult.ok) {
          outputs.push({
            workOrderId: wo.workId,
            channelLabel: wo.channelLabel,
            channelPresetId: output.channelPresetId,
            frameWidth: output.frameWidth,
            frameHeight: output.frameHeight,
            layoutKey: plan.layoutKey,
            source,
            outcome: "failed",
            message: renderResult.message
          });
          continue;
        }
        const node = await figma.getNodeByIdAsync(renderResult.nodeId);
        const frameName = buildFrameName(wo.workId, output.channelPresetId, plan.layoutKey, source);
        if (node) {
          node.name = frameName;
          const targetPage = source === "verified" ? verifiedPage : reviewPage;
          targetPage.appendChild(node);
        }
        outputs.push({
          workOrderId: wo.workId,
          channelLabel: wo.channelLabel,
          channelPresetId: output.channelPresetId,
          frameWidth: output.frameWidth,
          frameHeight: output.frameHeight,
          layoutKey: plan.layoutKey,
          source,
          outcome: "generated",
          nodeId: renderResult.nodeId,
          frameName
        });
      }
    }
    const summary = {
      totalWorkOrders: batch.workOrders.length,
      totalOutputs: outputs.length,
      generatedCount: outputs.filter((o) => o.outcome === "generated").length,
      skippedReviewRequiredCount: outputs.filter((o) => o.outcome === "skippedReviewRequired").length,
      skippedNotRenderableCount: outputs.filter((o) => o.outcome === "skippedNotRenderable").length,
      skippedErrorCount: outputs.filter((o) => o.outcome === "skippedError").length,
      failedCount: outputs.filter((o) => o.outcome === "failed").length
    };
    return { summary, outputs };
  }

  // src/exportRenderer.ts
  async function exportNodesAsJpg(items) {
    const files = [];
    const failures = [];
    for (const item of items) {
      const node = await figma.getNodeByIdAsync(item.nodeId);
      if (!node) {
        failures.push({ fileName: item.fileName, message: `\uB178\uB4DC "${item.nodeId}"\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.` });
        continue;
      }
      if (!("exportAsync" in node) || !("width" in node) || !("height" in node)) {
        failures.push({ fileName: item.fileName, message: `\uB178\uB4DC "${node.name}"\uB294 JPG export\uB97C \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.` });
        continue;
      }
      try {
        const bytes = await node.exportAsync({ format: "JPG" });
        const { width, height } = node;
        files.push({ fileName: item.fileName, bytes, width, height });
      } catch (e) {
        failures.push({ fileName: item.fileName, message: e.message });
      }
    }
    return { files, failures };
  }

  // src/code.ts
  figma.showUI(__html__, { width: 460, height: 560 });
  var CURRENT_FILE_PRODUCT_GROUP = "simple-meal";
  function post(message) {
    figma.ui.postMessage(message);
  }
  async function sendProductList() {
    const products = await listProductAssets();
    post({ type: "products", products });
  }
  figma.ui.onmessage = async (msg) => {
    if (msg.type === "ready") {
      await sendProductList();
      return;
    }
    if (msg.type === "register") {
      const result = await registerProductAssetFromSelection(msg.productKey);
      if (!result.ok) {
        post({ type: "error", message: result.message });
        return;
      }
      post({ type: "registered", productKey: msg.productKey });
      await sendProductList();
      return;
    }
    if (msg.type === "generate") {
      try {
        if (!msg.productKey) {
          post({ type: "error", message: "\uC0C1\uD488\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694." });
          return;
        }
        if (!Number.isInteger(msg.quantity) || msg.quantity <= 0) {
          post({ type: "error", message: "\uC218\uB7C9\uC740 1 \uC774\uC0C1\uC758 \uC815\uC218\uC5EC\uC57C \uD569\uB2C8\uB2E4." });
          return;
        }
        const product = {
          id: msg.productKey,
          name: msg.productKey,
          productGroup: CURRENT_FILE_PRODUCT_GROUP,
          assetKey: msg.productKey
        };
        const request = {
          items: [{ productId: product.id, quantity: msg.quantity }],
          channelPresetId: "naver-1000x1000"
        };
        const composeResult = composePlan(request, {
          products: [product],
          channelPresets: CHANNEL_PRESETS,
          layouts: LAYOUTS
        });
        if (!composeResult.ok) {
          post({ type: "error", message: `[${composeResult.reason}] ${composeResult.message}` });
          return;
        }
        const renderResult = await renderPlan(composeResult.plan);
        if (!renderResult.ok) {
          post({ type: "error", message: renderResult.message });
          return;
        }
        post({ type: "success", nodeId: renderResult.nodeId });
      } catch (e) {
        post({ type: "error", message: `\uC608\uC0C1\uD558\uC9C0 \uBABB\uD55C \uC624\uB958: ${e.message}` });
      }
      return;
    }
    if (msg.type === "renderBatch") {
      try {
        const result = await renderBatch(
          msg.batch,
          { products: DOMAIN_PRODUCTS, channelPresets: CHANNEL_PRESETS, layouts: LAYOUTS },
          { includeReviewRequired: msg.includeReviewRequired }
        );
        post({ type: "batchRenderResult", result });
      } catch (e) {
        post({ type: "error", message: `Batch Render \uC911 \uC624\uB958: ${e.message}` });
      }
      return;
    }
    if (msg.type === "exportBatch") {
      try {
        const { files, failures } = await exportNodesAsJpg(msg.items);
        post({ type: "exportBatchResult", files, failures });
      } catch (e) {
        post({ type: "error", message: `JPEG export \uC911 \uC624\uB958: ${e.message}` });
      }
      return;
    }
  };
})();
