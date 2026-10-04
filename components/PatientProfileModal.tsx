import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const COMMON_CONDITIONS = [
  'Không có bệnh nền / Không dị ứng',
  'Dị ứng Penicillin / Kháng sinh',
  'Tăng huyết áp',
  'Đái tháo đường (Tiểu đường)',
  'Hen phế quản',
  'Bệnh lý tim mạch',
  'Viêm dạ dày tá tràng',
  'Dị ứng thuốc giảm đau NSAID',
];

interface Props {
  visible: boolean;
  patientId: string;
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const PatientProfileModal: React.FC<Props> = ({
  visible,
  patientId,
  initialData,
  onClose,
  onSuccess,
}) => {
  const { updateUser } = useAuth();

  const isTempName = (name?: string | null) =>
    !name || name.trim().length === 0 || name.startsWith('Bệnh nhân ');

  const [fullName, setFullName] = useState(
    initialData?.full_name && !isTempName(initialData.full_name) ? initialData.full_name : ''
  );
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    initialData?.date_of_birth ? initialData.date_of_birth.slice(0, 10) : '1995-05-15'
  );
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(
    initialData?.gender || 'male'
  );
  const [address, setAddress] = useState(initialData?.address || '');
  const [province, setProvince] = useState(initialData?.province || 'Hà Nội');
  const [healthInsuranceNo, setHealthInsuranceNo] = useState(
    initialData?.health_insurance_no || ''
  );
  const [emergencyName, setEmergencyName] = useState(
    initialData?.emergency_contact_name || ''
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    initialData?.emergency_contact_phone || ''
  );

  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      if (initialData.full_name) {
        setFullName(isTempName(initialData.full_name) ? '' : initialData.full_name);
      }
      if (initialData.phone) setPhone(initialData.phone);
      if (initialData.date_of_birth) setDateOfBirth(initialData.date_of_birth.slice(0, 10));
      if (initialData.gender) setGender(initialData.gender);
      if (initialData.address) setAddress(initialData.address);
      if (initialData.province) setProvince(initialData.province);
      if (initialData.healthInsuranceNo || initialData.health_insurance_no) {
        setHealthInsuranceNo(initialData.healthInsuranceNo || initialData.health_insurance_no);
      }
      if (initialData.emergencyContactName || initialData.emergency_contact_name) {
        setEmergencyName(initialData.emergencyContactName || initialData.emergency_contact_name);
      }
      if (initialData.emergencyContactPhone || initialData.emergency_contact_phone) {
        setEmergencyPhone(initialData.emergencyContactPhone || initialData.emergency_contact_phone);
      }
    }
  }, [initialData]);

  const toggleCondition = (cond: string) => {
    if (cond === 'Không có bệnh nền / Không dị ứng') {
      setSelectedConditions([cond]);
      return;
    }

    setSelectedConditions((prev) => {
      const filtered = prev.filter((c) => c !== 'Không có bệnh nền / Không dị ứng');
      if (filtered.includes(cond)) {
        return filtered.filter((c) => c !== cond);
      }
      return [...filtered, cond];
    });
  };

  const handleSave = async () => {
    // 1. Kiểm tra họ và tên
    if (!fullName.trim() || fullName.trim().length < 2) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ Họ và tên thật của bệnh nhân.');
      return;
    }

    if (fullName.trim().startsWith('Bệnh nhân ')) {
      Alert.alert(
        'Họ và tên chưa hợp lệ',
        'Vui lòng nhập Họ và tên thật của bạn (Ví dụ: Nguyễn Văn An), không để tên mặc định tạm thời của hệ thống.'
      );
      return;
    }

    // 2. Kiểm tra số điện thoại
    if (!phone.trim() || phone.trim().length < 9) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Số điện thoại liên hệ hợp lệ (tối thiểu 9 số).');
      return;
    }

    // 3. Kiểm tra ngày sinh
    if (!dateOfBirth.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập ngày sinh hợp lệ theo định dạng YYYY-MM-DD (Ví dụ: 1995-05-15).');
      return;
    }

    try {
      setIsLoading(true);

      const updatePayload = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        dateOfBirth: new Date(dateOfBirth.trim()).toISOString(),
        gender,
        address: address.trim() || undefined,
        province: province.trim() || undefined,
        healthInsuranceNo: healthInsuranceNo.trim() || undefined,
        emergencyContactName: emergencyName.trim() || undefined,
        emergencyContactPhone: emergencyPhone.trim() || undefined,
      };

      // 1. Cập nhật thông tin hành chính bệnh nhân (Ưu tiên /patients/me)
      try {
        await api.patch('/patients/me', updatePayload);
      } catch {
        if (patientId && patientId !== 'me') {
          await api.patch(`/patients/${patientId}`, updatePayload);
        }
      }

      // Cập nhật thông tin người dùng trong AuthContext
      await updateUser({
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
      });

      // 2. Lưu tiền sử bệnh nếu có chọn
      const conditionsToSave = [...selectedConditions];
      if (customCondition.trim()) {
        conditionsToSave.push(customCondition.trim());
      }

      if (conditionsToSave.length > 0) {
        for (const cond of conditionsToSave) {
          await api.post(`/patients/${patientId}/medical-history`, {
            conditionName: cond,
            note: 'Khai báo thông tin hồ sơ y tế',
          }).catch(() => null);
        }
      }

      Alert.alert('Thành công 🎉', 'Thông tin cá nhân của bệnh nhân đã được cập nhật thành công!');
      onSuccess();
    } catch (e: any) {
      Alert.alert('Lỗi cập nhật', e.response?.data?.message || 'Không thể lưu hồ sơ bệnh nhân.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Thông Tin Cá Nhân Bệnh Nhân</Text>
              <Text style={styles.subtitle}>Bắt buộc hoàn thiện trước khi đặt lịch khám</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Cảnh báo bắt buộc */}
            <View style={styles.alertBox}>
              <Ionicons name="shield-checkmark" size={20} color="#0284C7" />
              <Text style={styles.alertText}>
                Hồ sơ cá nhân chính xác giúp phòng khám thiết lập mã Bệnh án Điện tử (EMR) và liên hệ đón tiếp bạn chu đáo.
              </Text>
            </View>

            {/* 1. THÔNG TIN BẮT BUỘC */}
            <Text style={styles.sectionTitle}>1. Thông tin bắt buộc (*)</Text>

            <Text style={styles.label}>Họ và tên bệnh nhân (*):</Text>
            <TextInput
              style={[
                styles.input,
                (!fullName.trim() || fullName.startsWith('Bệnh nhân ')) && styles.inputWarning,
              ]}
              placeholder="VD: Nguyễn Văn Nam (Nhập họ tên thật)"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={setFullName}
            />
            {(!fullName.trim() || fullName.startsWith('Bệnh nhân ')) && (
              <Text style={styles.nameWarningText}>
                ⚠️ Bắt buộc nhập họ và tên thật (không dùng tên tạm) để lập bệnh án phòng khám.
              </Text>
            )}

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Số điện thoại (*):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0912345678"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.label}>Giới tính (*):</Text>
                <View style={styles.genderRow}>
                  {[
                    { key: 'male', label: 'Nam' },
                    { key: 'female', label: 'Nữ' },
                  ].map((g) => (
                    <TouchableOpacity
                      key={g.key}
                      style={[
                        styles.genderBtn,
                        gender === g.key && styles.genderBtnActive,
                      ]}
                      onPress={() => setGender(g.key as any)}
                    >
                      <Text
                        style={[
                          styles.genderText,
                          gender === g.key && styles.genderTextActive,
                        ]}
                      >
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.label}>Ngày sinh (YYYY-MM-DD) (*):</Text>
            <TextInput
              style={styles.input}
              placeholder="1995-05-15"
              placeholderTextColor="#94A3B8"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
            />

            {/* 2. THÔNG TIN BỔ SUNG */}
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>2. Địa chỉ & Bảo hiểm y tế</Text>

            <Text style={styles.label}>Địa chỉ thường trú / Nơi ở hiện tại:</Text>
            <TextInput
              style={styles.input}
              placeholder="Số nhà, đường, phường, quận..."
              placeholderTextColor="#94A3B8"
              value={address}
              onChangeText={setAddress}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Tỉnh / Thành phố:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Hà Nội"
                  placeholderTextColor="#94A3B8"
                  value={province}
                  onChangeText={setProvince}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.label}>Số thẻ BHYT (nếu có):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DN401..."
                  placeholderTextColor="#94A3B8"
                  value={healthInsuranceNo}
                  onChangeText={setHealthInsuranceNo}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Người liên hệ khẩn cấp:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Họ tên người thân"
                  placeholderTextColor="#94A3B8"
                  value={emergencyName}
                  onChangeText={setEmergencyName}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.label}>SĐT khẩn cấp:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="09..."
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                />
              </View>
            </View>

            {/* 3. Tiền sử bệnh lý & Dị ứng */}
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
              3. Tiền sử bệnh lý & Dị ứng (Tùy chọn)
            </Text>
            <Text style={styles.hint}>
              Chạm để chọn bệnh nền hoặc dị ứng bạn đã từng gặp (nếu có):
            </Text>

            <View style={styles.chipGrid}>
              {COMMON_CONDITIONS.map((cond) => {
                const isSelected = selectedConditions.includes(cond);
                return (
                  <TouchableOpacity
                    key={cond}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => toggleCondition(cond)}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                      size={16}
                      color={isSelected ? '#0284C7' : '#64748B'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {cond}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { marginTop: 8 }]}>Ghi chú tiền sử khác:</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Thoát vị đĩa đệm, đau dạ dày..."
              placeholderTextColor="#94A3B8"
              value={customCondition}
              onChangeText={setCustomCondition}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Lưu thông tin bệnh nhân</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    paddingBottom: 20,
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 14,
    alignItems: 'center',
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 4,
  },
  hint: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    height: 44,
  },
  genderBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  genderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  genderTextActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
  },
  chipText: {
    fontSize: 11,
    color: '#475569',
  },
  chipTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: '#0284C7',
    borderRadius: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  inputWarning: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  nameWarningText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: -8,
    marginBottom: 10,
    marginLeft: 2,
  },
});
