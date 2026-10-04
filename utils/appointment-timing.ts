export const getAppointmentStartBlockMessage = (
  scheduledAt: string | undefined,
  now = new Date()
): string | null => {
  if (!scheduledAt) {
    return 'Không xác định được giờ hẹn. Vui lòng tải lại lịch trước khi bắt đầu khám.';
  }

  const appointmentTime = new Date(scheduledAt);
  if (Number.isNaN(appointmentTime.getTime())) {
    return 'Giờ hẹn không hợp lệ. Vui lòng tải lại lịch trước khi bắt đầu khám.';
  }

  if (now.getTime() < appointmentTime.getTime()) {
    return `Chưa đến giờ hẹn (${appointmentTime.toLocaleString('vi-VN')}). Chỉ có thể bắt đầu khám từ giờ hẹn trở đi.`;
  }

  return null;
};

export const canRequestAppointmentChange = (
  status: string,
  scheduledAt: string | undefined,
  now = new Date()
): boolean => {
  if (status !== 'pending' && status !== 'confirmed') return false;
  if (!scheduledAt) return false;

  const appointmentTime = new Date(scheduledAt);
  return !Number.isNaN(appointmentTime.getTime()) && now.getTime() < appointmentTime.getTime();
};
