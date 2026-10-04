import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MedicalColors } from '../constants/Colors';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CareLogModal } from '../components/CareLogModal';

interface FollowUpItem {
  id: string;
  patient_id: string;
  next_visit_date: string;
  status: string;
  reminder_sent: boolean;
  notes?: string;
  patients?: {
    id: string;
    full_name: string;
    phone: string;
    address?: string;
  };
  examinations?: {
    diagnosis_note?: string;
    diseases?: {
      name: string;
      icd_code: string;
    };
    users?: {
      full_name: string;
    };
  };
}

export default function CskhFollowupsScreen() {
  const { user, token } = useAuth();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [careLogs, setCareLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'followups' | 'history'>('followups');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Care log modal state
  const [careModalVisible, setCareModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const [dashRes, followRes, logsRes] = await Promise.all([
        api.get('/cskh/dashboard').catch(() => null),
        api.get('/follow-ups').catch(() => null),
        api.get('/cskh/care-logs').catch(() => null),
      ]);

      if (dashRes?.data?.data) {
        setDashboardData(dashRes.data.data);
      }

      const items =
        followRes?.data?.data?.items ||
        followRes?.data?.data?.data ||
        (Array.isArray(followRes?.data?.data) ? followRes.data.data : []);
      setFollowUps(items);

      const logs =
        logsRes?.data?.data?.items ||
        logsRes?.data?.data?.data ||
        (Array.isArray(logsRes?.data?.data) ? logsRes.data.data : []);
      setCareLogs(logs);
    } catch {
      // Mock data đầy đủ chuẩn nghiệp vụ
      setDashboardData({
        stats: {
          assignedPatients: 18,
          upcomingFollowUpsCount: 5,
          unreadNotificationsCount: 3,
        },
      });

      setFollowUps([
        {
          id: 'fu-001',
          patient_id: 'pat-001',
          next_visit_date: new Date(Date.now() + 86400000).toISOString(),
          status: 'reminded',
          reminder_sent: true,
          notes: 'Tái khám sau 5 ngày điều trị viêm phế quản',
          patients: {
            id: 'pat-001',
            full_name: 'Nguyễn Văn Bệnh Nhân',
            phone: '0912345678',
            address: '123 Giải Phóng, Hai Bà Trưng, Hà Nội',
          },
          examinations: {
            diagnosis_note: 'Bệnh nhân có ran rít nhẹ ở phế quản, kê đơn kháng sinh 5 ngày.',
            diseases: { name: 'Viêm phế quản cấp', icd_code: 'J20' },
            users: { full_name: 'BS. CK1 Hoàng Minh Tâm' },
          },
        },
        {
          id: 'fu-002',
          patient_id: 'pat-002',
          next_visit_date: new Date(Date.now() + 86400000 * 3).toISOString(),
          status: 'scheduled',
          reminder_sent: false,
          notes: 'Kiểm tra huyết áp và kiểm soát đường huyết',
          patients: {
            id: 'pat-002',
            full_name: 'Trần Thị Mai',
            phone: '0988776655',
            address: '144 Xuân Thủy, Cầu Giấy, Hà Nội',
          },
          examinations: {
            diagnosis_note: 'Huyết áp dao động 145/90 mmHg, cần tái khám đo lại.',
            diseases: { name: 'Tăng huyết áp vô căn', icd_code: 'I10' },
            users: { full_name: 'BS. CK1 Hoàng Minh Tâm' },
          },
        },
      ]);

      setCareLogs([
        {
          id: 'log-001',
          interaction_type: 'call',
          content: 'Đã gọi điện hỏi thăm bệnh nhân sau 2 ngày uống thuốc. Bệnh nhân phản hồi hết sốt, còn ho nhẹ. Hướng dẫn uống đủ liều.',
          next_action: 'Gọi điện xác nhận lịch tái khám vào ngày mai',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          patients: { full_name: 'Nguyễn Văn Bệnh Nhân' },
        },
      ]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleOpenCareModal = (patientId: string, patientName: string) => {
    setSelectedPatient({ id: patientId, name: patientName });
    setCareModalVisible(true);
  };

  const handleUpdateFollowUpStatus = async (followUpId: string, newStatus: 'confirmed' | 'missed') => {
    try {
      await api.patch(`/follow-ups/${followUpId}/status`, {
        status: newStatus,
      });

      setFollowUps((prev) =>
        prev.map((item) => (item.id === followUpId ? { ...item, status: newStatus } : item))
      );

      Alert.alert(
        'Thành công',
        `Đã chuyển lịch tái khám sang trạng thái "${newStatus === 'confirmed' ? 'Đã xác nhận' : 'Bỏ lỡ'}"`
      );
    } catch {
      setFollowUps((prev) =>
        prev.map((item) => (item.id === followUpId ? { ...item, status: newStatus } : item))
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { label: 'Khách đã chốt lịch', color: '#15803D', bg: '#DCFCE7' };
      case 'reminded':
        return { label: 'Đã gửi thông báo nhắc', color: '#B45309', bg: '#FEF3C7' };
      case 'missed':
        return { label: 'Bỏ lỡ tái khám', color: '#B91C1C', bg: '#FEE2E2' };
      default:
        return { label: 'Đang theo dõi', color: '#0369A1', bg: '#E0F2FE' };
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* KPI Header Dashboard */}
      <View style={styles.header}>
        <View style={styles.badgePill}>
          <Ionicons name="heart" size={14} color="#EA580C" />
          <Text style={styles.badgePillText}>Trung Tâm Chăm Sóc Khách Hàng (CRM y tế)</Text>
        </View>
        <Text style={styles.title}>Quản Lý Tái Khám & Nhật Ký CSKH</Text>
        <Text style={styles.sub}>
          Theo dõi vòng đời điều trị sau khám, nhắc nhở tái khám tự động và lưu trữ Care Logs.
        </Text>

        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: '#FFEDD5', borderColor: '#FDBA74' }]}>
            <Text style={[styles.kpiNum, { color: '#C2410C' }]}>
              {dashboardData?.stats?.assignedPatients || followUps.length}
            </Text>
            <Text style={styles.kpiLabel}>Khách phụ trách (Rule 1)</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
            <Text style={[styles.kpiNum, { color: '#B45309' }]}>
              {dashboardData?.stats?.upcomingFollowUpsCount || followUps.length}
            </Text>
            <Text style={styles.kpiLabel}>Tái khám 7 ngày tới</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
            <Text style={[styles.kpiNum, { color: '#0284C7' }]}>07:00 AM</Text>
            <Text style={styles.kpiLabel}>Cron Quét nhắc tự động</Text>
          </View>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'followups' && styles.tabBtnActive]}
          onPress={() => setActiveTab('followups')}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={activeTab === 'followups' ? '#EA580C' : '#64748B'}
          />
          <Text style={[styles.tabBtnText, activeTab === 'followups' && styles.tabBtnTextActive]}>
            Lịch Tái Khám Đến Hạn ({followUps.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="book-outline"
            size={16}
            color={activeTab === 'history' ? '#EA580C' : '#64748B'}
          />
          <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
            Nhật Ký Chăm Sóc ({careLogs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Đang nạp dữ liệu chăm sóc...</Text>
        </View>
      ) : activeTab === 'followups' ? (
        /* DANH SÁCH LỊCH TÁI KHÁM */
        <View style={styles.listSection}>
          {followUps.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkbox-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Chưa có lịch tái khám nào đến hạn</Text>
              <Text style={styles.emptySub}>
                Toàn bộ bệnh nhân đã được thăm khám chu đáo hoặc chưa tới kỳ hẹn.
              </Text>
            </View>
          ) : (
            followUps.map((fu) => {
              const patientName = fu.patients?.full_name || 'Bệnh nhân';
              const patientPhone = fu.patients?.phone || '0901234567';
              const docName = fu.examinations?.users?.full_name || 'BS. Hoàng Minh Tâm';
              const icd = fu.examinations?.diseases?.icd_code;
              const diseaseName = fu.examinations?.diseases?.name || 'Theo dõi lâm sàng';
              const stCfg = getStatusBadge(fu.status);

              return (
                <View key={fu.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardPatientName}>{patientName}</Text>
                      <Text style={styles.cardAddress}>
                        {fu.patients?.address || 'Tại nhà bệnh nhân'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: stCfg.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: stCfg.color }]}>
                        {stCfg.label}
                      </Text>
                    </View>
                  </View>

                  {/* Scheduled Date */}
                  <View style={styles.dateRow}>
                    <Ionicons name="alarm" size={16} color="#EA580C" />
                    <Text style={styles.dateText}>
                      Ngày tái khám:{' '}
                      <Text style={{ fontWeight: '800', color: '#C2410C' }}>
                        {new Date(fu.next_visit_date).toLocaleDateString('vi-VN')}
                      </Text>
                    </Text>
                  </View>

                  {/* Medical Diagnosis past */}
                  <View style={styles.diseaseBox}>
                    <View style={styles.icdTag}>
                      <Text style={styles.icdTagText}>{icd || 'ICD'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.diseaseName}>{diseaseName}</Text>
                      <Text style={styles.doctorName}>Bác sĩ khám đợt trước: {docName}</Text>
                    </View>
                  </View>

                  {fu.examinations?.diagnosis_note && (
                    <Text style={styles.diagNote}>
                      Ghi chú: {fu.examinations.diagnosis_note}
                    </Text>
                  )}

                  {/* Actions: Call, Zalo, Log */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => Linking.openURL(`tel:${patientPhone}`)}
                    >
                      <Ionicons name="call" size={14} color="#FFFFFF" />
                      <Text style={styles.callBtnText}>Gọi điện</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.zaloBtn}
                      onPress={() => Linking.openURL(`https://zalo.me/${patientPhone}`)}
                    >
                      <MaterialCommunityIcons name="chat-outline" size={14} color="#0284C7" />
                      <Text style={styles.zaloBtnText}>Chat Zalo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.logBtn}
                      onPress={() => handleOpenCareModal(fu.patient_id, patientName)}
                    >
                      <Ionicons name="create-outline" size={14} color="#0D9488" />
                      <Text style={styles.logBtnText}>Ghi nhật ký</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Confirm or Miss status */}
                  {fu.status !== 'confirmed' && (
                    <View style={styles.quickStatusRow}>
                      <TouchableOpacity
                        style={styles.btnConfirmFollow}
                        onPress={() => handleUpdateFollowUpStatus(fu.id, 'confirmed')}
                      >
                        <Ionicons name="checkmark-circle" size={14} color="#15803D" />
                        <Text style={styles.btnConfirmFollowText}>Khách đồng ý tái khám</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.btnMissFollow}
                        onPress={() => handleUpdateFollowUpStatus(fu.id, 'missed')}
                      >
                        <Text style={styles.btnMissFollowText}>Bỏ lỡ / Dời lịch</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      ) : (
        /* LỊCH SỬ CHĂM SÓC KHÁCH HÀNG (CARE LOGS) */
        <View style={styles.listSection}>
          {careLogs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Chưa có nhật ký chăm sóc nào</Text>
              <Text style={styles.emptySub}>
                Bấm vào nút "Ghi nhật ký" ở danh sách tái khám để lưu lại cuộc gọi hoặc tin nhắn.
              </Text>
            </View>
          ) : (
            careLogs.map((log) => (
              <View key={log.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.logTypeTag}>
                    <Ionicons
                      name={
                        log.interaction_type === 'call'
                          ? 'call'
                          : log.interaction_type === 'zalo'
                          ? 'chatbubbles'
                          : 'mail'
                      }
                      size={14}
                      color="#0284C7"
                    />
                    <Text style={styles.logTypeText}>
                      {log.interaction_type === 'call'
                        ? 'Cuộc gọi'
                        : log.interaction_type === 'zalo'
                        ? 'Zalo'
                        : 'Tin nhắn'}
                    </Text>
                  </View>
                  <Text style={styles.logDate}>
                    {new Date(log.created_at).toLocaleDateString('vi-VN')}
                  </Text>
                </View>

                <Text style={styles.logPatientName}>
                  Bệnh nhân: <Text style={{ fontWeight: '700' }}>{log.patients?.full_name}</Text>
                </Text>

                <Text style={styles.logContent}>{log.content}</Text>

                {log.next_action && (
                  <View style={styles.nextActionBox}>
                    <Ionicons name="arrow-forward-circle" size={14} color="#D97706" />
                    <Text style={styles.nextActionText}>
                      Hành động tiếp theo: {log.next_action}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      )}

      {/* Care Log Modal */}
      {selectedPatient && (
        <CareLogModal
          visible={careModalVisible}
          patientId={selectedPatient.id}
          patientName={selectedPatient.name}
          onClose={() => setCareModalVisible(false)}
          onSuccess={() => {
            setCareModalVisible(false);
            fetchData();
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 6,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  kpiCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  kpiNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#C2410C',
    fontWeight: '700',
  },
  listSection: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardPatientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardAddress: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#475569',
  },
  diseaseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    gap: 10,
  },
  icdTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  icdTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  diseaseName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  doctorName: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  diagNote: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  zaloBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  zaloBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  logBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  logBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  quickStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  btnConfirmFollow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  btnConfirmFollowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  btnMissFollow: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  btnMissFollowText: {
    fontSize: 11,
    color: '#64748B',
  },
  logTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  logTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  logDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  logPatientName: {
    fontSize: 13,
    color: '#334155',
    marginTop: 8,
  },
  logContent: {
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 18,
    marginTop: 4,
  },
  nextActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  nextActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  center: {
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});
