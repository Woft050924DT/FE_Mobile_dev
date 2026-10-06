import React, { useCallback, useState, useEffect } from 'react';
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
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MedicalColors } from '../constants/Colors';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge';
import { sortAppointmentsByStatusAndDate } from '../utils/appointment-order';

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
  patient?: {
    full_name?: string;
    phone?: string;
  };
}

interface DoctorUser {
  id: string;
  full_name: string;
  phone: string;
  email: string;
}

type ChangeRequestAction = 'reschedule' | 'cancel';
type ChangeRequestStatus = 'pending' | 'awaiting_patient' | 'approved' | 'rejected';
type ChangeRequestDecision = 'approved' | 'rejected';
type PatientChangeChoice = 'reschedule' | 'change_doctor';

interface AppointmentChangeRequest {
  id: string;
  appointmentId?: string;
  appointment_id?: string;
  patientId?: string;
  patient_id?: string;
  action?: ChangeRequestAction;
  appointment_change_action?: ChangeRequestAction;
  status?: ChangeRequestStatus;
  appointment_change_request_status?: ChangeRequestStatus;
  initiatedByRole?: string;
  initiated_by_role?: string;
  patientChoice?: PatientChangeChoice;
  patient_choice?: PatientChangeChoice;
  requestedScheduledAt?: string;
  requested_scheduled_at?: string;
  scheduledAt?: string;
  currentScheduledAt?: string;
  current_scheduled_at?: string;
  reason?: string;
  reviewNote?: string;
  review_note?: string;
  reviewedBy?: string;
  reviewed_by?: string;
  reviewer?: {
    full_name?: string;
  };
  reviewedAt?: string;
  reviewed_at?: string;
  patients?: {
    full_name?: string;
    phone?: string;
  };
  patient?: {
    full_name?: string;
    phone?: string;
  };
  patients_change_requests_patient_idTopatients?: {
    full_name?: string;
    phone?: string;
  };
  appointments?: AppointmentItem;
  appointment?: AppointmentItem;
  appointments_appointment_idToappointments?: AppointmentItem;
  appointments_change_requests_appointment_idToappointments?: AppointmentItem;
}

export default function CskhAppointmentsScreen() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [assignedPatientCount, setAssignedPatientCount] = useState(0);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [activeQueue, setActiveQueue] = useState<'appointments' | 'change-requests'>('appointments');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [changeRequests, setChangeRequests] = useState<AppointmentChangeRequest[]>([]);
  const [changeRequestStatus, setChangeRequestStatus] = useState<ChangeRequestStatus>('pending');
  const [changeRequestPage, setChangeRequestPage] = useState(1);
  const [changeRequestTotalPages, setChangeRequestTotalPages] = useState(1);
  const [pendingChangeRequestCount, setPendingChangeRequestCount] = useState(0);
  const [isLoadingChangeRequests, setIsLoadingChangeRequests] = useState(true);
  const [changeRequestError, setChangeRequestError] = useState<string | null>(null);

  // Doctors
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [hasLoadedActiveDoctors, setHasLoadedActiveDoctors] = useState(false);
  const [selectedDoctorMap, setSelectedDoctorMap] = useState<Record<string, string>>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal assign doctor
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [currentApt, setCurrentApt] = useState<AppointmentItem | null>(null);
  const [reviewRequest, setReviewRequest] = useState<AppointmentChangeRequest | null>(null);
  const [reviewDecision, setReviewDecision] = useState<ChangeRequestDecision>('approved');
  const [reviewNote, setReviewNote] = useState('');
  const [replacementDoctorId, setReplacementDoctorId] = useState('');

  const fetchChangeRequests = useCallback(async (status: ChangeRequestStatus, page: number) => {
    try {
      setIsLoadingChangeRequests(true);
      setChangeRequestError(null);
      const res = await api.get('/appointments/change-requests', {
        params: { status, page, limit: 10 },
      });
      const payload = res.data?.data ?? res.data;
      const candidates = [
        payload,
        payload?.items,
        payload?.requests,
        payload?.changeRequests,
        payload?.appointmentChangeRequests,
        payload?.data,
        payload?.data?.items,
        payload?.data?.requests,
        payload?.result?.items,
        payload?.results,
      ];
      const items = candidates.find(Array.isArray);
      if (!items) {
        throw new Error('API trả về dữ liệu yêu cầu đổi/hủy không đúng định dạng.');
      }

      setChangeRequests(items);
      const pagination = payload?.meta || payload?.pagination || payload?.data?.meta || payload;
      const totalCount = Number(pagination?.total ?? pagination?.totalItems ?? items.length);
      const totalPages =
        pagination?.totalPages ??
        pagination?.total_pages ??
        Math.ceil(totalCount / 10);
      setChangeRequestTotalPages(Math.max(1, Number(totalPages) || 1));
      if (status === 'pending') {
        setPendingChangeRequestCount(totalCount);
      }
    } catch (err: any) {
      setChangeRequests([]);
      if (status === 'pending') {
        setPendingChangeRequestCount(0);
      }
      setChangeRequestError(
        err.response?.data?.message ||
          err.message ||
          'Không tải được hàng đợi yêu cầu đổi/hủy lịch.'
      );
    } finally {
      setIsLoadingChangeRequests(false);
      setRefreshing(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setAppointmentsError(null);
    setAssignedPatientCount(0);
    try {
      if (!user?.id) {
        throw new Error('Không xác định được tài khoản CSKH đang đăng nhập.');
      }

      const assignmentPageSize = 100;
      const patientIds = new Set<string>();
      let assignmentPage = 1;
      while (true) {
        const assignmentRes = await api.get('/cskh/assignments', {
          params: {
            staffId: user.id,
            isActive: true,
            page: assignmentPage,
            limit: assignmentPageSize,
          },
        });
        const assignmentPayload = assignmentRes.data?.data ?? assignmentRes.data;
        const assignmentCandidates = [
          assignmentPayload,
          assignmentPayload?.items,
          assignmentPayload?.data,
          assignmentPayload?.data?.items,
        ];
        const assignments = assignmentCandidates.find(Array.isArray);
        if (!assignments) {
          throw new Error('API trả về danh sách phân công CSKH không đúng định dạng.');
        }
        for (const assignment of assignments) {
          const patientId = assignment.patient_id || assignment.patients?.id;
          if (patientId) patientIds.add(patientId);
        }
        const assignmentMeta =
          assignmentPayload?.meta ||
          assignmentPayload?.pagination ||
          assignmentRes.data?.meta;
        const totalPages = Number(
          assignmentMeta?.totalPages ?? assignmentMeta?.total_pages
        );
        if (Number.isFinite(totalPages) && totalPages > 0) {
          if (assignmentPage >= totalPages) break;
        } else if (
          assignmentMeta?.hasNextPage === false ||
          assignments.length < assignmentPageSize
        ) {
          break;
        }
        if (assignments.length === 0) break;
        assignmentPage += 1;
      }
      setAssignedPatientCount(patientIds.size);

      if (patientIds.size === 0) {
        setAppointments([]);
      } else {
        const pageSize = 100;
        const allItems: AppointmentItem[] = [];
        const seenIds = new Set<string>();
        let page = 1;

        while (true) {
          const aptRes = await api.get('/appointments', {
            params: { page, limit: pageSize },
          });
          const payload = aptRes.data?.data ?? aptRes.data;
          const candidates = [
            payload,
            payload?.data,
            payload?.items,
            payload?.results,
            payload?.data?.items,
            payload?.data?.results,
          ];
          const items = candidates.find(Array.isArray);
          if (!items) {
            throw new Error('API trả về danh sách lịch hẹn không đúng định dạng.');
          }

          let addedCount = 0;
          for (const item of items as AppointmentItem[]) {
            if (item.id && seenIds.has(item.id)) continue;
            if (item.id) seenIds.add(item.id);
            allItems.push({
              ...item,
              status: String(item.status || '').toLowerCase(),
            });
            addedCount += 1;
          }

          const pagination =
            payload?.meta ||
            payload?.pagination ||
            payload?.data?.meta ||
            payload?.data?.pagination ||
            aptRes.data?.meta ||
            aptRes.data?.pagination;
          const reportedTotalPages = Number(
            pagination?.totalPages ??
              pagination?.total_pages ??
              pagination?.lastPage ??
              pagination?.pages ??
              pagination?.pageCount
          );
          const reportedTotal = Number(
            pagination?.total ??
              pagination?.totalItems ??
              pagination?.totalCount ??
              pagination?.count
          );
          const totalPages =
            Number.isFinite(reportedTotalPages) && reportedTotalPages > 0
              ? reportedTotalPages
              : Number.isFinite(reportedTotal) && reportedTotal >= 0
                ? Math.ceil(reportedTotal / pageSize)
                : undefined;
          if (
            typeof totalPages === 'number' &&
            Number.isFinite(totalPages) &&
            totalPages > 0 &&
            page >= totalPages
          ) break;
          if (!totalPages && items.length < pageSize) break;
          if (addedCount === 0) {
            throw new Error('API phân trang lịch hẹn bị lặp; chưa tải được đầy đủ danh sách.');
          }
          page += 1;
        }
        setAppointments(
          allItems.filter((appointment) => {
            const patientId = appointment.patient_id || appointment.patients?.id;
            return !!patientId && patientIds.has(patientId);
          })
        );
      }
    } catch (err: any) {
      setAppointments([]);
      setAppointmentsError(
        err.response?.data?.message || err.message || 'Không tải được danh sách lịch hẹn.'
      );
    }

    try {
      const docRes = await api.get('/users?roleCode=doctor&status=active');
      const payload = docRes.data?.data ?? docRes.data;
      const doctorsList = Array.isArray(payload) ? payload : payload?.items;
      if (!Array.isArray(doctorsList)) {
        throw new Error('API trả về danh sách bác sĩ không đúng định dạng.');
      }
      setDoctors(doctorsList);
      setHasLoadedActiveDoctors(true);
    } catch {
      setDoctors([]);
      setHasLoadedActiveDoctors(false);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeQueue !== 'change-requests') return;

    let isActive = true;
    let refreshTimeout: ReturnType<typeof setTimeout>;

    const loadChangeRequests = async () => {
      await fetchChangeRequests(changeRequestStatus, changeRequestPage);
      if (isActive) {
        refreshTimeout = setTimeout(loadChangeRequests, 15000);
      }
    };

    void loadChangeRequests();
    return () => {
      isActive = false;
      clearTimeout(refreshTimeout);
    };
  }, [activeQueue, changeRequestStatus, changeRequestPage, fetchChangeRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeQueue === 'change-requests') {
      fetchChangeRequests(changeRequestStatus, changeRequestPage);
    } else {
      fetchData();
    }
  };

  const openReviewModal = (
    request: AppointmentChangeRequest,
    decision: ChangeRequestDecision
  ) => {
    setReviewRequest(request);
    setReviewDecision(decision);
    setReviewNote('');
    setReplacementDoctorId('');
  };

  const handleReviewChangeRequest = async () => {
    if (!reviewRequest) return;
    const patientChoice = reviewRequest.patientChoice || reviewRequest.patient_choice;
    if (
      reviewDecision === 'approved' &&
      patientChoice === 'change_doctor' &&
      (!hasLoadedActiveDoctors || !replacementDoctorId)
    ) {
      Alert.alert(
        'Chưa chọn bác sĩ',
        hasLoadedActiveDoctors
          ? 'Vui lòng chọn bác sĩ thay thế trước khi duyệt.'
          : 'Không tải được danh sách bác sĩ đang hoạt động. Tải lại màn hình rồi thử lại.'
      );
      return;
    }
    if (
      reviewDecision === 'approved' &&
      patientChoice === 'reschedule' &&
      !(reviewRequest.requestedScheduledAt || reviewRequest.requested_scheduled_at)
    ) {
      Alert.alert(
        'Thiếu giờ hẹn mới',
        'Bệnh nhân chưa cung cấp giờ hẹn mới. Vui lòng liên hệ bệnh nhân trước khi duyệt.'
      );
      return;
    }

    try {
      setActionLoadingId(reviewRequest.id);
      await api.patch(
        `/appointments/change-requests/${reviewRequest.id}/review`,
        {
          decision: reviewDecision,
          reviewNote: reviewNote.trim(),
          ...(reviewDecision === 'approved' &&
          patientChoice === 'change_doctor' &&
          replacementDoctorId
            ? { assignedStaffId: replacementDoctorId }
            : {}),
        }
      );
      setReviewRequest(null);
      setReplacementDoctorId('');
      Alert.alert(
        reviewDecision === 'approved' ? 'Đã duyệt yêu cầu' : 'Đã từ chối yêu cầu',
        reviewDecision === 'approved'
          ? 'Yêu cầu đã được duyệt và bệnh nhân sẽ nhận thông báo kết quả.'
          : 'Yêu cầu đã bị từ chối và bệnh nhân sẽ nhận thông báo kết quả.'
      );
      if (changeRequestStatus === 'pending') {
        setChangeRequests((prev) => prev.filter((item) => item.id !== reviewRequest.id));
        if (changeRequests.length === 1 && changeRequestPage > 1) {
          setChangeRequestPage((page) => page - 1);
        } else {
          fetchChangeRequests(changeRequestStatus, changeRequestPage);
        }
      } else {
        fetchChangeRequests(changeRequestStatus, changeRequestPage);
      }
    } catch (err: any) {
      Alert.alert(
        'Không xử lý được yêu cầu',
        err.response?.data?.message || 'Vui lòng thử lại. Có thể lịch bị trùng với ca khám khác.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNotifyPatient = async (request: AppointmentChangeRequest) => {
    try {
      setActionLoadingId(request.id);
      await api.post(
        `/appointments/change-requests/${request.id}/notify-patient`
      );
      Alert.alert(
        'Đã thông báo bệnh nhân',
        'Yêu cầu được chuyển sang chờ bệnh nhân chọn phương án.'
      );
      await fetchChangeRequests(changeRequestStatus, changeRequestPage);
    } catch (err: any) {
      Alert.alert(
        'Không gửi được thông báo',
        err.response?.data?.message || 'Vui lòng thử lại.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRequestAppointment = (request: AppointmentChangeRequest) =>
    request.appointment ||
    request.appointments ||
    request.appointments_appointment_idToappointments ||
    request.appointments_change_requests_appointment_idToappointments;

  const getRequestAction = (request: AppointmentChangeRequest) =>
    request.action || request.appointment_change_action || 'cancel';

  const getRequestStatus = (request: AppointmentChangeRequest) =>
    request.status || request.appointment_change_request_status || 'pending';

  const isDoctorInitiatedRequest = (request: AppointmentChangeRequest) =>
    (request.initiatedByRole || request.initiated_by_role)?.toLowerCase() === 'doctor';

  const formatDateTime = (value?: string) => {
    if (!value) return 'Không có thông tin';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Không có thông tin';
    return `${date.toLocaleDateString('vi-VN')} lúc ${date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
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
      });

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

  const filtered = sortAppointmentsByStatusAndDate(appointments.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  }));

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
          Tiếp nhận lịch khám mới và xử lý yêu cầu đổi hoặc hủy lịch từ bệnh nhân.
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

      <View style={styles.queueSwitcher}>
        {([
          { key: 'appointments', label: 'Điều phối lịch khám' },
          { key: 'change-requests', label: 'Yêu cầu đổi/hủy' },
        ] as const).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.queueTab, activeQueue === tab.key && styles.queueTabActive]}
            onPress={() => setActiveQueue(tab.key)}
          >
            <Text style={[styles.queueTabText, activeQueue === tab.key && styles.queueTabTextActive]}>
              {tab.label}
              {tab.key === 'change-requests'
                ? ` (${pendingChangeRequestCount})`
                : ''}
            </Text>
          </TouchableOpacity>
        ))}
        {activeQueue === 'change-requests' && (
          <TouchableOpacity
            style={styles.queueRefreshButton}
            onPress={() => fetchChangeRequests(changeRequestStatus, changeRequestPage)}
            disabled={isLoadingChangeRequests}
            accessibilityLabel="Tải lại yêu cầu đổi hủy"
          >
            {isLoadingChangeRequests ? (
              <ActivityIndicator size="small" color="#EA580C" />
            ) : (
              <Ionicons name="refresh" size={18} color="#EA580C" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {activeQueue === 'appointments' ? (
        <>
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
      ) : appointmentsError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.emptyTitle}>Không tải được lịch hẹn</Text>
          <Text style={styles.emptySub}>{appointmentsError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-done-circle-outline" size={56} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Không có lịch hẹn nào</Text>
          <Text style={styles.emptySub}>
            {assignedPatientCount === 0
              ? 'Tài khoản CSKH này chưa được phân công bệnh nhân nào.'
              : filterStatus === 'pending'
                ? 'Hiện chưa có lịch hẹn chờ duyệt của bệnh nhân được phân công cho bạn.'
                : 'Chưa có lịch hẹn ở bộ lọc này của bệnh nhân được phân công cho bạn.'}
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
        </>
      ) : (
        <>
          <View style={styles.changeRequestFilterBar}>
            {([
              ['pending', 'Chờ xử lý'],
              ['awaiting_patient', 'Chờ bệnh nhân'],
              ['approved', 'Đã duyệt'],
              ['rejected', 'Đã từ chối'],
            ] as const).map(([status, label]) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterTab,
                  changeRequestStatus === status && styles.filterTabActive,
                ]}
                onPress={() => {
                  setChangeRequestStatus(status);
                  setChangeRequestPage(1);
                }}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    changeRequestStatus === status && styles.filterTabTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isLoadingChangeRequests ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#EA5800" />
              <Text style={styles.loadingText}>Đang tải yêu cầu đổi/hủy lịch...</Text>
            </View>
          ) : changeRequestError ? (
            <View style={styles.center}>
              <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
              <Text style={styles.emptyTitle}>Không tải được yêu cầu</Text>
              <Text style={styles.emptySub}>{changeRequestError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchChangeRequests(changeRequestStatus, changeRequestPage)}
              >
                <Text style={styles.retryButtonText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : changeRequests.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Không có yêu cầu nào</Text>
              <Text style={styles.emptySub}>
                {changeRequestStatus === 'pending'
                  ? `Hiện không có yêu cầu đổi/hủy đang chờ xử lý cho tài khoản ${user?.fullName || 'CSKH này'}. Nhấn nút làm mới để kiểm tra lại.`
                  : 'Không tìm thấy yêu cầu trong trạng thái này.'}
              </Text>
            </View>
          ) : (
            <>
              <FlatList
                data={changeRequests}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const appointment = getRequestAppointment(item);
                  const patient =
                    item.patient ||
                    item.patients ||
                    item.patients_change_requests_patient_idTopatients ||
                    appointment?.patients ||
                    appointment?.patient;
                  const isProcessing = actionLoadingId === item.id;
                  const action = getRequestAction(item);
                  const status = getRequestStatus(item);
                  const requestActionLabel = isDoctorInitiatedRequest(item)
                    ? action === 'reschedule'
                      ? 'Bác sĩ yêu cầu đổi lịch'
                      : 'Bác sĩ yêu cầu hủy lịch'
                    : action === 'reschedule'
                      ? 'Yêu cầu đổi ngày/giờ'
                      : 'Yêu cầu hủy lịch';
                  const patientChoice = item.patientChoice || item.patient_choice;
                  const requestedAt = item.requestedScheduledAt || item.requested_scheduled_at;
                  const appointmentId = item.appointmentId || item.appointment_id || appointment?.id;

                  return (
                    <View style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={styles.changeRequestTypeBadge}>
                          <Text style={styles.changeRequestTypeText}>{requestActionLabel}</Text>
                        </View>
                        <View
                          style={[
                            styles.changeRequestStatusBadge,
                            status === 'approved'
                              ? styles.changeRequestApproved
                              : status === 'rejected'
                                ? styles.changeRequestRejected
                                : styles.changeRequestPending,
                          ]}
                        >
                          <Text style={styles.changeRequestStatusText}>
                            {status === 'approved'
                              ? 'Đã duyệt'
                              : status === 'rejected'
                                ? 'Đã từ chối'
                                : status === 'awaiting_patient'
                                  ? 'Chờ bệnh nhân chọn'
                                : 'Chờ xử lý'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.changeRequestPatient}>
                        {patient?.full_name || 'Bệnh nhân'}
                      </Text>
                      <Text style={styles.changeRequestMeta}>
                        Mã lịch hẹn: {appointmentId || 'Không có thông tin'}
                      </Text>
                      {patient?.phone ? (
                        <View style={styles.phoneActionRow}>
                          <Ionicons name="call-outline" size={14} color="#0284C7" />
                          <Text style={styles.phoneText}>{patient.phone}</Text>
                          <TouchableOpacity
                            style={styles.callNowBtn}
                            onPress={() => Linking.openURL(`tel:${patient.phone}`)}
                          >
                            <Ionicons name="call" size={12} color="#FFFFFF" />
                            <Text style={styles.callNowBtnText}>Gọi bệnh nhân</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      <View style={styles.requestDetailBox}>
                        <Text style={styles.requestDetailText}>
                          Lịch hiện tại:{' '}
                          {formatDateTime(
                            appointment?.scheduled_at ||
                              item.currentScheduledAt ||
                              item.current_scheduled_at
                          )}
                        </Text>
                        {(action === 'reschedule' || patientChoice === 'reschedule') && (
                          <Text style={styles.requestDetailText}>
                            Thời gian đề xuất: {formatDateTime(requestedAt)}
                          </Text>
                        )}
                        <Text style={styles.requestDetailText}>
                          Lý do: {item.reason?.trim() || 'Không ghi lý do'}
                        </Text>
                        {patientChoice && (
                          <Text style={styles.requestDetailText}>
                            Bệnh nhân chọn:{' '}
                            {patientChoice === 'reschedule' ? 'Đổi ngày/giờ' : 'Đổi bác sĩ'}
                          </Text>
                        )}
                        {item.reviewNote || item.review_note ? (
                          <Text style={styles.requestReviewNote}>
                            Ghi chú xử lý: {item.reviewNote || item.review_note}
                          </Text>
                        ) : null}
                        {item.reviewedAt || item.reviewed_at ? (
                          <Text style={styles.changeRequestMeta}>
                            Đã xử lý: {formatDateTime(item.reviewedAt || item.reviewed_at)}
                          </Text>
                        ) : null}
                        {item.reviewer?.full_name || item.reviewedBy || item.reviewed_by ? (
                          <Text style={styles.changeRequestMeta}>
                            Người xử lý: {item.reviewer?.full_name || item.reviewedBy || item.reviewed_by}
                          </Text>
                        ) : null}
                      </View>

                      {status === 'pending' &&
                        isDoctorInitiatedRequest(item) &&
                        !patientChoice && (
                          <TouchableOpacity
                            style={styles.notifyPatientBtn}
                            disabled={isProcessing}
                            onPress={() => handleNotifyPatient(item)}
                          >
                            {isProcessing ? (
                              <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                              <>
                                <Ionicons name="notifications-outline" size={16} color="#FFFFFF" />
                                <Text style={styles.assignBtnText}>Thông báo bệnh nhân chọn phương án</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}

                      {status === 'pending' &&
                        (!isDoctorInitiatedRequest(item) || !!patientChoice) && (
                        <View style={styles.actionGroup}>
                          <TouchableOpacity
                            style={styles.reviewApproveBtn}
                            disabled={isProcessing}
                            onPress={() => openReviewModal(item, 'approved')}
                          >
                            {isProcessing ? (
                              <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                                <Text style={styles.assignBtnText}>Duyệt yêu cầu</Text>
                              </>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.reviewRejectBtn}
                            disabled={isProcessing}
                            onPress={() => openReviewModal(item, 'rejected')}
                          >
                            <Ionicons name="close-circle" size={16} color="#B91C1C" />
                            <Text style={styles.reviewRejectText}>Từ chối</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                }}
              />
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageButton, changeRequestPage <= 1 && styles.pageButtonDisabled]}
                  disabled={changeRequestPage <= 1}
                  onPress={() => setChangeRequestPage((page) => Math.max(1, page - 1))}
                >
                  <Text style={styles.pageButtonText}>Trước</Text>
                </TouchableOpacity>
                <Text style={styles.pageLabel}>
                  Trang {changeRequestPage}/{changeRequestTotalPages}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.pageButton,
                    changeRequestPage >= changeRequestTotalPages && styles.pageButtonDisabled,
                  ]}
                  disabled={changeRequestPage >= changeRequestTotalPages}
                  onPress={() =>
                    setChangeRequestPage((page) => Math.min(changeRequestTotalPages, page + 1))
                  }
                >
                  <Text style={styles.pageButtonText}>Sau</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
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

      <Modal
        visible={reviewRequest !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewRequest(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reviewModal}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.modalTitle}>
                  {reviewDecision === 'approved' ? 'Duyệt yêu cầu' : 'Từ chối yêu cầu'}
                </Text>
                <Text style={styles.modalSub}>
                  {reviewRequest && getRequestAction(reviewRequest) === 'reschedule'
                    ? 'Đánh giá lý do và ngày/giờ đề xuất trước khi quyết định.'
                    : 'Đánh giá lý do bệnh nhân đưa ra trước khi quyết định.'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReviewRequest(null)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            {reviewRequest && (
              <View style={styles.reviewRequestSummary}>
                <Text style={styles.reviewSummaryText}>
                  Lịch hiện tại: {formatDateTime(getRequestAppointment(reviewRequest)?.scheduled_at)}
                </Text>
                {(reviewRequest.patientChoice || reviewRequest.patient_choice) === 'reschedule' && (
                  <Text style={styles.reviewSummaryText}>
                    Thời gian đề xuất:{' '}
                    {formatDateTime(
                      reviewRequest.requestedScheduledAt || reviewRequest.requested_scheduled_at
                    )}
                  </Text>
                )}
                <Text style={styles.reviewSummaryReason}>
                  Lý do: {reviewRequest.reason?.trim() || 'Không ghi lý do'}
                </Text>
                {(reviewRequest.patientChoice || reviewRequest.patient_choice) ===
                  'change_doctor' &&
                  reviewDecision === 'approved' && (
                    <>
                      <Text style={styles.doctorListHeader}>Chọn bác sĩ thay thế</Text>
                      {hasLoadedActiveDoctors && doctors.map((doctor) => (
                        <TouchableOpacity
                          key={doctor.id}
                          style={[
                            styles.replacementDoctorOption,
                            replacementDoctorId === doctor.id && styles.replacementDoctorSelected,
                          ]}
                          onPress={() => setReplacementDoctorId(doctor.id)}
                        >
                          <Ionicons
                            name={replacementDoctorId === doctor.id ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={replacementDoctorId === doctor.id ? '#0D9488' : '#64748B'}
                          />
                          <Text style={styles.replacementDoctorText}>{doctor.full_name}</Text>
                        </TouchableOpacity>
                      ))}
                      {(!hasLoadedActiveDoctors || doctors.length === 0) && (
                        <Text style={styles.reviewSummaryReason}>
                          Không tải được danh sách bác sĩ đang hoạt động. Vui lòng tải lại màn hình.
                        </Text>
                      )}
                    </>
                  )}
              </View>
            )}
            <Text style={styles.reviewNoteLabel}>Ghi chú xử lý (không bắt buộc)</Text>
            <TextInput
              style={styles.reviewNoteInput}
              value={reviewNote}
              onChangeText={setReviewNote}
              placeholder="Nhập ghi chú gửi bệnh nhân"
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <View style={styles.reviewModalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setReviewRequest(null)}
                disabled={actionLoadingId === reviewRequest?.id}
              >
                <Text style={styles.modalCancelButtonText}>Quay lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reviewConfirmButton,
                  reviewDecision === 'rejected' && styles.reviewConfirmReject,
                ]}
                onPress={handleReviewChangeRequest}
                disabled={actionLoadingId === reviewRequest?.id}
              >
                {actionLoadingId === reviewRequest?.id ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.reviewConfirmButtonText}>
                    {reviewDecision === 'approved' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
                  </Text>
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
  queueSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  queueTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  queueTabActive: {
    backgroundColor: '#EA580C',
  },
  queueTabText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  queueTabTextActive: {
    color: '#FFFFFF',
  },
  queueRefreshButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
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
  changeRequestFilterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
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
  changeRequestTypeBadge: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  changeRequestTypeText: {
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '700',
  },
  changeRequestStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  changeRequestPending: {
    backgroundColor: '#FEF3C7',
  },
  changeRequestApproved: {
    backgroundColor: '#DCFCE7',
  },
  changeRequestRejected: {
    backgroundColor: '#FEE2E2',
  },
  changeRequestStatusText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
  },
  changeRequestPatient: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  changeRequestMeta: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
  },
  requestDetailBox: {
    gap: 6,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#EA580C',
  },
  requestDetailText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 19,
  },
  requestReviewNote: {
    color: '#166534',
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  reviewApproveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#16A34A',
  },
  notifyPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: '#0284C7',
  },
  replacementDoctorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
  },
  replacementDoctorSelected: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  replacementDoctorText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  reviewRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
  },
  reviewRejectText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFEDD5',
  },
  pageButtonDisabled: {
    opacity: 0.45,
  },
  pageButtonText: {
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '700',
  },
  pageLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
  reviewModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  reviewNoteLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  reviewRequestSummary: {
    gap: 6,
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderLeftWidth: 3,
    borderLeftColor: '#EA580C',
  },
  reviewSummaryText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 19,
  },
  reviewSummaryReason: {
    color: '#7C2D12',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  reviewNoteInput: {
    minHeight: 96,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    color: '#0F172A',
    fontSize: 14,
  },
  reviewModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCancelButtonText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  reviewConfirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#16A34A',
  },
  reviewConfirmReject: {
    backgroundColor: '#DC2626',
  },
  reviewConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
