import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MedicalColors } from '../constants/Colors';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function BookAppointmentScreen() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [appointmentType, setAppointmentType] = useState<'first_visit' | 'follow_up' | 'emergency'>('first_visit');
  const [scheduledDate, setScheduledDate] = useState('Ngày mai, 09:00 Sáng');
  const [visitAddress, setVisitAddress] = useState(
    user?.address || 'Số 144 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội'
  );
  const [symptomNote, setSymptomNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleBook = async () => {
    if (!token) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập trước khi đặt lịch khám tại nhà.', [
        { text: 'Hủy' },
        { text: 'Đăng nhập ngay', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (!visitAddress.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ nhà để bác sĩ đến khám.');
      return;
    }

    try {
      setIsLoading(true);
      const scheduledAt = new Date(Date.now() + 86400000); // 24h sau
      scheduledAt.setHours(9, 0, 0, 0);

      await api.post('/appointments', {
        type: appointmentType,
        scheduledAt: scheduledAt.toISOString(),
        visitAddress: visitAddress.trim(),
        note: symptomNote.trim() || undefined,
      });

      Alert.alert(
        'Đặt lịch thành công!',
        'Yêu cầu khám chữa bệnh tại nhà của bạn đã được tiếp nhận. Chuyên viên CSKH phụ trách sẽ liên hệ xác nhận trong ít phút.',
        [
          {
            text: 'Xem danh sách lịch hẹn',
            onPress: () => {
              router.replace('/appointments');
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Lỗi đặt lịch', e.response?.data?.message || 'Không thể gửi yêu cầu đặt lịch.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Thẻ giới thiệu dịch vụ */}
      <View style={styles.banner}>
        <Ionicons name="car-outline" size={24} color="#0284C7" />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Dịch vụ bác sĩ khám tại nhà</Text>
          <Text style={styles.bannerSub}>
            Đội ngũ y bác sĩ sẽ mang đầy đủ thiết bị y tế và thuốc thiết yếu đến tận nơi thăm khám.
          </Text>
        </View>
      </View>

      {/* 1. Chọn loại hình khám */}
      <Text style={styles.label}>1. Loại hình khám:</Text>
      <View style={styles.typeRow}>
        {[
          { key: 'first_visit', label: 'Khám lần đầu', desc: 'Triệu chứng mới phát sinh' },
          { key: 'follow_up', label: 'Tái khám', desc: 'Khám theo lịch hẹn bác sĩ' },
          { key: 'emergency', label: 'Khẩn cấp', desc: 'Ưu tiên bác sĩ đến sớm' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.typeCard,
              appointmentType === item.key && styles.typeCardActive,
            ]}
            onPress={() => setAppointmentType(item.key as any)}
          >
            <Text
              style={[
                styles.typeTitle,
                appointmentType === item.key && styles.typeTitleActive,
              ]}
            >
              {item.label}
            </Text>
            <Text style={styles.typeDesc}>{item.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 2. Thời gian hẹn khám */}
      <Text style={styles.label}>2. Thời gian mong muốn:</Text>
      <View style={styles.inputBox}>
        <Ionicons name="time-outline" size={20} color="#0284C7" style={styles.boxIcon} />
        <TextInput
          style={styles.inputText}
          value={scheduledDate}
          onChangeText={setScheduledDate}
        />
      </View>

      {/* 3. Địa chỉ nhà thăm khám */}
      <Text style={styles.label}>3. Địa chỉ nhà (Bác sĩ đến tận nơi):</Text>
      <View style={[styles.inputBox, { height: 75, alignItems: 'flex-start', paddingTop: 10 }]}>
        <Ionicons name="location-outline" size={20} color="#EF4444" style={styles.boxIcon} />
        <TextInput
          style={[styles.inputText, { height: 60 }]}
          placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
          placeholderTextColor="#94A3B8"
          value={visitAddress}
          onChangeText={setVisitAddress}
          multiline
        />
      </View>

      {/* 4. Mô tả triệu chứng ban đầu */}
      <Text style={styles.label}>4. Mô tả triệu chứng / Yêu cầu thêm:</Text>
      <View style={[styles.inputBox, { height: 90, alignItems: 'flex-start', paddingTop: 10 }]}>
        <Ionicons name="create-outline" size={20} color="#64748B" style={styles.boxIcon} />
        <TextInput
          style={[styles.inputText, { height: 75 }]}
          placeholder="Mô tả cụ thể cảm giác đau, sốt, tiền sử dị ứng thuốc nếu có..."
          placeholderTextColor="#94A3B8"
          value={symptomNote}
          onChangeText={setSymptomNote}
          multiline
        />
      </View>

      {/* Nút gửi yêu cầu đặt lịch */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleBook}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>Xác nhận đặt lịch khám</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  banner: {
    flexDirection: 'row',
    backgroundColor: '#E0F2FE',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
  },
  bannerSub: {
    fontSize: 12,
    color: '#0C4A6E',
    lineHeight: 16,
    marginTop: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    marginTop: 12,
  },
  typeRow: {
    gap: 10,
    marginBottom: 8,
  },
  typeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  typeCardActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  typeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  typeTitleActive: {
    color: '#0284C7',
  },
  typeDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 6,
  },
  boxIcon: {
    marginRight: 10,
  },
  inputText: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
