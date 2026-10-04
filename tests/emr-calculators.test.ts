import assert from 'assert';

/**
 * Test Suite: EMR Calculators & Directory Filter Logic
 */

// 1. Follow-up date calculator logic
export function calculateFollowUpDate(baseDate: Date, days: number): string {
  const d = new Date(baseDate.getTime());
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 2. Doctor Patient Directory Filter Logic
export interface PatientDirectoryItem {
  id: string;
  full_name: string;
  phone: string;
  address?: string;
  total_examinations?: number;
  last_diagnosis?: string;
  last_icd_code?: string | null;
  has_pending_visit?: boolean;
}

export function filterDoctorPatients(
  patients: PatientDirectoryItem[],
  searchQuery: string,
  filterTab: 'all' | 'examined' | 'today'
): PatientDirectoryItem[] {
  return patients.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      p.full_name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.address && p.address.toLowerCase().includes(q)) ||
      (p.last_diagnosis && p.last_diagnosis.toLowerCase().includes(q)) ||
      (p.last_icd_code && p.last_icd_code.toLowerCase().includes(q));

    if (!matchQuery) return false;

    if (filterTab === 'examined') {
      return (p.total_examinations || 0) > 0;
    }
    if (filterTab === 'today') {
      return p.has_pending_visit === true;
    }
    return true;
  });
}

// 3. Prescription Validator
export function validatePrescriptionItem(item: {
  productId: string;
  quantity: number;
  dosage: string;
  durationDays?: number;
}): { isValid: boolean; error?: string } {
  if (!item.productId) return { isValid: false, error: 'Thiếu thuốc' };
  if (!item.quantity || item.quantity <= 0) return { isValid: false, error: 'Số lượng phải lớn hơn 0' };
  if (!item.dosage || !item.dosage.trim()) return { isValid: false, error: 'Thiếu liều dùng' };
  return { isValid: true };
}

export async function testEmrCalculators() {
  console.log('\n--- [FE TEST SUITE 3: EMR CALCULATORS & DIRECTORY FILTERS] ---');
  console.log('Testing follow-up date calculation, directory search/filters, and prescription validator...');

  // 1. Follow-up date calculation
  const fixedDate = new Date('2026-10-01T08:00:00.000Z');
  assert.strictEqual(calculateFollowUpDate(fixedDate, 3), '2026-10-04', '+3 ngày phải là 2026-10-04');
  assert.strictEqual(calculateFollowUpDate(fixedDate, 5), '2026-10-06', '+5 ngày phải là 2026-10-06');
  assert.strictEqual(calculateFollowUpDate(fixedDate, 7), '2026-10-08', '+7 ngày phải là 2026-10-08');
  assert.strictEqual(calculateFollowUpDate(fixedDate, 14), '2026-10-15', '+14 ngày phải là 2026-10-15');

  // Month-end boundary crossing
  const endOfMonth = new Date('2026-10-30T08:00:00.000Z');
  assert.strictEqual(calculateFollowUpDate(endOfMonth, 5), '2026-11-04', 'Qua tháng 11 phải đúng');

  // 2. Doctor Patient Directory Filter
  const samplePatients: PatientDirectoryItem[] = [
    {
      id: 'p-1',
      full_name: 'Nguyễn Văn Bệnh Nhân',
      phone: '0912345678',
      address: '144 Xuân Thủy, Cầu Giấy',
      total_examinations: 2,
      last_diagnosis: 'Viêm phế quản cấp tính',
      last_icd_code: 'J20',
      has_pending_visit: true,
    },
    {
      id: 'p-2',
      full_name: 'Trần Thị Mai',
      phone: '0988776655',
      address: 'Chung cư Sunrise',
      total_examinations: 0,
      last_diagnosis: 'Đau thắt lưng',
      last_icd_code: 'M54.5',
      has_pending_visit: true,
    },
    {
      id: 'p-3',
      full_name: 'Lê Văn Cường',
      phone: '0933221100',
      address: '12 Giải Phóng',
      total_examinations: 3,
      last_diagnosis: 'Viêm họng',
      last_icd_code: 'J02',
      has_pending_visit: false,
    },
  ];

  // Search by name
  const searchedByName = filterDoctorPatients(samplePatients, 'mai', 'all');
  assert.strictEqual(searchedByName.length, 1);
  assert.strictEqual(searchedByName[0].id, 'p-2');

  // Search by ICD code
  const searchedByIcd = filterDoctorPatients(samplePatients, 'J20', 'all');
  assert.strictEqual(searchedByIcd.length, 1);
  assert.strictEqual(searchedByIcd[0].id, 'p-1');

  // Filter by 'today' tab
  const todayOnly = filterDoctorPatients(samplePatients, '', 'today');
  assert.strictEqual(todayOnly.length, 2, 'Có 2 bệnh nhân có lịch khám hôm nay (p-1 và p-2)');

  // Filter by 'examined' tab
  const examinedOnly = filterDoctorPatients(samplePatients, '', 'examined');
  assert.strictEqual(examinedOnly.length, 2, 'Có 2 bệnh nhân đã có lượt khám (p-1 và p-3)');

  // 3. Prescription item validator
  const validItem = validatePrescriptionItem({
    productId: 'med-1',
    quantity: 10,
    dosage: '1 viên x 2 lần',
  });
  assert.strictEqual(validItem.isValid, true);

  const invalidQty = validatePrescriptionItem({
    productId: 'med-1',
    quantity: 0,
    dosage: '1 viên',
  });
  assert.strictEqual(invalidQty.isValid, false);

  const emptyDosage = validatePrescriptionItem({
    productId: 'med-1',
    quantity: 5,
    dosage: '',
  });
  assert.strictEqual(emptyDosage.isValid, false);

  console.log('  ✔ EMR Calculators & Directory Filters passed all assertions.');
}
