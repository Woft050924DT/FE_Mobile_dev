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
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PatientProfileModal } from '../components/PatientProfileModal';
import { DatePickerModal } from '../components/DatePickerModal';
import { BodyMap2D, BodyPartData, SelectedSymptomItem } from '../components/BodyMap2D';

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
  { id: 'slot-1', timeRange: '08:00 - 08:45', startHour: 8, startMinute: 0 },
  { id: 'slot-2', timeRange: '09:00 - 09:45', startHour: 9, startMinute: 0 },
  { id: 'slot-3', timeRange: '10:00 - 10:45', startHour: 10, startMinute: 0 },
  { id: 'slot-4', timeRange: '13:30 - 14:15', startHour: 13, startMinute: 30 },
  { id: 'slot-5', timeRange: '14:30 - 15:15', startHour: 14, startMinute: 30 },
  { id: 'slot-6', timeRange: '15:30 - 16:15', startHour: 15, startMinute: 30 },
  { id: 'slot-7', timeRange: '16:30 - 17:15', startHour: 16, startMinute: 30 },
];

const DEFAULT_BODY_PARTS: BodyPartData[] = [
  { id: 1, code: 'HEAD_FRONT', name: 'Đầu - Mặt trước', region: 'Đầu', view_side: 'front', coord_x: 50.0, coord_y: 10.0 },
  { id: 2, code: 'HEAD_BACK', name: 'Đầu gáy - Mặt sau', region: 'Đầu', view_side: 'back', coord_x: 50.0, coord_y: 10.0 },
  { id: 3, code: 'CHEST', name: 'Vùng Ngực', region: 'Ngực', view_side: 'front', coord_x: 50.0, coord_y: 28.0 },
  { id: 4, code: 'ABDOMEN', name: 'Vùng Bụng', region: 'Bụng', view_side: 'front', coord_x: 50.0, coord_y: 42.0 },
  { id: 5, code: 'UPPER_BACK', name: 'Lưng trên', region: 'Lưng', view_side: 'back', coord_x: 50.0, coord_y: 30.0 },
  { id: 6, code: 'LOWER_BACK', name: 'Thắt lưng / Lưng dưới', region: 'Lưng', view_side: 'back', coord_x: 50.0, coord_y: 45.0 },
  { id: 7, code: 'LEFT_ARM', name: 'Cánh tay trái', region: 'Tay', view_side: 'front', coord_x: 30.0, coord_y: 35.0 },
  { id: 8, code: 'RIGHT_ARM', name: 'Cánh tay phải', region: 'Tay', view_side: 'front', coord_x: 70.0, coord_y: 35.0 },
  { id: 9, code: 'LEFT_KNEE', name: 'Đầu gối trái', region: 'Chân', view_side: 'front', coord_x: 42.0, coord_y: 72.0 },
  { id: 10, code: 'RIGHT_KNEE', name: 'Đầu gối phải', region: 'Chân', view_side: 'front', coord_x: 58.0, coord_y: 72.0 },
];

const formatDateToYMD = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (d: Date): string => {
  const dayOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()];
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${dayOfWeek}, ngày ${day}/${month}/${year}`;
};

export default function BookAppointmentScreen() {
  const router = useRouter();
  const { user, token } = useAuth();

  // Wizard Step: 1 (Lịch khám & Bác sĩ) | 2 (Triệu chứng & Vị trí đau)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Profile status
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // STEP 1 DATA
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  // Date selection: Tự do chọn ngày bất kỳ qua Dropdown (Mặc định: Ngày mai)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);

  // Khung giờ khám
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Hình thức khám
  const [appointmentType, setAppointmentType] = useState<'first_visit' | 'follow_up'>('first_visit');

  // STEP 2 DATA: Triệu chứng & Vị trí đau Body Map 2D
  const [symptomNote, setSymptomNote] = useState('');
  const [bodyParts, setBodyParts] = useState<BodyPartData[]>(DEFAULT_BODY_PARTS);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [selectedPainPoints, setSelectedPainPoints] = useState<SelectedSymptomItem[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSlotLoading, setIsSlotLoading] = useState(false);

  const isSlotInPast = (slot: Pick<TimeSlot, 'startHour' | 'startMinute'>) => {
    const slotStart = new Date(selectedDate);
    slotStart.setHours(slot.startHour, slot.startMinute, 0, 0);
    return slotStart.getTime() <= Math.max(currentTime, Date.now());
  };

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (token) {
      fetchPatientProfile();
      fetchDoctors();
      fetchBodyParts();
    }
  }, [token]);

  useEffect(() => {
    if (selectedDoctorId) {
      calculateAvailableSlots();
    }
  }, [selectedDoctorId, selectedDate]);

  // Kiểm tra hồ sơ bệnh nhân có hợp lệ và đầy đủ thông tin hay không
  const isPatientProfileComplete = (profile: any): boolean => {
    if (!profile) return false;
    const hasName =
      !!profile.full_name &&
      profile.full_name.trim().length >= 2 &&
      !profile.full_name.startsWith('Bệnh nhân '); // Tránh tên tạm ban đầu
    const hasPhone = !!profile.phone && profile.phone.trim().length >= 9;
    const hasDob = !!profile.date_of_birth;
    const hasGender = !!profile.gender;
    return hasName && hasPhone && hasDob && hasGender;
  };

  const fetchPatientProfile = async () => {
    try {
      setIsProfileLoading(true);
      let data: any = null;
      try {
        const res = await api.get('/patients/me');
        data = res.data?.data;
      } catch {
        if (user?.id) {
          const res = await api.get(`/patients/${user.id}`);
          data = res.data?.data;
        }
      }
      setPatientProfile(data);
    } catch {
      // Nếu chưa có hồ sơ
      setPatientProfile(null);
    } finally {
      setIsProfileLoading(false);
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

  const fetchBodyParts = async () => {
    try {
      const res = await api.get('/body-parts');
      const items = res.data?.data || [];
      if (Array.isArray(items) && items.length > 0) {
        setBodyParts(items);
      }
    } catch {
      // Dùng DEFAULT_BODY_PARTS
    }
  };

  const calculateAvailableSlots = async () => {
    if (!selectedDoctorId) return;
    try {
      setIsSlotLoading(true);
      const dateStr = formatDateToYMD(selectedDate);

      const res = await api.get(`/appointments/doctor-availability?doctorId=${selectedDoctorId}&date=${dateStr}`);
      const bookedTimes: string[] = res.data?.data?.bookedTimes || [];

      const computed = BASE_SLOTS.map((slot) => {
        const slotStart = new Date(selectedDate);
        slotStart.setHours(slot.startHour, slot.startMinute, 0, 0);

        const isBooked = bookedTimes.some((bookedIso: string) => {
          const bDate = new Date(bookedIso);
          return Math.abs(bDate.getTime() - slotStart.getTime()) < 30 * 60 * 1000;
        });

        return {
          ...slot,
          isBooked,
        };
      });

      setTimeSlots(computed);
      const firstAvailable = computed.find(
        (slot) => !slot.isBooked && !isSlotInPast(slot)
      );
      setSelectedSlotId(firstAvailable ? firstAvailable.id : null);
    } catch {
      const fallbackSlots = BASE_SLOTS.map((slot) => ({ ...slot, isBooked: false }));
      setTimeSlots(fallbackSlots);
      const firstAvailable = fallbackSlots.find((slot) => !isSlotInPast(slot));
      setSelectedSlotId(firstAvailable ? firstAvailable.id : null);
    } finally {
      setIsSlotLoading(false);
    }
  };

  // Toggle điểm đau trên mô hình 2D
  const handleToggleBodyPart = (part: BodyPartData) => {
    setSelectedPainPoints((prev) => {
      const exists = prev.find((item) => item.bodyPartId === part.id);
      if (exists) {
        return prev.filter((item) => item.bodyPartId !== part.id);
      } else {
        const newItem: SelectedSymptomItem = {
          bodyPartId: part.id,
          bodyPartName: part.name,
          severity: 'moderate',
          note: `Đau tại vùng ${part.name}`,
        };
        return [...prev, newItem];
      }
    });
  };

  const handleRemovePainPoint = (partId: number) => {
    setSelectedPainPoints((prev) => prev.filter((item) => item.bodyPartId !== partId));
  };

  const handleToggleSeverity = (partId: number) => {
    setSelectedPainPoints((prev) =>
      prev.map((item) => {
        if (item.bodyPartId !== partId) return item;
        const nextSev =
          item.severity === 'mild' ? 'moderate' : item.severity === 'moderate' ? 'severe' : 'mild';
        return { ...item, severity: nextSev };
      })
    );
  };

  // Chuyển từ Step 1 sang Step 2 (Có kiểm tra thông tin bệnh nhân bắt buộc)
  const handleNextToStep2 = () => {
    if (!token) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập trước khi đặt lịch khám.', [
        { text: 'Hủy' },
        { text: 'Đăng nhập ngay', onPress: () => router.push('/login') },
      ]);
      return;
    }

    // 🔴 BẮT BUỘC: Kiểm tra thông tin bệnh nhân
    if (!isPatientProfileComplete(patientProfile)) {
      Alert.alert(
        'Yêu cầu hoàn thiện hồ sơ bệnh nhân 📋',
        'Phòng khám bắt buộc có đầy đủ thông tin cá nhân (Họ tên, SĐT, Ngày sinh, Giới tính) để lập hồ sơ bệnh án. Vui lòng cập nhật trước khi đăng ký khám.',
        [
          { text: 'Hủy' },
          { text: 'Cập nhật ngay', onPress: () => setProfileModalVisible(true) },
        ]
      );
      return;
    }

    // Chặn ngày quá khứ
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(selectedDate);
    checkDate.setHours(0, 0, 0, 0);
    if (checkDate.getTime() < today.getTime()) {
      Alert.alert('Ngày không hợp lệ', 'Không thể đặt lịch khám cho ngày trong quá khứ.');
      return;
    }

    if (!selectedDoctorId) {
      Alert.alert('Chưa chọn bác sĩ', 'Vui lòng chọn Bác sĩ phụ trách ca khám.');
      return;
    }

    if (!selectedSlotId) {
      Alert.alert('Chưa chọn khung giờ', 'Vui lòng chọn khung giờ khám còn trống.');
      return;
    }

    const chosenSlot = timeSlots.find((s) => s.id === selectedSlotId);
    if (!chosenSlot || chosenSlot.isBooked || isSlotInPast(chosenSlot)) {
      if (chosenSlot && isSlotInPast(chosenSlot)) {
        Alert.alert('Giờ hẹn đã qua', 'Vui lòng chọn khung giờ sau thời điểm hiện tại.');
        return;
      }
      Alert.alert('Lịch đã kín', 'Khung giờ bạn chọn hiện đã kín lịch. Vui lòng chọn khung giờ khác.');
      return;
    }

    setCurrentStep(2);
  };

  // Submit toàn bộ lịch khám tại Step 2
  const handleSubmitBooking = async () => {
    // 🔴 BẮT BUỘC: Kiểm tra lại thông tin bệnh nhân trước khi gửi
    if (!isPatientProfileComplete(patientProfile)) {
      Alert.alert(
        'Thiếu thông tin bệnh nhân 📋',
        'Vui lòng cập nhật đầy đủ thông tin cá nhân trước khi hoàn tất đăng ký lịch khám.',
        [
          { text: 'Cập nhật ngay', onPress: () => setProfileModalVisible(true) },
        ]
      );
      return;
    }

    const chosenSlot = timeSlots.find((s) => s.id === selectedSlotId);
    if (!chosenSlot) return;

    const finalDate = new Date(selectedDate);
    finalDate.setHours(chosenSlot.startHour, chosenSlot.startMinute, 0, 0);
    if (finalDate.getTime() <= Date.now()) {
      Alert.alert('Giờ hẹn đã qua', 'Không thể đặt lịch trước thời điểm hiện tại. Vui lòng chọn giờ khác.');
      setSelectedSlotId(null);
      setCurrentStep(1);
      return;
    }

    try {
      setIsLoading(true);

      let createdReportId: string | undefined = undefined;

      // 1. Nếu có đánh dấu điểm đau trên mô hình 2D, tạo Symptom Report trên backend
      if (selectedPainPoints.length > 0 && user?.id) {
        try {
          const reportRes = await api.post('/body-map/reports', {
            patientId: user.id,
            source: 'app',
          });
          const newReport = reportRes.data?.data;
          if (newReport?.id) {
            createdReportId = newReport.id;
            for (const pt of selectedPainPoints) {
              await api.post(`/body-map/reports/${newReport.id}/items`, {
                bodyPartId: pt.bodyPartId,
                severity: pt.severity,
                note: pt.note || pt.bodyPartName,
              }).catch(() => null);
            }
          }
        } catch {
          // Bỏ qua lỗi phụ của report
        }
      }

      // Tổng hợp ghi chú triệu chứng & điểm đau cơ thể
      const painNames = selectedPainPoints.map((p) => p.bodyPartName).join(', ');
      const combinedNote = [
        symptomNote.trim() ? `Mô tả: ${symptomNote.trim()}` : '',
        painNames ? `Vị trí đau trên Body Map: ${painNames}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      // 2. Tạo cuộc hẹn tại phòng khám
      await api.post('/appointments', {
        patientId: patientProfile?.id || user?.id,
        assignedStaffId: selectedDoctorId,
        type: appointmentType,
        scheduledAt: finalDate.toISOString(),
        visitAddress: 'Phòng khám Đa khoa',
        clinicRoom: 'Phòng tiếp đón Tầng 1',
        reportId: createdReportId,
        note: combinedNote || undefined,
      });

      Alert.alert(
        'Đặt lịch khám thành công! 🎉',
        `Phòng khám đã tiếp nhận lịch hẹn của Bệnh nhân ${patientProfile?.full_name} vào lúc ${chosenSlot.timeRange} ${formatDisplayDate(
          selectedDate
        )}.\n\nThông tin triệu chứng và sơ đồ vị trí đau cơ thể đã được chuyển tới Bác sĩ. Vui lòng có mặt trước 10 phút tại quầy lễ tân để check-in.`,
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

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
  const selectedSlot = timeSlots.find((s) => s.id === selectedSlotId);
  const hasCompleteProfile = isPatientProfileComplete(patientProfile);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* THANH TIẾN TRÌNH 2 BƯỚC (STEP INDICATOR) */}
      <View style={styles.stepperContainer}>
        {/* Step 1 Pill */}
        <TouchableOpacity
          style={[styles.stepPill, currentStep === 1 ? styles.stepPillActive : styles.stepPillCompleted]}
          onPress={() => setCurrentStep(1)}
        >
          <View
            style={[
              styles.stepNumberCircle,
              currentStep === 1 ? styles.stepNumberCircleActive : styles.stepNumberCircleCompleted,
            ]}
          >
            {currentStep === 2 ? (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            ) : (
              <Text style={styles.stepNumberText}>1</Text>
            )}
          </View>
          <Text style={[styles.stepLabel, currentStep === 1 && styles.stepLabelActive]}>
            Lịch khám & Bác sĩ
          </Text>
        </TouchableOpacity>

        {/* Đường nối */}
        <View style={[styles.stepLine, currentStep === 2 && styles.stepLineCompleted]} />

        {/* Step 2 Pill */}
        <TouchableOpacity
          style={[styles.stepPill, currentStep === 2 && styles.stepPillActive]}
          onPress={() => {
            if (currentStep === 1) handleNextToStep2();
            else setCurrentStep(2);
          }}
        >
          <View
            style={[
              styles.stepNumberCircle,
              currentStep === 2 ? styles.stepNumberCircleActive : styles.stepNumberCircleInactive,
            ]}
          >
            <Text
              style={[
                styles.stepNumberText,
                currentStep !== 2 && { color: '#94A3B8' },
              ]}
            >
              2
            </Text>
          </View>
          <Text style={[styles.stepLabel, currentStep === 2 && styles.stepLabelActive]}>
            Triệu chứng & Vị trí đau
          </Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================= */}
      {/* 🟢 STEP 1: THÔNG TIN BỆNH NHÂN, BÁC SĨ, NGÀY GIỜ & HÌNH THỨC */}
      {/* ========================================================= */}
      {currentStep === 1 && (
        <View>
          {/* BANNER THÔNG TIN PHÒNG KHÁM */}
          <View style={styles.clinicBanner}>
            <View style={styles.clinicIconBox}>
              <Ionicons name="business" size={24} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clinicBannerTitle}>Khám Chữa Bệnh Tại Phòng Khám</Text>
              <Text style={styles.clinicBannerSub}>
                Địa điểm: Phòng khám Đa khoa Quốc tế • Giờ tiếp đón: 07:30 - 17:30 hàng ngày
              </Text>
            </View>
          </View>

          {/* 🔴 MỤC 0: THÔNG TIN CÁ NHÂN CỦA BỆNH NHÂN (BẮT BUỘC) */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Thông tin Bệnh nhân (Người đến khám) (*):</Text>
            {isProfileLoading && <ActivityIndicator size="small" color="#0284C7" />}
          </View>

          {hasCompleteProfile ? (
            /* Card khi ĐÃ CÓ thông tin cá nhân đầy đủ */
            <View style={styles.patientInfoCard}>
              <View style={styles.patientInfoHeader}>
                <View style={styles.patientAvatarBox}>
                  <Ionicons name="person-circle" size={40} color="#0284C7" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.patientNameText}>{patientProfile.full_name}</Text>
                    <View style={styles.genderTag}>
                      <Text style={styles.genderTagText}>
                        {patientProfile.gender === 'male'
                          ? 'Nam'
                          : patientProfile.gender === 'female'
                          ? 'Nữ'
                          : 'Khác'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.patientSubText}>
                    📞 {patientProfile.phone} • 🎂{' '}
                    {patientProfile.date_of_birth
                      ? new Date(patientProfile.date_of_birth).toLocaleDateString('vi-VN')
                      : '---'}
                  </Text>
                  {patientProfile.address && (
                    <Text style={styles.patientAddressText} numberOfLines={1}>
                      📍 {patientProfile.address}
                      {patientProfile.province ? `, ${patientProfile.province}` : ''}
                    </Text>
                  )}
                  {patientProfile.health_insurance_no && (
                    <Text style={styles.patientBhytText}>
                      🛡️ BHYT: {patientProfile.health_insurance_no}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.editProfileBtn}
                  onPress={() => setProfileModalVisible(true)}
                >
                  <Ionicons name="create-outline" size={15} color="#0284C7" />
                  <Text style={styles.editProfileBtnText}>Sửa</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.verifiedRow}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.verifiedText}>Hồ sơ cá nhân hợp lệ để đăng ký khám bệnh</Text>
              </View>
            </View>
          ) : (
            /* Card cảnh báo khi CHƯA CÓ / THIẾU thông tin bệnh nhân */
            <View style={styles.missingProfileCard}>
              <View style={styles.missingProfileHeader}>
                <Ionicons name="alert-circle" size={24} color="#DC2626" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.missingProfileTitle}>
                    {patientProfile?.full_name?.startsWith('Bệnh nhân ')
                      ? 'Cần cập nhật Họ tên thật của bạn!'
                      : 'Chưa đủ thông tin bệnh nhân!'}
                  </Text>
                  <Text style={styles.missingProfileSub}>
                    {patientProfile?.full_name?.startsWith('Bệnh nhân ')
                      ? `Tên hiện tại là tên tạm (${patientProfile.full_name}). Vui lòng bấm cập nhật và nhập Họ và tên thật để phòng khám thiết lập hồ sơ bệnh án.`
                      : 'Phòng khám yêu cầu cung cấp đầy đủ Họ tên, Số điện thoại, Ngày sinh và Giới tính để thiết lập hồ sơ trước khi đăng ký khám.'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.updateProfileNowBtn}
                onPress={() => {
                  if (!token) {
                    Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập tài khoản Bệnh nhân để cập nhật hồ sơ.', [
                      { text: 'Hủy' },
                      { text: 'Đăng nhập ngay', onPress: () => router.push('/login') },
                    ]);
                  } else {
                    setProfileModalVisible(true);
                  }
                }}
              >
                <Ionicons name="person-add" size={16} color="#FFFFFF" />
                <Text style={styles.updateProfileNowBtnText}>
                  Cập nhật thông tin cá nhân ngay
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 1. CHỌN BÁC SĨ PHỤ TRÁCH */}
          <Text style={styles.sectionHeader}>1. Chọn Bác sĩ chuyên môn khám:</Text>
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
                      name="person"
                      size={24}
                      color={isSelected ? '#0284C7' : '#64748B'}
                    />
                  </View>
                  <Text style={[styles.doctorName, isSelected && styles.doctorNameActive]} numberOfLines={1}>
                    {doc.full_name}
                  </Text>
                  <Text style={styles.doctorRole}>Bác sĩ Chuyên khoa</Text>
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

          {/* 2. CHỌN NGÀY KHÁM (DROPDOWN) */}
          <Text style={styles.sectionHeader}>2. Chọn Ngày khám:</Text>
          <TouchableOpacity
            style={styles.dropdownSelector}
            activeOpacity={0.7}
            onPress={() => setCalendarModalVisible(true)}
          >
            <View style={styles.dropdownLeft}>
              <View style={styles.dropdownIconCircle}>
                <Ionicons name="calendar" size={20} color="#0284C7" />
              </View>
              <View>
                <Text style={styles.dropdownSubLabel}>Ngày hẹn thăm khám</Text>
                <Text style={styles.dropdownValueText}>{formatDisplayDate(selectedDate)}</Text>
              </View>
            </View>
            <View style={styles.dropdownRight}>
              <Ionicons name="chevron-down" size={20} color="#0284C7" />
            </View>
          </TouchableOpacity>

          {/* 3. HIỂN THỊ CÁC KHUNG GIỜ CÒN TRỐNG / ĐÃ KÍN */}
          <View style={styles.slotHeaderRow}>
            <Text style={styles.sectionHeader}>3. Khung giờ khám tại Phòng khám:</Text>
            {isSlotLoading && <ActivityIndicator size="small" color="#0284C7" />}
          </View>
          <Text style={styles.subHint}>
            * Thời lượng dự kiến: 45 phút/lượt khám trực tiếp tại phòng bác sĩ
          </Text>

          <View style={styles.slotsGrid}>
            {timeSlots.map((slot) => {
              const isPast = isSlotInPast(slot);
              const isUnavailable = slot.isBooked || isPast;
              const isSelected = selectedSlotId === slot.id && !isUnavailable;
              return (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.slotCard,
                    isUnavailable && styles.slotCardBooked,
                    isSelected && styles.slotCardActive,
                  ]}
                  disabled={isUnavailable}
                  onPress={() => setSelectedSlotId(slot.id)}
                >
                  <View style={styles.slotTopRow}>
                    <Ionicons
                      name={isUnavailable ? 'close-circle' : 'time-outline'}
                      size={16}
                      color={isUnavailable ? '#94A3B8' : isSelected ? '#0284C7' : '#334155'}
                    />
                    <Text
                      style={[
                        styles.slotTimeText,
                        isUnavailable && styles.slotTimeBooked,
                        isSelected && styles.slotTimeActive,
                      ]}
                    >
                      {slot.timeRange}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.slotBadge,
                      isUnavailable ? styles.slotBadgeBooked : styles.slotBadgeAvailable,
                    ]}
                  >
                    <Text
                      style={[
                        styles.slotBadgeText,
                        isUnavailable ? styles.slotBadgeTextBooked : styles.slotBadgeTextAvailable,
                      ]}
                    >
                      {isPast ? 'Đã qua giờ' : slot.isBooked ? 'Đã kín lịch' : 'Còn trống'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 4. HÌNH THỨC KHÁM */}
          <Text style={styles.sectionHeader}>4. Hình thức khám:</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, appointmentType === 'first_visit' && styles.typeBtnActive]}
              onPress={() => setAppointmentType('first_visit')}
            >
              <Ionicons
                name="medkit-outline"
                size={18}
                color={appointmentType === 'first_visit' ? '#0284C7' : '#64748B'}
              />
              <Text style={[styles.typeBtnText, appointmentType === 'first_visit' && styles.typeBtnTextActive]}>
                Khám mới (Lần đầu)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeBtn, appointmentType === 'follow_up' && styles.typeBtnActive]}
              onPress={() => setAppointmentType('follow_up')}
            >
              <Ionicons
                name="repeat-outline"
                size={18}
                color={appointmentType === 'follow_up' ? '#0284C7' : '#64748B'}
              />
              <Text style={[styles.typeBtnText, appointmentType === 'follow_up' && styles.typeBtnTextActive]}>
                Tái khám định kỳ
              </Text>
            </TouchableOpacity>
          </View>

          {/* NÚT TIẾP TỤC SANG STEP 2 */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              !hasCompleteProfile && styles.submitBtnDisabled,
            ]}
            onPress={handleNextToStep2}
          >
            <Text style={styles.submitBtnText}>
              {hasCompleteProfile ? 'Tiếp tục: Khai báo triệu chứng' : 'Cần hoàn thiện hồ sơ bệnh nhân'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* =================================================================== */}
      {/* 🔵 STEP 2: MÔ TẢ TRIỆU CHỨNG, LÝ DO KHÁM & MÔ HÌNH 2D VỊ TRÍ ĐAU */}
      {/* =================================================================== */}
      {currentStep === 2 && (
        <View>
          {/* Tóm tắt thông tin đã chọn ở Step 1 */}
          <View style={styles.summaryCard}>
            <View style={{ flex: 1 }}>
              <View style={styles.summaryRow}>
                <Ionicons name="person" size={15} color="#0369A1" />
                <Text style={styles.summaryTextBold}>
                  Bệnh nhân: {patientProfile?.full_name} ({patientProfile?.phone})
                </Text>
              </View>
              <View style={[styles.summaryRow, { marginTop: 4 }]}>
                <Ionicons name="calendar" size={15} color="#15803D" />
                <Text style={styles.summaryText}>
                  {selectedDoctor?.full_name} • {selectedSlot?.timeRange} ({formatDisplayDate(selectedDate)})
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setCurrentStep(1)} style={styles.editStep1Btn}>
              <Text style={styles.editStep1BtnText}>Đổi lịch</Text>
            </TouchableOpacity>
          </View>

          {/* 1. MÔ TẢ TRIỆU CHỨNG & LÝ DO KHÁM */}
          <Text style={styles.sectionHeader}>1. Mô tả triệu chứng hoặc lý do khám:</Text>
          <View style={[styles.inputBox, { height: 85, alignItems: 'flex-start', paddingTop: 10 }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#64748B" style={styles.boxIcon} />
            <TextInput
              style={[styles.inputText, { height: 65 }]}
              placeholder="VD: Đau rát họng, sốt nhẹ 2 ngày nay, tức ngực khi vận động mạnh..."
              placeholderTextColor="#94A3B8"
              value={symptomNote}
              onChangeText={setSymptomNote}
              multiline
            />
          </View>

          {/* 2. CHỌN VỊ TRÍ ĐAU TRÊN MÔ HÌNH 2D */}
          <Text style={styles.sectionHeader}>2. Chọn vị trí đau trên mô hình cơ thể 2D:</Text>
          <Text style={styles.subHint}>
            * Chạm trực tiếp vào các điểm tròn trên cơ thể để đánh dấu hoặc bỏ chọn vị trí đau
          </Text>

          {/* Component BodyMap2D */}
          <BodyMap2D
            bodyParts={bodyParts}
            selectedItems={selectedPainPoints}
            activeSide={activeSide}
            onChangeSide={setActiveSide}
            onPressPart={handleToggleBodyPart}
          />

          {/* Danh sách các điểm đau đã chọn (Chips / Badges) */}
          {selectedPainPoints.length > 0 && (
            <View style={styles.painPointsBox}>
              <Text style={styles.painPointsTitle}>
                Các vị trí đã đánh dấu ({selectedPainPoints.length}):
              </Text>
              <View style={styles.chipsContainer}>
                {selectedPainPoints.map((pt) => {
                  const isSevere = pt.severity === 'severe';
                  const isModerate = pt.severity === 'moderate';
                  const badgeColor = isSevere ? '#EF4444' : isModerate ? '#F59E0B' : '#10B981';
                  const sevLabel = isSevere ? 'Nặng' : isModerate ? 'Vừa' : 'Nhẹ';

                  return (
                    <View key={pt.bodyPartId} style={styles.painChip}>
                      <View style={[styles.painDot, { backgroundColor: badgeColor }]} />
                      <Text style={styles.painChipName}>{pt.bodyPartName}</Text>

                      {/* Bấm vào để đổi mức độ đau */}
                      <TouchableOpacity
                        style={[styles.sevBadge, { backgroundColor: badgeColor + '20' }]}
                        onPress={() => handleToggleSeverity(pt.bodyPartId)}
                      >
                        <Text style={[styles.sevBadgeText, { color: badgeColor }]}>{sevLabel}</Text>
                      </TouchableOpacity>

                      {/* Nút xóa */}
                      <TouchableOpacity
                        style={styles.removeChipBtn}
                        onPress={() => handleRemovePainPoint(pt.bodyPartId)}
                      >
                        <Ionicons name="close-circle" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* HÀNG NÚT ĐIỀU HƯỚNG BƯỚC 2 */}
          <View style={styles.step2ActionsRow}>
            <TouchableOpacity
              style={styles.backStepBtn}
              onPress={() => setCurrentStep(1)}
              disabled={isLoading}
            >
              <Ionicons name="arrow-back" size={18} color="#0284C7" />
              <Text style={styles.backStepBtnText}>Quay lại</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitFinalBtn, !hasCompleteProfile && styles.submitBtnDisabled]}
              onPress={handleSubmitBooking}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                  <Text style={styles.submitFinalBtnText}>Xác nhận Đặt lịch khám</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal Lịch chọn ngày linh hoạt */}
      <DatePickerModal
        visible={calendarModalVisible}
        selectedDate={selectedDate}
        minDate={new Date()}
        onSelectDate={(newDate) => setSelectedDate(newDate)}
        onClose={() => setCalendarModalVisible(false)}
      />

      {/* Modal cập nhật thông tin cá nhân bệnh nhân */}
      {(patientProfile?.id || user?.id) && (
        <PatientProfileModal
          visible={profileModalVisible}
          patientId={patientProfile?.id || user?.id || ''}
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
    padding: 16,
    paddingBottom: 40,
  },
  // STEPPER PROGRESS BAR
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepPillActive: {
    opacity: 1,
  },
  stepPillCompleted: {
    opacity: 0.9,
  },
  stepNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberCircleActive: {
    backgroundColor: '#0284C7',
  },
  stepNumberCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepNumberCircleInactive: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  stepLabelActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  stepLineCompleted: {
    backgroundColor: '#10B981',
  },

  // THÔNG TIN BỆNH NHÂN (NGƯỜI KHÁM)
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  patientInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    marginBottom: 14,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  patientInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatarBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  genderTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  genderTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  patientSubText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 3,
  },
  patientAddressText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  patientBhytText: {
    fontSize: 11,
    color: '#0D9488',
    fontWeight: '600',
    marginTop: 3,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  editProfileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  verifiedText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },

  // MISSING PROFILE CARD
  missingProfileCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    marginBottom: 14,
  },
  missingProfileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  missingProfileTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 3,
  },
  missingProfileSub: {
    fontSize: 12,
    color: '#B91C1C',
    lineHeight: 16,
  },
  updateProfileNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  updateProfileNowBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // SUMMARY CARD
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryTextBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },
  editStep1Btn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    marginLeft: 8,
  },
  editStep1BtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },

  clinicBanner: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    marginBottom: 14,
    gap: 12,
    alignItems: 'center',
  },
  clinicIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clinicBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 2,
  },
  clinicBannerSub: {
    fontSize: 12,
    color: '#0284C7',
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    marginTop: 10,
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
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownSubLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  dropdownValueText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  dropdownRight: {
    paddingLeft: 8,
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
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  typeBtnActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  typeBtnTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  boxIcon: {
    marginRight: 10,
  },
  inputText: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },

  // PAIN POINTS CHIPS
  painPointsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  painPointsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  painChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  painDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  painChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  sevBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sevBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  removeChipBtn: {
    padding: 2,
  },

  // STEP 2 ACTION BUTTONS
  step2ActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  backStepBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  backStepBtnText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 14,
  },
  submitFinalBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitFinalBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // STEP 1 SUBMIT BUTTON
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
