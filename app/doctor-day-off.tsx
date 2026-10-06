import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const getVietnamDayStart = (dateText: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText.trim());
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.toISOString().slice(0, 10) !== dateText.trim()) return null;

  return new Date(calendarDate.getTime() - 7 * 60 * 60 * 1000);
};

export default function DoctorDayOffScreen() {
  const router = useRouter();
  const { isDoctor, isLoading: isAuthLoading } = useAuth();
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !isDoctor) router.replace('/(tabs)');
  }, [isAuthLoading, isDoctor, router]);

  const submitDayOffRequest = async () => {
    setError(null);
    setSuccess(null);

    const dayStart = getVietnamDayStart(date);
    if (!dayStart) {
      setError('Nhập ngày hợp lệ theo định dạng YYYY-MM-DD.');
      return;
    }
    if (dayStart.getTime() < Date.now() + 24 * 60 * 60 * 1000) {
      setError('Cần gửi yêu cầu trước ngày nghỉ ít nhất 24 giờ.');
      return;
    }
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do nghỉ.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/appointments/doctor-day-off-request', {
        date: date.trim(),
        reason: reason.trim(),
      });
      const appointmentCount = res.data?.data?.appointmentCount;
      if (typeof appointmentCount !== 'number') {
        throw new Error('Phản hồi từ máy chủ không hợp lệ.');
      }
      setSuccess(
        `Đã gửi ${appointmentCount} yêu cầu đổi lịch đến CSKH. Lịch khám chưa bị thay đổi; CSKH sẽ xử lý từng bệnh nhân.`
      );
    } catch (requestError: any) {
      console.error('Failed to submit doctor day-off request:', requestError);
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Không gửi được yêu cầu nghỉ. Vui lòng thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || !isDoctor) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#0D9488" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yêu cầu nghỉ một ngày</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.noticeCard}>
          <Ionicons name="calendar-outline" size={22} color="#B45309" />
          <Text style={styles.noticeText}>
            Tất cả lịch chưa hoàn tất trong ngày đã chọn sẽ được gửi riêng vào hàng đợi yêu cầu
            đổi lịch của CSKH. Lịch chỉ thay đổi sau khi CSKH trao đổi với bệnh nhân.
          </Text>
        </View>

        <Text style={styles.label}>Ngày nghỉ</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94A3B8"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          accessibilityLabel="Ngày nghỉ theo định dạng năm-tháng-ngày"
        />
        <Text style={styles.helperText}>
          Yêu cầu phải được gửi trước thời điểm bắt đầu ngày nghỉ ít nhất 24 giờ.
        </Text>

        <Text style={styles.label}>Lý do nghỉ</Text>
        <TextInput
          style={[styles.input, styles.reasonInput]}
          value={reason}
          onChangeText={setReason}
          placeholder="Nhập lý do để CSKH trao đổi với bệnh nhân"
          placeholderTextColor="#94A3B8"
          multiline
          textAlignVertical="top"
          maxLength={500}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}
        {success && (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={20} color="#15803D" />
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}

        {success ? (
          <TouchableOpacity style={styles.submitButton} onPress={() => router.back()}>
            <Text style={styles.submitText}>Quay lại lịch khám</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={submitDayOffRequest}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                <Text style={styles.submitText}>Gửi yêu cầu cho CSKH</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    gap: 10,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noticeText: {
    flex: 1,
    color: '#78350F',
    fontSize: 13,
    lineHeight: 19,
  },
  label: {
    marginTop: 6,
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    fontSize: 14,
  },
  reasonInput: {
    minHeight: 110,
  },
  helperText: {
    color: '#64748B',
    fontSize: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
  },
  successText: {
    flex: 1,
    color: '#166534',
    fontSize: 13,
    lineHeight: 19,
  },
  submitButton: {
    minHeight: 48,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#0D9488',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
