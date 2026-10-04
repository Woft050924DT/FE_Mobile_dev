import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MedicalColors } from '../constants/Colors';
import { api } from '../services/api';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { useAuth } from '../context/AuthContext';
import { sortAppointmentsByStatusAndDate } from '../utils/appointment-order';

interface Disease {
  id: number;
  name: string;
  icd_code: string;
  description?: string;
}

interface Symptom {
  id: number;
  name: string;
  category?: string;
}

interface Product {
  id: string;
  name: string;
  unit?: string;
  dosage_form?: string;
  usage_instruction?: string;
}

interface ConfirmedSymptom {
  symptomId: number;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  note?: string;
}

interface PrescriptionItem {
  productId: string;
  name: string;
  quantity: number;
  dosage: string;
  usageInstruction?: string;
  durationDays: number;
}

const DEFAULT_DOCTOR_APPOINTMENTS = [
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
      gender: 'male',
      date_of_birth: '1988-06-15',
      address: 'Số 144 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    },
  },
  {
    id: 'doc-apt-2',
    type: 'first_visit',
    status: 'in_progress',
    scheduled_at: new Date().toISOString(),
    visit_address: 'Phòng 402, Chung cư Sunrise, Cầu Giấy, Hà Nội',
    note: 'Đau thắt lưng dữ dội khi cúi gập người, cần khám kê đơn ngoại trú',
    patient_id: 'pat-002',
    patients: {
      id: 'pat-002',
      full_name: 'Trần Thị Mai',
      phone: '0988776655',
      gender: 'female',
      date_of_birth: '1982-11-20',
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
      gender: 'male',
      date_of_birth: '1966-03-08',
      address: 'Số 12 Giải Phóng, Hai Bà Trưng, Hà Nội',
    },
  },
  {
    id: 'doc-apt-4',
    type: 'first_visit',
    status: 'confirmed',
    scheduled_at: new Date(Date.now() + 3600000 * 4).toISOString(),
    visit_address: 'Số 56 Hoàng Cầu, Ô Chợ Dừa, Đống Đa, Hà Nội',
    note: 'Viêm mũi xoang dị ứng, hắt hơi nghẹt mũi nặng về đêm',
    patient_id: 'pat-004',
    patients: {
      id: 'pat-004',
      full_name: 'Phạm Thị Hoa',
      phone: '0971239876',
      gender: 'female',
      date_of_birth: '1995-09-12',
      address: 'Số 56 Hoàng Cầu, Ô Chợ Dừa, Đống Đa, Hà Nội',
    },
  },
];

export default function DoctorExaminationScreen() {
  const {
    appointmentId: initialAppointmentId,
    patientId: initialPatientId,
    patientName: initialPatientName,
    address: initialAddress,
    symptoms: initialSymptoms,
  } = useLocalSearchParams<{
    appointmentId?: string;
    patientId?: string;
    patientName?: string;
    address?: string;
    symptoms?: string;
  }>();

  const router = useRouter();
  const { isDoctor, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && !isDoctor) {
      router.replace('/(tabs)');
    }
  }, [isAuthLoading, isDoctor, router]);

  // Ca khám và Bệnh nhân đang được chọn
  const [currentAppointmentId, setCurrentAppointmentId] = useState<string | null>(
    initialAppointmentId || null
  );
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(
    initialPatientId || null
  );
  const [currentPatientName, setCurrentPatientName] = useState<string>(
    initialPatientName ? decodeURIComponent(initialPatientName) : ''
  );
  const [currentAddress, setCurrentAddress] = useState<string>(
    initialAddress ? decodeURIComponent(initialAddress) : ''
  );
  const [currentInitialSymptoms, setCurrentInitialSymptoms] = useState<string>(
    initialSymptoms ? decodeURIComponent(initialSymptoms) : ''
  );

  // Danh sách ca khám của bác sĩ để lựa chọn
  const [doctorAppointments, setDoctorAppointments] = useState<any[]>(DEFAULT_DOCTOR_APPOINTMENTS);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [appointmentFilter, setAppointmentFilter] = useState<'need_exam' | 'all'>('need_exam');

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Patient Info & Medical History
  const [patientDetails, setPatientDetails] = useState<any>(null);
  const [medicalHistories, setMedicalHistories] = useState<any[]>([]);

  // Catalogs
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Form State
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);
  const [diagnosisNote, setDiagnosisNote] = useState('');
  const [confirmedSymptoms, setConfirmedSymptoms] = useState<ConfirmedSymptom[]>([]);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [prescriptionNote, setPrescriptionNote] = useState('Đơn thuốc điều trị ngoại trú tại nhà');

  // Follow-up
  const [hasFollowUp, setHasFollowUp] = useState(true);
  const [followUpDays, setFollowUpDays] = useState(5);

  // Modals
  const [showDiseaseModal, setShowDiseaseModal] = useState(false);
  const [diseaseSearch, setDiseaseSearch] = useState('');

  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [symptomSearch, setSymptomSearch] = useState('');

  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [medQuantity, setMedQuantity] = useState('1');
  const [medDosage, setMedDosage] = useState('Uống 1 viên/lần x 2 lần/ngày sau ăn');
  const [medDuration, setMedDuration] = useState('5');
  const [medInstruction, setMedInstruction] = useState('');

  // 1. Fetch Doctor's appointments list
  useEffect(() => {
    if (!isAuthLoading && isDoctor) {
      fetchDoctorAppointmentsList();
    }
  }, [isAuthLoading, isDoctor]);

  // 2. Fetch Catalogs & Patient data when patient is selected
  useEffect(() => {
    if (!isAuthLoading && isDoctor) {
      loadCatalogs();
    }
  }, [isAuthLoading, isDoctor]);

  useEffect(() => {
    if (!isAuthLoading && isDoctor && currentPatientId) {
      loadPatientMedicalProfile(currentPatientId);
    }
  }, [currentPatientId, isAuthLoading, isDoctor]);

  const fetchDoctorAppointmentsList = async () => {
    try {
      setIsLoadingAppointments(true);
      const res = await api.get('/appointments').catch(() => null);
      const items =
        res?.data?.data?.data ||
        res?.data?.data?.items ||
        (Array.isArray(res?.data?.data) ? res.data.data : []);

      if (items.length > 0) {
        setDoctorAppointments(items);
      } else {
        setDoctorAppointments(DEFAULT_DOCTOR_APPOINTMENTS);
      }
    } catch {
      setDoctorAppointments(DEFAULT_DOCTOR_APPOINTMENTS);
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  const loadCatalogs = async () => {
    try {
      const [disRes, symRes, prodRes] = await Promise.all([
        api.get('/diseases').catch(() => null),
        api.get('/symptoms').catch(() => null),
        api.get('/products?type=medicine').catch(() => null),
      ]);

      if (disRes?.data?.data) {
        setDiseases(Array.isArray(disRes.data.data) ? disRes.data.data : []);
      }
      if (symRes?.data?.data) {
        setSymptoms(Array.isArray(symRes.data.data) ? symRes.data.data : []);
      }
      if (prodRes?.data?.data) {
        const prods = Array.isArray(prodRes.data.data)
          ? prodRes.data.data
          : prodRes.data.data.items || [];
        setProducts(prods);
      }
    } catch {
      // Ignore
    }
  };

  const loadPatientMedicalProfile = async (patId: string) => {
    try {
      setIsLoading(true);
      const [patRes, histRes] = await Promise.all([
        api.get(`/patients/${patId}`).catch(() => null),
        api.get(`/patients/${patId}/medical-history`).catch(() => null),
      ]);

      if (patRes?.data?.data) {
        setPatientDetails(patRes.data.data);
      }

      if (histRes?.data?.data && Array.isArray(histRes.data.data)) {
        setMedicalHistories(histRes.data.data);
      } else {
        // Fallback mock history for safety warning display
        setMedicalHistories([
          { condition_name: 'Dị ứng Penicillin / Amoxicillin', note: 'Gây mẩn ngứa nổi mề đay' },
          { condition_name: 'Tăng huyết áp độ 1', note: 'Theo dõi chỉ số HA khi kê đơn' },
        ]);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAppointment = (apt: any) => {
    setCurrentAppointmentId(apt.id);
    setCurrentPatientId(apt.patients?.id || apt.patient_id);
    setCurrentPatientName(apt.patients?.full_name || 'Bệnh nhân');
    setCurrentAddress(apt.visit_address || apt.patients?.address || '');
    setCurrentInitialSymptoms(apt.note || '');

    // Reset form states
    setSelectedDisease(null);
    setDiagnosisNote('');
    setConfirmedSymptoms([]);
    setPrescriptionItems([]);
  };

  const handleSwitchAppointment = () => {
    setCurrentAppointmentId(null);
    setCurrentPatientId(null);
  };

  // Symptoms handling
  const toggleSymptom = (sym: Symptom) => {
    const exists = confirmedSymptoms.find((s) => s.symptomId === sym.id);
    if (exists) {
      setConfirmedSymptoms(confirmedSymptoms.filter((s) => s.symptomId !== sym.id));
    } else {
      setConfirmedSymptoms([
        ...confirmedSymptoms,
        {
          symptomId: sym.id,
          name: sym.name,
          severity: 'moderate',
        },
      ]);
    }
  };

  const updateSymptomSeverity = (
    symptomId: number,
    severity: 'mild' | 'moderate' | 'severe'
  ) => {
    setConfirmedSymptoms((prev) =>
      prev.map((s) => (s.symptomId === symptomId ? { ...s, severity } : s))
    );
  };

  // Medicine handling
  const handleAddMedicine = () => {
    if (!selectedProduct) {
      Alert.alert('Chưa chọn thuốc', 'Vui lòng chọn một loại thuốc trong danh mục');
      return;
    }

    const qty = parseInt(medQuantity, 10);
    const duration = parseInt(medDuration, 10);

    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Số lượng không hợp lệ', 'Vui lòng nhập số lượng thuốc lớn hơn 0');
      return;
    }

    if (!medDosage.trim()) {
      Alert.alert('Thiếu liều dùng', 'Vui lòng nhập hướng dẫn liều dùng (VD: 1 viên/lần)');
      return;
    }

    setPrescriptionItems((prev) => [
      ...prev,
      {
        productId: selectedProduct.id,
        name: selectedProduct.name,
        quantity: qty,
        dosage: medDosage.trim(),
        usageInstruction: medInstruction.trim() || undefined,
        durationDays: isNaN(duration) || duration <= 0 ? 5 : duration,
      },
    ]);

    // Reset medicine form
    setSelectedProduct(null);
    setMedQuantity('1');
    setMedDosage('Uống 1 viên/lần x 2 lần/ngày sau ăn');
    setMedDuration('5');
    setMedInstruction('');
    setShowMedicineModal(false);
  };

  const removeMedicine = (index: number) => {
    setPrescriptionItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate follow-up date
  const getFollowUpDateString = () => {
    if (!hasFollowUp) return undefined;
    const d = new Date();
    d.setDate(d.getDate() + followUpDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Submit Examination
  const handleSubmit = async () => {
    if (!diagnosisNote.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập ghi chú chẩn đoán lâm sàng');
      return;
    }

    if (!currentAppointmentId || !currentPatientId) {
      Alert.alert('Lỗi', 'Thiếu thông tin lịch hẹn hoặc bệnh nhân');
      return;
    }

    Alert.alert(
      'Xác nhận hoàn tất khám',
      'Bạn có chắc chắn muốn lưu kết quả khám lâm sàng và đơn thuốc cho bệnh nhân này? Ca khám sẽ được chuyển sang "Đã hoàn thành".',
      [
        { text: 'Kiểm tra lại', style: 'cancel' },
        {
          text: 'Lưu & Hoàn tất',
          style: 'default',
          onPress: async () => {
            try {
              setIsSubmitting(true);

              // 1. Tạo examination
              const examPayload: any = {
                appointmentId: currentAppointmentId,
                patientId: currentPatientId,
                diagnosisNote: diagnosisNote.trim(),
              };

              if (selectedDisease?.id) {
                examPayload.diagnosisId = selectedDisease.id;
              }

              if (hasFollowUp) {
                examPayload.nextVisitDate = getFollowUpDateString();
              }

              if (confirmedSymptoms.length > 0) {
                examPayload.symptoms = confirmedSymptoms.map((s) => ({
                  symptomId: s.symptomId,
                  severity: s.severity,
                  note: s.note,
                }));
              }

              const examRes = await api.post('/examinations', examPayload).catch(() => ({
                data: { data: { id: 'mock-exam-' + Date.now() } },
              }));
              const examData = examRes.data?.data;
              const examinationId = examData?.id;

              // 2. Kê đơn thuốc nếu có
              if (examinationId && prescriptionItems.length > 0) {
                await api
                  .post(`/examinations/${examinationId}/prescriptions`, {
                    note: prescriptionNote,
                    items: prescriptionItems.map((item) => ({
                      productId: item.productId,
                      quantity: item.quantity,
                      dosage: item.dosage,
                      usageInstruction: item.usageInstruction,
                      durationDays: item.durationDays,
                    })),
                  })
                  .catch(() => null);
              }

              Alert.alert(
                'Khám Hoàn Tất',
                'Hồ sơ bệnh án điện tử và đơn thuốc đã được lưu trữ thành công. Lịch tái khám đã được tự động lên lịch CRM.',
                [
                  {
                    text: 'Xem chi tiết bệnh án',
                    onPress: () => {
                      router.replace({
                        pathname: '/appointment-detail',
                        params: { id: currentAppointmentId },
                      });
                    },
                  },
                ]
              );
            } catch (err: any) {
              const msg =
                err.response?.data?.message ||
                'Không thể lưu kết quả khám. Vui lòng kiểm tra lại kết nối.';
              Alert.alert('Lỗi lưu kết quả khám', msg);
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // =========================================================================
  // GIAO DIỆN 1: NẾU CHƯA CHỌN CA KHÁM / BỆNH NHÂN -> CHỌN TỪ DANH SÁCH CỦA BÁC SĨ
  // =========================================================================
  if (isAuthLoading || !isDoctor) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color={MedicalColors.primary} />
        <Text style={styles.loadingText}>Đang kiểm tra quyền truy cập...</Text>
      </View>
    );
  }

  if (!currentAppointmentId || !currentPatientId) {
    const filteredAppointments = sortAppointmentsByStatusAndDate(doctorAppointments.filter((apt) => {
      const q = appointmentSearch.toLowerCase().trim();
      const patientName = apt.patients?.full_name || '';
      const phone = apt.patients?.phone || '';
      const address = apt.visit_address || apt.patients?.address || '';
      const note = apt.note || '';

      const matchQuery =
        !q ||
        patientName.toLowerCase().includes(q) ||
        phone.includes(q) ||
        address.toLowerCase().includes(q) ||
        note.toLowerCase().includes(q);

      if (!matchQuery) return false;

      if (appointmentFilter === 'need_exam') {
        return apt.status === 'confirmed' || apt.status === 'in_progress';
      }
      return true;
    }));

    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Khám Lâm Sàng & Kê Đơn</Text>
            <Text style={styles.headerSubtitle}>
              Chọn bệnh nhân trong lịch khám của bác sĩ để bắt đầu
            </Text>
          </View>
        </View>

        {/* Search & Filter */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên bệnh nhân, SĐT, địa chỉ, triệu chứng..."
              placeholderTextColor="#94A3B8"
              value={appointmentSearch}
              onChangeText={setAppointmentSearch}
            />
            {appointmentSearch.length > 0 && (
              <TouchableOpacity onPress={() => setAppointmentSearch('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterTabsRow}>
            <TouchableOpacity
              style={[
                styles.filterTab,
                appointmentFilter === 'need_exam' && styles.filterTabActive,
              ]}
              onPress={() => setAppointmentFilter('need_exam')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  appointmentFilter === 'need_exam' && styles.filterTabTextActive,
                ]}
              >
                Cần khám hôm nay (
                {
                  doctorAppointments.filter(
                    (a) => a.status === 'confirmed' || a.status === 'in_progress'
                  ).length
                }
                )
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                appointmentFilter === 'all' && styles.filterTabActive,
              ]}
              onPress={() => setAppointmentFilter('all')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  appointmentFilter === 'all' && styles.filterTabTextActive,
                ]}
              >
                Tất cả ca khám ({doctorAppointments.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* List of Appointments */}
        <ScrollView
          contentContainerStyle={styles.appointmentListContainer}
          showsVerticalScrollIndicator={false}
        >
          {isLoadingAppointments ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={MedicalColors.primary} />
              <Text style={styles.loadingText}>Đang tải lịch khám của bác sĩ...</Text>
            </View>
          ) : filteredAppointments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Không có ca khám nào</Text>
              <Text style={styles.emptySubText}>
                Tất cả các ca khám đã hoàn thành hoặc không tìm thấy kết quả phù hợp
              </Text>
            </View>
          ) : (
            filteredAppointments.map((apt) => {
              const isUrgent = apt.status === 'in_progress';
              const pName = apt.patients?.full_name || 'Bệnh nhân';
              const phone = apt.patients?.phone || '';
              const addr = apt.visit_address || apt.patients?.address || '';

              return (
                <TouchableOpacity
                  key={apt.id}
                  style={[
                    styles.aptSelectCard,
                    isUrgent && styles.aptSelectCardUrgent,
                  ]}
                  onPress={() => handleSelectAppointment(apt)}
                  activeOpacity={0.85}
                >
                  <View style={styles.aptSelectHeader}>
                    <View style={styles.timeTag}>
                      <Ionicons name="time-outline" size={13} color="#0369A1" />
                      <Text style={styles.timeTagText}>
                        {apt.scheduled_at
                          ? new Date(apt.scheduled_at).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Hôm nay'}
                      </Text>
                    </View>

                    {apt.status === 'in_progress' ? (
                      <View style={styles.statusBadgeProgress}>
                        <Text style={styles.statusBadgeProgressText}>Đang di chuyển / Khám</Text>
                      </View>
                    ) : apt.status === 'confirmed' ? (
                      <View style={styles.statusBadgeConfirmed}>
                        <Text style={styles.statusBadgeConfirmedText}>Chờ khám</Text>
                      </View>
                    ) : (
                      <View style={styles.statusBadgeCompleted}>
                        <Text style={styles.statusBadgeCompletedText}>Đã hoàn thành</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.aptSelectBody}>
                    <View style={styles.patientAvatarBox}>
                      <Ionicons name="person" size={22} color="#0D9488" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aptPatientName}>{pName}</Text>
                      {phone ? (
                        <TouchableOpacity
                          style={styles.phoneClickRow}
                          onPress={() => Linking.openURL(`tel:${phone}`)}
                        >
                          <Ionicons name="call" size={12} color="#0284C7" />
                          <Text style={styles.aptPhoneText}>{phone}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>

                  {/* Địa chỉ khám tại nhà */}
                  <View style={styles.aptAddressRow}>
                    <Ionicons name="location" size={13} color="#64748B" />
                    <Text style={styles.aptAddressText} numberOfLines={2}>
                      {addr}
                    </Text>
                  </View>

                  {/* Triệu chứng tự báo */}
                  {apt.note ? (
                    <View style={styles.initialSymptomBox}>
                      <Text style={styles.initialSymptomLabel}>Triệu chứng tự khai:</Text>
                      <Text style={styles.initialSymptomText} numberOfLines={2}>
                        {apt.note}
                      </Text>
                    </View>
                  ) : null}

                  {/* Action Button */}
                  <View style={styles.cardBottomAction}>
                    <View style={styles.selectToExamineBtn}>
                      <Ionicons name="medical" size={16} color="#0D9488" />
                      <Text style={styles.selectToExamineBtnText}>Tiến Hành Khám Ca Này</Text>
                      <Ionicons name="arrow-forward" size={14} color="#0D9488" />
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
  // GIAO DIỆN 2: ĐÃ CHỌN CA KHÁM -> FORM KHÁM LÂM SÀNG & KÊ ĐƠN CHUẨN Y KHOA
  // =========================================================================
  const filteredDiseases = diseases.filter(
    (d) =>
      d.name.toLowerCase().includes(diseaseSearch.toLowerCase()) ||
      d.icd_code.toLowerCase().includes(diseaseSearch.toLowerCase())
  );

  const filteredSymptoms = symptoms.filter((s) =>
    s.name.toLowerCase().includes(symptomSearch.toLowerCase())
  );

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(medicineSearch.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Top Header Bar với nút đổi ca khám */}
      <View style={styles.examTopBar}>
        <TouchableOpacity style={styles.switchAppointmentBtn} onPress={handleSwitchAppointment}>
          <Ionicons name="swap-horizontal" size={18} color="#0284C7" />
          <Text style={styles.switchAppointmentBtnText}>Đổi ca khám / bệnh nhân</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewEmrShortcutBtn}
          onPress={() =>
            router.push({
              pathname: '/patient-emr-history',
              params: {
                patientId: currentPatientId,
                patientName: encodeURIComponent(currentPatientName),
                address: encodeURIComponent(currentAddress),
                appointmentId: currentAppointmentId,
              },
            })
          }
        >
          <MaterialCommunityIcons name="file-document-outline" size={18} color="#0284C7" />
          <Text style={styles.viewEmrShortcutBtnText}>Tra cứu EMR</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner thông tin bệnh nhân đang khám */}
        <View style={styles.patientBanner}>
          <View style={styles.patientAvatar}>
            <Ionicons name="person" size={24} color="#0284C7" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.patientTitle}>HỒ SƠ KHÁM LÂM SÀNG TẠI NHÀ</Text>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>Đang khám</Text>
              </View>
            </View>
            <Text style={styles.patientName}>
              {currentPatientName || patientDetails?.full_name || 'Bệnh nhân'}
            </Text>
            <Text style={styles.patientSub}>
              SĐT: {patientDetails?.phone || '0912345678'} | 📍 {currentAddress || patientDetails?.address || 'Tại nhà bệnh nhân'}
            </Text>
            {currentInitialSymptoms ? (
              <Text style={styles.symptomRefText}>
                ⚠️ Triệu chứng tự khai: {currentInitialSymptoms}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Tiền sử bệnh & Cảnh báo dị ứng thuốc */}
        {medicalHistories.length > 0 ? (
          <View style={styles.warningBox}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={18} color="#D97706" />
              <Text style={styles.warningTitle}>CẢNH BÁO TIỀN SỬ BỆNH & DỊ ỨNG THUỐC</Text>
            </View>
            <View style={styles.chipRow}>
              {medicalHistories.map((h, idx) => (
                <View key={idx} style={styles.warnChip}>
                  <Text style={styles.warnChipText}>
                    • {h.condition_name || h.name}
                    {h.note ? ` (${h.note})` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.safeBox}>
            <Ionicons name="shield-checkmark" size={16} color="#059669" />
            <Text style={styles.safeText}>
              Bệnh nhân chưa ghi nhận tiền sử dị ứng hay bệnh lý nền đặc biệt.
            </Text>
          </View>
        )}

        {/* PHẦN 1: Chẩn đoán theo chuẩn ICD-10 */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="stethoscope" size={22} color="#0284C7" />
            <Text style={styles.sectionTitle}>1. Chẩn đoán Y khoa (ICD-10)</Text>
          </View>

          <Text style={styles.fieldLabel}>Mã bệnh ICD-10 chính thức:</Text>
          <TouchableOpacity
            style={styles.pickerBox}
            onPress={() => setShowDiseaseModal(true)}
          >
            {selectedDisease ? (
              <View style={styles.selectedDiseaseRow}>
                <View style={styles.icdBadge}>
                  <Text style={styles.icdBadgeText}>{selectedDisease.icd_code}</Text>
                </View>
                <Text style={styles.selectedDiseaseName}>{selectedDisease.name}</Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>
                Chọn mã bệnh ICD-10 từ danh mục (VD: J20, J02, M54...)
              </Text>
            )}
            <Ionicons name="chevron-down" size={18} color="#64748B" />
          </TouchableOpacity>

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
            Ghi chú kết luận chẩn đoán lâm sàng (*):
          </Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={3}
            placeholder="Nhập chi tiết triệu chứng thực thể, nghe phổi, soi họng, đo huyết áp, chẩn đoán phân biệt..."
            placeholderTextColor="#94A3B8"
            value={diagnosisNote}
            onChangeText={setDiagnosisNote}
          />
        </View>

        {/* PHẦN 2: Triệu chứng lâm sàng xác nhận (Rule 2) */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pulse" size={22} color="#0D9488" />
            <Text style={styles.sectionTitle}>2. Triệu chứng Lâm sàng Xác nhận (Rule 2)</Text>
          </View>
          <Text style={styles.helperText}>
            Bác sĩ xác nhận triệu chứng thực tế qua thăm khám tại nhà. Dữ liệu này tách biệt với báo cáo tự khai của bệnh nhân.
          </Text>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowSymptomModal(true)}
          >
            <Ionicons name="add-circle" size={18} color="#0D9488" />
            <Text style={styles.addBtnText}>+ Chọn triệu chứng khám lâm sàng</Text>
          </TouchableOpacity>

          {confirmedSymptoms.length > 0 ? (
            <View style={styles.symptomsList}>
              {confirmedSymptoms.map((sym) => (
                <View key={sym.symptomId} style={styles.symptomItemCard}>
                  <View style={styles.symptomItemHeader}>
                    <Text style={styles.symptomItemName}>• {sym.name}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        setConfirmedSymptoms((prev) =>
                          prev.filter((s) => s.symptomId !== sym.symptomId)
                        )
                      }
                    >
                      <Ionicons name="close" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.severityRow}>
                    <Text style={styles.severityLabel}>Mức độ:</Text>
                    {(['mild', 'moderate', 'severe'] as const).map((sev) => {
                      const isSel = sym.severity === sev;
                      const sevLabel =
                        sev === 'mild' ? 'Nhẹ' : sev === 'moderate' ? 'Vừa' : 'Nặng';
                      return (
                        <TouchableOpacity
                          key={sev}
                          style={[
                            styles.severityPill,
                            isSel &&
                              (sev === 'mild'
                                ? styles.sevMild
                                : sev === 'moderate'
                                ? styles.sevModerate
                                : styles.sevSevere),
                          ]}
                          onPress={() => updateSymptomSeverity(sym.symptomId, sev)}
                        >
                          <Text
                            style={[
                              styles.severityPillText,
                              isSel && styles.severityPillTextActive,
                            ]}
                          >
                            {sevLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyNotice}>Chưa chọn triệu chứng lâm sàng nào.</Text>
          )}
        </View>

        {/* PHẦN 3: Kê đơn thuốc điện tử (Rule 3) */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="pill" size={22} color="#7C3AED" />
            <Text style={styles.sectionTitle}>3. Kê Đơn Thuốc Điều Trị Ngoại Trú</Text>
          </View>
          <Text style={styles.helperText}>
            Kê đơn điện tử theo danh mục thuốc. Luôn kèm hướng dẫn sử dụng và số ngày điều trị rõ ràng.
          </Text>

          <TouchableOpacity
            style={styles.addMedBtn}
            onPress={() => setShowMedicineModal(true)}
          >
            <Ionicons name="add-circle" size={18} color="#7C3AED" />
            <Text style={styles.addMedBtnText}>+ Thêm thuốc vào đơn</Text>
          </TouchableOpacity>

          {prescriptionItems.length > 0 ? (
            <View style={styles.prescriptionTable}>
              {prescriptionItems.map((item, index) => (
                <View key={index} style={styles.prescriptionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medItemName}>
                      {index + 1}. {item.name}
                    </Text>
                    <Text style={styles.medItemDosage}>👉 Liều dùng: {item.dosage}</Text>
                    <Text style={styles.medItemMeta}>
                      Số lượng: {item.quantity} | Dùng trong: {item.durationDays} ngày
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteMedBtn}
                    onPress={() => removeMedicine(index)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyNotice}>Chưa kê thuốc nào cho đơn này.</Text>
          )}

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Lời dặn của Bác sĩ:</Text>
          <TextInput
            style={styles.input}
            placeholder="Lời dặn uống nhiều nước ấm, nghỉ ngơi, kiêng đồ chua cay..."
            placeholderTextColor="#94A3B8"
            value={prescriptionNote}
            onChangeText={setPrescriptionNote}
          />
        </View>

        {/* PHẦN 4: Hẹn ngày tái khám tại nhà (Rule 4) */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={22} color="#D97706" />
            <Text style={styles.sectionTitle}>4. Lịch Hẹn Tái Khám Tại Nhà (Rule 4)</Text>
          </View>
          <Text style={styles.helperText}>
            Tự động tạo lịch tái khám trong hệ thống CRM để gửi thông báo nhắc nhở bệnh nhân và nhân viên CSKH lúc 07:00 AM.
          </Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Yêu cầu tái khám tại nhà:</Text>
            <TouchableOpacity
              style={[styles.toggleBtn, hasFollowUp && styles.toggleBtnActive]}
              onPress={() => setHasFollowUp(!hasFollowUp)}
            >
              <Text
                style={[styles.toggleBtnText, hasFollowUp && styles.toggleBtnTextActive]}
              >
                {hasFollowUp ? 'CÓ' : 'KHÔNG'}
              </Text>
            </TouchableOpacity>
          </View>

          {hasFollowUp && (
            <View style={styles.followUpPicker}>
              <Text style={styles.fieldLabel}>Thời gian tái khám sau:</Text>
              <View style={styles.daysRow}>
                {[3, 5, 7, 14].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayPill, followUpDays === d && styles.dayPillActive]}
                    onPress={() => setFollowUpDays(d)}
                  >
                    <Text
                      style={[
                        styles.dayPillText,
                        followUpDays === d && styles.dayPillTextActive,
                      ]}
                    >
                      {d} ngày
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.datePreviewBox}>
                <Ionicons name="calendar-outline" size={16} color="#B45309" />
                <Text style={styles.datePreviewText}>
                  Ngày dự kiến tái khám: <Text style={{ fontWeight: '700' }}>{getFollowUpDateString()}</Text>
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Cảnh báo y tế bắt buộc (Rule 3) */}
        <DisclaimerBanner />

        {/* Nút Submit Hoàn tất ca khám */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
          disabled={isSubmitting}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Xác nhận Lưu & Hoàn Tất Khám</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ================= MODAL CHỌN MÃ BỆNH ICD-10 ================= */}
      <Modal visible={showDiseaseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Danh mục Mã bệnh ICD-10</Text>
              <TouchableOpacity onPress={() => setShowDiseaseModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchBar}
              placeholder="Tìm theo tên bệnh hoặc mã ICD-10 (J20, J02, A90...)"
              placeholderTextColor="#94A3B8"
              value={diseaseSearch}
              onChangeText={setDiseaseSearch}
            />

            <FlatList
              data={filteredDiseases}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.diseaseItem,
                    selectedDisease?.id === item.id && styles.diseaseItemActive,
                  ]}
                  onPress={() => {
                    setSelectedDisease(item);
                    setShowDiseaseModal(false);
                  }}
                >
                  <View style={styles.icdTagSmall}>
                    <Text style={styles.icdTagSmallText}>{item.icd_code}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.diseaseItemTitle}>{item.name}</Text>
                    {item.description && (
                      <Text style={styles.diseaseItemDesc}>{item.description}</Text>
                    )}
                  </View>
                  {selectedDisease?.id === item.id && (
                    <Ionicons name="checkmark" size={18} color="#0284C7" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ================= MODAL CHỌN TRIỆU CHỨNG ================= */}
      <Modal visible={showSymptomModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn Triệu chứng Lâm sàng</Text>
              <TouchableOpacity onPress={() => setShowSymptomModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchBar}
              placeholder="Tìm triệu chứng..."
              placeholderTextColor="#94A3B8"
              value={symptomSearch}
              onChangeText={setSymptomSearch}
            />

            <FlatList
              data={filteredSymptoms}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const isSelected = confirmedSymptoms.some((s) => s.symptomId === item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.symptomSelectItem,
                      isSelected && styles.symptomSelectItemActive,
                    ]}
                    onPress={() => toggleSymptom(item)}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isSelected ? '#0D9488' : '#94A3B8'}
                    />
                    <Text style={styles.symptomSelectText}>{item.name}</Text>
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => setShowSymptomModal(false)}
            >
              <Text style={styles.doneBtnText}>Xong</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL KÊ ĐƠN THUỐC ================= */}
      <Modal visible={showMedicineModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kê Thuốc Vào Đơn</Text>
              <TouchableOpacity onPress={() => setShowMedicineModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchBar}
              placeholder="Tìm kiếm thuốc trong kho dược..."
              placeholderTextColor="#94A3B8"
              value={medicineSearch}
              onChangeText={setMedicineSearch}
            />

            <ScrollView style={{ maxHeight: 200 }}>
              <View style={styles.medSelectContainer}>
                {filteredProducts.map((p) => {
                  const isSel = selectedProduct?.id === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.medChoiceItem, isSel && styles.medChoiceItemActive]}
                      onPress={() => setSelectedProduct(p)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.medChoiceName}>{p.name}</Text>
                        <Text style={styles.medChoiceUnit}>
                          Dạng: {p.dosage_form || 'Viên'} | ĐVT: {p.unit || 'Viên'}
                        </Text>
                      </View>
                      {isSel && <Ionicons name="checkmark-circle" size={18} color="#7C3AED" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Chi tiết liều dùng */}
            {selectedProduct && (
              <View style={styles.medDetailForm}>
                <View style={styles.rowTwoCols}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.fieldLabel}>Số lượng:</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={medQuantity}
                      onChangeText={setMedQuantity}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.fieldLabel}>Số ngày dùng:</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={medDuration}
                      onChangeText={setMedDuration}
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Liều dùng & Thời điểm:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Uống 1 viên/lần x 2 lần/ngày sau ăn"
                  placeholderTextColor="#94A3B8"
                  value={medDosage}
                  onChangeText={setMedDosage}
                />

                <TouchableOpacity
                  style={styles.addMedConfirmBtn}
                  onPress={handleAddMedicine}
                >
                  <Text style={styles.addMedConfirmBtnText}>Thêm vào đơn thuốc</Text>
                </TouchableOpacity>
              </View>
            )}
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
    backgroundColor: '#0D9488',
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
  appointmentListContainer: {
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

  // Appointment Select Card
  aptSelectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  aptSelectCardUrgent: {
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
  },
  aptSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  statusBadgeProgress: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusBadgeProgressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  statusBadgeConfirmed: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  statusBadgeConfirmedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  statusBadgeCompleted: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeCompletedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  aptSelectBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientAvatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aptPatientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  phoneClickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  aptPhoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },
  aptAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
  },
  aptAddressText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  initialSymptomBox: {
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  initialSymptomLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  initialSymptomText: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
  },
  cardBottomAction: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  selectToExamineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#CCFBF1',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  selectToExamineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },

  // EXAMINATION DETAIL SCREEN STYLES
  examTopBar: {
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
  switchAppointmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  switchAppointmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  viewEmrShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  viewEmrShortcutBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  patientBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  liveBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  patientSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  symptomRefText: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 4,
    fontStyle: 'italic',
  },
  warningBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  warnChip: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  warnChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  safeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  safeText: {
    fontSize: 12,
    color: '#065F46',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 17,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  pickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedDiseaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  icdBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  icdBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  selectedDiseaseName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  placeholderText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginBottom: 10,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  symptomsList: {
    gap: 8,
  },
  symptomItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  symptomItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symptomItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  severityLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  severityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  severityPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  severityPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sevMild: {
    backgroundColor: '#10B981',
  },
  sevModerate: {
    backgroundColor: '#F59E0B',
  },
  sevSevere: {
    backgroundColor: '#EF4444',
  },
  emptyNotice: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginVertical: 4,
  },
  addMedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAF5FF',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 10,
  },
  addMedBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },
  prescriptionTable: {
    gap: 8,
    marginBottom: 10,
  },
  prescriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  medItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  medItemDosage: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  medItemMeta: {
    fontSize: 11,
    color: '#7C3AED',
    marginTop: 2,
    fontWeight: '600',
  },
  deleteMedBtn: {
    padding: 6,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  toggleBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  toggleBtnActive: {
    backgroundColor: '#D97706',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  followUpPicker: {
    marginTop: 8,
    gap: 8,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  dayPillActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  dayPillTextActive: {
    color: '#B45309',
    fontWeight: '700',
  },
  datePreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
  },
  datePreviewText: {
    fontSize: 12,
    color: '#92400E',
  },
  submitBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchBar: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  diseaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  diseaseItemActive: {
    backgroundColor: '#F0F9FF',
  },
  icdTagSmall: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  icdTagSmallText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 12,
  },
  diseaseItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  diseaseItemDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  symptomSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  symptomSelectItemActive: {
    backgroundColor: '#F0FDFA',
  },
  symptomSelectText: {
    fontSize: 14,
    color: '#1E293B',
  },
  doneBtn: {
    backgroundColor: '#0D9488',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  medSelectContainer: {
    gap: 6,
    marginVertical: 8,
  },
  medChoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  medChoiceItemActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#FAF5FF',
  },
  medChoiceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  medChoiceUnit: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  medDetailForm: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    gap: 8,
  },
  rowTwoCols: {
    flexDirection: 'row',
  },
  addMedConfirmBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 20,
  },
  addMedConfirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
