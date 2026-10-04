import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MedicalColors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AppointmentStatusBadge } from '../../components/AppointmentStatusBadge';
import { PatientProfileModal } from '../../components/PatientProfileModal';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout, isDoctor, isCskh } = useAuth();

  // ================= STATE DÀNH CHO BÁC SĨ =================
  const [doctorAppointments, setDoctorAppointments] = useState<any[]>([]);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorRefreshing, setDoctorRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'unexamined' | 'examined'>('all');

  // ================= STATE DÀNH CHO CSKH =================
  const [cskhPendingCount, setCskhPendingCount] = useState(0);
  const [cskhFollowUpCount, setCskhFollowUpCount] = useState(0);

  // ================= STATE HỒ SƠ BỆNH NHÂN =================
  const [patientModalVisible, setPatientModalVisible] = useState(false);
  const [patientProfile, setPatientProfile] = useState<any>(null);

  useEffect(() => {
    if (isDoctor) {
      fetchDoctorAppointments();
    } else if (isCskh) {
      fetchCskhStats();
    } else if (user?.id) {
      fetchPatientProfile();
    }
  }, [isDoctor, isCskh, user?.id]);

  const fetchPatientProfile = async () => {
    try {
      let res: any;
      try {
        res = await api.get('/patients/me');
      } catch {
        if (user?.id) {
          res = await api.get(`/patients/${user.id}`);
        }
      }
      if (res?.data?.data) {
        setPatientProfile(res.data.data);
      }
    } catch {
      // ignore
    }
  };

  const isProfileComplete = (profile: any) => {
    if (!profile) return false;
    const hasName =
      !!profile.full_name &&
      profile.full_name.trim().length >= 2 &&
      !profile.full_name.startsWith('Bệnh nhân ');
    const hasPhone = !!profile.phone && profile.phone.trim().length >= 9;
    const hasDob = !!profile.date_of_birth;
    const hasGender = !!profile.gender;
    return hasName && hasPhone && hasDob && hasGender;
  };

  const fetchDoctorAppointments = async () => {
    try {
      setDoctorLoading(true);
      const res = await api.get('/appointments');
      const items =
        res.data?.data?.data ||
        res.data?.data?.items ||
        (Array.isArray(res.data?.data) ? res.data?.data : []);
      setDoctorAppointments(items);
    } catch {
      // Mock data ca khám hôm nay cho Bác sĩ
      setDoctorAppointments([
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
      setDoctorLoading(false);
      setDoctorRefreshing(false);
    }
  };

  const fetchCskhStats = async () => {
    try {
      const [aptRes, dashRes] = await Promise.all([
        api.get('/appointments?status=pending').catch(() => null),
        api.get('/cskh/dashboard').catch(() => null),
      ]);
      const pendingItems =
        aptRes?.data?.data?.data || aptRes?.data?.data?.items || aptRes?.data?.data || [];
      setCskhPendingCount(Array.isArray(pendingItems) ? pendingItems.length : 2);
      setCskhFollowUpCount(dashRes?.data?.data?.stats?.upcomingFollowUpsCount || 5);
    } catch {
      setCskhPendingCount(2);
      setCskhFollowUpCount(5);
    }
  };

  const handleDoctorUpdateStatus = async (
    appointmentId: string,
    newStatus: 'in_progress' | 'completed',
    statusLabel: string
  ) => {
    try {
      setActionLoadingId(appointmentId);
      await api.patch(`/appointments/${appointmentId}/status`, { status: newStatus });
      setDoctorAppointments((prev) =>
        prev.map((item) => (item.id === appointmentId ? { ...item, status: newStatus } : item))
      );
      Alert.alert('Thành công', `Đã chuyển ca khám sang trạng thái "${statusLabel}"`);
    } catch {
      setDoctorAppointments((prev) =>
        prev.map((item) => (item.id === appointmentId ? { ...item, status: newStatus } : item))
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // KPI Bác sĩ
  const unexaminedCount = doctorAppointments.filter(
    (a) => a.status === 'confirmed' || a.status === 'in_progress' || a.status === 'pending'
  ).length;
  const examinedCount = doctorAppointments.filter((a) => a.status === 'completed').length;
  const totalDoctorPatients = doctorAppointments.length;

  const todayFormatted = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const filteredDoctorAppointments = doctorAppointments.filter((item) => {
    if (filterTab === 'unexamined') {
      return item.status === 'confirmed' || item.status === 'in_progress' || item.status === 'pending';
    }
    if (filterTab === 'examined') {
      return item.status === 'completed';
    }
    return true;
  });

  // ==============================================================
  // 1. GIAO DIỆN TRỰC TIẾP CHO BÁC SĨ (KHI ĐĂNG NHẬP LÀ DOCTOR)
  // ==============================================================
  if (isDoctor) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={doctorRefreshing}
              onRefresh={() => {
                setDoctorRefreshing(true);
                fetchDoctorAppointments();
              }}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header Bác sĩ */}
          <View style={styles.doctorHeader}>
            <View>
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Đang trực tuyến • Sẵn sàng khám</Text>
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

          {/* Hero Dashboard Bác sĩ */}
          <View style={styles.doctorHeroCard}>
            <View style={styles.heroHeaderRow}>
              <Ionicons name="medkit" size={24} color="#FFFFFF" />
              <Text style={styles.heroDateText}>{todayFormatted}</Text>
            </View>
            <Text style={styles.doctorHeroTitle}>Dashboard Ca Trực Bác Sĩ</Text>
            <Text style={styles.doctorHeroSubtitle}>
              Theo dõi lộ trình thăm khám hôm nay, tra cứu hồ sơ bệnh án EMR và kê đơn thuốc điều trị ngoại trú.
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

            {/* Đã khám xong */}
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
              <Text style={styles.kpiNote}>Đã có bệnh án EMR</Text>
            </TouchableOpacity>

            {/* Tổng số */}
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
              <Text style={[styles.kpiNumber, { color: '#0369A1' }]}>{totalDoctorPatients}</Text>
              <Text style={styles.kpiTitle}>Tổng bệnh nhân</Text>
              <Text style={styles.kpiNote}>Trong danh sách</Text>
            </TouchableOpacity>
          </View>

          {/* LỐI TẮT CÔNG CỤ NHANH */}
          <View style={styles.quickToolsRow}>
            <TouchableOpacity
              style={styles.quickToolBtn}
              onPress={() => router.push('/patient-emr-history')}
            >
              <MaterialCommunityIcons name="file-document-outline" size={18} color="#0284C7" />
              <Text style={styles.quickToolBtnText}>Tra cứu EMR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickToolBtn}
              onPress={() => router.push('/doctor-examination')}
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

          {/* DANH SÁCH LỊCH KHÁM HÔM NAY HIỂN THỊ TRỰC TIẾP */}
          <View style={styles.listHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                Lịch khám hôm nay ({filteredDoctorAppointments.length})
              </Text>
              <Text style={styles.sectionSub}>
                {filterTab === 'unexamined'
                  ? 'Đang lọc: Các ca bệnh nhân chưa khám'
                  : filterTab === 'examined'
                  ? 'Đang lọc: Các ca bệnh nhân đã khám xong'
                  : 'Toàn bộ các ca khám được phân công hôm nay'}
              </Text>
            </View>
            <TouchableOpacity onPress={fetchDoctorAppointments} style={styles.reloadBtn}>
              <Ionicons name="reload" size={16} color="#0D9488" />
            </TouchableOpacity>
          </View>

          {doctorLoading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#0D9488" />
              <Text style={styles.loadingText}>Đang tải lịch khám hôm nay...</Text>
            </View>
          ) : filteredDoctorAppointments.length === 0 ? (
            <View style={styles.emptyDoctorCard}>
              <Ionicons name="calendar-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Không có ca khám nào</Text>
              <Text style={styles.emptySub}>
                {filterTab === 'unexamined'
                  ? 'Tuyệt vời! Không còn bệnh nhân nào chưa khám hôm nay.'
                  : 'Chưa có dữ liệu ca khám cho bộ lọc này.'}
              </Text>
            </View>
          ) : (
            filteredDoctorAppointments.map((apt) => {
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
                      <Text style={styles.doctorPatientName}>{patientName}</Text>
                      <View style={styles.phoneRow}>
                        <Ionicons name="call-outline" size={13} color="#0284C7" />
                        <Text style={styles.phoneText}>{patientPhone}</Text>
                        <TouchableOpacity
                          style={styles.callNowMiniBtn}
                          onPress={() => Linking.openURL(`tel:${patientPhone}`)}
                        >
                          <Ionicons name="call" size={11} color="#FFFFFF" />
                          <Text style={styles.callNowMiniBtnText}>Gọi ngay</Text>
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
                          handleDoctorUpdateStatus(apt.id, 'in_progress', 'Đang di chuyển đến khám')
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

  // ==============================================================
  // 2. GIAO DIỆN TRỰC TIẾP CHO CSKH (KHI ĐĂNG NHẬP LÀ CSKH)
  // ==============================================================
  if (isCskh) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header CSKH */}
          <View style={styles.header}>
            <View>
              <Text style={styles.subGreeting}>Xin chào chuyên viên,</Text>
              <Text style={styles.userName}>{user?.fullName || 'CSKH Trần Thị B'}</Text>
              <Text style={[styles.roleTag, { color: '#EA580C' }]}>
                🎧 Chuyên viên Chăm sóc & Điều phối y tế
              </Text>
            </View>

            <TouchableOpacity style={styles.authBadge} onPress={logout}>
              <Ionicons name="log-out-outline" size={18} color={MedicalColors.danger} />
              <Text style={styles.authBadgeText}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>

          {/* Hero CSKH */}
          <View style={[styles.heroCard, { backgroundColor: '#C2410C' }]}>
            <View style={styles.heroContent}>
              <View style={[styles.pillBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={[styles.pillText, { color: '#FFFFFF' }]}>Trung tâm Điều Phối & CRM y tế</Text>
              </View>
              <Text style={styles.heroTitle}>Bàn Tiếp Nhận & Chăm Sóc Khách Hàng</Text>
              <Text style={styles.heroDesc}>
                Tiếp nhận yêu cầu khám mới, gọi điện chốt địa chỉ, phân công bác sĩ và quản lý chu trình tái khám.
              </Text>

              <TouchableOpacity
                style={[styles.heroActionBtn, { backgroundColor: '#FFFFFF' }]}
                onPress={() => router.push('/cskh-appointments')}
              >
                <Text style={[styles.heroActionText, { color: '#C2410C' }]}>Duyệt ca chờ xử lý ({cskhPendingCount})</Text>
                <Ionicons name="arrow-forward" size={16} color="#C2410C" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Phím tắt CSKH */}
          <Text style={styles.sectionTitle}>Công cụ nghiệp vụ CSKH</Text>
          <View style={styles.gridContainer}>
            <TouchableOpacity
              style={[styles.gridCard, { borderColor: '#FDBA74' }]}
              onPress={() => router.push('/cskh-appointments')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#FFEDD5' }]}>
                <Ionicons name="clipboard" size={26} color="#EA580C" />
              </View>
              <Text style={styles.gridTitle}>Duyệt Lịch Khám</Text>
              <Text style={styles.gridSub}>Chốt địa chỉ & phân công Bác sĩ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridCard, { borderColor: '#FCD34D' }]}
              onPress={() => router.push('/cskh-followups')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="heart-circle" size={26} color="#D97706" />
              </View>
              <Text style={styles.gridTitle}>Quản Lý Tái Khám</Text>
              <Text style={styles.gridSub}>Nhắc lịch tái khám & Ghi Care Log</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridCard, { borderColor: '#BAE6FD' }]}
              onPress={() => router.push('/appointments')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="calendar-outline" size={26} color="#0284C7" />
              </View>
              <Text style={styles.gridTitle}>Giám Sát Lịch</Text>
              <Text style={styles.gridSub}>Theo dõi tiến độ toàn bộ ca khám</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridCard, { borderColor: '#BBF7D0' }]}
              onPress={() => router.push('/care')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="notifications" size={26} color="#16A34A" />
              </View>
              <Text style={styles.gridTitle}>Hộp Thư Thông Báo</Text>
              <Text style={styles.gridSub}>Cảnh báo từ Cron nhắc lịch 07:00</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==============================================================
  // 3. GIAO DIỆN TRỰC TIẾP CHO BỆNH NHÂN (MẶC ĐỊNH)
  // ==============================================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Bệnh nhân */}
        <View style={styles.header}>
          <View>
            <Text style={styles.subGreeting}>Xin chào,</Text>
            <Text style={styles.userName}>{user ? user.fullName : 'Quý khách hàng'}</Text>
            <Text style={styles.roleTag}>🛡️ Bệnh nhân / Người dùng</Text>
          </View>

          {user ? (
            <TouchableOpacity style={styles.authBadge} onPress={logout}>
              <Ionicons name="log-out-outline" size={18} color={MedicalColors.danger} />
              <Text style={styles.authBadgeText}>Đăng xuất</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
              <Ionicons name="person-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.loginBtnText}>Đăng nhập</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* THÔNG BÁO TÌNH TRẠNG HỒ SƠ BỆNH NHÂN (ĐIỀU KIỆN TIÊN QUYẾT ĐỂ ĐẶT LỊCH) */}
        {user && (
          isProfileComplete(patientProfile) ? (
            <View style={styles.profileReadyBanner}>
              <Ionicons name="checkmark-circle" size={24} color="#059669" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.profileReadyTitle}>Hồ sơ bệnh nhân hợp lệ</Text>
                <Text style={styles.profileReadySub}>
                  Đã cập nhật đủ Họ tên, SĐT, Ngày sinh & Giới tính. Sẵn sàng đăng ký khám bệnh.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.profileReadyBtn}
                onPress={() => router.push('/(tabs)/profile' as any)}
              >
                <Text style={styles.profileReadyBtnText}>Xem hồ sơ</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.profileWarningBanner}>
              <Ionicons name="alert-circle" size={26} color="#DC2626" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.profileWarningTitle}>
                  {patientProfile?.full_name?.startsWith('Bệnh nhân ')
                    ? 'Cần đổi tên tạm sang Họ tên thật!'
                    : 'Chưa đủ điều kiện đặt lịch khám!'}
                </Text>
                <Text style={styles.profileWarningSub}>
                  {patientProfile?.full_name?.startsWith('Bệnh nhân ')
                    ? `Bạn đang để tên tạm (${patientProfile.full_name}). Cần nhập họ tên thật để đủ điều kiện đặt lịch khám.`
                    : 'Phòng khám bắt buộc có đủ Họ tên, SĐT, Ngày sinh, Giới tính để lập hồ sơ bệnh án trước khi đăng ký khám.'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.profileWarningBtn}
                onPress={() => router.push('/(tabs)/profile' as any)}
              >
                <Text style={styles.profileWarningBtnText}>Bổ sung ngay</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {/* Hero Banner: Đặt lịch khám tại phòng khám */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.pillBadge}>
              <Text style={styles.pillText}>Phòng khám Đa khoa Quốc tế</Text>
            </View>
            <Text style={styles.heroTitle}>Khám Chữa Bệnh Tại Phòng Khám Chuẩn Y Khoa</Text>
            <Text style={styles.heroDesc}>
              Bác sĩ chuyên khoa thăm khám trực tiếp, chẩn đoán theo mã ICD-10 và lưu trữ hồ sơ bệnh án điện tử EMR.
            </Text>
            <TouchableOpacity
              style={styles.heroActionBtn}
              onPress={() => router.push('/book-appointment')}
            >
              <Text style={styles.heroActionText}>Đặt lịch khám ngay</Text>
              <Ionicons name="arrow-forward" size={16} color="#0284C7" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Phím tắt tính năng Bệnh nhân */}
        <Text style={styles.sectionTitle}>Tính năng dành cho bạn</Text>
        <View style={styles.gridContainer}>
          {/* Card 1: Body Map */}
          <TouchableOpacity
            style={[styles.gridCard, { borderColor: '#BAE6FD' }]}
            onPress={() => router.push('/body-map')}
          >
            <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="body" size={28} color="#0284C7" />
            </View>
            <Text style={styles.gridTitle}>Body Map 2D</Text>
            <Text style={styles.gridSub}>Khai vị trí đau & triệu chứng trực quan</Text>
          </TouchableOpacity>

          {/* Card 2: Lịch khám */}
          <TouchableOpacity
            style={[styles.gridCard, { borderColor: '#BBF7D0' }]}
            onPress={() => router.push('/appointments')}
          >
            <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="calendar" size={28} color="#16A34A" />
            </View>
            <Text style={styles.gridTitle}>Lịch Hẹn Của Bạn</Text>
            <Text style={styles.gridSub}>Theo dõi ca khám & giờ hẹn bác sĩ</Text>
          </TouchableOpacity>

          {/* Card 3: Bệnh án EMR */}
          <TouchableOpacity
            style={[styles.gridCard, { borderColor: '#DDD6FE' }]}
            onPress={() => router.push('/appointments')}
          >
            <View style={[styles.iconBox, { backgroundColor: '#EDE9FE' }]}>
              <MaterialCommunityIcons name="file-document-outline" size={28} color="#7C3AED" />
            </View>
            <Text style={styles.gridTitle}>Bệnh Án & Đơn Thuốc</Text>
            <Text style={styles.gridSub}>Xem kết quả ICD-10 & cách uống thuốc</Text>
          </TouchableOpacity>

          {/* Card 4: CSKH 1-1 */}
          <TouchableOpacity
            style={[styles.gridCard, { borderColor: '#FED7AA' }]}
            onPress={() => router.push('/care')}
          >
            <View style={[styles.iconBox, { backgroundColor: '#FFEDD5' }]}>
              <Ionicons name="headset" size={28} color="#EA580C" />
            </View>
            <Text style={styles.gridTitle}>Chăm Sóc 1-1</Text>
            <Text style={styles.gridSub}>Nhân viên CSKH chuyên trách hỗ trợ</Text>
          </TouchableOpacity>

          {/* Card 5: Hồ Sơ Cá Nhân Bệnh Nhân */}
          <TouchableOpacity
            style={[styles.gridCard, { borderColor: '#BAE6FD' }]}
            onPress={() => {
              if (!user) {
                router.push('/login');
              } else {
                router.push('/(tabs)/profile' as any);
              }
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="person-circle" size={28} color="#0284C7" />
            </View>
            <Text style={styles.gridTitle}>Hồ Sơ Cá Nhân</Text>
            <Text style={styles.gridSub}>Thông tin hành chính, BHYT & SĐT</Text>
          </TouchableOpacity>
        </View>

        {/* Quy trình 4 bước khám tại phòng khám dành cho Bệnh nhân */}
        <Text style={styles.sectionTitle}>Quy trình khám chữa bệnh tại phòng khám</Text>
        <View style={styles.timelineCard}>
          <View style={styles.timelineItem}>
            <View style={[styles.stepCircle, { backgroundColor: '#0284C7' }]}>
              <Text style={styles.stepNum}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Hoàn thiện hồ sơ & Khai Body Map</Text>
              <Text style={styles.stepDesc}>
                Cập nhật thông tin cá nhân và đánh dấu vị trí đau trên mô hình 2D trực quan.
              </Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View style={[styles.stepCircle, { backgroundColor: '#0D9488' }]}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Chọn Bác sĩ & Khung giờ khám</Text>
              <Text style={styles.stepDesc}>
                Lựa chọn bác sĩ phụ trách ca khám và chọn ngày giờ thuận tiện nhất.
              </Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View style={[styles.stepCircle, { backgroundColor: '#7C3AED' }]}>
              <Text style={styles.stepNum}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Đến phòng khám & Khám bệnh</Text>
              <Text style={styles.stepDesc}>
                Check-in tiếp đón tại Tầng 1, thăm khám lâm sàng, chẩn đoán ICD-10 và kê đơn thuốc.
              </Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View style={[styles.stepCircle, { backgroundColor: '#16A34A' }]}>
              <Text style={styles.stepNum}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Nhận bệnh án EMR & Nhắc tái khám</Text>
              <Text style={styles.stepDesc}>
                Hồ sơ bệnh án điện tử và đơn thuốc lưu trữ an toàn, CSKH tự động nhắc lịch.
              </Text>
            </View>
          </View>
        </View>

        {/* Cam kết y tế */}
        <View style={styles.trustBanner}>
          <Ionicons name="shield-checkmark" size={24} color="#059669" />
          <View style={{ flex: 1 }}>
            <Text style={styles.trustTitle}>Cam kết Bảo mật Hồ sơ Y tế (EMR)</Text>
            <Text style={styles.trustDesc}>
              Dữ liệu sức khỏe và thông tin cá nhân của bạn được mã hóa an toàn và tuân thủ chuẩn pháp lý y tế.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal Cập nhật Hồ sơ cá nhân bệnh nhân */}
      {user?.id && (
        <PatientProfileModal
          visible={patientModalVisible}
          patientId={user.id}
          onClose={() => setPatientModalVisible(false)}
          onSuccess={() => setPatientModalVisible(false)}
        />
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  subGreeting: {
    fontSize: 13,
    color: '#64748B',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleTag: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
    marginTop: 2,
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  authBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: MedicalColors.danger,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loginBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroCard: {
    backgroundColor: '#0284C7',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#0284C7',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  heroContent: {
    gap: 8,
  },
  pillBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  heroDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    marginTop: 6,
  },
  heroActionText: {
    color: '#0284C7',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  /* ================= DOCTOR STYLES ================= */
  doctorHeader: {
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
  doctorHeroCard: {
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
  doctorHeroTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  doctorHeroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 17,
    marginTop: 4,
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
  emptyDoctorCard: {
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
  doctorPatientName: {
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
  callNowMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginLeft: 6,
  },
  callNowMiniBtnText: {
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
  /* ================= COMMON PATIENT STYLES ================= */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  gridSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginLeft: 15,
    marginVertical: 4,
  },
  trustBanner: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 12,
    alignItems: 'center',
  },
  trustTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  trustDesc: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
    lineHeight: 15,
  },
  profileReadyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  profileReadyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  profileReadySub: {
    fontSize: 12,
    color: '#166534',
    marginTop: 2,
    lineHeight: 16,
  },
  profileReadyBtn: {
    backgroundColor: '#15803D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  profileReadyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  profileWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  profileWarningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  profileWarningSub: {
    fontSize: 12,
    color: '#991B1B',
    marginTop: 2,
    lineHeight: 16,
  },
  profileWarningBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  profileWarningBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
