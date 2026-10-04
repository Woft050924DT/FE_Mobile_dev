import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MedicalColors } from '../constants/Colors';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

interface Props {
  status: AppointmentStatus | string;
  size?: 'sm' | 'md';
}

export const AppointmentStatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const cfg = (MedicalColors.status as any)[status as AppointmentStatus] || {
    bg: '#F1F5F9',
    text: '#64748B',
    label: status,
  };

  const getIcon = (st: string) => {
    switch (st) {
      case 'pending':
        return 'time-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'checked_in':
        return 'business-outline';
      case 'in_progress':
        return 'medical-outline';
      case 'completed':
        return 'checkmark-done-circle';
      case 'cancelled':
        return 'close-circle-outline';
      case 'no_show':
        return 'person-remove-outline';
      case 'rescheduled':
        return 'calendar-outline';
      default:
        return 'information-circle-outline';
    }
  };

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: cfg.bg },
        isSmall && styles.badgeSm,
      ]}
    >
      <Ionicons
        name={getIcon(status) as any}
        size={isSmall ? 12 : 14}
        color={cfg.text}
        style={{ marginRight: 4 }}
      />
      <Text style={[styles.text, { color: cfg.text }, isSmall && styles.textSm]}>
        {cfg.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
  textSm: {
    fontSize: 11,
  },
});
