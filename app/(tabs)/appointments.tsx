import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
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
  users_appointments_assigned_staff_idTousers?: {
    full_name: string;
    phone: string;
  };
  examinations?: any[];
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [token]);

  const fetchAppointments = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.get('/appointments');
      const items = res.data?.data?.items || res.data?.data || [];
      setAppointments(items);
    } catch {
      // Mock data hiển thị khi chưa có kết nối server
      setAppointments([
        {
          id: 'apt-001',
          type: 'first_visit',
          status: 'confirmed',
          scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          visit_address: 'Tòa nhà A, 144 Xuân Thủy, Cầu Giấy, Hà Nội',
          note: 'Sốt nhẹ, đau mỏi cơ thể 2 ngày nay',
          users_appointments_assigned_staff_idTousers: {
            full_name: 'BS. Nguyễn Văn A',
            phone: '0902345678',
          },
        },
        {
          id: 'apt-002',
          type: 'first_visit',
          status: 'completed',
          scheduled_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          visit_address: '123 Đường Giải Phóng, Hai Bà Trưng, Hà Nội',
          note: 'Đau rát họng, ho khan về đêm',
          users_appointments_assigned_staff_idTousers: {
            full_name: 'BS. Nguyễn Văn A',
            phone: '0902345678',
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

  const filteredAppointments = appointments.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

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
      {/* Thanh lọc trạng thái */}
      <View style={styles.filterBar}>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'pending', label: 'Chờ duyệt' },
          { key: 'confirmed', label: 'Đã xác nhận' },
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
          <Text style={styles.loadingText}>Đang tải lịch hẹn...</Text>
        </View>
      ) : filteredAppointments.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="calendar-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Chưa có lịch hẹn nào</Text>
          <Text style={styles.emptySub}>
            Bạn có thể đặt lịch khám tại nhà qua Body Map hoặc bấm nút bên dưới.
          </Text>
          <TouchableOpacity
            style={styles.bookNowBtn}
            onPress={() => router.push('/book-appointment')}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.bookNowText}>Đặt lịch khám mới</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredAppointments}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{getTypeName(item.type)}</Text>
                </View>
                <AppointmentStatusBadge status={item.status} />
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color="#0284C7" />
                <Text style={styles.infoText}>
                  Thời gian: <Text style={styles.bold}>{formatDate(item.scheduled_at)}</Text>
                </Text>
              </View>

              {item.visit_address && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color="#64748B" />
                  <Text style={styles.infoText} numberOfLines={2}>
                    Địa chỉ: {item.visit_address}
                  </Text>
                </View>
              )}

              {item.users_appointments_assigned_staff_idTousers && (
                <View style={styles.doctorBox}>
                  <Ionicons name="medkit-outline" size={16} color="#0D9488" />
                  <Text style={styles.doctorText}>
                    Bác sĩ: {item.users_appointments_assigned_staff_idTousers.full_name} (
                    {item.users_appointments_assigned_staff_idTousers.phone})
                  </Text>
                </View>
              )}

              {item.note && (
                <Text style={styles.noteText} numberOfLines={2}>
                  * Ghi chú: {item.note}
                </Text>
              )}

              {/* Nút xem chi tiết bệnh án EMR nếu đã khám xong */}
              {item.status === 'completed' && (
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
          )}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/book-appointment')}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    paddingHorizontal: 14,
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
  doctorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
  },
  doctorText: {
    fontSize: 12,
    color: '#0D9488',
    fontWeight: '600',
  },
  noteText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
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
