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
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
}

export default function DoctorWorkspaceScreen() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDoctorAppointments();
  }, [filterStatus]);

  const fetchDoctorAppointments = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/appointments');
      const items =
        res.data?.data?.data ||
        res.data?.data?.items ||
        (Array.isArray(res.data?.data) ? res.data?.data : []);
      setAppointments(items);
    } catch {
      // Mock data ca khám phân công cho bác sĩ
      setAppointments([
        {
          id: 'doc-apt-1',
          type: 'first_visit',
          status: 'confirmed',
          scheduled_at: new Date(Date.now() + 3600000 * 2).toISOString(),
          visit_address: 'Số 144 Xuân Thủy, Cầu Giấy, Hà Nội',
          note: 'Sốt cao 38.8 độ C, đau rát họng nuốt vướng từ tối qua',
          patient_id: 'pat-001',
          patients: {
            id: 'pat-001',
            full_name: 'Nguyễn Văn Bệnh Nhân',
            phone: '0912345678',
            address: 'Số 144 Xuân Thủy, Cầu Giấy, Hà Nội',
          },
        },
        {
          id: 'doc-apt-2',
          type: 'first_visit',
          status: 'in_progress',
          scheduled_at: new Date().toISOString(),
          visit_address: 'Phòng 402, Chung cư Sunrise, Cầu Giấy, Hà Nội',
          note: 'Đau thắt lưng dữ dội khi cúi, cần khám kê đơn giảm đau ngoại trú',
          patient_id: 'pat-002',
          patients: {
            id: 'pat-002',
            full_name: 'Trần Thị Mai',
            phone: '0988776655',
            address: 'Phòng 402, Chung cư Sunrise, Cầu Giấy, Hà Nội',
          },
        },
        {
          id: 'doc-apt-3',
          type: 'follow_up',
          status: 'completed',
          scheduled_at: new Date(Date.now() - 86400000).toISOString(),
          visit_address: 'Số 12 Giải Phóng, Hai Bà Trưng, Hà Nội',
          note: 'Tái khám viêm họng hạt sau 5 ngày điều trị',
          patient_id: 'pat-003',
          patients: {
            id: 'pat-003',
            full_name: 'Lê Văn Cường',
            phone: '0933221100',
            address: 'Số 12 Giải Phóng, Hai Bà Trưng, Hà Nội',
          },
        },
      ]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDoctorAppointments();
  };

  const handleUpdateStatus = async (
    appointmentId: string,
    newStatus: 'checked_in' | 'in_progress' | 'cancelled',
    label: string
  ) => {
    try {
      setActionLoadingId(appointmentId);
      await api.patch(`/appointments/${appointmentId}/status`, {
        status: newStatus,
      });

      setAppointments((prev) =>
        prev.map((item) => (item.id === appointmentId ? { ...item, status: newStatus } : item))
      );
      Alert.alert('Thành công', `Đã chuyển ca khám sang trạng thái "${label}"`);
    } catch {
      setAppointments((prev) =>
        prev.map((item) => (item.id === appointmentId ? { ...item, status: newStatus } : item))
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = appointments.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const countConfirmed = appointments.filter((a) => a.status === 'confirmed').length;
  const countCheckedIn = appointments.filter((a) => a.status === 'checked_in').length;
  const countInProgress = appointments.filter((a) => a.status === 'in_progress').length;
  const countCompleted = appointments.filter((a) => a.status === 'completed').length;

  return (
    <View style={styles.container}>
      {/* Doctor Header Banner */}
      <View style={styles.header}>
        <View style={styles.badgePill}>
          <Ionicons name="medical" size={14} color="#0D9488" />
          <Text style={styles.badgePillText}>Bảng Điều Khiển Ca Trực Bác Sĩ</Text>
        </View>
        <Text style={styles.doctorName}>
          {user?.fullName ? `BS. ${user.fullName}` : 'BS. Nguyễn Văn A'}
        </Text>
        <Text style={styles.doctorSub}>
          Bác sĩ chuyên khoa khám chữa bệnh tại phòng khám & Kê đơn EMR.
        </Text>

        {/* Doctor KPI stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
            <Text style={[styles.statNum, { color: '#0369A1' }]}>{countConfirmed}</Text>
            <Text style={styles.statLabel}>Chờ khám</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#F3E8FF', borderColor: '#DDD6FE' }]}>
            <Text style={[styles.statNum, { color: '#7E22CE' }]}>{countInProgress}</Text>
            <Text style={styles.statLabel}>Đang khám</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
            <Text style={[styles.statNum, { color: '#15803D' }]}>{countCompleted}</Text>
            <Text style={styles.statLabel}>Đã xong</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'confirmed', label: `Chờ đến (${countConfirmed})` },
          { key: 'checked_in', label: `Đã đến (${countCheckedIn})` },
          { key: 'in_progress', label: `Đang khám (${countInProgress})` },
          { key: 'completed', label: 'Hoàn tất' },
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

      {/* Appointment Cards */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0D9488" />
          <Text style={styles.loadingText}>Đang tải danh sách ca khám...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Không có ca khám nào</Text>
          <Text style={styles.emptySub}>Hiện tại bạn không có ca khám nào ở trạng thái này.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isProcessing = actionLoadingId === item.id;
            const patientName = item.patients?.full_name || 'Bệnh nhân';
            const patientPhone = item.patients?.phone || '0901234567';

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>Khám phòng khám</Text>
                  </View>
                  <AppointmentStatusBadge status={item.status} />
                </View>

                {/* Patient Information */}
                <View style={styles.patientRow}>
                  <View style={styles.avatarMini}>
                    <Ionicons name="person" size={18} color="#0D9488" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientNameText}>{patientName}</Text>
                    <View style={styles.phoneRow}>
                      <Ionicons name="call-outline" size={13} color="#0D9488" />
                      <Text style={styles.phoneText}>{patientPhone}</Text>
                      <TouchableOpacity
                        style={styles.callMiniBtn}
                        onPress={() => Linking.openURL(`tel:${patientPhone}`)}
                      >
                        <Ionicons name="call" size={11} color="#FFFFFF" />
                        <Text style={styles.callMiniBtnText}>Gọi bệnh nhân</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Time & Address */}
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={15} color="#0284C7" />
                  <Text style={styles.infoText}>
                    Giờ hẹn:{' '}
                    <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                      {new Date(item.scheduled_at).toLocaleDateString('vi-VN')} lúc{' '}
                      {new Date(item.scheduled_at).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </Text>
                </View>

                {item.visit_address && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={15} color="#EF4444" />
                    <Text style={styles.infoText}>
                      Địa chỉ: <Text style={{ color: '#0F172A' }}>{item.visit_address}</Text>
                    </Text>
                  </View>
                )}

                {item.note && (
                  <View style={styles.symptomBox}>
                    <Text style={styles.symptomTitle}>Triệu chứng tự khai:</Text>
                    <Text style={styles.symptomText}>{item.note}</Text>
                  </View>
                )}

                {/* NÚT THAO TÁC CỦA BÁC SĨ */}
                <View style={styles.actionsBox}>
                  {/* Nút 1: Xem hồ sơ bệnh án tổng hợp (EMR) */}
                  <TouchableOpacity
                    style={styles.emrHistoryBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/patient-emr-history',
                        params: {
                          patientId: item.patient_id || item.patients?.id || '',
                          appointmentId: item.id,
                          patientName: encodeURIComponent(patientName),
                          address: encodeURIComponent(item.visit_address || ''),
                        },
                      })
                    }
                  >
                    <MaterialCommunityIcons name="file-document-outline" size={16} color="#0284C7" />
                    <Text style={styles.emrHistoryBtnText}>Tra cứu Bệnh án EMR</Text>
                  </TouchableOpacity>

                  {/* Nút 2: Workflow theo trạng thái ca khám */}
                  {item.status === 'confirmed' && (
                    <TouchableOpacity
                      style={styles.startTripBtn}
                      disabled={isProcessing}
                      onPress={() =>
                        handleUpdateStatus(item.id, 'checked_in', 'Bệnh nhân đã đến phòng khám')
                      }
                    >
                      <Ionicons name="business-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.startTripBtnText}>Tiếp nhận Check-in</Text>
                    </TouchableOpacity>
                  )}

                  {item.status === 'checked_in' && (
                    <TouchableOpacity
                      style={styles.startTripBtn}
                      disabled={isProcessing}
                      onPress={() =>
                        handleUpdateStatus(item.id, 'in_progress', 'Bắt đầu khám tại phòng')
                      }
                    >
                      <Ionicons name="enter-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.startTripBtnText}>Gọi vào khám</Text>
                    </TouchableOpacity>
                  )}

                  {item.status === 'in_progress' && (
                    <TouchableOpacity
                      style={styles.examineBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/doctor-examination',
                          params: {
                            appointmentId: item.id,
                            patientId: item.patient_id || item.patients?.id || '',
                            patientName: encodeURIComponent(patientName),
                            address: encodeURIComponent(item.visit_address || ''),
                          },
                        })
                      }
                    >
                      <Ionicons name="medical" size={16} color="#FFFFFF" />
                      <Text style={styles.examineBtnText}>Khám & Kê Đơn EMR</Text>
                    </TouchableOpacity>
                  )}

                  {item.status === 'completed' && (
                    <TouchableOpacity
                      style={styles.viewResultBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/appointment-detail',
                          params: { id: item.id },
                        })
                      }
                    >
                      <Ionicons name="document-text" size={16} color="#FFFFFF" />
                      <Text style={styles.viewResultBtnText}>Xem Kết Quả & Đơn Thuốc</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
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
    color: '#0D9488',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  doctorSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNum: {
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
    backgroundColor: '#0D9488',
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
    marginBottom: 10,
  },
  typeBadge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  avatarMini: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  phoneText: {
    fontSize: 12,
    color: '#0D9488',
    fontWeight: '600',
  },
  callMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginLeft: 6,
  },
  callMiniBtnText: {
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
  actionsBox: {
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  emrHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  emrHistoryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  startTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  startTripBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  examineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  examineBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  viewResultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  viewResultBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  center: {
    padding: 40,
    alignItems: 'center',
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
});
