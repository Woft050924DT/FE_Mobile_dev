import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MedicalColors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { sendOtp, verifyOtp, loginStaff } = useAuth();

  const [activeTab, setActiveTab] = useState<'patient' | 'staff'>('patient');

  // Patient OTP state
  const [phone, setPhone] = useState('0912345678');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Staff login state
  const [email, setEmail] = useState('doctor@hospital.local');
  const [password, setPassword] = useState('Doctor@123');

  const handleSendOtp = async () => {
    if (!phone || phone.length < 9) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại hợp lệ.');
      return;
    }
    try {
      setIsLoading(true);
      const res = await sendOtp(phone);
      setOtpSent(true);
      if (res?.mockOtp) {
        setOtp(res.mockOtp);
      }
      Alert.alert(
        'Đã gửi mã OTP',
        `Mã xác thực đã được gửi tới số ${phone}. ${
          res?.mockOtp ? `(Mã thử nghiệm tự động điền: ${res.mockOtp})` : ''
        }`
      );
    } catch (e: any) {
      // Cho phép test offline/mock
      setOtpSent(true);
      setOtp('123456');
      Alert.alert('Chế độ thử nghiệm', 'Đã tạo mã OTP tự động: 123456');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ 6 chữ số mã OTP.');
      return;
    }
    try {
      setIsLoading(true);
      await verifyOtp(phone, otp);
      Alert.alert('Thành công', 'Đăng nhập thành công!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Đăng nhập thất bại', e.response?.data?.message || 'Mã OTP không đúng.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }
    try {
      setIsLoading(true);
      await loginStaff(email, password);
      Alert.alert('Thành công', 'Đăng nhập nhân viên thành công!', [
        {
          text: 'OK',
          onPress: () => {
            if (email.includes('doctor')) {
              router.replace('/doctor-dashboard');
            } else if (email.includes('cskh')) {
              router.replace('/cskh-appointments');
            } else {
              router.back();
            }
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert(
        'Đăng nhập thất bại',
        e.response?.data?.message || 'Email hoặc mật khẩu không chính xác.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickAccount = (role: 'doctor' | 'cskh' | 'admin') => {
    if (role === 'doctor') {
      setEmail('doctor@hospital.local');
      setPassword('Doctor@123');
    } else if (role === 'cskh') {
      setEmail('cskh@hospital.local');
      setPassword('Cskh@123');
    } else {
      setEmail('admin@hospital.local');
      setPassword('Admin@123');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Logo */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="medical" size={32} color="#0284C7" />
          </View>
          <Text style={styles.title}>Home Healthcare CRM</Text>
          <Text style={styles.subTitle}>Hệ thống y tế khám chữa bệnh tại nhà</Text>
        </View>

        {/* Tab switch Patient vs Staff */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'patient' && styles.tabActive]}
            onPress={() => setActiveTab('patient')}
          >
            <Text style={[styles.tabText, activeTab === 'patient' && styles.tabTextActive]}>
              Bệnh nhân (OTP)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'staff' && styles.tabActive]}
            onPress={() => setActiveTab('staff')}
          >
            <Text style={[styles.tabText, activeTab === 'staff' && styles.tabTextActive]}>
              Bác sĩ / Nhân viên
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'patient' ? (
          /* Form Đăng nhập Bệnh nhân */
          <View style={styles.formCard}>
            <Text style={styles.label}>Số điện thoại:</Text>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập số điện thoại (VD: 0912345678)"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            {!otpSent ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSendOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Gửi mã xác thực OTP</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.label}>Nhập mã OTP (6 số):</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="key-outline" size={18} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="123456"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Xác thực & Vào ứng dụng</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={handleSendOtp}
                >
                  <Text style={styles.resendText}>Chưa nhận được? Gửi lại mã</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          /* Form Đăng nhập Nhân viên y tế */
          <View style={styles.formCard}>
            <Text style={styles.label}>Email nhân viên:</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="doctor@hospital.local"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={styles.label}>Mật khẩu:</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleStaffLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Đăng nhập Nội bộ</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Phím điền nhanh tài khoản test */}
            <Text style={styles.quickFillTitle}>Tài khoản thử nghiệm sẵn có:</Text>
            <View style={styles.quickFillRow}>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => fillQuickAccount('doctor')}
              >
                <Text style={styles.quickChipText}>🩺 Bác sĩ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => fillQuickAccount('cskh')}
              >
                <Text style={styles.quickChipText}>🎧 CSKH</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => fillQuickAccount('admin')}
              >
                <Text style={styles.quickChipText}>🛡️ Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  subTitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    width: '100%',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  formCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#0284C7',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: 14,
  },
  resendText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '600',
  },
  quickFillTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 20,
    marginBottom: 8,
  },
  quickFillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickChip: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
});
