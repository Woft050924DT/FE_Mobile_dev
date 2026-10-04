import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MedicalColors } from '../constants/Colors';
import { api } from '../services/api';

interface Props {
  visible: boolean;
  patientId: string;
  patientName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const INTERACTION_TYPES = [
  { key: 'call', label: 'Gọi điện', icon: 'call' },
  { key: 'zalo', label: 'Zalo', icon: 'chatbubbles' },
  { key: 'message', label: 'SMS', icon: 'mail' },
  { key: 'home_visit', label: 'Thăm nhà', icon: 'home' },
  { key: 'other', label: 'Khác', icon: 'ellipsis-horizontal' },
];

export const CareLogModal: React.FC<Props> = ({
  visible,
  patientId,
  patientName,
  onClose,
  onSuccess,
}) => {
  const [interactionType, setInteractionType] = useState<string>('call');
  const [content, setContent] = useState('');
  const [nextAction, setNextAction] = useState('Gọi lại nhắc lịch tái khám');
  const [daysUntilNext, setDaysUntilNext] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getNextActionDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + daysUntilNext);
    return d.toISOString();
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập nội dung trao đổi / tình trạng sức khỏe bệnh nhân.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/cskh/care-logs', {
        patientId,
        interactionType,
        content: content.trim(),
        nextAction: nextAction.trim() || undefined,
        nextActionDate: getNextActionDate(),
      });

      Alert.alert('Thành công', 'Đã lưu nhật ký chăm sóc bệnh nhân thành công!');
      setContent('');
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể lưu nhật ký chăm sóc.';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Ghi Nhật Ký Chăm Sóc (Care Log)</Text>
              <Text style={styles.subtitle}>Bệnh nhân: {patientName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* 1. Kênh tương tác */}
            <Text style={styles.label}>Kênh chăm sóc:</Text>
            <View style={styles.typeRow}>
              {INTERACTION_TYPES.map((type) => {
                const isActive = interactionType === type.key;
                return (
                  <TouchableOpacity
                    key={type.key}
                    style={[styles.typeBtn, isActive && styles.typeBtnActive]}
                    onPress={() => setInteractionType(type.key)}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={16}
                      color={isActive ? '#FFFFFF' : '#0284C7'}
                    />
                    <Text style={[styles.typeBtnText, isActive && styles.typeBtnTextActive]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. Nội dung trao đổi */}
            <Text style={[styles.label, { marginTop: 14 }]}>
              Nội dung trao đổi / Tình trạng sức khỏe <Text style={{ color: '#EF4444' }}>*</Text>:
            </Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder="VD: Bệnh nhân đỡ sốt, còn ho nhẹ. Đã uống thuốc đủ 2 ngày theo đơn. Đồng ý tái khám đúng hẹn vào sáng thứ 6..."
              placeholderTextColor="#94A3B8"
              value={content}
              onChangeText={setContent}
            />

            {/* 3. Hành động tiếp theo */}
            <Text style={[styles.label, { marginTop: 14 }]}>Hành động tiếp theo:</Text>
            <TextInput
              style={styles.input}
              value={nextAction}
              onChangeText={setNextAction}
              placeholder="VD: Gọi điện kiểm tra lại, xếp lịch bác sĩ..."
              placeholderTextColor="#94A3B8"
            />

            {/* 4. Thời gian theo dõi tiếp theo */}
            <Text style={[styles.label, { marginTop: 14 }]}>Thời gian liên hệ lại:</Text>
            <View style={styles.daysRow}>
              {[1, 2, 3, 5, 7].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[styles.dayChip, daysUntilNext === days && styles.dayChipActive]}
                  onPress={() => setDaysUntilNext(days)}
                >
                  <Text style={[styles.dayChipText, daysUntilNext === days && styles.dayChipTextActive]}>
                    +{days} ngày
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Lưu Nhật Ký</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingVertical: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
    gap: 6,
  },
  typeBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 90,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  dayChipTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
