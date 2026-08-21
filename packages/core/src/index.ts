export * from './domain/product';
export * from './domain/channel';
export * from './domain/thumbnailType';
export * from './domain/layout';
export * from './domain/generation-request';
export * from './domain/composition-plan';
export * from './engine/selectLayout';
export * from './engine/assignSlots';
export * from './engine/composePlan';
export * from './data/channelPresets';
export * from './data/layouts';
export * from './data/channels';
export * from './data/products';

// 주의: Excel 파싱 모듈(exceljs 포함)은 여기서 재수출하지 않는다.
// code.ts(Figma 메인 스레드)처럼 Excel을 다루지 않는 소비자가 '@thumbnail-generator/core'를
// import하면 exceljs까지 번들에 딸려 들어가는 것을 막기 위함이다.
// Excel을 다루는 코드는 '@thumbnail-generator/core/import'에서 명시적으로 가져온다.
