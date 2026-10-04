import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MedicalColors } from '../constants/Colors';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge';

interface AppointmentItem {
  id: string;
  type: string;
  status: string;
  scheduled_at: string;
  visit_address?: string;
  note?: string;
  patient_id?: string;
  patients?: {
    id: string;
    full_name: string;
    phone: string;
    address?: string;
  };
  users_appointments_assigned_staff_idTousers?: {
    id: string;
    full_name: string;
    phone: string;
  };
}

interface DoctorUser {
  id: string;
  full_name: string;
  phone: string;
  email: string;
}

export default function CskhAppointmentsScreen() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Doctors
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [selectedDoctorMap, setSelectedDoctorMap] = useState<Record<string, string>>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal assign doctor
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [currentApt, setCurrentApt] = useState<AppointmentItem | null>(null);

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [aptRes, docRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/users?roleCode=doctor&status=active'),
      ]);

      const items =
        aptRes.data?.data?.data ||
        aptRes.data?.data?.items ||
        (Array.isArray(aptRes.data?.data) ? aptRes.data?.data : []);
      setAppointments(items);

      const docs = docRes.data?.data?.items || docRes.data?.data || [];
      setDoctors(docs);
    } catch {
      // Mock data cho CSKH thử nghiệm
      setAppointments([
        {
          id: 'apt-cskh-01',
          type: 'first_visit',
          status: 'pending',
          scheduled_at: new Date(Date.now() + 3600000 * 3).toISOString(),
          visit_address: 'Phòng 502, Tòa nhà Detech, Tôn Thất Thuyết, Cầu Giấy, Hà Nội',
          note: 'Bệnh nhân sốt cao 39 độ, đau đầu và ho khan liên tục từ tối qua.',
          patient_id: 'pat-001',
          patients: {
            id: 'pat-001',
            full_name: 'Nguyễn Văn Bệnh Nhân',
            phone: '0912345678',
            address: 'Phòng 502, Tòa nhà Detech, Tôn Thất Thuyết, Cầu Giấy, Hà Nội',
          },
        },
        {
          id: 'apt-cskh-02',
          type: 'first_visit',
          status: 'pending',
          scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          visit_address: '144 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
          note: 'Cần bác sĩ đến khám viêm họng hạt và tư vấn huyết áp định kỳ.',
          patient_id: 'pat-002',
          patients: {
            id: 'pat-002',
            full_name: 'Trần Thị Mai',
            phone: '0988776655',
            address: '144 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
          },
        },
        {
          id: 'apt-cskh-03',
          type: 'follow_up',
          status: 'confirmed',
          scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(),
          visit_address: '12 Giải Phóng, Hai Bà Trưng, Hà Nội',
          note: 'Tái khám sau đợt viêm phế quản',
          patient_id: 'pat-003',
          patients: {
            id: 'pat-003',
            full_name: 'Lê Văn Cường',
            phone: '0933221100',
          },
          users_appointments_assigned_staff_idTousers: {
            id: 'doc-001',
            full_name: 'BS. CK1 Hoàng Minh Tâm',
            phone: '0901234567',
          },
        },
      ]);

      setDoctors([
        {
          id: 'doc-001',
          full_name: 'BS. CK1 Hoàng Minh Tâm',
          phone: '0901234567',
          email: 'doctor@hospital.local',
        },
        {
          id: 'doc-002',
          full_name: 'ThS. BS Trần Minh Đức',
          phone: '0912334455',
          email: 'duc.tm@hospital.local',
        },
      ]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const openAssignModal = (item: AppointmentItem) => {
    setCurrentApt(item);
    setAssignModalVisible(true);
  };

  const handleConfirmAndAssign = async (doctorId: string) => {
    if (!currentApt) return;
    try {
      setActionLoadingId(currentApt.id);
      setAssignModalVisible(false);

      // 1. Phân công Bác sĩ
      await api.patch(`/appointments/${currentApt.id}/assign`, {
        staffId: doctorId,
      }).catch(() => null);

      // 2. Chuyển trạng thái sang confirmed
      await api.patch(`/appointments/${currentApt.id}/status`, {
        status: 'confirmed',
      });

      const assignedDoc = doctors.find((d) => d.id === doctorId);

      setAppointments((prev) =>
        prev.map((item) =>
          item.id === currentApt.id
            ? {
                ...item,
                status: 'confirmed',
                users_appointments_assigned_staff_idTousers: assignedDoc
                  ? { id: assignedDoc.id, full_name: assignedDoc.full_name, phone: assignedDoc.phone }
                  : undefined,
              }
            : item
        )
      );

      Alert.alert(
        'Đã duyệt thành công! 🎉',
        `Ca khám đã được chuyển sang trạng thái "Đã xác nhận" và bàn giao cho ${assignedDoc?.full_name || 'Bác sĩ'}. Bác sĩ và bệnh nhân sẽ nhận được thông báo.`
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể xác nhận lịch hẹn. Vui lòng thử lại.';
      Alert.alert('Lỗi xác nhận', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelAppointment = (appointmentId: string) => {
    Alert.alert(
      'Hủy ca khám',
      'Bạn có chắc chắn muốn hủy ca khám này không? Thông báo hủy sẽ được gửi đến bệnh nhân.',
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Xác nhận hủy',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoadingId(appointmentId);
              await api.patch(`/appointments/${appointmentId}/status`, {
                status: 'cancelled',
              });
              setAppointments((prev) =>
                prev.map((item) =>
                  item.id === appointmentId ? { ...item, status: 'cancelled' } : item
                )
              );
              Alert.alert('Đã hủy', 'Lịch hẹn đã được chuyển sang trạng thái đã hủy.');
            } catch (err: any) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể hủy lịch.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const filtered = appointments.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const pendingCount = appointments.filter((a) => a.status === 'pending').length;
  const confirmedCount = appointments.filter((a) => a.status === 'confirmed').length;

  return (
    <View style={styles.container}>
      {/* Header Banner CSKH */}
      <View style={styles.cskhHeader}>
        <View style={styles.badgePill}>
          <Ionicons name="headset" size={14} color="#EA580C" />
          <Text style={styles.badgePillText}>Bàn Tiếp Nhận & Điều Phối CSKH</Text>
        </View>
        <Text style={styles.cskhTitle}>Xác Nhận & Điều Phối Lịch Phòng Khám</Text>
        <Text style={styles.cskhSub}>
          Tiếp nhận ca khám mới, gọi điện xác nhận & phân công phòng khám, bác sĩ phụ trách.
        </Text>

        {/* Mini stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#FFEDD5', borderColor: '#FDBA74' }]}>
            <Text style={[styles.statNumber, { color: '#C2410C' }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Chờ duyệt (Pending)</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
            <Text style={[styles.statNumber, { color: '#15803D' }]}>{confirmedCount}</Text>
            <Text style={styles.statLabel}>Đã điều phối</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {[
          { key: 'pending', label: `Chờ duyệt (${pendingCount})` },
          { key: 'confirmed', label: 'Chờ đến' },
          { key: 'checked_in', label: 'Đã đến' },
          { key: 'all', label: 'Tất cả' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filterStatus === tab.key && styles.filterTabActive]}
            onPress={() => setFilterStatus(tab.key)}
          >
            <Text
              style={[
                styles.filterTabText,
                filterStatus === tab.key && styles.filterTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Appointment List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Đang tải danh sách điều phối...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-done-circle-outline" size={56} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Không có lịch hẹn nào</Text>
          <Text style={styles.emptySub}>
            {filterStatus === 'pending'
              ? 'Tuyệt vời! Hiện tại đã xử lý hết toàn bộ ca khám chờ duyệt.'
              : 'Chưa có lịch hẹn ở bộ lọc này.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isProcessing = actionLoadingId === item.id;
            const patientName = item.patients?.full_name || 'Bệnh nhân đăng ký';
            const patientPhone = item.patients?.phone || 'Chưa có SĐT';
            const doctorName = item.users_appointments_assigned_staff_idTousers?.full_name;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>Khám phòng khám</Text>
                  </View>
                  <AppointmentStatusBadge status={item.status} />
                </View>

                {/* Patient Info */}
                <View style={styles.patientRow}>
                  <View style={styles.avatarMini}>
                    <Ionicons name="person" size={18} color="#EA580C" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{patientName}</Text>
                    <View style={styles.phoneActionRow}>
                      <Ionicons name="call-outline" size={14} color="#0284C7" />
                      <Text style={styles.phoneText}>{patientPhone}</Text>
                      <TouchableOpacity
                        style={styles.callNowBtn}
                        onPress={() => Linking.openURL(`tel:${patientPhone}`)}
                      >
                        <Ionicons name="call" size={12} color="#FFFFFF" />
                        <Text style={styles.callNowBtnText}>Gọi chốt lịch</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Scheduled time */}
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={16} color="#475569" />
                  <Text style={styles.infoText}>
                    Thời gian:{' '}
                    <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                      {new Date(item.scheduled_at).toLocaleDateString('vi-VN')} lúc{' '}
                      {new Date(item.scheduled_at).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </Text>
                </View>

                {/* Visit Address */}
                {item.visit_address && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color="#EF4444" />
                    <Text style={styles.infoText}>
                      Địa chỉ: <Text style={{ color: '#0F172A' }}>{item.visit_address}</Text>
                    </Text>
                  </View>
                )}

                {/* Symptom note */}
                {item.note && (
                  <View style={styles.symptomBox}>
                    <Text style={styles.symptomTitle}>Triệu chứng bệnh nhân tự khai:</Text>
                    <Text style={styles.symptomText}>{item.note}</Text>
                  </View>
                )}

                {/* Assigned Doctor info if any */}
                {doctorName ? (
                  <View style={styles.doctorAssignedBox}>
                    <Ionicons name="medkit" size={16} color="#0D9488" />
                    <Text style={styles.doctorAssignedText}>
                      Bác sĩ phụ trách: <Text style={{ fontWeight: '700' }}>{doctorName}</Text>
                    </Text>
                  </View>
                ) : (
                  <View style={styles.unassignedBox}>
                    <Ionicons name="alert-circle-outline" size={16} color="#D97706" />
                    <Text style={styles.unassignedText}>Chưa phân công Bác sĩ phụ trách</Text>
                  </View>
                )}

                {/* CSKH Actions */}
                {item.status === 'pending' && (
                  <View style={styles.actionGroup}>
                    <TouchableOpacity
                      style={styles.assignBtn}
                      disabled={isProcessing}
                      onPress={() => openAssignModal(item)}
                    >
                      <Ionicons name="person-add" size={16} color="#FFFFFF" />
                      <Text style={styles.assignBtnText}>Chọn Bác Sĩ & Duyệt Lịch</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelBtn}
                      disabled={isProcessing}
                      onPress={() => handleCancelAppointment(item.id)}
                    >
                      <Ionicons name="close" size={16} color="#EF4444" />
                      <Text style={styles.cancelBtnText}>Từ chối</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* MODAL: CHỌN BÁC SĨ PHỤ TRÁCH */}
      <Modal
        visible={assignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Phân Công Bác Sĩ Phụ Trách</Text>
                <Text style={styles.modalSub}>
                  Ca khám của: {currentApt?.patients?.full_name || 'Bệnh nhân'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.doctorListHeader}>Danh sách Bác sĩ đang hoạt động:</Text>
            <FlatList
              data={doctors}
              keyExtractor={(d) => d.id}
              renderItem={({ item: doc }) => (
                <TouchableOpacity
                  style={styles.doctorOption}
                  onPress={() => handleConfirmAndAssign(doc.id)}
                >
                  <View style={styles.docAvatar}>
                    <Ionicons name="medkit" size={20} color="#0D9488" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{doc.full_name}</Text>
                    <Text style={styles.docPhone}>SĐT: {doc.phone || 'Chưa có'}</Text>
                    <Text style={styles.docEmail}>{doc.email}</Text>
                  </View>
                  <View style={styles.chooseBadge}>
                    <Text style={styles.chooseBadgeText}>Chọn & Gán ca</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  cskhHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 6,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
  },
  cskhTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  cskhSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterTabActive: {
    backgroundColor: '#EA580C',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  patientRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  phoneActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  phoneText: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '600',
  },
  callNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginLeft: 6,
  },
  callNowBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },
  symptomBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  symptomTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  symptomText: {
    fontSize: 13,
    color: '#78350F',
    marginTop: 2,
  },
  doctorAssignedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  doctorAssignedText: {
    fontSize: 13,
    color: '#166534',
  },
  unassignedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  unassignedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
  },
  actionGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  assignBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  assignBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  doctorListHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 14,
    marginBottom: 8,
  },
  doctorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    gap: 12,
  },
  docAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  docPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  docEmail: {
    fontSize: 11,
    color: '#94A3B8',
  },
  chooseBadge: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chooseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
