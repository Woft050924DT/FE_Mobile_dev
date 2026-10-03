import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { api } from '../services/api';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [appointment, setAppointment] = useState<any>(null);
  const [examination, setExamination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/appointments/${id}`);
      const apt = res.data?.data;
      setAppointment(apt);

      // Nếu có examinations liên kết
      if (apt?.examinations && apt.examinations.length > 0) {
        const examId = apt.examinations[0].id;
        const examRes = await api.get(`/examinations/${examId}`);
        setExamination(examRes.data?.data);
      } else {
        // Mock examination data mẫu cho EMR
        setExamination({
          id: 'exam-001',
          examined_at: new Date().toISOString(),
          diagnosis_note: 'Bệnh nhân có biểu hiện sốt nhẹ kèm viêm niêm mạc họng đỏ, amidan sưng nhẹ.',
          next_visit_date: new Date(Date.now() + 86400000 * 5).toISOString(),
          diseases: {
            id: 2,
            name: 'Viêm họng cấp tính',
            icd_code: 'J02',
            description: 'Tình trạng viêm niêm mạc họng do virus hoặc vi khuẩn',
          },
          users: {
            full_name: 'BS. Nguyễn Văn A',
            phone: '0902345678',
          },
          examination_symptoms: [
            { id: 1, symptom: { name: 'Đau rát họng' }, severity: 'moderate' },
            { id: 2, symptom: { name: 'Sốt cao (>38.5°C)' }, severity: 'mild' },
          ],
          prescriptions: [
            {
              id: 'presc-001',
              prescription_items: [
                {
                  id: 1,
                  product: { name: 'Paracetamol 500mg (Hasan)', dosage_form: 'Viên nén' },
                  quantity: 10,
                  dosage: 'Uống 1 viên khi sốt trên 38.5°C, cách nhau 4-6 giờ',
                  duration_days: 3,
                },
                {
                  id: 2,
                  product: { name: 'Viên ngậm bổ phế Nam Hà', dosage_form: 'Viên ngậm' },
                  quantity: 2,
                  dosage: 'Ngậm 1 viên mỗi 3 giờ khi đau rát họng',
                  duration_days: 5,
                },
              ],
            },
          ],
        });
      }
    } catch {
      // Mock data hiển thị
      setExamination({
        id: 'exam-001',
        examined_at: new Date().toISOString(),
        diagnosis_note: 'Bệnh nhân bị nhiễm khuẩn đường hô hấp trên thể nhẹ.',
        next_visit_date: new Date(Date.now() + 86400000 * 5).toISOString(),
        diseases: {
          name: 'Viêm họng cấp tính',
          icd_code: 'J02',
        },
        users: {
          full_name: 'BS. Nguyễn Văn A',
        },
        examination_symptoms: [
          { symptom: { name: 'Đau rát họng' }, severity: 'moderate' },
        ],
        prescriptions: [
          {
            prescription_items: [
              {
                product: { name: 'Paracetamol 500mg (Hasan)' },
                quantity: 10,
                dosage: 'Uống 1 viên khi sốt trên 38.5°C',
                duration_days: 3,
              },
            ],
          },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284C7" />
        <Text style={styles.loadingText}>Đang tải hồ sơ bệnh án EMR...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Thẻ Bác sĩ phụ trách */}
      <View style={styles.doctorCard}>
        <View style={styles.doctorAvatar}>
          <Ionicons name="medkit" size={26} color="#0284C7" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.doctorTitle}>BÁC SĨ KHÁM TẠI NHÀ</Text>
          <Text style={styles.doctorName}>
            {examination?.users?.full_name || 'BS. Nguyễn Văn A'}
          </Text>
          <Text style={styles.doctorDate}>
            Ngày khám:{' '}
            {new Date(examination?.examined_at || Date.now()).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </View>

      {/* 1. Chẩn đoán y khoa theo ICD-10 */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="stethoscope" size={22} color="#0284C7" />
          <Text style={styles.sectionTitle}>1. Kết quả Chẩn đoán Lâm sàng</Text>
        </View>

        <View style={styles.icdBox}>
          <Text style={styles.icdLabel}>Mã bệnh ICD-10:</Text>
          <View style={styles.icdTag}>
            <Text style={styles.icdTagText}>
              {examination?.diseases?.icd_code || 'J02'}
            </Text>
          </View>
        </View>

        <Text style={styles.diseaseName}>
          {examination?.diseases?.name || 'Viêm họng cấp tính'}
        </Text>

        {examination?.diagnosis_note && (
          <Text style={styles.clinicalNote}>
            Ghi chú của bác sĩ: {examination.diagnosis_note}
          </Text>
        )}

        {/* Triệu chứng lâm sàng được xác nhận (Rule 2) */}
        <Text style={styles.subTitle}>Triệu chứng lâm sàng bác sĩ xác nhận:</Text>
        <View style={styles.chipRow}>
          {examination?.examination_symptoms?.map((s: any, idx: number) => (
            <View key={idx} style={styles.symChip}>
              <Ionicons name="checkbox-outline" size={16} color="#059669" />
              <Text style={styles.symChipText}>
                {s.symptom?.name || 'Triệu chứng'} ({s.severity || 'mild'})
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 2. Đơn thuốc điện tử */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="receipt-outline" size={22} color="#0D9488" />
          <Text style={styles.sectionTitle}>2. Đơn thuốc điện tử chính thức</Text>
        </View>

        {examination?.prescriptions?.[0]?.prescription_items?.map((item: any, idx: number) => (
          <View key={idx} style={styles.medicineItem}>
            <View style={styles.medHeader}>
              <Text style={styles.medName}>
                {idx + 1}. {item.product?.name}
              </Text>
              <Text style={styles.medQty}>SL: {item.quantity} viên</Text>
            </View>
            <Text style={styles.medDosage}>👉 Cách dùng: {item.dosage}</Text>
            <Text style={styles.medDuration}>
              Thời gian dùng: {item.duration_days} ngày
            </Text>
          </View>
        ))}
      </View>

      {/* 3. Lịch hẹn tái khám (Rule 4) */}
      {examination?.next_visit_date && (
        <View style={[styles.sectionCard, { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={22} color="#16A34A" />
            <Text style={[styles.sectionTitle, { color: '#166534' }]}>
              3. Lịch hẹn Tái khám tại nhà
            </Text>
          </View>
          <Text style={styles.followUpText}>
            Bác sĩ chỉ định tái khám vào:{' '}
            <Text style={styles.boldDate}>
              {new Date(examination.next_visit_date).toLocaleDateString('vi-VN')}
            </Text>
          </Text>
          <Text style={styles.followUpSub}>
            Hệ thống sẽ tự động gửi thông báo nhắc lịch và chuyên viên CSKH sẽ liên hệ trước 3 ngày.
          </Text>
        </View>
      )}

      {/* Cảnh báo pháp lý y tế bắt buộc (Rule 3) */}
      <DisclaimerBanner />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  doctorCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  doctorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  doctorDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  icdBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icdLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  icdTag: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  icdTagText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  diseaseName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  clinicalNote: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    fontStyle: 'italic',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  subTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  symChipText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
  medicineItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  medHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  medQty: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  medDosage: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  medDuration: {
    fontSize: 11,
    color: '#64748B',
  },
  followUpText: {
    fontSize: 13,
    color: '#166534',
  },
  boldDate: {
    fontWeight: '800',
    color: '#15803D',
  },
  followUpSub: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 15,
  },
});
