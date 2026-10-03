import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MedicalColors } from '../../constants/Colors';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function CareScreen() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'notifications' | 'cskh'>('notifications');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [cskhStaff, setCskhStaff] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      // Lấy danh sách thông báo
      const notifRes = await api.get('/notifications');
      setNotifications(notifRes.data?.data?.items || notifRes.data?.data || []);

      // Lấy thông tin CSKH phụ trách qua hồ sơ bệnh nhân
      if (user?.id) {
        try {
          const patientRes = await api.get(`/patients/${user.id}`);
          const assignedStaff = patientRes.data?.data?.users_patients_assigned_cskh_idTousers;
          if (assignedStaff) {
            setCskhStaff({
              cskh_staff: assignedStaff,
              assigned_at: patientRes.data?.data?.created_at,
            });
          } else {
            setCskhStaff({
              cskh_staff: {
                full_name: 'CSKH Trần Thị B (Mặc định)',
                phone: '0903456789',
                email: 'cskh@hospital.local',
              },
              assigned_at: new Date().toISOString(),
            });
          }
        } catch {
          // Fallback khi chưa gán CSKH
          setCskhStaff({
            cskh_staff: {
              full_name: 'CSKH Trần Thị B',
              phone: '0903456789',
              email: 'cskh@hospital.local',
            },
            assigned_at: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Mock data notifications mẫu
      setNotifications([
        {
          id: 'n1',
          type: 'follow_up_reminder',
          title: 'Nhắc lịch tái khám tại nhà',
          content: 'Bạn có lịch tái khám vào ngày mai lúc 09:00. Bác sĩ Nguyễn Văn A sẽ đến thăm khám.',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: 'n2',
          type: 'appointment_confirmation',
          title: 'Xác nhận lịch hẹn khám',
          content: 'Lịch hẹn khám tại nhà #APT-001 của bạn đã được xác nhận thành công.',
          is_read: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'n3',
          type: 'medicine_reminder',
          title: 'Nhắc uống thuốc sau ăn',
          content: 'Nhớ uống 01 viên Paracetamol 500mg sau bữa trưa theo đơn bác sĩ kê.',
          is_read: true,
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const handleCallCSKH = () => {
    const phone = cskhStaff?.cskh_staff?.phone || '0903456789';
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenZalo = () => {
    const phone = cskhStaff?.cskh_staff?.phone || '0903456789';
    Linking.openURL(`https://zalo.me/${phone}`).catch(() => {
      Alert.alert('Zalo', 'Không thể mở liên kết Zalo trên thiết bị này.');
    });
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'follow_up_reminder':
        return { name: 'alarm-outline', color: '#D97706', bg: '#FEF3C7' };
      case 'appointment_confirmation':
        return { name: 'checkmark-circle-outline', color: '#0284C7', bg: '#E0F2FE' };
      case 'medicine_reminder':
        return { name: 'medkit-outline', color: '#16A34A', bg: '#DCFCE7' };
      case 'cskh_care':
        return { name: 'heart-outline', color: '#EA580C', bg: '#FFEDD5' };
      default:
        return { name: 'notifications-outline', color: '#64748B', bg: '#F1F5F9' };
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'notifications' && styles.tabBtnActive]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'notifications' && styles.tabTextActive,
            ]}
          >
            Hộp thư Thông báo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'cskh' && styles.tabBtnActive]}
          onPress={() => setActiveTab('cskh')}
        >
          <Text
            style={[styles.tabText, activeTab === 'cskh' && styles.tabTextActive]}
          >
            CSKH Chuyên trách (1-1)
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={MedicalColors.primary} style={{ marginTop: 40 }} />
      ) : activeTab === 'notifications' ? (
        /* Danh sách thông báo */
        <View style={styles.notifSection}>
          <Text style={styles.subHeader}>
            Thông báo tự động & Nhắc lịch tái khám (07:00 AM)
          </Text>

          {notifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="mail-open-outline" size={36} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Hộp thư rỗng</Text>
              <Text style={styles.emptySub}>Bạn chưa có thông báo mới nào.</Text>
            </View>
          ) : (
            notifications.map((notif) => {
              const iconCfg = getNotifIcon(notif.type);
              return (
                <TouchableOpacity
                  key={notif.id}
                  style={[
                    styles.notifCard,
                    !notif.is_read && styles.notifCardUnread,
                  ]}
                  onPress={() => handleMarkAsRead(notif.id)}
                >
                  <View style={[styles.notifIconBox, { backgroundColor: iconCfg.bg }]}>
                    <Ionicons name={iconCfg.name as any} size={20} color={iconCfg.color} />
                  </View>
                  <View style={styles.notifContent}>
                    <View style={styles.notifTitleRow}>
                      <Text style={styles.notifTitle}>{notif.title}</Text>
                      {!notif.is_read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notifBody}>{notif.content}</Text>
                    <Text style={styles.notifTime}>
                      {new Date(notif.created_at).toLocaleDateString('vi-VN')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      ) : (
        /* Thẻ CSKH chuyên trách 1-1 theo Rule 1 */
        <View style={styles.cskhSection}>
          <View style={styles.cskhCard}>
            <View style={styles.cskhAvatarBox}>
              <Ionicons name="headset" size={36} color="#0284C7" />
            </View>
            <Text style={styles.cskhRole}>CHUYÊN VIÊN CSKH PHỤ TRÁCH CỦA BẠN</Text>
            <Text style={styles.cskhName}>
              {cskhStaff?.cskh_staff?.full_name || 'CSKH Trần Thị B'}
            </Text>
            <Text style={styles.cskhDesc}>
              Tuân thủ nguyên tắc chăm sóc 1 cửa (Single Active CSKH). Nhân viên phụ trách sẽ hỗ trợ bạn tái khám, hướng dẫn uống thuốc và giải đáp mọi thắc mắc.
            </Text>

            <View style={styles.cskhBtnGroup}>
              <TouchableOpacity style={styles.callBtn} onPress={handleCallCSKH}>
                <Ionicons name="call" size={18} color="#FFFFFF" />
                <Text style={styles.callBtnText}>Gọi điện trực tiếp</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.zaloBtn} onPress={handleOpenZalo}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#0284C7" />
                <Text style={styles.zaloBtnText}>Nhắn tin Zalo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quy tắc cam kết dịch vụ */}
          <View style={styles.policyCard}>
            <Text style={styles.policyTitle}>Cam kết Chăm sóc Bệnh nhân</Text>
            <View style={styles.policyItem}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.policyText}>
                Liên hệ xác nhận lịch hẹn trong vòng 15 phút sau khi đặt.
              </Text>
            </View>
            <View style={styles.policyItem}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.policyText}>
                Tự động nhắc lịch tái khám trước 3 ngày qua app và điện thoại.
              </Text>
            </View>
            <View style={styles.policyItem}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.policyText}>
                Hỗ trợ gửi thuốc hoặc giao vật tư y tế tận nhà khi cần thiết.
              </Text>
            </View>
          </View>
        </View>
      )}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
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
  subHeader: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  notifSection: {
    gap: 10,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  notifCardUnread: {
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
  },
  notifIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifContent: {
    flex: 1,
    gap: 4,
  },
  notifTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0284C7',
  },
  notifBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  notifTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
  },
  cskhSection: {
    gap: 16,
  },
  cskhCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cskhAvatarBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cskhRole: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cskhName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  cskhDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  cskhBtnGroup: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  zaloBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 12,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  zaloBtnText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 13,
  },
  policyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  policyText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
  },
});
