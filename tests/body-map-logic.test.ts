import assert from 'assert';

/**
 * Test Suite: Body Map 2D Coordinate & View Side Logic
 */

export interface TestBodyPart {
  id: number;
  code: string;
  name: string;
  region: string;
  view_side: 'front' | 'back';
  coord_x: number;
  coord_y: number;
}

export function filterBodyPartsBySide(parts: TestBodyPart[], side: 'front' | 'back'): TestBodyPart[] {
  return parts.filter((p) => p.view_side === side);
}

export function validateCoordinates(coord_x: number, coord_y: number): boolean {
  return coord_x >= 0 && coord_x <= 100 && coord_y >= 0 && coord_y <= 100;
}

export function toggleSymptomSelection(
  current: Array<{ symptomId: number; name: string }>,
  symptom: { symptomId: number; name: string }
) {
  const exists = current.some((s) => s.symptomId === symptom.symptomId);
  if (exists) {
    return current.filter((s) => s.symptomId !== symptom.symptomId);
  }
  return [...current, symptom];
}

export async function testBodyMapLogic() {
  console.log('\n--- [FE TEST SUITE 4: BODY MAP 2D COORDINATES & VIEW SIDE LOGIC] ---');
  console.log('Testing coordinate boundaries, front/back filtering, and symptom selection toggling...');

  const sampleParts: TestBodyPart[] = [
    { id: 1, code: 'HEAD_FRONT', name: 'Đầu trước', region: 'Đầu', view_side: 'front', coord_x: 50.0, coord_y: 10.0 },
    { id: 2, code: 'HEAD_BACK', name: 'Đầu sau', region: 'Đầu', view_side: 'back', coord_x: 50.0, coord_y: 10.0 },
    { id: 3, code: 'CHEST', name: 'Ngực', region: 'Ngực', view_side: 'front', coord_x: 50.0, coord_y: 28.0 },
    { id: 4, code: 'UPPER_BACK', name: 'Lưng trên', region: 'Lưng', view_side: 'back', coord_x: 50.0, coord_y: 30.0 },
    { id: 5, code: 'ABDOMEN', name: 'Bụng', region: 'Bụng', view_side: 'front', coord_x: 50.0, coord_y: 42.0 },
  ];

  // 1. View side filtering
  const frontParts = filterBodyPartsBySide(sampleParts, 'front');
  assert.strictEqual(frontParts.length, 3, 'Mặt trước phải có 3 bộ phận');
  assert(frontParts.every((p) => p.view_side === 'front'), 'Tất cả phải là front');

  const backParts = filterBodyPartsBySide(sampleParts, 'back');
  assert.strictEqual(backParts.length, 2, 'Mặt sau phải có 2 bộ phận');
  assert(backParts.every((p) => p.view_side === 'back'), 'Tất cả phải là back');

  // 2. Coordinate boundaries
  assert.strictEqual(validateCoordinates(50, 28), true, 'Tọa độ chuẩn (50, 28) phải hợp lệ');
  assert.strictEqual(validateCoordinates(0, 0), true, 'Tọa độ góc (0, 0) phải hợp lệ');
  assert.strictEqual(validateCoordinates(100, 100), true, 'Tọa độ góc (100, 100) phải hợp lệ');
  assert.strictEqual(validateCoordinates(-5, 50), false, 'Tọa độ âm phải không hợp lệ');
  assert.strictEqual(validateCoordinates(50, 105), false, 'Tọa độ > 100 phải không hợp lệ');

  // 3. Symptom toggling
  let selected: Array<{ symptomId: number; name: string }> = [];
  selected = toggleSymptomSelection(selected, { symptomId: 1, name: 'Sốt cao' });
  assert.strictEqual(selected.length, 1);
  assert.strictEqual(selected[0].name, 'Sốt cao');

  // Toggle same symptom again (removes it)
  selected = toggleSymptomSelection(selected, { symptomId: 1, name: 'Sốt cao' });
  assert.strictEqual(selected.length, 0, 'Bỏ chọn triệu chứng phải giảm về 0');

  // Add multiple symptoms
  selected = toggleSymptomSelection(selected, { symptomId: 1, name: 'Sốt cao' });
  selected = toggleSymptomSelection(selected, { symptomId: 2, name: 'Đau đầu' });
  assert.strictEqual(selected.length, 2);

  console.log('  ✔ Body Map 2D Logic passed all assertions.');
}
