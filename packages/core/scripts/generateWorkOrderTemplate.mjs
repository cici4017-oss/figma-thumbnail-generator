/**
 * 표준 "썸네일 자동화 요청서" Excel 템플릿을 생성하는 스크립트.
 *
 * 지저분한 레거시 작업지시 양식(병합 셀, 채널명 안에 수량/옵션이 뒤섞인 형태)을 해석하는 대신,
 * 앞으로 자동화가 직접 읽을 표준 양식을 먼저 만들고 그 규격만 지원하기로 한 결정에 따른 산출물이다.
 *
 * 이 스크립트를 다시 실행하면 동일한 템플릿을 재생성할 수 있다:
 *   node packages/core/scripts/generateWorkOrderTemplate.mjs
 *
 * 이 스크립트는 아직 이 템플릿을 "읽는" 파서와는 무관하다 — 파일과 컬럼 규격만 만든다.
 *
 * 채널 모델링 관련 결정: "광고용"/"위탁" 같은 표기는 실제 출력 규격을 바꾸는 공식 분류가 아니라고
 * 확인되어, 채널 자체의 variant로 모델링하지 않는다. 채널은 실제 출력 규격/템플릿이 달라지는
 * 판매채널 단위로만 관리한다.
 *
 * thumbnailType(basic/staged)은 core 도메인 모델에는 존재하지만 V1 표준 요청서에는 넣지 않는다.
 * 특수 연출 요청은 우선 "비고"로 받고, parser가 비고 유무만으로 reviewRequired 처리한다.
 *
 * 상품 선택은 상품코드가 아니라 "상품명" 드롭다운으로 한다 — 상품코드는 자동화 식별자일 뿐이고
 * 작성자가 외우거나 직접 고르기엔 불편하기 때문. 상품명을 고르면 상품코드는 수식으로 자동 입력되고
 * 회색으로 표시해 직접 수정하지 않도록 한다.
 */

import ExcelJS from 'exceljs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, '../../../templates/썸네일_자동화_요청서.xlsx');

const COLORS = {
  headerFill: 'FF1F3864', // 진한 네이비
  headerFont: 'FFFFFFFF',
  workSheetTab: 'FF2E7D32', // 초록 — 직접 입력하는 시트
  lockedSheetTab: 'FFB71C1C', // 빨강 — 건드리면 안 되는 시트
  guideSheetTab: 'FF616161', // 회색 — 안내 시트
  lockedBannerFill: 'FFFDECEA',
  lockedBannerFont: 'FFB71C1C',
  autoFillCell: 'FFF2F2F2',
};

/**
 * 02_상품목록 컬럼 순서: 상품코드(A) 상품군(B) 브랜드(C) 상품명(D) 용량(E)
 * "상품명"(D열)이 드롭다운 원천이자 자동입력 수식의 조회 키가 되므로, 상품목록 전체에서
 * 상품명이 고유해야 한다 (그룹이 달라도 이름이 겹치면 안 됨).
 */
const PRODUCT_ROWS = {
  simpleMeal: [
    { code: 'SIMPLE_BEEF_JANGJORIM_130', brand: '본죽', name: '소고기장조림', capacity: '130g' },
    { code: 'SIMPLE_QUAIL_JANGJORIM_180', brand: '본죽', name: '메추리알 장조림', capacity: '180g' },
    { code: 'SIMPLE_CHIVE_KKOMAK_240', brand: '본죽', name: '부추 꼬막무침', capacity: '240g' },
  ],
  baby: [
    { code: 'BABY_BEEF_PORRIDGE_100', brand: '본죽', name: '이유식 소고기죽', capacity: '100g' },
    { code: 'BABY_PUMPKIN_PORRIDGE_100', brand: '본죽', name: '이유식 단호박죽', capacity: '100g' },
  ],
};

/**
 * 실제 출력 규격/템플릿이 달라지는 판매채널 단위로만 관리한다.
 * "광고용"/"위탁" 같은 표기는 공식 분류가 아니므로 여기 포함하지 않는다.
 */
const CHANNELS = [
  { label: '네이버', channelId: 'naver' },
  { label: '카카오', channelId: 'kakao' },
  { label: '옥션', channelId: 'auction' },
  { label: '지마켓', channelId: 'gmarket' },
  { label: '홈앤쇼핑', channelId: 'home-and-shopping' },
  { label: '알리익스프레스', channelId: 'aliexpress' },
  { label: 'SSG', channelId: 'ssg' },
  { label: 'SK스토아', channelId: 'sk-stoa' },
  { label: '쿠팡', channelId: 'coupang' },
  { label: 'NS홈쇼핑', channelId: 'ns-shopping' },
  { label: 'GS샵', channelId: 'gs-shop' },
  { label: '롯데온', channelId: 'lotte-on' },
  { label: 'SKT딜', channelId: 'skt-deal' },
  { label: '올웨이즈', channelId: 'alwayz' },
  { label: '이랜드몰', channelId: 'eland-mall' },
  { label: '신세계TV쇼핑', channelId: 'shinsegae-tv-shopping' },
  { label: '11번가', channelId: '11st' },
  { label: '토스', channelId: 'toss' },
  { label: '제이슨딜', channelId: 'jasondeal' },
];

const TEMPLATE_ROW_COUNT = 500; // 데이터 유효성 검사를 미리 적용해 둘 여유 행 수 (100~200건+버퍼)

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.headerFont } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerFill } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  row.height = 22;
}

/**
 * 병합 셀을 쓰지 않고(요구사항) 경고 배너처럼 보이게 한다:
 * 첫 컬럼에만 문구를 쓰고, 같은 행의 나머지 컬럼들은 배경색만 맞춰서
 * 자연스러운 텍스트 오버플로우로 배너처럼 보이게 한다.
 */
function addLockedSheetBanner(worksheet, colCount, message) {
  const row = worksheet.getRow(1);
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lockedBannerFill } };
    if (c === 1) {
      cell.value = message;
      cell.font = { bold: true, color: { argb: COLORS.lockedBannerFont } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    }
  }
  row.height = 28;
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'thumbnail-generator';
  workbook.created = new Date();

  // 탭 순서가 01→02→03→04로 보이도록 먼저 시트를 순서대로 만들어 둔다.
  // (실제 내용 채우기는 02/03의 행 범위를 먼저 계산해야 하는 01보다 02/03을 먼저 채운다.)
  const workSheet = workbook.addWorksheet('01_작업요청', {
    properties: { tabColor: { argb: COLORS.workSheetTab } },
  });
  const productSheet = workbook.addWorksheet('02_상품목록', {
    properties: { tabColor: { argb: COLORS.lockedSheetTab } },
  });
  const channelSheet = workbook.addWorksheet('03_채널목록', {
    properties: { tabColor: { argb: COLORS.lockedSheetTab } },
  });
  const guideSheet = workbook.addWorksheet('04_작성가이드', {
    properties: { tabColor: { argb: COLORS.guideSheetTab } },
  });

  // ---------------------------------------------------------------------
  // 02_상품목록 (건드리면 안 됨) — 간편식 블록, 영유아 블록을 각각 연속된 행으로 배치해야
  // 아래 defined name(PRODUCTS_간편식/PRODUCTS_영유아)이 정확한 연속 범위를 가리킬 수 있다.
  // ---------------------------------------------------------------------
  addLockedSheetBanner(
    productSheet,
    5,
    '⚠ 이 시트는 자동화 기준 데이터입니다. 직접 수정하지 마세요. 상품 추가/변경은 담당자에게 요청하세요.',
  );

  const productHeaderRow = productSheet.getRow(2);
  productHeaderRow.values = ['상품코드', '상품군', '브랜드', '상품명', '용량'];
  styleHeaderRow(productHeaderRow);
  productSheet.columns = [
    { key: 'code', width: 28 },
    { key: 'group', width: 12 },
    { key: 'brand', width: 12 },
    { key: 'name', width: 22 },
    { key: 'capacity', width: 10 },
  ];

  let r = 3;
  const simpleMealStartRow = r;
  for (const p of PRODUCT_ROWS.simpleMeal) {
    productSheet.getRow(r).values = [p.code, '간편식', p.brand, p.name, p.capacity];
    r++;
  }
  const simpleMealEndRow = r - 1;

  const babyStartRow = r;
  for (const p of PRODUCT_ROWS.baby) {
    productSheet.getRow(r).values = [p.code, '영유아', p.brand, p.name, p.capacity];
    r++;
  }
  const babyEndRow = r - 1;

  // 드롭다운/자동입력 모두 "상품명"(D열) 기준이므로 defined name도 D열을 가리킨다.
  workbook.definedNames.add(
    `'02_상품목록'!$D$${simpleMealStartRow}:$D$${simpleMealEndRow}`,
    'PRODUCTS_간편식',
  );
  workbook.definedNames.add(`'02_상품목록'!$D$${babyStartRow}:$D$${babyEndRow}`, 'PRODUCTS_영유아');

  productSheet.protect('', { selectLockedCells: true, selectUnlockedCells: false });

  // ---------------------------------------------------------------------
  // 03_채널목록 (건드리면 안 됨)
  // 실제 출력 규격/템플릿이 달라지는 판매채널 단위로만 관리한다 (variant 없음).
  // ---------------------------------------------------------------------
  addLockedSheetBanner(
    channelSheet,
    3,
    '⚠ 이 시트는 자동화 기준 데이터입니다. 직접 수정하지 마세요. 채널 추가/변경은 담당자에게 요청하세요.',
  );

  const channelHeaderRow = channelSheet.getRow(2);
  channelHeaderRow.values = ['채널명', '채널ID', '비고'];
  styleHeaderRow(channelHeaderRow);
  channelSheet.columns = [
    { key: 'label', width: 22 },
    { key: 'channelId', width: 22 },
    { key: 'note', width: 30 },
  ];

  CHANNELS.forEach((c, i) => {
    channelSheet.getRow(3 + i).values = [c.label, c.channelId, ''];
  });
  const channelStartRow = 3;
  const channelEndRow = 2 + CHANNELS.length;

  channelSheet.protect('', { selectLockedCells: true, selectUnlockedCells: false });

  // ---------------------------------------------------------------------
  // 01_작업요청 (실제 입력 시트)
  // 컬럼: 작업ID(A) 순번(B) 상품군(C) 채널(D) 상품명(E, 드롭다운) 상품코드(F, 자동입력) 수량(G) 딱지여부(H) 비고(I)
  // 규칙: 같은 작업ID = 하나의 썸네일. 혼합상품은 같은 작업ID로 여러 행(순번 1,2,3...)을 작성한다.
  //       같은 작업ID의 모든 행은 상품군/채널/딱지여부가 동일해야 한다.
  //       특수 연출(예: 라이프스타일 컷)이 필요하면 "비고"에 적는다 — 별도 컬럼 없음.
  // ---------------------------------------------------------------------
  workSheet.views = [{ state: 'frozen', ySplit: 1 }];

  const workHeaderRow = workSheet.getRow(1);
  workHeaderRow.values = [
    '작업ID',
    '순번',
    '상품군',
    '채널',
    '상품명',
    '상품코드(자동입력)',
    '수량',
    '딱지여부',
    '비고',
  ];
  styleHeaderRow(workHeaderRow);
  workSheet.columns = [
    { key: 'workId', width: 14 },
    { key: 'seq', width: 8 },
    { key: 'productGroup', width: 12 },
    { key: 'channel', width: 16 },
    { key: 'productName', width: 22 },
    { key: 'productCodeDisplay', width: 28 },
    { key: 'quantity', width: 8 },
    { key: 'badge', width: 10 },
    { key: 'note', width: 30 },
  ];

  // 상품명(E)으로 02_상품목록의 D열을 찾아 같은 행의 A열(상품코드)을 반환한다.
  // VLOOKUP이 아니라 INDEX/MATCH를 쓰는 이유: 상품코드(A)가 상품명(D)보다 왼쪽 열이라
  // VLOOKUP은 왼쪽 열을 되찾아올 수 없다.
  const productCodeFormula = (row) =>
    `IFERROR(INDEX('02_상품목록'!$A:$A,MATCH($E${row},'02_상품목록'!$D:$D,0)),"")`;

  for (let row = 2; row <= TEMPLATE_ROW_COUNT + 1; row++) {
    const rowRef = workSheet.getRow(row);

    rowRef.getCell(6).value = { formula: productCodeFormula(row) };
    rowRef.getCell(6).font = { italic: true, color: { argb: 'FF666666' } };
    rowRef.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.autoFillCell } };

    rowRef.getCell(3).dataValidation = {
      type: 'list',
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: '상품군 오류',
      error: '드롭다운에서 간편식 또는 영유아를 선택하세요.',
      formulae: ['"간편식,영유아"'],
    };

    rowRef.getCell(4).dataValidation = {
      type: 'list',
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: '채널 오류',
      error: "'03_채널목록' 시트에 등록된 채널만 선택할 수 있습니다.",
      formulae: [`'03_채널목록'!$A$${channelStartRow}:$A$${channelEndRow}`],
    };

    rowRef.getCell(5).dataValidation = {
      type: 'list',
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: '상품명 오류',
      error: '먼저 상품군을 선택하세요. 선택한 상품군에 등록된 상품명만 선택할 수 있습니다.',
      formulae: [`INDIRECT("PRODUCTS_"&$C${row})`],
    };

    rowRef.getCell(7).dataValidation = {
      type: 'whole',
      operator: 'greaterThanOrEqual',
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: '수량 오류',
      error: '수량은 1 이상의 정수만 입력할 수 있습니다.',
      formulae: [1],
    };

    rowRef.getCell(8).dataValidation = {
      type: 'list',
      allowBlank: false,
      showErrorMessage: true,
      errorTitle: '딱지여부 오류',
      error: 'O 또는 X 중에서 선택하세요.',
      formulae: ['"O,X"'],
    };
  }

  // ---- 예시 2건: 단일상품 1건 + 3종 혼합상품 1건 ----
  // 주의: row.values = [...] 로 통째로 대입하면 배열 안의 undefined가 F열(자동입력 수식)을
  // 실제로 지워버린다. 반드시 셀 단위로 써서 F열(index 5)은 건드리지 않는다.
  const exampleRows = [
    ['WO-0001', 1, '간편식', '네이버', '메추리알 장조림', undefined, 3, 'X', ''],
    ['WO-0002', 1, '간편식', '카카오', '소고기장조림', undefined, 1, 'O', ''],
    ['WO-0002', 2, '간편식', '카카오', '메추리알 장조림', undefined, 1, 'O', ''],
    ['WO-0002', 3, '간편식', '카카오', '부추 꼬막무침', undefined, 1, 'O', ''],
  ];
  exampleRows.forEach((values, i) => {
    const row = workSheet.getRow(2 + i);
    values.forEach((v, colIdx) => {
      if (colIdx === 5) return; // F열(상품코드 자동입력) 수식 유지
      row.getCell(colIdx + 1).value = v;
    });
  });

  // ---------------------------------------------------------------------
  // 04_작성가이드
  // ---------------------------------------------------------------------
  guideSheet.columns = [{ width: 90 }];

  const guideLines = [
    ['제목', '썸네일 자동화 요청서 — 작성 가이드'],
    ['', ''],
    ['시트 구성', ''],
    ['  01_작업요청', '실제로 작성하는 시트. 이 파일에서 유일하게 직접 입력하는 시트입니다.'],
    ['  02_상품목록 / 03_채널목록', '자동화 기준 데이터입니다. 직접 수정하지 마세요 (시트 보호 적용됨).'],
    ['  04_작성가이드', '이 시트. 참고용입니다.'],
    ['', ''],
    ['핵심 규칙', ''],
    ['  1) 한 썸네일 = 하나의 작업ID', '작업ID는 자유 문자열이지만 파일 내에서 고유해야 합니다. (예: WO-0001)'],
    [
      '  2) 혼합상품 작성법',
      '여러 상품이 한 썸네일에 들어가면, 같은 작업ID로 행을 여러 개 만들고 "순번"을 1,2,3...으로 채웁니다.',
    ],
    [
      '  3) 같은 작업ID 내 일관성',
      '같은 작업ID의 모든 행은 상품군 / 채널 / 딱지여부가 서로 같아야 합니다 (한 썸네일의 속성이므로).',
    ],
    [
      '  4) 상품 선택',
      '"상품명" 드롭다운에서 고르세요. "상품코드(자동입력)" 열은 상품명을 기준으로 자동으로 채워지는 자동화 식별자이며, 직접 수정하지 마세요.',
    ],
    [
      '  5) 채널',
      '실제 출력 규격/템플릿이 달라지는 판매채널 단위입니다. "광고용", "위탁" 같은 표기는 공식 분류가 아니므로 이 목록에 없습니다.',
    ],
    ['  6) 수량', '양의 정수만 입력할 수 있습니다 (0 이하, 소수 입력 불가 — 입력 시 자동으로 오류가 표시됩니다).'],
    ['  7) 딱지여부', 'O 또는 X 중 하나를 선택합니다. 빈칸으로 두지 마세요.'],
    [
      '  8) 비고',
      '자유롭게 입력할 수 있습니다. 라이프스타일 연출컷처럼 결과물 자체가 달라지는 특수 요청도 우선 여기에 적습니다. 비고가 있는 행은 자동 검증 단계에서 "검토필요(reviewRequired)"로 표시되어, 자동 생성 전에 담당자 확인을 거치게 됩니다.',
    ],
    ['', ''],
    ['상품군/채널/상품명이 목록에 없다면', '02_상품목록, 03_채널목록에 항목 추가가 필요합니다. 담당자에게 요청하세요.'],
    ['', ''],
    ['참고', '이 템플릿은 packages/core/scripts/generateWorkOrderTemplate.mjs 스크립트로 재생성할 수 있습니다.'],
  ];

  guideLines.forEach(([title, body], i) => {
    const row = guideSheet.getRow(i + 1);
    row.getCell(1).value = body ? `${title}${title ? '  —  ' : ''}${body}` : title;
    if (title && !body && title !== '') {
      row.getCell(1).font = { bold: true, size: 13 };
    }
    row.getCell(1).alignment = { wrapText: true, vertical: 'top' };
  });

  await workbook.xlsx.writeFile(OUTPUT_PATH);
  console.log(`생성 완료: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
