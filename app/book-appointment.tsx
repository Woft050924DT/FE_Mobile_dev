import React, { useState, useEffect } from 'react';
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
import { PatientProfileModal } from '../components/PatientProfileModal';

interface DoctorUser {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  avatar_url?: string | null;
}

interface TimeSlot {
  id: string;
  timeRange: string;
  startHour: number;
  startMinute: number;
  isBooked: boolean;
}

const BASE_SLOTS: Omit<TimeSlot, 'isBooked'>[] = [
  { id: 'slot-1', timeRange: '08:00 - 09:30', startHour: 8, startMinute: 0 },
  { id: 'slot-2', timeRange: '09:30 - 11:00', startHour: 9, startMinute: 30 },
  { id: 'slot-3', timeRange: '13:30 - 15:00', startHour: 13, startMinute: 30 },
  { id: 'slot-4', timeRange: '15:00 - 16:30', startHour: 15, startMinute: 0 },
  { id: 'slot-5', timeRange: '16:30 - 18:00', startHour: 16, startMinute: 30 },
];

export default function BookAppointmentScreen() {
  const router = useRouter();
  const { user, token } = useAuth();

  // Profile status
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  // Doctors list
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  // Date selection: Hôm nay (0), Ngày mai (1), Ngày kia (2)
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(1); // Mặc định ngày mai
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Appointment data
  const [appointmentType, setAppointmentType] = useState<'first_visit' | 'follow_up' | 'emergency'>('first_visit');
  const [visitAddress, setVisitAddress] = useState('');
  const [symptomNote, setSymptomNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSlotLoading, setIsSlotLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchPatientProfile();
      fetchDoctors();
    }
  }, [token]);

  useEffect(() => {
    if (selectedDoctorId) {
      calculateAvailableSlots();
    }
  }, [selectedDoctorId, selectedDayOffset]);

  const fetchPatientProfile = async () => {
    if (!user?.id) return;
    try {
      const res = await api.get(`/patients/${user.id}`);
      const data = res.data?.data;
      setPatientProfile(data);
      if (data?.address) {
        setVisitAddress(data.address);
      }

      // Kiểm tra xem đã có địa chỉ và tiền sử bệnh lý chưa
      const hasAddress = !!data?.address && data.address.trim().length > 3;
      const hasHistory = Array.isArray(data?.patient_medical_history) && data.patient_medical_history.length > 0;

      if (!hasAddress || !hasHistory) {
        setProfileIncomplete(true);
      } else {
        setProfileIncomplete(false);
      }
    } catch {
      setProfileIncomplete(true);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/users?roleCode=doctor&status=active');
      const docs = res.data?.data?.items || res.data?.data || [];
      setDoctors(docs);
      if (docs.length > 0) {
        setSelectedDoctorId(docs[0].id);
      }
    } catch {
      // Fallback danh sách bác sĩ mẫu
      const mockDocs: DoctorUser[] = [
        {
          id: '5d9b3781-7dbb-4af4-b563-b82510ac562a',
          full_name: 'BS. CKI Nguyễn Văn A',
          phone: '0902345678',
          email: 'doctor@hospital.local',
        },
      ];
      setDoctors(mockDocs);
      setSelectedDoctorId(mockDocs[0].id);
    }
  };

  const getTargetDate = (offset: number): Date => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d;
  };

  const calculateAvailableSlots = async () => {
    if (!selectedDoctorId) return;
    try {
      setIsSlotLoading(true);
      const targetDate = getTargetDate(selectedDayOffset);
      const dateStr = targetDate.toISOString().slice(0, 10); // YYYY-MM-DD

      // Lấy danh sách lịch đã có của bác sĩ vào ngày này
      const res = await api.get(`/appointments?staffId=${selectedDoctorId}&date=${dateStr}`);
      const existingApts = res.data?.data?.data || res.data?.data?.items || res.data?.data || [];

      // Kiểm tra từng slot
      const computed = BASE_SLOTS.map((slot) => {
        const slotStart = new Date(targetDate);
        slotStart.setHours(slot.startHour, slot.startMinute, 0, 0);

        // Lịch bị xem là đã kín nếu có appointment trong khung giờ này và chưa hủy
        const isBooked = existingApts.some((apt: any) => {
          if (apt.status === 'cancelled' || apt.status === 'no_show') return false;
          const aptDate = new Date(apt.scheduled_at);
          return Math.abs(aptDate.getTime() - slotStart.getTime()) < 60 * 60 * 1000;
        });

        return {
          ...slot,
          isBooked,
        };
      });

      setTimeSlots(computed);
      // Mặc định chọn slot trống đầu tiên
      const firstAvailable = computed.find((s) => !s.isBooked);
      if (firstAvailable) {
        setSelectedSlotId(firstAvailable.id);
      } else {
        setSelectedSlotId(null);
      }
    } catch {
      setTimeSlots(BASE_SLOTS.map((s) => ({ ...s, isBooked: false })));
      setSelectedSlotId(BASE_SLOTS[0].id);
    } finally {
      setIsSlotLoading(false);
    }
  };

  const handleBook = async () => {
    if (!token) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập trước khi đặt lịch khám.', [
        { text: 'Hủy' },
        { text: 'Đăng nhập ngay', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (profileIncomplete) {
      Alert.alert(
        'Hồ sơ chưa hoàn thiện',
        'Bác sĩ cần thông tin cá nhân và tiền sử bệnh lý của bạn để chuẩn bị khám bệnh tại nhà. Vui lòng bấm "Cập nhật hồ sơ" trước.',
        [
          { text: 'Cập nhật ngay', onPress: () => setProfileModalVisible(true) },
          { text: 'Đóng' },
        ]
      );
      return;
    }

    if (!selectedDoctorId) {
      Alert.alert('Chưa chọn bác sĩ', 'Vui lòng chọn Bác sĩ bạn mong muốn đến thăm khám.');
      return;
    }

    if (!selectedSlotId) {
      Alert.alert('Chưa chọn khung giờ', 'Vui lòng chọn khung giờ khám còn trống.');
      return;
    }

    const chosenSlot = timeSlots.find((s) => s.id === selectedSlotId);
    if (!chosenSlot || chosenSlot.isBooked) {
      Alert.alert('Lịch đã kín', 'Khung giờ bạn chọn hiện đã kín lịch. Vui lòng chọn khung giờ khác.');
      return;
    }

    const finalDate = getTargetDate(selectedDayOffset);
    finalDate.setHours(chosenSlot.startHour, chosenSlot.startMinute, 0, 0);

    try {
      setIsLoading(true);
      await api.post('/appointments', {
        patientId: user?.id,
        assignedStaffId: selectedDoctorId,
        type: appointmentType,
        scheduledAt: finalDate.toISOString(),
        visitAddress: visitAddress.trim() || patientProfile?.address || 'Hà Nội',
        note: symptomNote.trim() || undefined,
      });

      Alert.alert(
        'Đặt lịch thành công! 🎉',
        `Bác sĩ đã tiếp nhận lịch hẹn vào lúc ${chosenSlot.timeRange} ngày ${finalDate.toLocaleDateString(
          'vi-VN'
        )}. Bác sĩ và chuyên viên CSKH sẽ liên hệ xác nhận trong ít phút.`,
        [
          {
            text: 'Xem danh sách lịch hẹn',
            onPress: () => router.replace('/appointments'),
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
      {/* ⚠️ CẢNH BÁO BẮT BUỘC HỒ SƠ Y TẾ NẾU CHƯA ĐỦ */}
      {profileIncomplete && (
        <View style={styles.warningBanner}>
          <View style={styles.warningIcon}>
            <Ionicons name="alert-circle" size={24} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Hồ sơ bệnh án chưa hoàn thiện</Text>
            <Text style={styles.warningSub}>
              Bạn cần cập nhật đầy đủ thông tin địa chỉ và tiền sử bệnh lý/dị ứng thuốc để bác sĩ chuẩn bị y cụ trước khi đến nhà.
            </Text>
            <TouchableOpacity
              style={styles.updateProfileBtn}
              onPress={() => setProfileModalVisible(true)}
            >
              <Ionicons name="create-outline" size={16} color="#FFFFFF" />
              <Text style={styles.updateProfileBtnText}>Cập nhật hồ sơ ngay</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 1. CHỌN BÁC SĨ MUỐN KHÁM */}
      <Text style={styles.sectionHeader}>1. Chọn Bác sĩ chuyên môn đến nhà:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.doctorScroll}>
        {doctors.map((doc) => {
          const isSelected = selectedDoctorId === doc.id;
          return (
            <TouchableOpacity
              key={doc.id}
              style={[styles.doctorCard, isSelected && styles.doctorCardActive]}
              onPress={() => setSelectedDoctorId(doc.id)}
            >
              <View style={[styles.avatarCircle, isSelected && styles.avatarCircleActive]}>
                <Ionicons
                  name="medkit"
                  size={24}
                  color={isSelected ? '#0284C7' : '#64748B'}
                />
              </View>
              <Text style={[styles.doctorName, isSelected && styles.doctorNameActive]} numberOfLines={1}>
                {doc.full_name}
              </Text>
              <Text style={styles.doctorRole}>Bác sĩ Khám tại nhà</Text>
              <View style={styles.doctorPhoneRow}>
                <Ionicons name="call-outline" size={12} color="#0D9488" />
                <Text style={styles.doctorPhone}>{doc.phone || '090...'}</Text>
              </View>
              {isSelected && (
                <View style={styles.selectedTick}>
                  <Ionicons name="checkmark-circle" size={18} color="#0284C7" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 2. CHỌN NGÀY KHÁM */}
      <Text style={styles.sectionHeader}>2. Chọn Ngày khám:</Text>
      <View style={styles.dayRow}>
        {[
          { offset: 0, label: 'Hôm nay' },
          { offset: 1, label: 'Ngày mai' },
          { offset: 2, label: 'Ngày kia' },
        ].map((d) => {
          const dateObj = getTargetDate(d.offset);
          const isSelected = selectedDayOffset === d.offset;
          return (
            <TouchableOpacity
              key={d.offset}
              style={[styles.dayCard, isSelected && styles.dayCardActive]}
              onPress={() => setSelectedDayOffset(d.offset)}
            >
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>
                {d.label}
              </Text>
              <Text style={[styles.dayDate, isSelected && styles.dayDateActive]}>
                {dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. HIỂN THỊ CÁC KHUNG GIỜ CÒN TRỐNG / ĐÃ KÍN */}
      <View style={styles.slotHeaderRow}>
        <Text style={styles.sectionHeader}>3. Khung giờ khám của Bác sĩ:</Text>
        {isSlotLoading && <ActivityIndicator size="small" color="#0284C7" />}
      </View>
      <Text style={styles.subHint}>
        * Bác sĩ dành 1.5 giờ cho mỗi ca gồm thăm khám tại nhà và thời gian di chuyển
      </Text>

      <View style={styles.slotsGrid}>
        {timeSlots.map((slot) => {
          const isSelected = selectedSlotId === slot.id && !slot.isBooked;
          return (
            <TouchableOpacity
              key={slot.id}
              style={[
                styles.slotCard,
                slot.isBooked && styles.slotCardBooked,
                isSelected && styles.slotCardActive,
              ]}
              disabled={slot.isBooked}
              onPress={() => setSelectedSlotId(slot.id)}
            >
              <View style={styles.slotTopRow}>
                <Ionicons
                  name={slot.isBooked ? 'close-circle' : 'time-outline'}
                  size={16}
                  color={slot.isBooked ? '#94A3B8' : isSelected ? '#0284C7' : '#334155'}
                />
                <Text
                  style={[
                    styles.slotTimeText,
                    slot.isBooked && styles.slotTimeBooked,
                    isSelected && styles.slotTimeActive,
                  ]}
                >
                  {slot.timeRange}
                </Text>
              </View>

              <View
                style={[
                  styles.slotBadge,
                  slot.isBooked ? styles.slotBadgeBooked : styles.slotBadgeAvailable,
                ]}
              >
                <Text
                  style={[
                    styles.slotBadgeText,
                    slot.isBooked ? styles.slotBadgeTextBooked : styles.slotBadgeTextAvailable,
                  ]}
                >
                  {slot.isBooked ? 'Đã kín lịch' : 'Còn trống'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 4. ĐỊA CHỈ NHÀ THĂM KHÁM */}
      <Text style={styles.sectionHeader}>4. Địa chỉ nhà bác sĩ đến khám (*):</Text>
      <View style={styles.inputBox}>
        <Ionicons name="location-outline" size={20} color="#EF4444" style={styles.boxIcon} />
        <TextInput
          style={styles.inputText}
          placeholder="Số nhà, tên ngõ, đường, phường, quận..."
          placeholderTextColor="#94A3B8"
          value={visitAddress}
          onChangeText={setVisitAddress}
        />
      </View>

      {/* 5. GHI CHÚ TRIỆU CHỨNG */}
      <Text style={styles.sectionHeader}>5. Mô tả triệu chứng ban đầu:</Text>
      <View style={[styles.inputBox, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={20} color="#64748B" style={styles.boxIcon} />
        <TextInput
          style={[styles.inputText, { height: 60 }]}
          placeholder="VD: Đau nhói vùng ngực, ho khan 2 ngày nay..."
          placeholderTextColor="#94A3B8"
          value={symptomNote}
          onChangeText={setSymptomNote}
          multiline
        />
      </View>

      {/* NÚT XÁC NHẬN ĐẶT LỊCH */}
      <TouchableOpacity
        style={[styles.submitBtn, profileIncomplete && styles.submitBtnDisabled]}
        onPress={handleBook}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>
              {profileIncomplete ? 'Cần hoàn thiện hồ sơ y tế' : 'Xác nhận Đặt lịch khám'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Modal cập nhật hồ sơ bắt buộc */}
      {user?.id && (
        <PatientProfileModal
          visible={profileModalVisible}
          patientId={user.id}
          initialData={patientProfile}
          onClose={() => setProfileModalVisible(false)}
          onSuccess={() => {
            setProfileModalVisible(false);
            fetchPatientProfile();
          }}
        />
      )}
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
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    marginBottom: 20,
    gap: 12,
  },
  warningIcon: {
    marginTop: 2,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  warningSub: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
  },
  updateProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 10,
    gap: 6,
  },
  updateProfileBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    marginTop: 12,
  },
  subHint: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
    marginTop: -6,
  },
  slotHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  doctorScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  doctorCard: {
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    position: 'relative',
  },
  doctorCardActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarCircleActive: {
    backgroundColor: '#E0F2FE',
  },
  doctorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  doctorNameActive: {
    color: '#0284C7',
  },
  doctorRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  doctorPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  doctorPhone: {
    fontSize: 11,
    color: '#0D9488',
    fontWeight: '600',
  },
  selectedTick: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  dayRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  dayCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  dayCardActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  dayLabelActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  dayDate: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  dayDateActive: {
    color: '#0284C7',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  slotCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
    minHeight: 70,
  },
  slotCardActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  slotCardBooked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.6,
  },
  slotTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  slotTimeActive: {
    color: '#0284C7',
  },
  slotTimeBooked: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  slotBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  slotBadgeAvailable: {
    backgroundColor: '#DCFCE7',
  },
  slotBadgeBooked: {
    backgroundColor: '#E2E8F0',
  },
  slotBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  slotBadgeTextAvailable: {
    color: '#16A34A',
  },
  slotBadgeTextBooked: {
    color: '#64748B',
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
    marginTop: 18,
    gap: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
