import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BodyMap2D, BodyPartData, SelectedSymptomItem } from '../../components/BodyMap2D';
import { DisclaimerBanner } from '../../components/DisclaimerBanner';
import { MedicalColors } from '../../constants/Colors';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Dữ liệu mẫu khởi tạo chuẩn từ DB trong trường hợp mất mạng
const DEFAULT_BODY_PARTS: BodyPartData[] = [
  { id: 1, code: 'HEAD_FRONT', name: 'Đầu - Mặt trước', region: 'Đầu', view_side: 'front', coord_x: 50.0, coord_y: 10.0 },
  { id: 2, code: 'HEAD_BACK', name: 'Đầu gáy - Mặt sau', region: 'Đầu', view_side: 'back', coord_x: 50.0, coord_y: 10.0 },
  { id: 3, code: 'CHEST', name: 'Vùng Ngực', region: 'Ngực', view_side: 'front', coord_x: 50.0, coord_y: 28.0 },
  { id: 4, code: 'ABDOMEN', name: 'Vùng Bụng', region: 'Bụng', view_side: 'front', coord_x: 50.0, coord_y: 42.0 },
  { id: 5, code: 'UPPER_BACK', name: 'Lưng trên', region: 'Lưng', view_side: 'back', coord_x: 50.0, coord_y: 30.0 },
  { id: 6, code: 'LOWER_BACK', name: 'Thắt lưng / Lưng dưới', region: 'Lưng', view_side: 'back', coord_x: 50.0, coord_y: 45.0 },
  { id: 7, code: 'LEFT_ARM', name: 'Cánh tay trái', region: 'Tay', view_side: 'front', coord_x: 30.0, coord_y: 35.0 },
  { id: 8, code: 'RIGHT_ARM', name: 'Cánh tay phải', region: 'Tay', view_side: 'front', coord_x: 70.0, coord_y: 35.0 },
  { id: 9, code: 'LEFT_KNEE', name: 'Đầu gối trái', region: 'Chân', view_side: 'front', coord_x: 42.0, coord_y: 72.0 },
  { id: 10, code: 'RIGHT_KNEE', name: 'Đầu gối phải', region: 'Chân', view_side: 'front', coord_x: 58.0, coord_y: 72.0 },
];

const DEFAULT_SYMPTOMS = [
  { id: 1, name: 'Sốt cao (>38.5°C)' },
  { id: 2, name: 'Đau đầu / Chóng mặt' },
  { id: 3, name: 'Ho khan / Ho có đờm' },
  { id: 4, name: 'Đau rát họng' },
  { id: 5, name: 'Đau bụng âm ỉ' },
  { id: 6, name: 'Buồn nôn / Nôn ói' },
  { id: 7, name: 'Đau mỏi thắt lưng' },
  { id: 8, name: 'Đau khớp gối' },
];

export default function BodyMapScreen() {
  const router = useRouter();
  const { user, token, isDoctor } = useAuth();

  useEffect(() => {
    if (isDoctor) {
      router.replace('/(tabs)');
    }
  }, [isDoctor]);

  const [bodyParts, setBodyParts] = useState<BodyPartData[]>(DEFAULT_BODY_PARTS);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [selectedItems, setSelectedItems] = useState<SelectedSymptomItem[]>([]);
  const [activePart, setActivePart] = useState<BodyPartData | null>(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [chosenSymptom, setChosenSymptom] = useState(DEFAULT_SYMPTOMS[0]);
  const [customSymptomText, setCustomSymptomText] = useState('');
  const [customNote, setCustomNote] = useState('');

  // Recommendation & Report state
  const [isLoading, setIsLoading] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchBodyParts();
    fetchSymptoms();
  }, [token]);

  const fetchBodyParts = async () => {
    try {
      const res = await api.get('/body-parts');
      if (res.data?.data && res.data.data.length > 0) {
        setBodyParts(res.data.data);
      }
    } catch {
      // Fallback về DEFAULT_BODY_PARTS đã nạp
    }
  };

  const fetchSymptoms = async () => {
    if (!token) return;
    try {
      const res = await api.get('/symptoms');
      if (res.data?.data && res.data.data.length > 0) {
        // Cập nhật danh sách triệu chứng từ catalog backend
      }
    } catch {}
  };

  const handlePressPart = (part: BodyPartData) => {
    setActivePart(part);
    // Nếu vị trí này đã được chọn trước đó, điền lại dữ liệu
    const existing = selectedItems.find((i) => i.bodyPartId === part.id);
    if (existing) {
      const foundSym = DEFAULT_SYMPTOMS.find((s) => s.id === existing.symptomId);
      if (foundSym) setChosenSymptom(foundSym);
      setCustomSymptomText(existing.symptomName || foundSym?.name || '');
      setCustomNote(existing.note || '');
    } else {
      setCustomSymptomText('');
      setCustomNote('');
    }
    setModalVisible(true);
  };

  const handleConfirmItem = () => {
    if (!activePart) return;

    const symptomName = customSymptomText.trim() || chosenSymptom.name;

    const newItem: SelectedSymptomItem = {
      bodyPartId: activePart.id,
      bodyPartName: activePart.name,
      symptomId: chosenSymptom.id,
      symptomName: symptomName,
      severity: 'mild',
      note: customNote,
    };

    setSelectedItems((prev) => {
      const filtered = prev.filter((i) => i.bodyPartId !== activePart.id);
      return [...filtered, newItem];
    });

    setModalVisible(false);
  };

  const handleRemoveItem = (bodyPartId: number) => {
    setSelectedItems((prev) => prev.filter((i) => i.bodyPartId !== bodyPartId));
  };

  const handleSubmitReport = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('Chưa có triệu chứng', 'Vui lòng chạm vào cơ thể để chọn ít nhất 1 điểm đau.');
      return;
    }

    if (!token) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập bằng số điện thoại để lưu kết quả khai báo.', [
        { text: 'Hủy' },
        { text: 'Đăng nhập', onPress: () => router.push('/login') },
      ]);
      return;
    }

    try {
      setIsLoading(true);
      // Bước 1: Tạo phiên khai báo chuẩn schema BE
      const reportRes = await api.post('/symptom-reports', {
        patientId: user?.id,
        source: 'app',
      });
      const repId = reportRes.data?.data?.id;
      setReportId(repId);

      // Bước 2: Lưu từng triệu chứng vào report
      for (const item of selectedItems) {
        await api.post(`/symptom-reports/${repId}/items`, {
          bodyPartId: item.bodyPartId,
          symptomId: item.symptomId,
          severity: item.severity,
          note: item.note || undefined,
        });
      }

      // Bước 3: Lấy chi tiết phiên & gợi ý sản phẩm
      const detailRes = await api.get(`/symptom-reports/${repId}`);
      const recommendations = detailRes.data?.data?.recommendations || [];
      setRecommendedProducts(recommendations);

      Alert.alert(
        'Đã lưu thành công!',
        'Đã ghi nhận các triệu chứng tự khai. Bạn có thể xem gợi ý thuốc tham khảo hoặc chuyển đổi thành lịch hẹn bác sĩ đến nhà.'
      );
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể lưu phiên khai báo triệu chứng.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertToAppointment = async () => {
    if (!reportId) {
      Alert.alert('Thông báo', 'Vui lòng bấm "Lưu triệu chứng & Xem gợi ý" trước khi đặt lịch.');
      return;
    }

    Alert.prompt
      ? Alert.prompt(
          'Địa chỉ khám tại nhà',
          'Vui lòng nhập địa chỉ nhà để bác sĩ đến khám:',
          async (address) => {
            if (!address) return;
            await executeConvert(address);
          }
        )
      : executeConvert(user?.address || '123 Đường Giải Phóng, Hà Nội');
  };

  const executeConvert = async (address: string) => {
    try {
      setIsLoading(true);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      await api.post(`/symptom-reports/${reportId}/convert-to-appointment`, {
        scheduledAt: tomorrow.toISOString(),
        visitAddress: address,
        note: `Đặt lịch từ Body Map (${selectedItems.map((i) => i.bodyPartName).join(', ')})`,
      });

      Alert.alert(
        'Đặt lịch thành công!',
        'Lịch hẹn khám tại nhà của bạn đã được chuyển tới nhân viên CSKH để xác nhận.',
        [
          {
            text: 'Xem lịch khám',
            onPress: () => router.push('/appointments'),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Lỗi đặt lịch', e.response?.data?.message || 'Không thể chuyển thành lịch hẹn.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Component Body Map 2D tương tác */}
      <BodyMap2D
        bodyParts={bodyParts}
        selectedItems={selectedItems}
        activeSide={activeSide}
        onChangeSide={setActiveSide}
        onPressPart={handlePressPart}
      />

      {/* Danh sách các điểm đau đã đánh dấu */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Vị trí đau đã chọn ({selectedItems.length})
          </Text>
          {selectedItems.length > 0 && (
            <TouchableOpacity onPress={() => setSelectedItems([])}>
              <Text style={styles.clearText}>Xóa tất cả</Text>
            </TouchableOpacity>
          )}
        </View>

        {selectedItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="finger-print-outline" size={32} color="#94A3B8" />
            <Text style={styles.emptyText}>Chưa có vị trí nào được chọn</Text>
            <Text style={styles.emptySub}>
              Hãy chạm vào các điểm tròn trên mô hình cơ thể ở trên
            </Text>
          </View>
        ) : (
          selectedItems.map((item) => (
            <View key={item.bodyPartId} style={styles.itemCard}>
              <View style={styles.itemLeft}>
                <View style={styles.pinTag}>
                  <Ionicons name="location" size={16} color="#0284C7" />
                </View>
                <View>
                  <Text style={styles.partName}>{item.bodyPartName}</Text>
                  <Text style={styles.symName}>{item.symptomName}</Text>
                  {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleRemoveItem(item.bodyPartId)}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Nút hành động chính */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.primaryBtn, selectedItems.length === 0 && styles.btnDisabled]}
          onPress={handleSubmitReport}
          disabled={selectedItems.length === 0 || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>
                {reportId ? 'Cập nhật triệu chứng' : 'Lưu & Xem gợi ý tham khảo'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {reportId && (
          <TouchableOpacity
            style={styles.convertBtn}
            onPress={handleConvertToAppointment}
            disabled={isLoading}
          >
            <Ionicons name="calendar" size={18} color="#FFFFFF" />
            <Text style={styles.convertBtnText}>Chuyển thành lịch khám tại nhà</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Hiển thị gợi ý thuốc/TPCN nếu có kết quả */}
      {recommendedProducts.length > 0 && (
        <View style={styles.recommendSection}>
          <Text style={styles.recommendTitle}>Gợi ý sản phẩm tham khảo sơ bộ</Text>

          {/* CẢNH BÁO Y TẾ PHÁP LÝ BẮT BUỘC THEO RULE 3 */}
          <DisclaimerBanner />

          {recommendedProducts.map((p, idx) => (
            <View key={idx} style={styles.productCard}>
              <View style={styles.prodHeader}>
                <Text style={styles.prodName}>{p.name || p.product?.name}</Text>
                <Text style={styles.prodType}>
                  {p.type === 'medicine' ? '💊 Thuốc' : '🌿 TPCN'}
                </Text>
              </View>
              <Text style={styles.prodUsage}>
                Liều dùng tham khảo: {p.recommended_dosage || 'Theo chỉ định'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Modal chọn Triệu chứng & Mức độ */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Chọn triệu chứng: {activePart?.name}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Nhập triệu chứng bạn cảm thấy:</Text>
            <TextInput
              style={styles.symptomInput}
              placeholder="Nhập triệu chứng (VD: Đau nhói từng cơn, tê bì, nóng rát...)"
              placeholderTextColor="#94A3B8"
              value={customSymptomText}
              onChangeText={setCustomSymptomText}
            />

            <Text style={styles.label}>Hoặc chọn nhanh từ gợi ý phổ biến:</Text>
            <View style={styles.chipGroup}>
              {DEFAULT_SYMPTOMS.map((sym) => (
                <TouchableOpacity
                  key={sym.id}
                  style={[
                    styles.chip,
                    customSymptomText === sym.name && styles.chipActive,
                  ]}
                  onPress={() => {
                    setChosenSymptom(sym);
                    setCustomSymptomText(sym.name);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      customSymptomText === sym.name && styles.chipTextActive,
                    ]}
                  >
                    {sym.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Ghi chú thêm cho bác sĩ:</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="VD: Đau buốt khi cúi xuống, xuất hiện từ 2 ngày trước..."
              placeholderTextColor="#94A3B8"
              value={customNote}
              onChangeText={setCustomNote}
              multiline
            />

            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={handleConfirmItem}
            >
              <Text style={styles.modalConfirmText}>Xác nhận điểm đau</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  section: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  clearText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  severityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  partName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  symName: {
    fontSize: 12,
    color: '#475569',
  },
  noteText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  deleteBtn: {
    padding: 6,
  },
  actionRow: {
    marginTop: 16,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  btnDisabled: {
    backgroundColor: '#94A3B8',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  convertBtn: {
    flexDirection: 'row',
    backgroundColor: '#0D9488',
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  convertBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  recommendSection: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recommendTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  productCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  prodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prodName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  prodType: {
    fontSize: 11,
    color: '#64748B',
  },
  prodUsage: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
    marginBottom: 8,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  chipActive: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  pinTag: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  symptomInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 46,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    height: 70,
    fontSize: 13,
    textAlignVertical: 'top',
    color: '#0F172A',
  },
  modalConfirmBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
