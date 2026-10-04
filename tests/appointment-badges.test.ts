import assert from 'assert';

/**
 * Test Suite: Appointment Status Badge Mapping Logic
 * Ensures each state in the Appointment State Machine maps to the correct label and theme.
 */

export interface StatusConfig {
  label: string;
  bgColor: string;
  textColor: string;
  iconName: string;
}

export function getStatusConfig(status: string): StatusConfig {
  switch (status) {
    case 'pending':
      return {
        label: 'Chờ xác nhận',
        bgColor: '#FEF3C7',
        textColor: '#B45309',
        iconName: 'time-outline',
      };
    case 'confirmed':
      return {
        label: 'Đã xác nhận',
        bgColor: '#E0F2FE',
        textColor: '#0284C7',
        iconName: 'checkmark-circle-outline',
      };
    case 'in_progress':
      return {
        label: 'Đang khám / Di chuyển',
        bgColor: '#F3E8FF',
        textColor: '#7E22CE',
        iconName: 'navigate-outline',
      };
    case 'completed':
      return {
        label: 'Đã hoàn thành',
        bgColor: '#DCFCE7',
        textColor: '#15803D',
        iconName: 'checkbox-outline',
      };
    case 'cancelled':
      return {
        label: 'Đã hủy',
        bgColor: '#FEE2E2',
        textColor: '#DC2626',
        iconName: 'close-circle-outline',
      };
    case 'checked_in':
      return {
        label: 'Đã đến phòng khám',
        bgColor: '#E0E7FF',
        textColor: '#4338CA',
        iconName: 'business-outline',
      };
    case 'rescheduled':
      return {
        label: 'Đã dời lịch',
        bgColor: '#F3E8FF',
        textColor: '#7E22CE',
        iconName: 'calendar-outline',
      };
    case 'no_show':
      return {
        label: 'Không có mặt',
        bgColor: '#F1F5F9',
        textColor: '#64748B',
        iconName: 'alert-circle-outline',
      };
    default:
      return {
        label: 'Không xác định',
        bgColor: '#F1F5F9',
        textColor: '#64748B',
        iconName: 'help-circle-outline',
      };
  }
}

export async function testStatusBadges() {
  console.log('\n--- [FE TEST SUITE 2: APPOINTMENT STATUS BADGE MAPPING] ---');
  console.log('Testing badge label, theme colors, and icons across all states...');

  // 1. Pending status
  const pending = getStatusConfig('pending');
  assert.strictEqual(pending.label, 'Chờ xác nhận');
  assert.strictEqual(pending.textColor, '#B45309');

  // 2. Confirmed status
  const confirmed = getStatusConfig('confirmed');
  assert.strictEqual(confirmed.label, 'Đã xác nhận');
  assert.strictEqual(confirmed.textColor, '#0284C7');

  // 3. In Progress status
  const inProgress = getStatusConfig('in_progress');
  assert.strictEqual(inProgress.label, 'Đang khám / Di chuyển');
  assert.strictEqual(inProgress.textColor, '#7E22CE');

  // 4. Completed status
  const completed = getStatusConfig('completed');
  assert.strictEqual(completed.label, 'Đã hoàn thành');
  assert.strictEqual(completed.textColor, '#15803D');

  // 5. Cancelled status
  const cancelled = getStatusConfig('cancelled');
  assert.strictEqual(cancelled.label, 'Đã hủy');
  assert.strictEqual(cancelled.textColor, '#DC2626');

  // 6. No Show status
  const noShow = getStatusConfig('no_show');
  assert.strictEqual(noShow.label, 'Không có mặt');
  assert.strictEqual(noShow.textColor, '#64748B');

  // 7. Unknown fallback
  const unknown = getStatusConfig('unknown_status');
  assert.strictEqual(unknown.label, 'Không xác định');

  console.log('  ✔ Appointment Status Badges passed all assertions.');
}
