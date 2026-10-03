export const MedicalColors = {
  primary: '#0284C7', // Sky 600 - Xanh y tế hiện đại
  primaryDark: '#0369A1', // Sky 700
  primaryLight: '#E0F2FE', // Sky 100
  primarySurface: '#F0F9FF', // Sky 50

  secondary: '#0D9488', // Teal 600
  secondaryLight: '#CCFBF1',

  success: '#10B981', // Emerald 500
  successLight: '#D1FAE5',

  warning: '#F59E0B', // Amber 500
  warningLight: '#FEF3C7',
  warningDark: '#B45309',

  danger: '#EF4444', // Red 500
  dangerLight: '#FEE2E2',

  textPrimary: '#0F172A', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94A3B8', // Slate 400

  background: '#F8FAFC', // Slate 50
  card: '#FFFFFF',
  border: '#E2E8F0',
  divider: '#F1F5F9',

  status: {
    pending: { bg: '#FEF3C7', text: '#B45309', label: 'Chờ xác nhận' },
    confirmed: { bg: '#E0F2FE', text: '#0369A1', label: 'Đã xác nhận' },
    in_progress: { bg: '#EDE9FE', text: '#6D28D9', label: 'Đang khám' },
    completed: { bg: '#D1FAE5', text: '#047857', label: 'Hoàn thành' },
    cancelled: { bg: '#FEE2E2', text: '#B91C1C', label: 'Đã hủy' },
    no_show: { bg: '#F1F5F9', text: '#64748B', label: 'Vắng mặt' },
  },

  severity: {
    mild: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', label: 'Nhẹ' },
    moderate: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', label: 'Vừa' },
    severe: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA', label: 'Nghiêm trọng' },
  }
};

export default {
  light: {
    text: MedicalColors.textPrimary,
    background: MedicalColors.background,
    tint: MedicalColors.primary,
    tabIconDefault: '#94A3B8',
    tabIconSelected: MedicalColors.primary,
  },
  dark: {
    text: '#F8FAFC',
    background: '#0F172A',
    tint: MedicalColors.primaryLight,
    tabIconDefault: '#64748B',
    tabIconSelected: '#38BDF8',
  },
};
