import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MedicalColors } from '../constants/Colors';

interface Props {
  text?: string;
}

export const DisclaimerBanner: React.FC<Props> = ({
  text = 'Các sản phẩm thuốc/TPCN dưới đây chỉ mang tính chất tham khảo sơ bộ dựa trên triệu chứng tự khai, KHÔNG thay thế chỉ định và đơn thuốc chính thức từ bác sĩ chuyên môn.',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Ionicons name="alert-circle" size={22} color={MedicalColors.warningDark} />
      </View>
      <View style={styles.textWrapper}>
        <Text style={styles.header}>CẢNH BÁO Y TẾ PHÁP LÝ (THAM KHẢO)</Text>
        <Text style={styles.content}>{text}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: MedicalColors.warningLight,
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: MedicalColors.warning,
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    alignItems: 'flex-start',
  },
  iconWrapper: {
    marginRight: 10,
    marginTop: 2,
  },
  textWrapper: {
    flex: 1,
  },
  header: {
    fontSize: 11,
    fontWeight: '800',
    color: MedicalColors.warningDark,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  content: {
    fontSize: 12,
    lineHeight: 18,
    color: '#78350F',
    fontWeight: '500',
  },
});
