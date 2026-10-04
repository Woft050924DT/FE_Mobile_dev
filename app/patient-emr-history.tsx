import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MedicalColors } from '../constants/Colors';
import { api } from '../services/api';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface DoctorPatientItem {
  id: string;
  full_name: string;
  phone: string;
  address?: string;
  gender?: string;
  date_of_birth?: string;
  total_examinations?: number;
  last_examined_at?: string;
  last_diagnosis?: string;
  last_icd_code?: string | null;
  has_pending_visit?: boolean;
  latest_appointment_id?: string;
  latest_appointment_status?: string;
  initial_symptoms?: string;
}

const DEFAULT_DOCTOR_PATIENTS: DoctorPatientItem[] = [
  {
    id: 'pat-001',
    full_name: 'Nguyễn Văn Bệnh Nhân',
    phone: '0912345678',
    address: 'Số 144 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    gender: 'male',
    date_of_birth: '1988-06-15',
    total_examinations: 2,
    last_examined_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    last_diagnosis: 'Viêm phế quản cấp tính',
    last_icd_code: 'J20',
    has_pending_visit: true,
    latest_appointment_id: 'doc-apt-1',
    latest_appointment_status: 'confirmed',
    initial_symptoms: 'Sốt cao 38.8°C, đau rát họng, nuốt vướng từ tối qua',
  },
  {
    id: 'pat-002',
    full_name: 'Trần Thị Mai',
    phone: '0988776655',
    address: 'Phòng 402, Chung cư Sunrise, Cầu Giấy, Hà Nội',
    gender: 'female',
    date_of_birth: '1982-11-20',
    total_examinations: 1,
    last_examined_at: new Date().toISOString(),
    last_diagnosis: 'Đau thắt lưng cơ năng cấp tính',
    last_icd_code: 'M54.5',
    has_pending_visit: true,
    latest_appointment_id: 'doc-apt-2',
    latest_appointment_status: 'in_progress',
    initial_symptoms: 'Đau thắt lưng dữ dội khi cúi gập người, cần khám ngoại trú',
  },
  {
    id: 'pat-003',
    full_name: 'Lê Văn Cường',
    phone: '0933221100',
    address: 'Số 12 Giải Phóng, Hai Bà Trưng, Hà Nội',
    gender: 'male',
    date_of_birth: '1966-03-08',
    total_examinations: 3,
    last_examined_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    last_diagnosis: 'Tái khám Viêm họng cấp sung huyết',
    last_icd_code: 'J02',
    has_pending_visit: false,
    latest_appointment_id: 'doc-apt-3',
    latest_appointment_status: 'completed',
    initial_symptoms: 'Tái khám sau 5 ngày điều trị viêm phế quản',
  },
  {
    id: 'pat-004',
    full_name: 'Phạm Thị Hoa',
    phone: '0971239876',
    address: 'Số 56 Phố Hoàng Cầu, Ô Chợ Dừa, Đống Đa, Hà Nội',
    gender: 'female',
    date_of_birth: '1995-09-12',
    total_examinations: 1,
    last_examined_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    last_diagnosis: 'Viêm mũi xoang dị ứng thời tiết',
    last_icd_code: 'J30',
    has_pending_visit: false,
    latest_appointment_id: 'doc-apt-4',
    latest_appointment_status: 'completed',
    initial_symptoms: 'Hắt hơi sổ mũi nhiều, nghẹt mũi về đêm',
  },
];

export default function PatientEmrHistoryScreen() {
  const {
    patientId: initialPatientId,
    appointmentId: initialAppointmentId,
    patientName: initialPatientName,
    address: initialAddress,
  } = useLocalSearchParams<{
    patientId?: string;
    appointmentId?: string;
    patientName?: string;
    address?: string;
  }>();

  const router = useRouter();

  // State chọn bệnh nhân
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    initialPatientId || null
  );
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(
    initialAppointmentId || null
  );

  // Danh sách bệnh nhân của bác sĩ
  const [doctorPatients, setDoctorPatients] = useState<DoctorPatientItem[]>(DEFAULT_DOCTOR_PATIENTS);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'examined' | 'today'>('all');

  // Dữ liệu chi tiết EMR của bệnh nhân được chọn
  const [isLoadingEmr, setIsLoadingEmr] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [medicalHistories, setMedicalHistories] = useState<any[]>([]);

  useEffect(() => {
    fetchDoctorPatientsList();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientEmrData(selectedPatientId);
    }
  }, [selectedPatientId]);

  // Lấy danh sách bệnh nhân mà đúng bác sĩ này đã hoặc đang khám
  const fetchDoctorPatientsList = async () => {
    try {
      setIsLoadingPatients(true);
      // 1. Thử gọi API chuyên dụng /examinations/doctor/my-patients
      const res = await api.get('/examinations/doctor/my-patients').catch(() => null);
      if (res?.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setDoctorPatients(res.data.data);
        return;
      }

      // 2. Thử lấy từ /appointments của bác sĩ
      const aptRes = await api.get('/appointments').catch(() => null);
      const appointments =
        aptRes?.data?.data?.data ||
        aptRes?.data?.data?.items ||
        (Array.isArray(aptRes?.data?.data) ? aptRes.data.data : []);

      if (appointments.length > 0) {
        const pMap = new Map<string, DoctorPatientItem>();
        for (const apt of appointments) {
          const p = apt.patients;
          if (!p) continue;
          if (!pMap.has(p.id)) {
            pMap.set(p.id, {
              id: p.id,
              full_name: p.full_name || 'Bệnh nhân',
              phone: p.phone || '',
              address: apt.visit_address || p.address || '',
              gender: p.gender || 'other',
              total_examinations: apt.status === 'completed' ? 1 : 0,
              last_examined_at: apt.scheduled_at,
              last_diagnosis: apt.note || 'Lịch hẹn khám tại nhà',
              has_pending_visit: apt.status === 'confirmed' || apt.status === 'in_progress',
              latest_appointment_id: apt.id,
              latest_appointment_status: apt.status,
              initial_symptoms: apt.note,
            });
          }
        }
        if (pMap.size > 0) {
          setDoctorPatients(Array.from(pMap.values()));
          return;
        }
      }

      // 3. Fallback mock list phong phú
      setDoctorPatients(DEFAULT_DOCTOR_PATIENTS);
    } catch {
      setDoctorPatients(DEFAULT_DOCTOR_PATIENTS);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  // Lấy chi tiết hồ sơ bệnh án EMR của 1 bệnh nhân cụ thể
  const fetchPatientEmrData = async (patId: string) => {
    try {
      setIsLoadingEmr(true);
      const [sumRes, histRes] = await Promise.all([
        api.get(`/patients/${patId}/summary`).catch(() => null),
        api.get(`/patients/${patId}/medical-history`).catch(() => null),
      ]);

      if (sumRes?.data?.data) {
        setSummaryData(sumRes.data.data);
      }
      if (histRes?.data?.data) {
        setMedicalHistories(Array.isArray(histRes.data.data) ? histRes.data.data : []);
      }

      // Nếu không có dữ liệu từ backend, nạp mock dữ liệu sinh động tương ứng với bệnh nhân được chọn
      if (!sumRes?.data?.data) {
        const found = doctorPatients.find((p) => p.id === patId);
        setSummaryData({
          patient: {
            id: patId,
            full_name: found?.full_name || initialPatientName || 'Nguyễn Văn Bệnh Nhân',
            phone: found?.phone || '0912345678',
            address: found?.address || initialAddress || '123 Đường Giải Phóng, Hà Nội',
            gender: found?.gender || 'male',
            date_of_birth: found?.date_of_birth || '1988-06-15',
          },
          activeCskh: {
            full_name: 'CSKH Trần Thị Bích (Phụ trách)',
            phone: '0903456789',
          },
          upcomingFollowUps: [
            {
              id: 'fu-1',
              next_visit_date: new Date(Date.now() + 86400000 * 3).toISOString(),
              status: 'scheduled',
            },
          ],
          recentExaminations: [
            {
              id: 'ex-101',
              examined_at: new Date(Date.now() - 86400000 * 15).toISOString(),
              diagnosis_note: 'Bệnh nhân có ran rít phế quản, ho có đờm vàng, sốt 38.5 độ C.',
              diseases: { name: found?.last_diagnosis || 'Viêm phế quản cấp tính', icd_code: found?.last_icd_code || 'J20' },
              users: { full_name: 'BS. CK1 Hoàng Minh Tâm (Bạn đã khám)' },
              examination_symptoms: [
                { symptoms: { name: 'Sốt cao (>38.5°C)' } },
                { symptoms: { name: 'Ho có đờm rải rác' } },
              ],
            },
            {
              id: 'ex-100',
              examined_at: new Date(Date.now() - 86400000 * 45).toISOString(),
              diagnosis_note: 'Viêm họng cấp sung huyết, amidan sưng to độ II.',
              diseases: { name: 'Viêm họng cấp tính', icd_code: 'J02' },
              users: { full_name: 'BS. CK1 Hoàng Minh Tâm (Bạn đã khám)' },
              examination_symptoms: [
                { symptoms: { name: 'Đau rát họng' } },
                { symptoms: { name: 'Nuốt vướng' } },
              ],
            },
          ],
          recentPrescriptions: [
            {
              id: 'pr-101',
              created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
              prescription_items: [
                {
                  products: { name: 'Augmentin 1g (Amoxicillin/Clavulanate)' },
                  quantity: 14,
                  dosage: 'Uống 1 viên/lần x 2 lần/ngày sau ăn',
                  duration_days: 7,
                },
                {
                  products: { name: 'Paracetamol 500mg (Hasan)' },
                  quantity: 10,
                  dosage: 'Uống 1 viên khi sốt trên 38.5°C',
                  duration_days: 3,
                },
              ],
            },
          ],
        });

        setMedicalHistories([
          { condition_name: 'Dị ứng Penicillin / Amoxicillin', note: 'Gây mẩn ngứa, nổi mề đay nhẹ' },
          { condition_name: 'Tăng huyết áp độ 1', note: 'Đang theo dõi kiểm soát bằng lối sống' },
        ]);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingEmr(false);
    }
  };

  const handleSelectPatient = (patient: DoctorPatientItem) => {
    setSelectedPatientId(patient.id);
    if (patient.latest_appointment_id) {
      setSelectedAppointmentId(patient.latest_appointment_id);
    }
  };

  const handleBackToPatientList = () => {
    setSelectedPatientId(null);
    setSelectedAppointmentId(null);
    setSummaryData(null);
  };

  // Lọc danh sách bệnh nhân
  const filteredPatients = doctorPatients.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      p.full_name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.address && p.address.toLowerCase().includes(q)) ||
      (p.last_diagnosis && p.last_diagnosis.toLowerCase().includes(q));

    if (!matchQuery) return false;

    if (filterTab === 'examined') {
      return (p.total_examinations || 0) > 0;
    }
    if (filterTab === 'today') {
      return p.has_pending_visit === true;
    }
    return true;
  });

  // =========================================================================
  // GIAO DIỆN 1: NẾU CHƯA CHỌN BỆNH NHÂN -> HIỂN THỊ DANH SÁCH BỆNH NHÂN CỦA BÁC SĨ
  // =========================================================================
  if (!selectedPatientId) {
    return (
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Tra Cứu Bệnh Án EMR</Text>
            <Text style={styles.headerSubtitle}>
              Danh sách bệnh nhân bác sĩ đã & đang phụ trách khám
            </Text>
          </View>
        </View>

        {/* Thanh tìm kiếm */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên bệnh nhân, SĐT, chẩn đoán..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterTabsRow}>
            <TouchableOpacity
              style={[styles.filterTab, filterTab === 'all' && styles.filterTabActive]}
              onPress={() => setFilterTab('all')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filterTab === 'all' && styles.filterTabTextActive,
                ]}
              >
                Tất cả ({doctorPatients.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filterTab === 'today' && styles.filterTabActive]}
              onPress={() => setFilterTab('today')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filterTab === 'today' && styles.filterTabTextActive,
                ]}
              >
                Chờ khám hôm nay ({doctorPatients.filter((p) => p.has_pending_visit).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filterTab === 'examined' && styles.filterTabActive]}
              onPress={() => setFilterTab('examined')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filterTab === 'examined' && styles.filterTabTextActive,
                ]}
              >
                Đã khám xong ({doctorPatients.filter((p) => (p.total_examinations || 0) > 0).length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Danh sách thẻ bệnh nhân */}
        <ScrollView contentContainerStyle={styles.patientListContainer} showsVerticalScrollIndicator={false}>
          {isLoadingPatients ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={MedicalColors.primary} />
              <Text style={styles.loadingText}>Đang tải danh sách bệnh nhân của bác sĩ...</Text>
            </View>
          ) : filteredPatients.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Không tìm thấy bệnh nhân</Text>
              <Text style={styles.emptySubText}>
                Thử thay đổi từ khóa tìm kiếm hoặc chuyển sang bộ lọc khác
              </Text>
            </View>
          ) : (
            filteredPatients.map((p) => {
              const isToday = p.has_pending_visit;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.patientItemCard, isToday && styles.patientItemCardToday]}
                  onPress={() => handleSelectPatient(p)}
                  activeOpacity={0.85}
                >
                  <View style={styles.patientItemTop}>
                    <View style={styles.patientAvatar}>
                      <Ionicons
                        name={p.gender === 'female' ? 'person-circle-outline' : 'person'}
                        size={24}
                        color="#0284C7"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.patientItemName}>{p.full_name}</Text>
                        {isToday ? (
                          <View style={styles.tagToday}>
                            <Text style={styles.tagTodayText}>Có lịch hôm nay</Text>
                          </View>
                        ) : (
                          <View style={styles.tagExamined}>
                            <Text style={styles.tagExaminedText}>Đã khám xong</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.patientItemSub}>
                        {p.gender === 'male' ? 'Nam' : 'Nữ'}
                        {p.date_of_birth ? ` • Năm sinh ${p.date_of_birth.slice(0, 4)}` : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Địa chỉ & SĐT */}
                  <View style={styles.patientInfoBlock}>
                    <TouchableOpacity
                      style={styles.phoneRow}
                      onPress={() => Linking.openURL(`tel:${p.phone}`)}
                    >
                      <Ionicons name="call" size={13} color="#0284C7" />
                      <Text style={styles.phoneText}>{p.phone}</Text>
                      <Text style={styles.callHint}>(Nhấn để gọi)</Text>
                    </TouchableOpacity>

                    {p.address ? (
                      <View style={styles.addressRow}>
                        <Ionicons name="location" size={13} color="#64748B" />
                        <Text style={styles.addressText} numberOfLines={2}>
                          {p.address}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Lịch sử khám gần nhất */}
                  <View style={styles.lastExamBox}>
                    <View style={styles.lastExamHeader}>
                      <MaterialCommunityIcons name="stethoscope" size={15} color="#0D9488" />
                      <Text style={styles.lastExamTitle}>Chẩn đoán gần nhất:</Text>
                      {p.last_icd_code && (
                        <View style={styles.miniIcdTag}>
                          <Text style={styles.miniIcdText}>{p.last_icd_code}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.lastExamDiagnosis} numberOfLines={2}>
                      {p.last_diagnosis || 'Chưa có thông tin'}
                    </Text>
                    <View style={styles.examMetaRow}>
                      <Text style={styles.examMetaText}>
                        🗓️ {p.last_examined_at ? new Date(p.last_examined_at).toLocaleDateString('vi-VN') : 'Mới'}
                      </Text>
                      <Text style={styles.examMetaText}>
                        🩺 Đã khám: {p.total_examinations || 0} lần
                      </Text>
                    </View>
                  </View>

                  {/* Nút hành động */}
                  <View style={styles.cardActionsRow}>
                    <View style={styles.viewEmrBtn}>
                      <MaterialCommunityIcons name="file-document-outline" size={16} color="#0284C7" />
                      <Text style={styles.viewEmrBtnText}>Xem Hồ Sơ Bệnh Án EMR</Text>
                      <Ionicons name="arrow-forward" size={14} color="#0284C7" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  }

  // =========================================================================
  // GIAO DIỆN 2: ĐÃ CHỌN BỆNH NHÂN -> HIỂN THỊ CHI TIẾT HỒ SƠ BỆNH ÁN EMR
  // =========================================================================
  const patient = summaryData?.patient;
  const examinations = summaryData?.recentExaminations || [];
  const prescriptions = summaryData?.recentPrescriptions || [];
  const selectedPatientObj = doctorPatients.find((p) => p.id === selectedPatientId);

  return (
    <View style={styles.container}>
      {/* Top Bar với nút quay lại danh sách chọn bệnh nhân */}
      <View style={styles.emrTopBar}>
        <TouchableOpacity style={styles.switchPatientBtn} onPress={handleBackToPatientList}>
          <Ionicons name="arrow-back" size={18} color="#0284C7" />
          <Text style={styles.switchPatientBtnText}>Chọn bệnh nhân khác</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => fetchPatientEmrData(selectedPatientId)}
        >
          <Ionicons name="refresh" size={18} color="#64748B" />
        </TouchableOpacity>
      </View>

      {isLoadingEmr ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={MedicalColors.primary} />
          <Text style={styles.loadingText}>Đang tải hồ sơ bệnh án điện tử...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Patient Profile Card */}
          <View style={styles.patientCard}>
            <View style={styles.avatarBox}>
              <Ionicons name="person" size={26} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.patientName}>{patient?.full_name || selectedPatientObj?.full_name || 'Bệnh nhân'}</Text>
                <View style={styles.activePatientTag}>
                  <Text style={styles.activePatientTagText}>Bệnh nhân của bạn</Text>
                </View>
              </View>
              <Text style={styles.patientSub}>
                Giới tính: {patient?.gender === 'male' ? 'Nam' : 'Nữ'} • Năm sinh:{' '}
                {patient?.date_of_birth ? patient.date_of_birth.slice(0, 4) : '1988'} • SĐT: {patient?.phone || selectedPatientObj?.phone || '0912345678'}
              </Text>
              <Text style={styles.patientAddress}>
                📍 {patient?.address || selectedPatientObj?.address || initialAddress || 'Địa chỉ chưa cập nhật'}
              </Text>
            </View>
          </View>

          {/* ⚠️ CẢNH BÁO BỆNH NỀN & DỊ ỨNG THUỐC */}
          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Ionicons name="warning" size={18} color="#D97706" />
              <Text style={styles.alertTitle}>TIỀN SỬ BỆNH LÝ & CẢNH BÁO DỊ ỨNG THUỐC</Text>
            </View>

            {medicalHistories.length > 0 ? (
              medicalHistories.map((h, idx) => (
                <View key={idx} style={styles.warnChip}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.warnText}>{h.condition_name || h.name}</Text>
                    {h.note && <Text style={styles.warnNote}>Ghi chú: {h.note}</Text>}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noWarnText}>
                Chưa ghi nhận tiền sử dị ứng thuốc hay bệnh lý nền mạn tính nguy hiểm.
              </Text>
            )}
          </View>

          {/* CSKH PHỤ TRÁCH (Rule 1: Single Active CSKH) */}
          {summaryData?.activeCskh && (
            <View style={styles.cskhCard}>
              <MaterialCommunityIcons name="headset" size={20} color="#0D9488" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cskhTitle}>Nhân viên CSKH phụ trách:</Text>
                <Text style={styles.cskhName}>
                  {summaryData.activeCskh.full_name} ({summaryData.activeCskh.phone})
                </Text>
              </View>
            </View>
          )}

          {/* TIMELINE CÁC ĐỢT KHÁM TRƯỚC (Examinations History) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="timeline-clock-outline" size={22} color="#0284C7" />
              <Text style={styles.sectionTitle}>
                Dòng Thời Gian Các Đợt Khám Trước ({examinations.length})
              </Text>
            </View>

            {examinations.length === 0 ? (
              <View style={styles.emptyHistoryCard}>
                <Text style={styles.emptyHistoryText}>Đây là lần khám đầu tiên của bệnh nhân với bác sĩ.</Text>
              </View>
            ) : (
              examinations.map((exam: any, idx: number) => (
                <View key={idx} style={styles.timelineItem}>
                  <View style={styles.timelineMarker}>
                    <View style={styles.timelineDot} />
                    {idx < examinations.length - 1 && <View style={styles.timelineLine} />}
                  </View>

                  <View style={styles.timelineContent}>
                    <View style={styles.examDateRow}>
                      <Text style={styles.examDate}>
                        {new Date(exam.examined_at).toLocaleDateString('vi-VN')}
                      </Text>
                      <View style={styles.icdTag}>
                        <Text style={styles.icdTagText}>
                          {exam.diseases?.icd_code || 'ICD-10'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.diseaseTitle}>
                      {exam.diseases?.name || 'Khám bệnh tại nhà'}
                    </Text>
                    <Text style={styles.doctorName}>
                      Bác sĩ khám: {exam.users?.full_name || 'BS. CK1 Hoàng Minh Tâm'}
                    </Text>

                    {exam.diagnosis_note && (
                      <Text style={styles.diagNote}>
                        👉 Kết luận: {exam.diagnosis_note}
                      </Text>
                    )}

                    {exam.examination_symptoms && exam.examination_symptoms.length > 0 && (
                      <View style={styles.symptomRow}>
                        {exam.examination_symptoms.map((s: any, sIdx: number) => (
                          <View key={sIdx} style={styles.symptomChip}>
                            <Text style={styles.symptomChipText}>
                              • {s.symptoms?.name || s.symptom?.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>

          {/* LỊCH SỬ CÁC ĐƠN THUỐC ĐÃ KÊ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt-outline" size={22} color="#7C3AED" />
              <Text style={styles.sectionTitle}>
                Lịch Sử Đơn Thuốc Đã Kê ({prescriptions.length})
              </Text>
            </View>

            {prescriptions.length === 0 ? (
              <View style={styles.emptyHistoryCard}>
                <Text style={styles.emptyHistoryText}>Chưa có lịch sử đơn thuốc nào trước đây.</Text>
              </View>
            ) : (
              prescriptions.map((pres: any, idx: number) => (
                <View key={idx} style={styles.prescriptionCard}>
                  <Text style={styles.presDate}>
                    Đơn thuốc ngày: {new Date(pres.created_at).toLocaleDateString('vi-VN')}
                  </Text>
                  {pres.prescription_items?.map((item: any, iIdx: number) => (
                    <View key={iIdx} style={styles.medRow}>
                      <Text style={styles.medName}>
                        {iIdx + 1}. {item.products?.name || item.product?.name || 'Thuốc ngoại trú'}
                      </Text>
                      <Text style={styles.medDosage}>Cách dùng: {item.dosage}</Text>
                      <Text style={styles.medQty}>
                        SL: {item.quantity} | Dùng trong: {item.duration_days || 5} ngày
                      </Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>

          {/* Disclaimer Banner */}
          <DisclaimerBanner />
        </ScrollView>
      )}

      {/* Floating Action Button at Bottom */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.examineNowBtn}
          onPress={() =>
            router.push({
              pathname: '/doctor-examination',
              params: {
                appointmentId: selectedAppointmentId || selectedPatientObj?.latest_appointment_id || 'doc-apt-1',
                patientId: selectedPatientId,
                patientName: encodeURIComponent(patient?.full_name || selectedPatientObj?.full_name || ''),
                address: encodeURIComponent(patient?.address || selectedPatientObj?.address || initialAddress || ''),
                symptoms: encodeURIComponent(selectedPatientObj?.initial_symptoms || ''),
              },
            })
          }
        >
          <Ionicons name="medical" size={20} color="#FFFFFF" />
          <Text style={styles.examineNowBtnText}>
            Tiến Hành Khám Ca Này & Kê Đơn →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  searchSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterTabActive: {
    backgroundColor: '#0284C7',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  patientListContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  centerLoading: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  patientItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  patientItemCardToday: {
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
  },
  patientItemTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientItemName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  patientItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  tagToday: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tagTodayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  tagExamined: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  tagExaminedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  patientInfoBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  callHint: {
    fontSize: 11,
    color: '#94A3B8',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  addressText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 17,
  },
  lastExamBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  lastExamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lastExamTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  miniIcdTag: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  miniIcdText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
  },
  lastExamDiagnosis: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  examMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 6,
  },
  examMetaText: {
    fontSize: 11,
    color: '#64748B',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  },
  viewEmrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  viewEmrBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },

  // EMR DETAIL SCREEN STYLES
  emrTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  switchPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  switchPatientBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
    gap: 14,
  },
  patientCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  activePatientTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activePatientTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  patientSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  patientAddress: {
    fontSize: 12,
    color: '#334155',
    marginTop: 4,
  },
  alertCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  warnChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  warnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  warnNote: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  noWarnText: {
    fontSize: 12,
    color: '#65A30D',
    fontStyle: 'italic',
  },
  cskhCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  cskhTitle: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '600',
  },
  cskhName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#134E4A',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyHistoryCard: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineMarker: {
    alignItems: 'center',
    width: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0284C7',
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginBottom: 10,
  },
  examDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  examDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  icdTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  icdTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  diseaseTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  doctorName: {
    fontSize: 12,
    color: '#64748B',
  },
  diagNote: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },
  symptomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  symptomChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  symptomChipText: {
    fontSize: 11,
    color: '#475569',
  },
  prescriptionCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  presDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  medRow: {
    borderTopWidth: 1,
    borderTopColor: '#E9D5FF',
    paddingTop: 6,
  },
  medName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  medDosage: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  medQty: {
    fontSize: 11,
    color: '#7C3AED',
    marginTop: 2,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  examineNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0D9488',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  examineNowBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
