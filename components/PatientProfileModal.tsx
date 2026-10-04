import React, { useState } from 'react';
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
import { MedicalColors } from '../constants/Colors';
import { api } from '../services/api';

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
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    initialData?.date_of_birth ? initialData.date_of_birth.slice(0, 10) : '1995-05-15'
  );
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(
    initialData?.gender || 'male'
  );
  const [address, setAddress] = useState(initialData?.address || '');
  const [province, setProvince] = useState(initialData?.province || 'Hà Nội');
  const [emergencyName, setEmergencyName] = useState(
    initialData?.emergency_contact_name || ''
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    initialData?.emergency_contact_phone || ''
  );

  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    if (!address.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ nhà cụ thể để bác sĩ đến khám.');
      return;
    }

    if (selectedConditions.length === 0 && !customCondition.trim()) {
      Alert.alert(
        'Tiền sử bệnh lý',
        'Vui lòng chọn hoặc nhập tiền sử bệnh án/dị ứng thuốc (hoặc chọn "Không có bệnh nền") để bác sĩ chuẩn bị trước.'
      );
      return;
    }

    try {
      setIsLoading(true);

      // 1. Cập nhật thông tin hành chính bệnh nhân
      await api.patch(`/patients/${patientId}`, {
        fullName: fullName.trim() || undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,
        gender,
        address: address.trim(),
        province: province.trim(),
        emergencyContactName: emergencyName.trim() || undefined,
        emergencyContactPhone: emergencyPhone.trim() || undefined,
      });

      // 2. Thêm tiền sử bệnh án vào patient_medical_history
      const conditionsToSave = [...selectedConditions];
      if (customCondition.trim()) {
        conditionsToSave.push(customCondition.trim());
      }

      for (const cond of conditionsToSave) {
        await api.post(`/patients/${patientId}/medical-history`, {
          conditionName: cond,
          note: 'Khai báo trước đợt khám tại nhà',
        });
      }

      Alert.alert('Thành công', 'Hồ sơ y tế của bạn đã được cập nhật hoàn chỉnh!');
      onSuccess();
    } catch (e: any) {
      Alert.alert('Lỗi cập nhật', e.response?.data?.message || 'Không thể lưu hồ sơ y tế.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Hoàn Thiện Hồ Sơ Y Tế</Text>
              <Text style={styles.subtitle}>Bắt buộc trước khi đăng ký khám tại nhà</Text>
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
                Thông tin nhân thân và tiền sử dị ứng thuốc giúp bác sĩ chuẩn bị trang thiết bị y tế và phác đồ điều trị an toàn tại nhà.
              </Text>
            </View>

            {/* 1. Thông tin cá nhân */}
            <Text style={styles.sectionTitle}>1. Thông tin cá nhân & Địa chỉ khám</Text>

            <Text style={styles.label}>Họ và tên bệnh nhân:</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Nguyễn Văn Nam"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={setFullName}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Ngày sinh (YYYY-MM-DD):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1995-05-15"
                  placeholderTextColor="#94A3B8"
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.label}>Giới tính:</Text>
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

            <Text style={styles.label}>Địa chỉ nhà thăm khám cụ thể (*):</Text>
            <TextInput
              style={[styles.input, { height: 60 }]}
              placeholder="Số nhà, tên ngõ, đường, phường/xã..."
              placeholderTextColor="#94A3B8"
              value={address}
              onChangeText={setAddress}
              multiline
            />

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

            {/* 2. Tiền sử bệnh lý & Dị ứng */}
            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
              2. Tiền sử bệnh án & Dị ứng thuốc (*)
            </Text>
            <Text style={styles.hint}>
              Chạm để chọn các bệnh nền hoặc dị ứng bạn đã từng gặp:
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

            <Text style={[styles.label, { marginTop: 10 }]}>Tiền sử bệnh khác (nếu có):</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Thoát vị đĩa đệm L4-L5, dị ứng hải sản..."
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
                  <Ionicons name="shield-checkmark-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Lưu & Tiếp tục Đặt lịch khám</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
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
    paddingBottom: 30,
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 46,
    fontSize: 13,
    color: '#0F172A',
  },
  row: {
    flexDirection: 'row',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 6,
    height: 46,
  },
  genderBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  genderBtnActive: {
    borderColor: '#0284C7',
    backgroundColor: '#E0F2FE',
  },
  genderText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  genderTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
  },
  chipTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    gap: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
