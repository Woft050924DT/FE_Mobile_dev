import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MedicalColors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { user, role, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Card */}
        <View style={styles.header}>
          <View>
            <Text style={styles.subGreeting}>Xin chào,</Text>
            <Text style={styles.userName}>
              {user ? user.fullName : 'Quý khách hàng'}
            </Text>
            <Text style={styles.roleTag}>
              {role === 'doctor'
                ? '🩺 Bác sĩ khám tại nhà'
                : role === 'cskh'
                ? '🎧 Chuyên viên CSKH'
                : '🛡️ Bệnh nhân / Người dùng'}
            </Text>
          </View>

          {user ? (
            <TouchableOpacity style={styles.authBadge} onPress={logout}>
              <Ionicons name="log-out-outline" size={20} color={MedicalColors.danger} />
              <Text style={styles.authBadgeText}>Đăng xuất</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => router.push('/login')}
            >
              <Ionicons name="person-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.loginBtnText}>Đăng nhập</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Hero Banner: Đặt lịch khám tại nhà */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.pillBadge}>
              <Text style={styles.pillText}>Bác sĩ đến tận nhà</Text>
            </View>
            <Text style={styles.heroTitle}>Khám Chữa Bệnh Tại Nhà Chuẩn Y Khoa</Text>
            <Text style={styles.heroDesc}>
              Bác sĩ chuyên khoa thăm khám trực tiếp, chẩn đoán theo mã ICD-10 và kê đơn thuốc điện tử.
            </Text>
            <TouchableOpacity
              style={styles.heroActionBtn}
              onPress={() => router.push('/book-appointment')}
            >
              <Text style={styles.heroActionText}>Đặt lịch hẹn ngay</Text>
              <Ionicons name="arrow-forward" size={16} color="#0284C7" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Phím tắt hành động nhanh */}
        <Text style={styles.sectionTitle}>Tính năng cốt lõi</Text>
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
            <Text style={styles.gridSub}>Theo dõi bác sĩ di chuyển & giờ hẹn</Text>
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
        </View>

        {/* Quy trình 4 bước khám tại nhà */}
        <Text style={styles.sectionTitle}>Quy trình khám chữa bệnh tại nhà</Text>
        <View style={styles.timelineCard}>
          <View style={styles.timelineItem}>
            <View style={[styles.stepCircle, { backgroundColor: '#0284C7' }]}>
              <Text style={styles.stepNum}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Khai triệu chứng qua Body Map</Text>
              <Text style={styles.stepDesc}>
                Chọn vùng đau trên mô hình cơ thể, mô tả mức độ nhẹ / vừa / nặng.
              </Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View style={[styles.stepCircle, { backgroundColor: '#0D9488' }]}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Xác nhận & Điều phối bác sĩ</Text>
              <Text style={styles.stepDesc}>
                Nhân viên CSKH gọi điện xác nhận và sắp xếp bác sĩ đến đúng giờ.
              </Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View style={[styles.stepCircle, { backgroundColor: '#7C3AED' }]}>
              <Text style={styles.stepNum}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Khám lâm sàng & Kê đơn thuốc</Text>
              <Text style={styles.stepDesc}>
                Bác sĩ đến tận nhà thăm khám, lập bệnh án điện tử và đơn thuốc.
              </Text>
            </View>
          </View>

          <View style={styles.timelineLine} />

          <View style={styles.timelineItem}>
            <View style={[styles.stepCircle, { backgroundColor: '#10B981' }]}>
              <Text style={styles.stepNum}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Tự động nhắc lịch & CSKH 1-1</Text>
              <Text style={styles.stepDesc}>
                Hệ thống nhắc tái khám lúc 07:00 sáng và CSKH thăm hỏi định kỳ.
              </Text>
            </View>
          </View>
        </View>

        {/* Cam kết y tế an toàn */}
        <View style={styles.trustBanner}>
          <Ionicons name="shield-checkmark" size={24} color="#059669" />
          <Text style={styles.trustText}>
            Hồ sơ y tế được bảo mật an toàn theo tiêu chuẩn EMR quốc tế. Mọi chỉ định thuốc đều do bác sĩ chuyên môn ban hành.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? 36 : 0,
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
    marginBottom: 20,
  },
  subGreeting: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleTag: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
    marginTop: 2,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  authBadgeText: {
    color: MedicalColors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: '#0284C7',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  heroContent: {
    gap: 8,
  },
  pillBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  heroDesc: {
    fontSize: 13,
    color: '#E0F2FE',
    lineHeight: 18,
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 6,
  },
  heroActionText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  gridSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  timelineLine: {
    width: 2,
    height: 18,
    backgroundColor: '#E2E8F0',
    marginLeft: 13,
    marginVertical: 4,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 10,
  },
  trustText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    lineHeight: 16,
  },
});
