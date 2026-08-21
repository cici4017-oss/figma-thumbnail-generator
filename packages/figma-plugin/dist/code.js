"use strict";
(() => {
  // ../core/src/domain/thumbnailType.ts
  var DEFAULT_THUMBNAIL_TYPE = "basic";

  // ../core/src/domain/layout.ts
  function getSaleSlotCount(layout) {
    return layout.slots.filter((s) => s.role === "sale").length;
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
        reason: "CHANNEL_PRESET_NOT_FOUND",
        message: `channelPresetId "${request.channelPresetId}"\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`
      };
    }
    if (request.items.length === 0) {
      return { ok: false, reason: "EMPTY_ITEMS", message: "\uD310\uB9E4 \uC0C1\uD488 \uD56D\uBAA9(items)\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4." };
    }
    const saleProductIds = expandItems(request.items);
    const giftProductIds = expandItems((_a = request.giftItems) != null ? _a : []);
    const productLookup = new Map(deps.products.map((p) => [p.id, p]));
    for (const id of [...saleProductIds, ...giftProductIds]) {
      if (!productLookup.has(id)) {
        return { ok: false, reason: "PRODUCT_NOT_FOUND", message: `productId "${id}"\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.` };
      }
    }
    const groups = new Set(
      [...saleProductIds, ...giftProductIds].map((id) => productLookup.get(id).productGroup)
    );
    if (groups.size > 1) {
      return {
        ok: false,
        reason: "INCONSISTENT_PRODUCT_GROUP",
        message: `\uC694\uCCAD\uC5D0 \uC11C\uB85C \uB2E4\uB978 productGroup\uC774 \uC11E\uC5EC \uC788\uC2B5\uB2C8\uB2E4: ${[...groups].join(", ")}`
      };
    }
    const productGroup = [...groups][0];
    const composition = new Set(request.items.map((i) => i.productId)).size > 1 ? "mixed" : "single";
    const thumbnailType = (_b = request.thumbnailType) != null ? _b : DEFAULT_THUMBNAIL_TYPE;
    const selection = selectLayout(
      {
        productGroup,
        composition,
        totalQuantity: saleProductIds.length,
        giftQuantity: giftProductIds.length,
        channelId: channelPreset.channelId,
        aspectRatioFamily: channelPreset.aspectRatioFamily,
        thumbnailType
      },
      deps.layouts
    );
    if (!selection.ok) {
      return { ok: false, reason: selection.reason, message: selection.message };
    }
    const saleSlots = selection.layout.slots.filter((s) => s.role === "sale");
    const giftSlots = selection.layout.slots.filter((s) => s.role === "gift");
    const slots = [
      ...saleSlots.map(
        (slot, i) => ({
          slotKey: slot.slotKey,
          assetKey: productLookup.get(saleProductIds[i]).assetKey,
          role: "sale"
        })
      ),
      ...giftSlots.map(
        (slot, i) => ({
          slotKey: slot.slotKey,
          assetKey: productLookup.get(giftProductIds[i]).assetKey,
          role: "gift"
        })
      )
    ];
    return {
      ok: true,
      plan: {
        layoutKey: selection.layout.layoutKey,
        channelPresetId: channelPreset.id,
        productGroup,
        thumbnailType,
        slots,
        options: {
          badge: (_c = request.options) == null ? void 0 : _c.badge,
          storageLabel: (_d = request.options) == null ? void 0 : _d.storageLabel,
          logoVariant: (_f = (_e = request.options) == null ? void 0 : _e.logoVariant) != null ? _f : "red"
        }
      }
    };
  }

  // ../core/src/data/channelPresets.ts
  var CHANNEL_PRESETS = [
    {
      id: "naver-1000x1000",
      channelId: "naver",
      frameWidth: 1e3,
      frameHeight: 1e3,
      aspectRatioFamily: "square",
      storageLabelSupported: true,
      badgeSupported: true
    }
  ];

  // ../core/src/data/layouts.ts
  var LAYOUTS = [
    {
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
        thumbnailTypes: ["basic"]
      },
      priority: 100
    }
  ];

  // src/templateMapper.ts
  var FIGMA_TEMPLATE_BINDINGS = [
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
  async function listProductAssets() {
    const page = findProductAssetsPage();
    if (!page) return [];
    await page.loadAsync();
    return page.children.filter((n) => getImageFill(n)).map((n) => n.name);
  }
  async function resolveProductAsset(productKey) {
    const page = findProductAssetsPage();
    if (!page) {
      return {
        ok: false,
        message: `"${PRODUCT_ASSETS_PAGE_NAME}" \uD398\uC774\uC9C0\uB97C \uC774 \uD30C\uC77C\uC5D0\uC11C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uBA3C\uC800 \uC0C1\uD488\uC744 \uB4F1\uB85D\uD574\uC8FC\uC138\uC694.`
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
  async function renderPlan(plan, bindings = FIGMA_TEMPLATE_BINDINGS) {
    var _a;
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
      const layer = clone.findOne((n) => n.name === slotBinding.layerName);
      if (!layer) {
        clone.remove();
        return {
          ok: false,
          message: `\uBCF5\uC81C\uB41C \uD504\uB808\uC784\uC5D0\uC11C \uB808\uC774\uC5B4 "${slotBinding.layerName}"\uC744(\uB97C) \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`
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
      layer.fills = [
        { type: "IMAGE", imageHash: resolved.imageHash, scaleMode: "FILL" }
      ];
    }
    figma.currentPage.selection = [clone];
    figma.viewport.scrollAndZoomIntoView([clone]);
    return { ok: true, nodeId: clone.id };
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
    }
  };
})();
