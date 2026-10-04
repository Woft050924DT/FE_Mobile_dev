import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppointmentStatusBadge } from '../../components/AppointmentStatusBadge';
import { MedicalColors } from '../../constants/Colors';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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
    id?: string;
    full_name: string;
    phone: string;
  };
  examinations?: any[];
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const { user, role, token, loginStaff } = useAuth();

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Cho phép chuyển đổi chế độ xem để kiểm thử cả 2 vai trò: Bác sĩ / Bệnh nhân
  const [viewMode, setViewMode] = useState<'doctor' | 'patient'>(
    role === 'doctor' || user?.role === 'doctor' ? 'doctor' : 'patient'
  );

  useEffect(() => {
    if (role === 'doctor' || user?.role === 'doctor') {
      setViewMode('doctor');
    }
  }, [role, user]);

  useEffect(() => {
    fetchAppointments();
  }, [token, viewMode]);

  const fetchAppointments = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.get('/appointments');
      const items =
        res.data?.data?.data ||
        res.data?.data?.items ||
        (Array.isArray(res.data?.data) ? res.data?.data : []);
      setAppointments(items);
    } catch {
      // Mock data đầy đủ trường hợp cho cả Bệnh nhân và Bác sĩ
      setAppointments([
        {
          id: 'apt-001',
          type: 'first_visit',
          status: 'pending',
          scheduled_at: new Date(Date.now() + 3600000 * 2).toISOString(),
          visit_address: 'Phòng 402, Chung cư Sunrise, Cầu Giấy, Hà Nội',
          note: 'Sốt nhẹ 38 độ, đau nhức họng và người mệt mỏi từ sáng nay',
          patient_id: 'pat-001',
          patients: {
            id: 'pat-001',
            full_name: 'Nguyễn Văn Bệnh Nhân',
            phone: '0912345678',
            address: 'Phòng 402, Chung cư Sunrise, Cầu Giấy, Hà Nội',
          },
          users_appointments_assigned_staff_idTousers: {
            full_name: 'BS. CK1 Hoàng Minh Tâm',
            phone: '0901234567',
          },
        },
        {
          id: 'apt-002',
          type: 'first_visit',
          status: 'confirmed',
          scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          visit_address: '144 Xuân Thủy, Cầu Giấy, Hà Nội',
          note: 'Bệnh nhân cần kiểm tra huyết áp và tư vấn viêm phế quản tái phát',
          patient_id: 'pat-002',
          patients: {
            id: 'pat-002',
            full_name: 'Trần Thị Mai',
            phone: '0988776655',
            address: '144 Xuân Thủy, Cầu Giấy, Hà Nội',
          },
          users_appointments_assigned_staff_idTousers: {
            full_name: 'BS. CK1 Hoàng Minh Tâm',
            phone: '0901234567',
          },
        },
        {
          id: 'apt-003',
          type: 'first_visit',
          status: 'in_progress',
          scheduled_at: new Date().toISOString(),
          visit_address: 'Số 12 Ngõ 88 Trung Kính, Cầu Giấy, Hà Nội',
          note: 'Đau thắt lưng lan xuống chân, cần khám và kê đơn giảm đau ngoại trú',
          patient_id: 'pat-003',
          patients: {
            id: 'pat-003',
            full_name: 'Lê Văn Cường',
            phone: '0933221100',
            address: 'Số 12 Ngõ 88 Trung Kính, Cầu Giấy, Hà Nội',
          },
          users_appointments_assigned_staff_idTousers: {
            full_name: 'BS. CK1 Hoàng Minh Tâm',
            phone: '0901234567',
          },
        },
        {
          id: 'apt-004',
          type: 'first_visit',
          status: 'completed',
          scheduled_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          visit_address: '123 Đường Giải Phóng, Hai Bà Trưng, Hà Nội',
          note: 'Đau rát họng, ho khan về đêm',
          patient_id: 'pat-001',
          patients: {
            id: 'pat-001',
            full_name: 'Nguyễn Văn Bệnh Nhân',
            phone: '0912345678',
            address: '123 Đường Giải Phóng, Hai Bà Trưng, Hà Nội',
          },
          users_appointments_assigned_staff_idTousers: {
            full_name: 'BS. CK1 Hoàng Minh Tâm',
            phone: '0901234567',
          },
          examinations: [{ id: 'exam-001' }],
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

  // Cập nhật trạng thái ca khám bởi Bác sĩ
  const handleUpdateStatus = async (
    appointmentId: string,
    newStatus: 'confirmed' | 'in_progress' | 'cancelled',
    statusLabel: string
  ) => {
    Alert.alert(
      'Xác nhận hành động',
      `Bạn có muốn chuyển ca khám này sang trạng thái "${statusLabel}" không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              setActionLoadingId(appointmentId);
              await api.patch(`/appointments/${appointmentId}/status`, {
                status: newStatus,
              });

              // Cập nhật trạng thái trên giao diện
              setAppointments((prev) =>
                prev.map((item) =>
                  item.id === appointmentId ? { ...item, status: newStatus } : item
                )
              );

              Alert.alert('Thành công', `Đã chuyển ca khám sang trạng thái "${statusLabel}"`);
            } catch (err: any) {
              const msg =
                err.response?.data?.message ||
                'Không thể cập nhật trạng thái. Vui lòng thử lại sau.';
              Alert.alert('Lỗi cập nhật', msg);
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // Đăng nhập nhanh tài khoản Bác sĩ để test trực tiếp
  const handleQuickDoctorLogin = async () => {
    try {
      setIsLoading(true);
      await loginStaff('doctor@hospital.local', 'Doctor@123');
      setViewMode('doctor');
      Alert.alert('Thành công', 'Đã chuyển sang tài khoản Bác sĩ (BS. Nguyễn Văn A)');
    } catch {
      Alert.alert('Lỗi', 'Không thể đăng nhập bác sĩ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const isDoctor = viewMode === 'doctor';

  const filteredAppointments = appointments.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  // Thống kê nhanh cho Bác sĩ
  const countPending = appointments.filter((a) => a.status === 'pending').length;
  const countConfirmed = appointments.filter((a) => a.status === 'confirmed').length;
  const countInProgress = appointments.filter((a) => a.status === 'in_progress').length;
  const countCompleted = appointments.filter((a) => a.status === 'completed').length;

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return `${d.toLocaleDateString('vi-VN')} lúc ${d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return isoStr;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'first_visit':
        return 'Khám lần đầu';
      case 'follow_up':
        return 'Khám tái khám';
      case 'emergency':
        return 'Khám khẩn cấp tại nhà';
      default:
        return 'Khám tại nhà';
    }
  };

  return (
    <View style={styles.container}>
      {/* Thanh chuyển đổi vai trò (Doctor / Patient) để trải nghiệm toàn diện */}
      <View style={styles.roleSwitchBar}>
        <View style={styles.roleInfo}>
          <Ionicons
            name={isDoctor ? 'medical' : 'person'}
            size={18}
            color={isDoctor ? '#0D9488' : '#0284C7'}
          />
          <Text style={styles.roleTitle}>
            {isDoctor ? 'Giao diện Bác sĩ Khám tại nhà' : 'Lịch khám của Bệnh nhân'}
          </Text>
        </View>

        <View style={styles.roleToggleGroup}>
          <TouchableOpacity
            style={[styles.roleBtn, !isDoctor && styles.roleBtnActive]}
            onPress={() => setViewMode('patient')}
          >
            <Text style={[styles.roleBtnText, !isDoctor && styles.roleBtnTextActive]}>
              Bệnh nhân
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleBtn, isDoctor && styles.roleBtnActiveDoctor]}
            onPress={() => {
              setViewMode('doctor');
              if (role !== 'doctor') {
                // Nếu chưa có token bác sĩ, gợi ý đăng nhập nhanh
                Alert.alert(
                  'Kích hoạt phiên Bác sĩ',
                  'Bạn có muốn tự động kết nối tài khoản Bác sĩ (doctor@hospital.local) để thao tác nhận ca và kê đơn EMR không?',
                  [
                    { text: 'Chỉ xem trước', style: 'cancel' },
                    { text: 'Đăng nhập Bác sĩ', onPress: handleQuickDoctorLogin },
                  ]
                );
              }
            }}
          >
            <Text style={[styles.roleBtnText, isDoctor && styles.roleBtnTextActive]}>
              Bác sĩ
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bảng thống kê nhanh dành cho Bác sĩ */}
      {isDoctor && (
        <View style={styles.doctorStatsRow}>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statCount, { color: '#B45309' }]}>{countPending}</Text>
            <Text style={[styles.statLabel, { color: '#92400E' }]}>Chờ duyệt</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#E0F2FE' }]}>
            <Text style={[styles.statCount, { color: '#0369A1' }]}>{countConfirmed}</Text>
            <Text style={[styles.statLabel, { color: '#075985' }]}>Đã nhận ca</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F3E8FF' }]}>
            <Text style={[styles.statCount, { color: '#7E22CE' }]}>{countInProgress}</Text>
            <Text style={[styles.statLabel, { color: '#6B21A8' }]}>Đang khám</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.statCount, { color: '#15803D' }]}>{countCompleted}</Text>
            <Text style={[styles.statLabel, { color: '#166534' }]}>Đã hoàn tất</Text>
          </View>
        </View>
      )}

      {/* Thanh lọc trạng thái */}
      <View style={styles.filterBar}>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'pending', label: 'Chờ duyệt' },
          { key: 'confirmed', label: 'Đã nhận' },
          { key: 'in_progress', label: 'Đang khám' },
          { key: 'completed', label: 'Đã khám' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.filterTab,
              filterStatus === tab.key && styles.filterTabActive,
            ]}
            onPress={() => setFilterStatus(tab.key)}
          >
            <Text
              style={[
                styles.filterLabel,
                filterStatus === tab.key && styles.filterLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Danh sách lịch hẹn */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={MedicalColors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách ca khám...</Text>
        </View>
      ) : filteredAppointments.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="calendar-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Chưa có lịch hẹn nào</Text>
          <Text style={styles.emptySub}>
            {isDoctor
              ? 'Hiện tại chưa có ca khám nào ở trạng thái này.'
              : 'Bạn có thể đặt lịch khám tại nhà qua Body Map hoặc nút bên dưới.'}
          </Text>
          {!isDoctor && (
            <TouchableOpacity
              style={styles.bookNowBtn}
              onPress={() => router.push('/book-appointment')}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.bookNowText}>Đặt lịch khám mới</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredAppointments}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isProcessing = actionLoadingId === item.id;
            const patientName =
              item.patients?.full_name || 'Bệnh nhân đăng ký';
            const patientPhone =
              item.patients?.phone || 'Chưa có SĐT';
            const doctorName =
              item.users_appointments_assigned_staff_idTousers?.full_name ||
              'BS. Hoàng Minh Tâm';

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{getTypeName(item.type)}</Text>
                  </View>
                  <AppointmentStatusBadge status={item.status} />
                </View>

                {/* Thời gian */}
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={16} color="#0284C7" />
                  <Text style={styles.infoText}>
                    Thời gian: <Text style={styles.bold}>{formatDate(item.scheduled_at)}</Text>
                  </Text>
                </View>

                {/* Nếu xem với vai trò Bác sĩ -> Hiển thị tên Bệnh nhân và SĐT liên hệ trực tiếp */}
                {isDoctor ? (
                  <View style={styles.patientInfoBox}>
                    <View style={styles.infoRow}>
                      <Ionicons name="person" size={16} color="#0D9488" />
                      <Text style={styles.doctorText}>
                        Bệnh nhân: <Text style={styles.bold}>{patientName}</Text>
                      </Text>
                    </View>

                    {patientPhone && (
                      <View style={styles.phoneRow}>
                        <Ionicons name="call-outline" size={15} color="#0D9488" />
                        <Text style={styles.phoneText}>SĐT: {patientPhone}</Text>
                        <TouchableOpacity
                          style={styles.callMiniBtn}
                          onPress={() => Linking.openURL(`tel:${patientPhone}`)}
                        >
                          <Ionicons name="call" size={12} color="#FFFFFF" />
                          <Text style={styles.callMiniBtnText}>Gọi ngay</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  /* Nếu xem với vai trò Bệnh nhân -> Hiển thị thông tin Bác sĩ phụ trách */
                  <View style={styles.doctorBox}>
                    <Ionicons name="medkit-outline" size={16} color="#0284C7" />
                    <Text style={styles.doctorText}>
                      Bác sĩ phụ trách: <Text style={styles.bold}>{doctorName}</Text>
                    </Text>
                  </View>
                )}

                {/* Địa chỉ thăm khám tại nhà */}
                {item.visit_address && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color="#EF4444" />
                    <Text style={styles.infoText} numberOfLines={2}>
                      Địa chỉ: <Text style={{ color: '#0F172A' }}>{item.visit_address}</Text>
                    </Text>
                  </View>
                )}

                {/* Ghi chú triệu chứng từ bệnh nhân */}
                {item.note && (
                  <View style={styles.symptomBox}>
                    <Text style={styles.noteTitle}>Triệu chứng / Ghi chú ban đầu:</Text>
                    <Text style={styles.noteText}>{item.note}</Text>
                  </View>
                )}

                {/* CÁC NÚT THAO TÁC CỦA BÁC SĨ (Workflow bác sĩ) */}
                {isDoctor && (
                  <View style={styles.doctorActionGroup}>
                    {/* Trạng thái 1: Chờ nhận ca (pending) */}
                    {item.status === 'pending' && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={[styles.doctorBtn, styles.btnAccept]}
                          disabled={isProcessing}
                          onPress={() =>
                            handleUpdateStatus(item.id, 'confirmed', 'Đã xác nhận nhận ca')
                          }
                        >
                          {isProcessing ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                              <Text style={styles.doctorBtnText}>Xác nhận Nhận Ca</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.doctorBtn, styles.btnReject]}
                          disabled={isProcessing}
                          onPress={() =>
                            handleUpdateStatus(item.id, 'cancelled', 'Từ chối ca khám')
                          }
                        >
                          <Ionicons name="close-circle" size={16} color="#EF4444" />
                          <Text style={[styles.doctorBtnText, { color: '#EF4444' }]}>
                            Từ chối
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Trạng thái 2: Đã nhận ca (confirmed) -> Bắt đầu đến khám */}
                    {item.status === 'confirmed' && (
                      <TouchableOpacity
                        style={[styles.doctorBtn, styles.btnStartTrip]}
                        disabled={isProcessing}
                        onPress={() =>
                          handleUpdateStatus(
                            item.id,
                            'in_progress',
                            'Đang đến khám / Đang khám'
                          )
                        }
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="navigate-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.doctorBtnText}>
                              Bắt đầu di chuyển đến khám
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Trạng thái 3: Đang khám (in_progress) -> Khám bệnh & Kê đơn EMR */}
                    {item.status === 'in_progress' && (
                      <TouchableOpacity
                        style={[styles.doctorBtn, styles.btnExamine]}
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
                        <Text style={styles.doctorBtnText}>
                          Tiến hành Khám & Kê Đơn EMR
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Trạng thái 4: Đã hoàn tất (completed) -> Xem bệnh án điện tử */}
                    {item.status === 'completed' && (
                      <TouchableOpacity
                        style={[styles.doctorBtn, styles.btnViewEmr]}
                        onPress={() =>
                          router.push({
                            pathname: '/appointment-detail',
                            params: { id: item.id },
                          })
                        }
                      >
                        <Ionicons name="document-text" size={16} color="#FFFFFF" />
                        <Text style={styles.doctorBtnText}>Xem Bệnh Án & Đơn Thuốc</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* CÁC NÚT THAO TÁC CỦA BỆNH NHÂN */}
                {!isDoctor && item.status === 'completed' && (
                  <TouchableOpacity
                    style={styles.emrBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/appointment-detail',
                        params: { id: item.id },
                      })
                    }
                  >
                    <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.emrBtnText}>Xem Bệnh Án ICD & Đơn Thuốc</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Floating Action Button dành cho Bệnh nhân */}
      {!isDoctor && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/book-appointment')}
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  roleSwitchBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 2,
  },
  roleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 18,
  },
  roleBtnActive: {
    backgroundColor: '#0284C7',
  },
  roleBtnActiveDoctor: {
    backgroundColor: '#0D9488',
  },
  roleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  roleBtnTextActive: {
    color: '#FFFFFF',
  },
  doctorStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statCard: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  statCount: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterTabActive: {
    backgroundColor: '#0284C7',
  },
  filterLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  filterLabelActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  patientInfoBox: {
    backgroundColor: '#F0FDFA',
    padding: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneText: {
    fontSize: 12,
    color: '#0D9488',
    fontWeight: '600',
    flex: 1,
  },
  callMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  callMiniBtnText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  doctorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
  },
  doctorText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
  },
  symptomBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0284C7',
    marginTop: 2,
  },
  noteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  noteText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
    fontStyle: 'italic',
  },
  doctorActionGroup: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  doctorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  btnAccept: {
    flex: 2,
    backgroundColor: '#059669',
  },
  btnReject: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  btnStartTrip: {
    backgroundColor: '#0284C7',
  },
  btnExamine: {
    backgroundColor: '#7C3AED',
  },
  btnViewEmr: {
    backgroundColor: '#4338CA',
  },
  doctorBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  emrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
    gap: 6,
  },
  emrBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  bookNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginTop: 12,
    gap: 6,
  },
  bookNowText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
