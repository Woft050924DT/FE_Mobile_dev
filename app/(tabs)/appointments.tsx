import React, { useCallback, useState, useEffect } from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppointmentStatusBadge } from '../../components/AppointmentStatusBadge';
import { MedicalColors } from '../../constants/Colors';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  canRequestAppointmentChange,
  getAppointmentStartBlockMessage,
} from '../../utils/appointment-timing';
import { sortAppointmentsByStatusAndDate } from '../../utils/appointment-order';

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

type PatientChoice = 'reschedule' | 'change_doctor';

interface PatientChoiceRequest {
  id: string;
  action?: 'reschedule' | 'cancel';
  reason?: string;
  status?: string;
  appointment?: AppointmentItem;
  appointments?: AppointmentItem;
  appointments_appointment_idToappointments?: AppointmentItem;
  appointments_change_requests_appointment_idToappointments?: AppointmentItem;
  patientChoice?: PatientChoice;
  patient_choice?: PatientChoice;
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const { user, token, isDoctor, isCskh } = useAuth();
  const isPatientUser = user?.role === 'patient';

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [requestAppointment, setRequestAppointment] = useState<AppointmentItem | null>(null);
  const [requestType, setRequestType] = useState<'reschedule' | 'cancel'>('reschedule');
  const [requestReason, setRequestReason] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [requestedTime, setRequestedTime] = useState('');
  const [patientChoiceRequests, setPatientChoiceRequests] = useState<PatientChoiceRequest[]>([]);
  const [patientChoiceRequest, setPatientChoiceRequest] = useState<PatientChoiceRequest | null>(null);
  const [patientChoice, setPatientChoice] = useState<PatientChoice>('reschedule');
  const [patientChoiceDate, setPatientChoiceDate] = useState('');
  const [patientChoiceTime, setPatientChoiceTime] = useState('');
  const [isLoadingPatientChoice, setIsLoadingPatientChoice] = useState(false);
  const [submittedDoctorChangeIds, setSubmittedDoctorChangeIds] = useState<string[]>([]);

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
      setAppointments(Array.isArray(items) ? items : []);
    } catch {
      setAppointments([]);
      Alert.alert('Không tải được lịch hẹn', 'Vui lòng kiểm tra kết nối và thử tải lại.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
    if (isPatientUser) fetchPatientChoiceRequests();
  };

  const fetchPatientChoiceRequests = useCallback(async (silent = false) => {
    try {
      const res = await api.get('/appointments/change-requests', {
        params: { status: 'awaiting_patient', page: 1, limit: 10 },
      });
      const payload = res.data?.data ?? res.data;
      const candidates = [
        payload,
        payload?.items,
        payload?.requests,
        payload?.data,
        payload?.data?.items,
        payload?.data?.requests,
      ];
      const items = candidates.find(Array.isArray);
      if (!items) {
        throw new Error('API trả về danh sách lựa chọn lịch hẹn không đúng định dạng.');
      }
      setPatientChoiceRequests(items);
    } catch (err: any) {
      setPatientChoiceRequests([]);
      if (!silent) {
        Alert.alert(
          'Không tải được yêu cầu cần lựa chọn',
          err.response?.data?.message || err.message || 'Vui lòng thử tải lại.'
        );
      }
    }
  }, []);

  useEffect(() => {
    if (!token || !isPatientUser) return;
    void fetchPatientChoiceRequests();
    const refreshInterval = setInterval(() => fetchPatientChoiceRequests(true), 15000);
    return () => clearInterval(refreshInterval);
  }, [token, isPatientUser, fetchPatientChoiceRequests]);

  useEffect(() => {
    fetchAppointments();
  }, [token]);

  const openChangeRequest = (appointment: AppointmentItem, type: 'reschedule' | 'cancel') => {
    setRequestAppointment(appointment);
    setRequestType(type);
    setRequestReason('');
    setRequestedDate('');
    setRequestedTime('');
  };

  const closeChangeRequest = () => {
    setRequestAppointment(null);
    setRequestReason('');
    setRequestedDate('');
    setRequestedTime('');
  };

  const submitChangeRequest = async () => {
    if (!requestAppointment || !requestReason.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập lý do yêu cầu.');
      return;
    }

    let requestedScheduledAt: string | undefined;
    if (requestType === 'reschedule') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || !/^\d{2}:\d{2}$/.test(requestedTime)) {
        Alert.alert('Thời gian chưa hợp lệ', 'Nhập ngày theo dạng YYYY-MM-DD và giờ theo dạng HH:mm.');
        return;
      }

      const [year, month, day] = requestedDate.split('-').map(Number);
      const [hour, minute] = requestedTime.split(':').map(Number);
      const proposedDate = new Date(year, month - 1, day, hour, minute);
      const matchesInput =
        proposedDate.getFullYear() === year &&
        proposedDate.getMonth() === month - 1 &&
        proposedDate.getDate() === day &&
        proposedDate.getHours() === hour &&
        proposedDate.getMinutes() === minute;
      if (
        !matchesInput ||
        hour > 23 ||
        minute > 59 ||
        Number.isNaN(proposedDate.getTime()) ||
        proposedDate <= new Date()
      ) {
        Alert.alert('Thời gian chưa hợp lệ', 'Vui lòng chọn thời gian mới trong tương lai.');
        return;
      }
      requestedScheduledAt = proposedDate.toISOString();
    }

    try {
      setActionLoadingId(requestAppointment.id);
      if (isDoctor) {
        await api.post(`/appointments/${requestAppointment.id}/doctor-change-request`, {
          action: requestType,
          reason: requestReason.trim(),
        });
        setSubmittedDoctorChangeIds((ids) =>
          ids.includes(requestAppointment.id) ? ids : [...ids, requestAppointment.id]
        );
      } else {
        await api.post(`/appointments/${requestAppointment.id}/change-request`, {
          action: requestType,
          reason: requestReason.trim(),
          ...(requestedScheduledAt ? { requestedScheduledAt } : {}),
        });
      }
      closeChangeRequest();
      Alert.alert(
        isDoctor ? 'Đã gửi yêu cầu cho CSKH' : 'Đã gửi yêu cầu đến CSKH',
        isDoctor
          ? 'CSKH sẽ thông báo để bệnh nhân chọn phương án. Lịch hiện tại chưa thay đổi.'
          : requestType === 'reschedule'
            ? 'CSKH sẽ liên hệ bạn để xác nhận lịch mới. Lịch hẹn hiện tại vẫn giữ nguyên cho đến khi được xử lý.'
            : 'CSKH sẽ tiếp nhận và xác nhận yêu cầu hủy. Lịch hẹn hiện tại vẫn giữ nguyên cho đến khi được xử lý.'
      );
    } catch (err: any) {
      Alert.alert(
        'Không gửi được yêu cầu',
        err.response?.data?.message || 'Vui lòng thử lại sau.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const openPatientChoice = (request: PatientChoiceRequest) => {
    setPatientChoiceRequest(request);
    setPatientChoice('reschedule');
    setPatientChoiceDate('');
    setPatientChoiceTime('');
  };

  const submitPatientChoice = async () => {
    if (!patientChoiceRequest) return;
    let requestedScheduledAt: string | undefined;
    if (patientChoice === 'reschedule') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(patientChoiceDate) ||
          !/^\d{2}:\d{2}$/.test(patientChoiceTime)) {
        Alert.alert('Thời gian chưa hợp lệ', 'Nhập ngày theo YYYY-MM-DD và giờ theo HH:mm.');
        return;
      }
      const [year, month, day] = patientChoiceDate.split('-').map(Number);
      const [hour, minute] = patientChoiceTime.split(':').map(Number);
      const selectedDate = new Date(year, month - 1, day, hour, minute);
      const validDate =
        selectedDate.getFullYear() === year &&
        selectedDate.getMonth() === month - 1 &&
        selectedDate.getDate() === day &&
        selectedDate.getHours() === hour &&
        selectedDate.getMinutes() === minute;
      if (
        !validDate ||
        selectedDate <= new Date() ||
        hour < 7 ||
        hour > 20 ||
        minute % 30 !== 0 ||
        (hour === 20 && minute > 30)
      ) {
        Alert.alert(
          'Thời gian chưa hợp lệ',
          'Chọn giờ tương lai trong khung 07:00–20:30, cách nhau 30 phút.'
        );
        return;
      }
      requestedScheduledAt = selectedDate.toISOString();
    }

    try {
      setIsLoadingPatientChoice(true);
      await api.patch(
        `/appointments/change-requests/${patientChoiceRequest.id}/patient-choice`,
        {
          choice: patientChoice,
          ...(requestedScheduledAt ? { requestedScheduledAt } : {}),
        }
      );
      setPatientChoiceRequest(null);
      setPatientChoiceRequests((requests) =>
        requests.filter((request) => request.id !== patientChoiceRequest.id)
      );
      Alert.alert(
        'Đã gửi lựa chọn',
        'CSKH sẽ xem xét phương án và xác nhận lịch với bạn.'
      );
      await fetchAppointments();
    } catch (err: any) {
      Alert.alert(
        'Không gửi được lựa chọn',
        err.response?.data?.message || 'Vui lòng thử lại.'
      );
    } finally {
      setIsLoadingPatientChoice(false);
    }
  };

  const getPatientChoiceAppointment = (request: PatientChoiceRequest) =>
    request.appointment ||
    request.appointments ||
    request.appointments_appointment_idToappointments ||
    request.appointments_change_requests_appointment_idToappointments;


  // Cập nhật trạng thái ca khám bởi Bác sĩ
  const handleUpdateStatus = async (
    appointmentId: string,
    newStatus: 'confirmed' | 'in_progress',
    statusLabel: string,
    scheduledAt?: string
  ) => {
    if (newStatus === 'in_progress') {
      const blockMessage = getAppointmentStartBlockMessage(scheduledAt);
      if (blockMessage) {
        Alert.alert('Chưa thể bắt đầu khám', blockMessage);
        return;
      }
    }

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

  const filteredAppointments = sortAppointmentsByStatusAndDate(appointments.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  }));

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
      {/* Thanh tiêu đề vai trò tự động theo tài khoản đang đăng nhập */}
      {isDoctor ? (
        <View style={styles.roleBannerDoctor}>
          <View style={styles.roleInfo}>
            <View style={styles.iconCircleDoctor}>
              <Ionicons name="medical" size={18} color="#0D9488" />
            </View>
            <View>
              <Text style={styles.roleTitleDoctor}>Lịch Khám Của Bác Sĩ Tại Nhà</Text>
              <Text style={styles.roleSubTitle}>
                {user?.fullName ? `BS. ${user.fullName}` : 'Bác sĩ chuyên khoa'} • {appointments.length} ca khám
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={fetchAppointments}
            disabled={isLoading}
          >
            <Ionicons name="refresh" size={18} color="#0D9488" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.roleBannerPatient}>
          <View style={styles.roleInfo}>
            <View style={styles.iconCirclePatient}>
              <Ionicons name="calendar" size={18} color="#0284C7" />
            </View>
            <View>
              <Text style={styles.roleTitlePatient}>Lịch Khám Tại Nhà Của Bạn</Text>
              <Text style={styles.roleSubTitle}>
                Đặt lịch, gửi yêu cầu đổi hoặc hủy, và theo dõi lịch khám
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={fetchAppointments}
            disabled={isLoading}
          >
            <Ionicons name="refresh" size={18} color="#0284C7" />
          </TouchableOpacity>
        </View>
      )}

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
          { key: 'cancelled', label: 'Đã hủy' },
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
      ) : filteredAppointments.length === 0 &&
        (!isPatientUser || patientChoiceRequests.length === 0) ? (
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
          ListHeaderComponent={
            isPatientUser && patientChoiceRequests.length > 0 ? (
              <View style={styles.patientChoiceSection}>
                <Text style={styles.patientChoiceSectionTitle}>
                  Yêu cầu từ bác sĩ cần bạn chọn phương án
                </Text>
                {patientChoiceRequests.map((request) => {
                  const appointment = getPatientChoiceAppointment(request);
                  return (
                    <View key={request.id} style={styles.patientChoiceCard}>
                      <Text style={styles.patientChoiceHeading}>
                        {request.action === 'cancel'
                          ? 'Bác sĩ đề nghị hủy lịch'
                          : 'Bác sĩ đề nghị thay đổi lịch'}
                      </Text>
                      {appointment?.scheduled_at ? (
                        <Text style={styles.patientChoiceDetail}>
                          Lịch hiện tại: {formatDate(appointment.scheduled_at)}
                        </Text>
                      ) : null}
                      {request.reason ? (
                        <Text style={styles.patientChoiceDetail}>Lý do: {request.reason}</Text>
                      ) : null}
                      <TouchableOpacity
                        style={styles.patientChoiceButton}
                        onPress={() => openPatientChoice(request)}
                      >
                        <Text style={styles.patientChoiceButtonText}>Chọn phương án xử lý</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const isProcessing = actionLoadingId === item.id;
            const canRequestDoctorChange = canRequestAppointmentChange(
              item.status,
              item.scheduled_at
            );
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
                            'Đang đến khám / Đang khám',
                            item.scheduled_at
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

                {isDoctor &&
                  (item.status === 'pending' || item.status === 'confirmed') &&
                  (submittedDoctorChangeIds.includes(item.id) ? (
                    <Text style={styles.patientChoiceDetail}>
                      Đã gửi yêu cầu; chờ CSKH thông báo bệnh nhân lựa chọn.
                    </Text>
                  ) : (
                  <>
                  <View style={styles.patientRequestGroup}>
                    <TouchableOpacity
                      style={[
                        styles.patientRequestBtn,
                        styles.rescheduleBtn,
                        (!canRequestDoctorChange || isProcessing) && styles.requestButtonDisabled,
                      ]}
                      disabled={!canRequestDoctorChange || isProcessing}
                      onPress={() => openChangeRequest(item, 'reschedule')}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={canRequestDoctorChange ? '#0369A1' : '#94A3B8'}
                      />
                      <Text
                        style={[
                          styles.rescheduleBtnText,
                          !canRequestDoctorChange && styles.requestButtonTextDisabled,
                        ]}
                      >
                        Yêu cầu đổi giờ
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.patientRequestBtn,
                        styles.cancelRequestBtn,
                        (!canRequestDoctorChange || isProcessing) && styles.requestButtonDisabled,
                      ]}
                      disabled={!canRequestDoctorChange || isProcessing}
                      onPress={() => openChangeRequest(item, 'cancel')}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={16}
                        color={canRequestDoctorChange ? '#B91C1C' : '#94A3B8'}
                      />
                      <Text
                        style={[
                          styles.cancelRequestBtnText,
                          !canRequestDoctorChange && styles.requestButtonTextDisabled,
                        ]}
                      >
                        Yêu cầu hủy
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {!canRequestDoctorChange && (
                    <Text style={styles.requestUnavailableText}>
                      Chỉ gửi yêu cầu khi lịch chưa bắt đầu và còn trước giờ hẹn.
                    </Text>
                  )}
                  </>
                  ))}

                {isPatientUser && (item.status === 'pending' || item.status === 'confirmed') && (
                  <View style={styles.patientRequestGroup}>
                    <TouchableOpacity
                      style={[styles.patientRequestBtn, styles.rescheduleBtn]}
                      disabled={isProcessing}
                      onPress={() => openChangeRequest(item, 'reschedule')}
                    >
                      <Ionicons name="calendar-outline" size={16} color="#0369A1" />
                      <Text style={styles.rescheduleBtnText}>Yêu cầu đổi lịch</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.patientRequestBtn, styles.cancelRequestBtn]}
                      disabled={isProcessing}
                      onPress={() => openChangeRequest(item, 'cancel')}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#B91C1C" />
                      <Text style={styles.cancelRequestBtnText}>Yêu cầu hủy</Text>
                    </TouchableOpacity>
                  </View>
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

      <Modal
        visible={requestAppointment !== null}
        transparent
        animationType="fade"
        onRequestClose={closeChangeRequest}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.requestModal}>
            <View style={styles.requestModalHeader}>
              <View style={styles.requestModalTitleWrap}>
                <Text style={styles.requestModalTitle}>
                  {requestType === 'reschedule'
                    ? 'Yêu cầu đổi lịch'
                    : 'Yêu cầu hủy lịch'}
                </Text>
                <Text style={styles.requestRecipient}>
                  {isDoctor
                    ? 'CSKH sẽ thông báo để bệnh nhân chọn phương án; lịch hiện tại chưa đổi.'
                    : 'Yêu cầu sẽ được chuyển đến bộ phận CSKH xử lý.'}
                </Text>
                {requestAppointment && (
                  <Text style={styles.requestModalSubtitle}>
                    Lịch hiện tại: {formatDate(requestAppointment.scheduled_at)}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={closeChangeRequest} accessibilityLabel="Đóng">
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {requestType === 'reschedule' && !isDoctor && (
              <>
                <Text style={styles.inputLabel}>Ngày mong muốn</Text>
                <TextInput
                  style={styles.requestInput}
                  value={requestedDate}
                  onChangeText={setRequestedDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={styles.inputLabel}>Giờ mong muốn</Text>
                <TextInput
                  style={styles.requestInput}
                  value={requestedTime}
                  onChangeText={setRequestedTime}
                  placeholder="HH:mm"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numbers-and-punctuation"
                />
              </>
            )}

            <Text style={styles.inputLabel}>Lý do yêu cầu</Text>
            <TextInput
              style={[styles.requestInput, styles.reasonInput]}
              value={requestReason}
              onChangeText={setRequestReason}
              placeholder="Nhập lý do để nhân viên hỗ trợ"
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
              maxLength={500}
            />

            <View style={styles.requestModalActions}>
              <TouchableOpacity
                style={styles.dismissRequestBtn}
                onPress={closeChangeRequest}
                disabled={actionLoadingId !== null}
              >
                <Text style={styles.dismissRequestText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitRequestBtn}
                onPress={submitChangeRequest}
                disabled={actionLoadingId !== null}
              >
                {actionLoadingId === requestAppointment?.id ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitRequestText}>
                    {isDoctor ? 'Gửi CSKH' : 'Gửi yêu cầu'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={patientChoiceRequest !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPatientChoiceRequest(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.requestModal}>
            <Text style={styles.requestModalTitle}>Chọn phương án với CSKH</Text>
            <Text style={styles.requestRecipient}>
              Bạn không cần chọn bác sĩ thay thế; CSKH sẽ bố trí bác sĩ mới nếu chọn đổi bác sĩ.
            </Text>
            <TouchableOpacity
              style={[
                styles.choiceOption,
                patientChoice === 'reschedule' && styles.choiceOptionSelected,
              ]}
              onPress={() => setPatientChoice('reschedule')}
            >
              <Ionicons
                name={patientChoice === 'reschedule' ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={patientChoice === 'reschedule' ? '#0369A1' : '#64748B'}
              />
              <Text style={styles.choiceOptionText}>Đổi ngày/giờ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.choiceOption,
                patientChoice === 'change_doctor' && styles.choiceOptionSelected,
              ]}
              onPress={() => setPatientChoice('change_doctor')}
            >
              <Ionicons
                name={patientChoice === 'change_doctor' ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={patientChoice === 'change_doctor' ? '#0369A1' : '#64748B'}
              />
              <Text style={styles.choiceOptionText}>Đổi sang bác sĩ khác</Text>
            </TouchableOpacity>
            {patientChoice === 'reschedule' && (
              <>
                <Text style={styles.inputLabel}>Ngày mong muốn</Text>
                <TextInput
                  style={styles.requestInput}
                  value={patientChoiceDate}
                  onChangeText={setPatientChoiceDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={styles.inputLabel}>Giờ mong muốn (07:00–20:30, mỗi 30 phút)</Text>
                <TextInput
                  style={styles.requestInput}
                  value={patientChoiceTime}
                  onChangeText={setPatientChoiceTime}
                  placeholder="HH:mm"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numbers-and-punctuation"
                />
              </>
            )}
            <View style={styles.requestModalActions}>
              <TouchableOpacity
                style={styles.dismissRequestBtn}
                onPress={() => setPatientChoiceRequest(null)}
                disabled={isLoadingPatientChoice}
              >
                <Text style={styles.dismissRequestText}>Để sau</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitRequestBtn}
                onPress={submitPatientChoice}
                disabled={isLoadingPatientChoice}
              >
                {isLoadingPatientChoice ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitRequestText}>Gửi lựa chọn</Text>
                )}
              </TouchableOpacity>
            </View>
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
  roleBannerDoctor: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#CCFBF1',
  },
  roleBannerPatient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#BAE6FD',
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircleDoctor: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCirclePatient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleTitleDoctor: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F766E',
  },
  roleTitlePatient: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0369A1',
  },
  roleSubTitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  refreshIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  patientRequestGroup: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  patientChoiceSection: {
    gap: 10,
    marginBottom: 16,
  },
  patientChoiceSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9A3412',
  },
  patientChoiceCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDBA74',
    backgroundColor: '#FFF7ED',
    gap: 6,
  },
  patientChoiceHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9A3412',
  },
  patientChoiceDetail: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
  },
  patientChoiceButton: {
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EA580C',
  },
  patientChoiceButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  choiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
  },
  choiceOptionSelected: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  choiceOptionText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  requestButtonDisabled: {
    backgroundColor: '#F1F5F9',
  },
  requestButtonTextDisabled: {
    color: '#94A3B8',
  },
  requestUnavailableText: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
  },
  patientRequestBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  rescheduleBtn: {
    backgroundColor: '#E0F2FE',
  },
  rescheduleBtnText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelRequestBtn: {
    backgroundColor: '#FEE2E2',
  },
  cancelRequestBtnText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  requestModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  requestModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  requestModalTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  requestModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  requestRecipient: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  requestModalSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  requestInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  reasonInput: {
    minHeight: 84,
  },
  requestModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  dismissRequestBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  dismissRequestText: {
    color: '#475569',
    fontWeight: '700',
  },
  submitRequestBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0284C7',
  },
  submitRequestText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
