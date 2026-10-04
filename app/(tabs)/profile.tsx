import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MedicalColors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { PatientProfileModal } from '../../components/PatientProfileModal';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, token, logout, isDoctor, isCskh } = useAuth();

  const [patientData, setPatientData] = useState<any>(null);
  const [medicalHistories, setMedicalHistories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (token) {
      loadProfile();
    }
  }, [token, user?.id]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      // Ưu tiên gọi /patients/me
      let profileRes: any;
      try {
        profileRes = await api.get('/patients/me');
      } catch {
        if (user?.id) {
          profileRes = await api.get(`/patients/${user.id}`);
        }
      }

      if (profileRes?.data?.data) {
        const p = profileRes.data.data;
        setPatientData(p);
        setMedicalHistories(p.patient_medical_history || []);
      }
    } catch {
      // Mock dữ liệu tạm nếu offline
      if (user) {
        setPatientData({
          id: user.id,
          full_name: user.fullName,
          phone: user.phone,
          address: user.address,
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadProfile();
  };

  // Kiểm tra tính đầy đủ của thông tin bệnh nhân
  const checkProfileCompleteness = (profile: any) => {
    const hasName =
      !!profile?.full_name &&
      profile.full_name.trim().length >= 2 &&
      !profile.full_name.startsWith('Bệnh nhân ');
    const hasPhone = !!profile?.phone && profile.phone.trim().length >= 9;
    const hasDob = !!profile?.date_of_birth;
    const hasGender = !!profile?.gender;

    const isComplete = hasName && hasPhone && hasDob && hasGender;
    return {
      isComplete,
      hasName,
      hasPhone,
      hasDob,
      hasGender,
    };
  };

  const completeness = checkProfileCompleteness(patientData);

  // ==============================================================
  // GIAO DIỆN CHƯA ĐĂNG NHẬP
  // ==============================================================
  if (!token || !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.guestContainer}>
          <View style={styles.guestIconCircle}>
            <Ionicons name="person-circle-outline" size={80} color="#94A3B8" />
          </View>
          <Text style={styles.guestTitle}>Chưa đăng nhập tài khoản</Text>
          <Text style={styles.guestSubtitle}>
            Vui lòng đăng nhập để xem thông tin cá nhân, cập nhật hồ sơ bệnh án và đặt lịch khám tại phòng khám.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/login')}>
            <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Đăng nhập ngay</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==============================================================
  // GIAO DIỆN CHO BÁC SĨ HOẶC NHÂN VIÊN CSKH
  // ==============================================================
  if (isDoctor || isCskh) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={styles.headerCard}>
            <View style={styles.avatarCircle}>
              <Ionicons name="medkit" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.userName}>{user.fullName}</Text>
            <View style={styles.badgeStaff}>
              <Text style={styles.badgeStaffText}>
                {isDoctor ? '🩺 Bác sĩ Chuyên khoa' : '🎧 Chuyên viên CSKH'}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Thông tin nhân viên</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{user.email || 'staff@hospital.local'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số điện thoại:</Text>
              <Text style={styles.infoValue}>{user.phone || '0901234567'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Đơn vị công tác:</Text>
              <Text style={styles.infoValue}>Phòng khám Đa khoa Quốc tế</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==============================================================
  // GIAO DIỆN CHO ROLE BỆNH NHÂN (PATIENT)
  // ==============================================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {/* HEADER BỆNH NHÂN */}
        <View style={styles.headerCard}>
          <View style={styles.avatarCirclePatient}>
            <Ionicons name="person" size={38} color="#FFFFFF" />
          </View>
          <Text style={styles.userName}>{patientData?.full_name || user.fullName}</Text>
          <Text style={styles.userPhone}>📞 {patientData?.phone || user.phone || 'Chưa cập nhật'}</Text>

          <View
            style={[
              styles.statusPill,
              completeness.isComplete ? styles.statusPillSuccess : styles.statusPillWarning,
            ]}
          >
            <Ionicons
              name={completeness.isComplete ? 'checkmark-circle' : 'alert-circle'}
              size={15}
              color={completeness.isComplete ? '#059669' : '#DC2626'}
            />
            <Text
              style={[
                styles.statusPillText,
                completeness.isComplete ? { color: '#059669' } : { color: '#DC2626' },
              ]}
            >
              {completeness.isComplete
                ? 'Hồ sơ cá nhân hợp lệ'
                : 'Chưa đủ điều kiện đặt lịch khám'}
            </Text>
          </View>
        </View>

        {/* THẺ BẮT BUỘC: ĐIỀU KIỆN ĐẶT LỊCH KHÁM */}
        <View
          style={[
            styles.checklistCard,
            completeness.isComplete ? styles.checklistCardValid : styles.checklistCardInvalid,
          ]}
        >
          <View style={styles.checkHeaderRow}>
            <Ionicons
              name={completeness.isComplete ? 'shield-checkmark' : 'information-circle'}
              size={22}
              color={completeness.isComplete ? '#059669' : '#DC2626'}
            />
            <Text style={styles.checkHeaderTitle}>
              {completeness.isComplete
                ? 'Đã đủ điều kiện đặt lịch khám tại phòng khám'
                : 'Yêu cầu hoàn thiện thông tin trước khi đặt lịch'}
            </Text>
          </View>
          <Text style={styles.checkDesc}>
            {completeness.isComplete
              ? 'Thông tin cá nhân của bạn đã đầy đủ để phòng khám tạo mã bệnh án và tiếp đón khám bệnh.'
              : 'Quy định phòng khám bắt buộc phải có đầy đủ Họ tên, Số điện thoại, Ngày sinh và Giới tính để lập hồ sơ bệnh án EMR.'}
          </Text>

          {/* Checklist 4 tiêu chí bắt buộc */}
          <View style={styles.checkItemsBox}>
            <View style={styles.checkItemRow}>
              <Ionicons
                name={completeness.hasName ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={completeness.hasName ? '#10B981' : '#EF4444'}
              />
              <Text style={[styles.checkItemText, completeness.hasName && styles.checkItemTextDone]}>
                Họ và tên bệnh nhân:{' '}
                {completeness.hasName
                  ? patientData?.full_name
                  : patientData?.full_name?.startsWith('Bệnh nhân ')
                  ? `(${patientData.full_name} - Đang là tên tạm, cần nhập họ tên thật)`
                  : '(Chưa điền)'}
              </Text>
            </View>

            <View style={styles.checkItemRow}>
              <Ionicons
                name={completeness.hasPhone ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={completeness.hasPhone ? '#10B981' : '#EF4444'}
              />
              <Text style={[styles.checkItemText, completeness.hasPhone && styles.checkItemTextDone]}>
                Số điện thoại liên hệ {completeness.hasPhone ? `(${patientData.phone})` : '(Chưa điền)'}
              </Text>
            </View>

            <View style={styles.checkItemRow}>
              <Ionicons
                name={completeness.hasDob ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={completeness.hasDob ? '#10B981' : '#EF4444'}
              />
              <Text style={[styles.checkItemText, completeness.hasDob && styles.checkItemTextDone]}>
                Ngày sinh / Độ tuổi{' '}
                {completeness.hasDob
                  ? `(${new Date(patientData.date_of_birth).toLocaleDateString('vi-VN')})`
                  : '(Chưa điền)'}
              </Text>
            </View>

            <View style={styles.checkItemRow}>
              <Ionicons
                name={completeness.hasGender ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={completeness.hasGender ? '#10B981' : '#EF4444'}
              />
              <Text style={[styles.checkItemText, completeness.hasGender && styles.checkItemTextDone]}>
                Giới tính{' '}
                {completeness.hasGender
                  ? `(${patientData.gender === 'male' ? 'Nam' : patientData.gender === 'female' ? 'Nữ' : 'Khác'})`
                  : '(Chưa chọn)'}
              </Text>
            </View>
          </View>

          {!completeness.isComplete && (
            <TouchableOpacity
              style={styles.updateNowBtn}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="create" size={16} color="#FFFFFF" />
              <Text style={styles.updateNowBtnText}>Cập nhật thông tin cá nhân ngay</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* THẺ 1: THÔNG TIN HÀNH CHÍNH CHI TIẾT */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="id-card" size={20} color="#0284C7" />
              <Text style={styles.cardTitle}>Thông tin hành chính</Text>
            </View>
            <TouchableOpacity
              style={styles.editCardBtn}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="pencil" size={14} color="#0284C7" />
              <Text style={styles.editCardBtnText}>Sửa</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Họ và tên:</Text>
            <Text style={styles.infoValueBold}>{patientData?.full_name || '---'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Giới tính:</Text>
            <Text style={styles.infoValue}>
              {patientData?.gender === 'male'
                ? 'Nam'
                : patientData?.gender === 'female'
                ? 'Nữ'
                : patientData?.gender === 'other'
                ? 'Khác'
                : 'Chưa cập nhật'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngày sinh:</Text>
            <Text style={styles.infoValue}>
              {patientData?.date_of_birth
                ? new Date(patientData.date_of_birth).toLocaleDateString('vi-VN')
                : 'Chưa cập nhật'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số điện thoại:</Text>
            <Text style={styles.infoValue}>{patientData?.phone || 'Chưa cập nhật'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thẻ BHYT:</Text>
            <Text style={styles.infoValue}>
              {patientData?.health_insurance_no
                ? `🛡️ ${patientData.health_insurance_no}`
                : 'Chưa đăng ký'}
            </Text>
          </View>
        </View>

        {/* THẺ 2: ĐỊA CHỈ CƯ TRÚ */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="location" size={20} color="#0D9488" />
              <Text style={styles.cardTitle}>Địa chỉ thường trú</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Địa chỉ:</Text>
            <Text style={styles.infoValue}>{patientData?.address || 'Chưa cập nhật'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tỉnh / Thành phố:</Text>
            <Text style={styles.infoValue}>{patientData?.province || 'Hà Nội'}</Text>
          </View>
        </View>

        {/* THẺ 3: LIÊN HỆ KHẨN CẤP */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="call" size={20} color="#EA580C" />
              <Text style={styles.cardTitle}>Người liên hệ khẩn cấp</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Họ tên người thân:</Text>
            <Text style={styles.infoValue}>
              {patientData?.emergency_contact_name || 'Chưa cập nhật'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số điện thoại khẩn cấp:</Text>
            <Text style={styles.infoValue}>
              {patientData?.emergency_contact_phone || 'Chưa cập nhật'}
            </Text>
          </View>
        </View>

        {/* THẺ 4: TIỀN SỬ BỆNH LÝ & DỊ ỨNG */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="fitness" size={20} color="#7C3AED" />
              <Text style={styles.cardTitle}>Tiền sử bệnh lý & Dị ứng</Text>
            </View>
          </View>

          {medicalHistories.length === 0 ? (
            <Text style={styles.emptyHistoryText}>
              Chưa ghi nhận tiền sử bệnh nền hoặc dị ứng thuốc.
            </Text>
          ) : (
            <View style={styles.historyList}>
              {medicalHistories.map((h: any, idx: number) => (
                <View key={h.id || idx} style={styles.historyItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#7C3AED" />
                  <Text style={styles.historyItemText}>
                    {h.condition_name || h.conditionName}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.addHistoryBtn}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={16} color="#7C3AED" />
            <Text style={styles.addHistoryBtnText}>Khai báo thêm tiền sử bệnh / dị ứng</Text>
          </TouchableOpacity>
        </View>

        {/* HÀNH ĐỘNG CHÍNH */}
        <View style={styles.actionButtonGroup}>
          {completeness.isComplete ? (
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => router.push('/book-appointment')}
            >
              <Ionicons name="calendar" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Đặt lịch khám tại phòng khám</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#DC2626' }]}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="person-add" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Hoàn thiện hồ sơ để đặt lịch khám</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL CẬP NHẬT THÔNG TIN CÁ NHÂN */}
      {(patientData?.id || user.id) && (
        <PatientProfileModal
          visible={modalVisible}
          patientId={patientData?.id || user.id}
          initialData={patientData}
          onClose={() => setModalVisible(false)}
          onSuccess={() => {
            setModalVisible(false);
            loadProfile();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  // GUEST STATE
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  guestIconCircle: {
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: MedicalColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  // HEADER CARD
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: MedicalColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCirclePatient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  userPhone: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  badgeStaff: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  badgeStaffText: {
    color: '#0369A1',
    fontWeight: '700',
    fontSize: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  statusPillSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusPillWarning: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // CHECKLIST CARD
  checklistCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  checklistCardValid: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  checklistCardInvalid: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  checkHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  checkDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
    lineHeight: 18,
  },
  checkItemsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkItemText: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  checkItemTextDone: {
    color: '#0F172A',
    fontWeight: '600',
  },
  updateNowBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  updateNowBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  // CARD STYLES
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  editCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editCardBtnText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  infoValueBold: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
    textAlign: 'right',
  },
  emptyHistoryText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  historyList: {
    gap: 6,
    marginBottom: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  historyItemText: {
    fontSize: 13,
    color: '#5B21B6',
    fontWeight: '600',
  },
  addHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  addHistoryBtnText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '700',
  },
  // ACTION BUTTONS
  actionButtonGroup: {
    marginTop: 8,
    gap: 12,
  },
  primaryActionBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
});
