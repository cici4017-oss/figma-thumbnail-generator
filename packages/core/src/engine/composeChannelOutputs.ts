import type { Product } from '../domain/product';
import type { AspectRatioFamily, ChannelPreset } from '../domain/channel';
import type { LayoutDefinition } from '../domain/layout';
import type { GenerationRequest } from '../domain/generation-request';
import { composePlan, type ComposePlanResult } from './composePlan';

/**
 * 하나의 판매채널(channelId)이 여러 출력 규격(ChannelPreset)을 가질 수 있다는 사실을
 * composePlan/CompositionPlan에는 알리지 않는다 — composePlan은 지금처럼 "preset 1개당
 * 결과 1개"만 책임진다(GenerationRequest에도 preset 배열을 넣지 않는다). 이 모듈은 그 위에서
 * channelId 하나를 그 channelId에 등록된 모든 ChannelPreset으로 fan-out해서, preset 수만큼
 * composePlan을 독립적으로 호출하는 오케스트레이션 계층이다.
 *
 * 각 preset의 결과(ComposePlanResult)는 서로 완전히 독립적이다 — 한 preset이 generated
 * fallback(reviewRequired)이 됐다고 해서 다른 preset의 verified/ready 결과에 영향을 주지
 * 않는다. square Layout을 wide로 스케일해서 재사용하지 않는다: composePlan이 내부적으로
 * resolveLayout을 호출할 때 이미 channelPreset.aspectRatioFamily 기준으로 verified Layout을
 * 찾고, 없으면 슬롯 수 기반 generated fallback을 쓰므로 별도 처리가 필요 없다.
 */

export type ChannelOutputsRequest = Omit<GenerationRequest, 'channelPresetId'> & { channelId: string };

export interface ChannelOutput {
  channelPresetId: string;
  aspectRatioFamily: AspectRatioFamily;
  frameWidth: number;
  frameHeight: number;
  result: ComposePlanResult;
}

export type ComposeChannelOutputsFailureReason = 'CHANNEL_NOT_FOUND';

export type ComposeChannelOutputsResult =
  | { ok: true; outputs: ChannelOutput[] }
  | { ok: false; reason: ComposeChannelOutputsFailureReason; message: string };

export function composeChannelOutputs(
  request: ChannelOutputsRequest,
  deps: { products: Product[]; channelPresets: ChannelPreset[]; layouts: LayoutDefinition[] },
): ComposeChannelOutputsResult {
  const { channelId, ...requestWithoutChannel } = request;
  const presets = deps.channelPresets.filter((p) => p.channelId === channelId);

  if (presets.length === 0) {
    return {
      ok: false,
      reason: 'CHANNEL_NOT_FOUND',
      message: `channelId "${channelId}"에 등록된 ChannelPreset이 없습니다.`,
    };
  }

  const outputs: ChannelOutput[] = presets.map((preset) => ({
    channelPresetId: preset.id,
    aspectRatioFamily: preset.aspectRatioFamily,
    frameWidth: preset.frameWidth,
    frameHeight: preset.frameHeight,
    result: composePlan({ ...requestWithoutChannel, channelPresetId: preset.id }, deps),
  }));

  return { ok: true, outputs };
}
