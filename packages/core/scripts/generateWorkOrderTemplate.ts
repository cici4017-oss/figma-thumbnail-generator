/**
 * 표준 "썸네일 자동화 요청서" Excel 템플릿을 생성해 저장소에 커밋되는 정적 파일로 저장한다.
 * 실제 워크북 구성 로직(시트/컬럼/데이터 유효성 검사 등)은 src/import/workOrderTemplateBuilder.ts
 * 하나에만 있다 — 상품/채널 데이터는 여기서 하드코딩하지 않고 data/products.ts, data/channels.ts를
 * 그대로 source of truth로 쓴다(figma-plugin의 "Excel 양식 다운로드" 버튼도 같은 빌더를 쓴다).
 *
 * 다시 실행하면 최신 상품/채널 데이터를 반영한 템플릿을 재생성할 수 있다:
 *   npm run generate:template
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildWorkOrderTemplateWorkbook } from '../src/import/workOrderTemplateBuilder';
import { PRODUCTS } from '../src/data/products';
import { CHANNELS } from '../src/data/channels';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, '../../../templates/썸네일_자동화_요청서.xlsx');

async function main() {
  const workbook = buildWorkOrderTemplateWorkbook({ products: PRODUCTS, channels: CHANNELS });
  await workbook.xlsx.writeFile(OUTPUT_PATH);
  console.log(`생성 완료: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
