import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MedicalColors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge';

export default function DoctorDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'unexamined' | 'examined'>('all');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/appointments');
      const items =
        res.data?.data?.data ||
        res.data?.data?.items ||
        (Array.isArray(res.data?.data) ? res.data?.data : []);
      setAppointments(items);
    } catch {
      // Mock data các ca khám hôm nay cho Bác sĩ
      setAppointments([
        {
          id: 'doc-apt-1',
          type: 'first_visit',
          status: 'confirmed',
          scheduled_at: new Date(Date.now() + 3600000 * 1.5).toISOString(),
          visit_address: 'Số 144 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
          note: 'Sốt cao 38.8°C, đau rát họng, nuốt vướng từ tối qua',
          patient_id: 'pat-001',
          patients: {
            id: 'pat-001',
            full_name: 'Nguyễn Văn Bệnh Nhân',
            phone: '0912345678',
            address: 'Số 144 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
          },
        },
        {
          id: 'doc-apt-2',
          type: 'first_visit',
          status: 'in_progress',
          scheduled_at: new Date().toISOString(),
          visit_address: 'Phòng 402, Chung cư Sunrise, Cầu Giấy, Hà Nội',
          note: 'Đau thắt lưng dữ dội khi cúi gập người, cần khám kê đơn giảm đau ngoại trú',
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
          scheduled_at: new Date(Date.now() - 3600000 * 3).toISOString(),
          visit_address: 'Số 12 Giải Phóng, Hai Bà Trưng, Hà Nội',
          note: 'Tái khám sau 5 ngày điều trị viêm phế quản',
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
    fetchAppointments();
  };

  const handleUpdateStatus = async (
    appointmentId: string,
    newStatus: 'in_progress' | 'completed',
    statusLabel: string
  ) => {
    try {
      setActionLoadingId(appointmentId);
      await api.patch(`/appointments/${appointmentId}/status`, { status: newStatus });
      setAppointments((prev) =>
        prev.map((item) => (item.id === appointmentId ? { ...item, status: newStatus } : item))
      );
      Alert.alert('Thành công', `Đã chuyển ca khám sang trạng thái "${statusLabel}"`);
    } catch {
      setAppointments((prev) =>
        prev.map((item) => (item.id === appointmentId ? { ...item, status: newStatus } : item))
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // KPI Calculations
  const unexaminedCount = appointments.filter(
    (a) => a.status === 'confirmed' || a.status === 'in_progress' || a.status === 'pending'
  ).length;
  const examinedCount = appointments.filter((a) => a.status === 'completed').length;
  const totalPatients = appointments.length;

  const todayFormatted = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const filteredAppointments = appointments.filter((item) => {
    if (filterTab === 'unexamined') {
      return item.status === 'confirmed' || item.status === 'in_progress' || item.status === 'pending';
    }
    if (filterTab === 'examined') {
      return item.status === 'completed';
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor Header Banner */}
        <View style={styles.topHeader}>
          <View>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Đang trực tuyến • Sẵn sàng nhận ca</Text>
            </View>
            <Text style={styles.doctorGreeting}>Xin chào,</Text>
            <Text style={styles.doctorNameTitle}>
              {user?.fullName ? `BS. ${user.fullName}` : 'BS. Nguyễn Văn A'}
            </Text>
            <Text style={styles.doctorSpecialty}>Bác sĩ chuyên khoa Khám chữa bệnh tại nhà</Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={styles.logoutBtnText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Card Dashboard */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <Ionicons name="medkit" size={24} color="#FFFFFF" />
            <Text style={styles.heroDateText}>{todayFormatted}</Text>
          </View>
          <Text style={styles.heroTitle}>Bảng Điều Khiển Ca Trực Bác Sĩ</Text>
          <Text style={styles.heroSubtitle}>
            Theo dõi lộ trình thăm khám hôm nay, tra cứu bệnh án EMR và tiến hành kê đơn thuốc tại nhà.
          </Text>
        </View>

        {/* THỐNG KÊ SỐ LƯỢNG BỆNH NHÂN ĐÃ KHÁM / CHƯA KHÁM */}
        <Text style={styles.sectionTitle}>Chỉ số ca khám hôm nay</Text>
        <View style={styles.kpiContainer}>
          {/* Chưa khám */}
          <TouchableOpacity
            style={[
              styles.kpiCard,
              { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' },
              filterTab === 'unexamined' && styles.kpiCardActive,
            ]}
            onPress={() => setFilterTab(filterTab === 'unexamined' ? 'all' : 'unexamined')}
          >
            <View style={[styles.kpiIconCircle, { backgroundColor: '#FDE68A' }]}>
              <Ionicons name="time" size={20} color="#B45309" />
            </View>
            <Text style={[styles.kpiNumber, { color: '#B45309' }]}>{unexaminedCount}</Text>
            <Text style={styles.kpiTitle}>Chưa khám</Text>
            <Text style={styles.kpiNote}>Cần khám hôm nay</Text>
          </TouchableOpacity>

          {/* Đã khám */}
          <TouchableOpacity
            style={[
              styles.kpiCard,
              { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
              filterTab === 'examined' && styles.kpiCardActive,
            ]}
            onPress={() => setFilterTab(filterTab === 'examined' ? 'all' : 'examined')}
          >
            <View style={[styles.kpiIconCircle, { backgroundColor: '#BBF7D0' }]}>
              <Ionicons name="checkmark-done-circle" size={20} color="#15803D" />
            </View>
            <Text style={[styles.kpiNumber, { color: '#15803D' }]}>{examinedCount}</Text>
            <Text style={styles.kpiTitle}>Đã khám xong</Text>
            <Text style={styles.kpiNote}>Đã hoàn tất EMR</Text>
          </TouchableOpacity>

          {/* Tổng số bệnh nhân */}
          <TouchableOpacity
            style={[
              styles.kpiCard,
              { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' },
              filterTab === 'all' && styles.kpiCardActive,
            ]}
            onPress={() => setFilterTab('all')}
          >
            <View style={[styles.kpiIconCircle, { backgroundColor: '#BAE6FD' }]}>
              <Ionicons name="people" size={20} color="#0369A1" />
            </View>
            <Text style={[styles.kpiNumber, { color: '#0369A1' }]}>{totalPatients}</Text>
            <Text style={styles.kpiTitle}>Tổng bệnh nhân</Text>
            <Text style={styles.kpiNote}>Trong danh sách</Text>
          </TouchableOpacity>
        </View>

        {/* LỐI TẮT CÔNG CỤ NHANH */}
        <View style={styles.quickToolsRow}>
          <TouchableOpacity
            style={styles.quickToolBtn}
            onPress={() =>
              router.push({
                pathname: '/patient-emr-history',
                params: {
                  patientId: 'pat-001',
                  patientName: encodeURIComponent('Nguyễn Văn Bệnh Nhân'),
                },
              })
            }
          >
            <MaterialCommunityIcons name="file-document-outline" size={18} color="#0284C7" />
            <Text style={styles.quickToolBtnText}>Tra cứu EMR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickToolBtn}
            onPress={() =>
              router.push({
                pathname: '/doctor-examination',
                params: {
                  appointmentId: 'apt-001',
                  patientId: 'pat-001',
                  patientName: encodeURIComponent('Nguyễn Văn Bệnh Nhân'),
                  address: encodeURIComponent('144 Xuân Thủy, Cầu Giấy, Hà Nội'),
                },
              })
            }
          >
            <Ionicons name="medical" size={18} color="#0D9488" />
            <Text style={styles.quickToolBtnText}>Khám & Kê đơn</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickToolBtn}
            onPress={() => router.push('/appointments')}
          >
            <Ionicons name="list" size={18} color="#7C3AED" />
            <Text style={styles.quickToolBtnText}>Tất cả lịch khám</Text>
          </TouchableOpacity>
        </View>

        {/* DANH SÁCH LỊCH KHÁM HÔM NAY */}
        <View style={styles.listHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>
              Lịch khám hôm nay ({filteredAppointments.length})
            </Text>
            <Text style={styles.sectionSub}>
              {filterTab === 'unexamined'
                ? 'Đang lọc: Các ca bệnh nhân chưa khám'
                : filterTab === 'examined'
                ? 'Đang lọc: Các ca bệnh nhân đã khám xong'
                : 'Toàn bộ các ca khám được phân công hôm nay'}
            </Text>
          </View>
          <TouchableOpacity onPress={fetchAppointments} style={styles.reloadBtn}>
            <Ionicons name="reload" size={16} color="#0D9488" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#0D9488" />
            <Text style={styles.loadingText}>Đang tải danh sách ca khám hôm nay...</Text>
          </View>
        ) : filteredAppointments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Không có ca khám nào</Text>
            <Text style={styles.emptySub}>
              {filterTab === 'unexamined'
                ? 'Tuyệt vời! Không còn bệnh nhân nào chưa khám hôm nay.'
                : 'Chưa có dữ liệu ca khám cho bộ lọc này.'}
            </Text>
          </View>
        ) : (
          filteredAppointments.map((apt) => {
            const isProcessing = actionLoadingId === apt.id;
            const patientName = apt.patients?.full_name || 'Bệnh nhân';
            const patientPhone = apt.patients?.phone || '0901234567';

            return (
              <View key={apt.id} style={styles.appointmentCard}>
                {/* Header ca khám */}
                <View style={styles.cardHeader}>
                  <View style={styles.timeTag}>
                    <Ionicons name="time" size={13} color="#0F766E" />
                    <Text style={styles.timeTagText}>
                      {new Date(apt.scheduled_at).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <AppointmentStatusBadge status={apt.status} />
                </View>

                {/* Patient Info */}
                <View style={styles.patientRow}>
                  <View style={styles.avatarBox}>
                    <Ionicons name="person" size={20} color="#0D9488" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{patientName}</Text>
                    <View style={styles.phoneRow}>
                      <Ionicons name="call-outline" size={13} color="#0284C7" />
                      <Text style={styles.phoneText}>{patientPhone}</Text>
                      <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() => Linking.openURL(`tel:${patientPhone}`)}
                      >
                        <Ionicons name="call" size={11} color="#FFFFFF" />
                        <Text style={styles.callBtnText}>Gọi ngay</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Địa chỉ khám tại nhà */}
                {apt.visit_address && (
                  <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={16} color="#EF4444" />
                    <Text style={styles.addressText} numberOfLines={2}>
                      Địa chỉ: <Text style={{ color: '#0F172A' }}>{apt.visit_address}</Text>
                    </Text>
                  </View>
                )}

                {/* Triệu chứng tự khai */}
                {apt.note && (
                  <View style={styles.symptomBox}>
                    <Text style={styles.symptomTitle}>Triệu chứng bệnh nhân tự khai:</Text>
                    <Text style={styles.symptomText}>{apt.note}</Text>
                  </View>
                )}

                {/* Doctor Actions */}
                <View style={styles.actionsRow}>
                  {/* Nút 1: Xem EMR */}
                  <TouchableOpacity
                    style={styles.emrBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/patient-emr-history',
                        params: {
                          patientId: apt.patients?.id || apt.patient_id || '',
                          appointmentId: apt.id,
                          patientName: encodeURIComponent(patientName),
                          address: encodeURIComponent(apt.visit_address || ''),
                        },
                      })
                    }
                  >
                    <MaterialCommunityIcons name="file-document-outline" size={15} color="#0284C7" />
                    <Text style={styles.emrBtnText}>Tra cứu EMR</Text>
                  </TouchableOpacity>

                  {/* Nút 2: Workflow theo trạng thái */}
                  {apt.status === 'confirmed' && (
                    <TouchableOpacity
                      style={styles.startTripBtn}
                      disabled={isProcessing}
                      onPress={() =>
                        handleUpdateStatus(apt.id, 'in_progress', 'Đang di chuyển đến khám')
                      }
                    >
                      <Ionicons name="navigate" size={15} color="#FFFFFF" />
                      <Text style={styles.startTripBtnText}>Bắt đầu di chuyển</Text>
                    </TouchableOpacity>
                  )}

                  {apt.status === 'in_progress' && (
                    <TouchableOpacity
                      style={styles.examineBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/doctor-examination',
                          params: {
                            appointmentId: apt.id,
                            patientId: apt.patients?.id || apt.patient_id || '',
                            patientName: encodeURIComponent(patientName),
                            address: encodeURIComponent(apt.visit_address || ''),
                          },
                        })
                      }
                    >
                      <Ionicons name="medical" size={15} color="#FFFFFF" />
                      <Text style={styles.examineBtnText}>Khám & Kê đơn EMR</Text>
                    </TouchableOpacity>
                  )}

                  {apt.status === 'completed' && (
                    <TouchableOpacity
                      style={styles.viewResultBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/appointment-detail',
                          params: { id: apt.id },
                        })
                      }
                    >
                      <Ionicons name="document-text" size={15} color="#FFFFFF" />
                      <Text style={styles.viewResultBtnText}>Xem bệnh án</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#15803D',
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  doctorGreeting: {
    fontSize: 13,
    color: '#64748B',
  },
  doctorNameTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  doctorSpecialty: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0D9488',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  heroCard: {
    backgroundColor: '#0F766E',
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#0F766E',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroDateText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 17,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  kpiCardActive: {
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  kpiIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpiNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
    textAlign: 'center',
  },
  kpiNote: {
    fontSize: 9,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },
  quickToolsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickToolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  quickToolBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  reloadBtn: {
    padding: 6,
  },
  centerLoading: {
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
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
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  timeTagText: {
    fontSize: 12,
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
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientName: {
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
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginLeft: 6,
  },
  callBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  addressText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  symptomBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  symptomTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  symptomText: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  emrBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 4,
  },
  emrBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  startTripBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 4,
  },
  startTripBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  examineBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 4,
  },
  examineBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  viewResultBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 4,
  },
  viewResultBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
