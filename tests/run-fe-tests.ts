declare const process: any;

import { testAuthRoles } from './auth-roles.test';
import { testStatusBadges } from './appointment-badges.test';
import { testEmrCalculators } from './emr-calculators.test';
import { testBodyMapLogic } from './body-map-logic.test';

async function main() {
  const startTime = Date.now();
  console.log('================================================================');
  console.log('📱  BỘ KIỂM THỬ ĐƠN VỊ (UNIT TESTS) - FRONTEND MOBILE (REACT NATIVE)');
  console.log('================================================================');

  let passedSuites = 0;
  let totalSuites = 4;

  try {
    // Suite 1
    await testAuthRoles();
    passedSuites++;

    // Suite 2
    await testStatusBadges();
    passedSuites++;

    // Suite 3
    await testEmrCalculators();
    passedSuites++;

    // Suite 4
    await testBodyMapLogic();
    passedSuites++;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n================================================================');
    console.log(`✅  TẤT CẢ ${passedSuites}/${totalSuites} FRONTEND TEST SUITES ĐÃ VƯỢT QUA THÀNH CÔNG!`);
    console.log(`⏱️   Thời gian thực thi: ${duration}s`);
    console.log('================================================================\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌  KIỂM THỬ FRONTEND THẤT BẠI!');
    console.error(error.message || error);
    process.exit(1);
  }
}

main();
