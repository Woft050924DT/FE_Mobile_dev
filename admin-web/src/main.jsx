import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowUpRight,
  ArrowUpRightFromSquare,
  BadgeCheck,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  FileClock,
  FilePlus2,
  FileText,
  Filter,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserRound,
  UserRoundPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { api, dataOf, errorMessage, listOf } from './api';
import './styles.css';

const navItems = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'appointments', label: 'Quản lý lịch hẹn', icon: CalendarDays },
  { id: 'requests', label: 'Yêu cầu đổi / hủy', icon: FileClock },
  { id: 'patients', label: 'Hồ sơ bệnh nhân', icon: UsersRound },
  { id: 'staff', label: 'Nhân viên & phân quyền', icon: UserRoundPlus },
  { id: 'body-map', label: 'Body Map', icon: Activity },
  { id: 'catalog', label: 'Danh mục y tế', icon: HeartPulse },
  { id: 'care', label: 'Điều phối CSKH', icon: ClipboardList },
];

const statusOptions = [
  ['pending', 'Chờ xác nhận'],
  ['confirmed', 'Đã xác nhận'],
  ['checked_in', 'Đã check-in'],
  ['in_progress', 'Đang khám'],
  ['completed', 'Hoàn thành'],
  ['cancelled', 'Đã hủy'],
  ['no_show', 'Vắng mặt'],
  ['rescheduled', 'Đã đổi lịch'],
];
const roleOptions = [
  ['2', 'Bác sĩ'],
  ['3', 'Điều dưỡng'],
  ['4', 'CSKH'],
  ['1', 'Admin'],
];
const interactionOptions = [
  ['call', 'Gọi điện'],
  ['message', 'Tin nhắn'],
  ['zalo', 'Zalo'],
  ['email', 'Email'],
  ['home_visit', 'Thăm tại nhà'],
  ['other', 'Khác'],
];
const statusText = (value) =>
  statusOptions.find(([key]) => key === value)?.[1] ||
  ({ active: 'Đang hoạt động', inactive: 'Tạm khóa', locked: 'Đã khóa', approved: 'Đã duyệt', rejected: 'Đã từ chối', awaiting_patient: 'Chờ bệnh nhân' }[value]) ||
  value ||
  '—';
const dateText = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
const moneyText = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value || 0));
const roleText = (user) =>
  user?.roles?.name || roleOptions.find(([key]) => key === String(user?.role_id))?.[1] || 'Nhân viên';

function App() {
  const [profile, setProfile] = useState(() => {
    try {
      const savedProfile = JSON.parse(localStorage.getItem('admin_profile') || 'null');
      const token = localStorage.getItem('admin_access_token');
      const payload = token ? JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) : null;
      return savedProfile?.role?.code?.toLowerCase() === 'admin' && payload?.role === 'admin'
        ? savedProfile
        : null;
    } catch {
      return null;
    }
  });
  const [section, setSection] = useState('overview');
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [queryStatus, setQueryStatus] = useState('');
  const [catalogTab, setCatalogTab] = useState('symptoms');
  const [modal, setModal] = useState(null);
  const [data, setData] = useState({
    appointments: [],
    staff: [],
    patients: [],
    requests: [],
    symptoms: [],
    diseases: [],
    products: [],
    bodyParts: [],
    assignments: [],
    careLogs: [],
    dashboard: null,
  });
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [patientExams, setPatientExams] = useState([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const loadData = useCallback(async () => {
    const [
      appointments,
      ...staffResponses
    ] = await Promise.all([
      api('/appointments?page=1&limit=100'),
      ...['admin', 'doctor', 'nurse', 'cskh'].map((roleCode) =>
        api(`/users?page=1&limit=100&roleCode=${roleCode}`)
      ),
    ]);
    const [
      patients,
      requests,
      symptoms,
      diseases,
      products,
      bodyParts,
      assignments,
      careLogs,
      dashboard,
    ] = await Promise.all([
      api('/patients?page=1&limit=100'),
      api('/appointments/change-requests?page=1&limit=100'),
      api('/symptoms?page=1&limit=100'),
      api('/diseases?page=1&limit=100'),
      api('/products?page=1&limit=100'),
      api('/body-parts'),
      api('/cskh/assignments?isActive=true'),
      api('/cskh/care-logs?page=1&limit=100'),
      api('/cskh/dashboard'),
    ]);
    setData({
      appointments: listOf(appointments),
      staff: [...new Map(staffResponses.flatMap(listOf).map((person) => [person.id, person])).values()],
      patients: listOf(patients),
      requests: listOf(requests),
      symptoms: listOf(symptoms),
      diseases: listOf(diseases),
      products: listOf(products),
      bodyParts: listOf(bodyParts),
      assignments: listOf(assignments),
      careLogs: listOf(careLogs),
      dashboard: dataOf(dashboard),
    });
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setProfile(null);
      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    };
    window.addEventListener('admin:unauthorized', onUnauthorized);
    return () => window.removeEventListener('admin:unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    setError('');
    loadData()
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false));
  }, [loadData, profile]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      await loadData();
      setToast('Dữ liệu đã được cập nhật');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  };

  const perform = async (label, action, refreshAfter = true) => {
    setError('');
    setSaving(true);
    try {
      await action();
      setModal(null);
      setToast(label);
      if (refreshAfter) {
        try {
          await loadData();
        } catch (reason) {
          setError(`Đã lưu thay đổi nhưng chưa thể tải lại dữ liệu: ${errorMessage(reason)}`);
        }
      }
      return true;
    } catch (reason) {
      const message = errorMessage(reason);
      if (modal) setModal((current) => current ? { ...current, error: message } : current);
      else setError(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleLogin = async (credentials) => {
    setLoginLoading(true);
    setError('');
    try {
      const response = await api('/auth/login', {
        method: 'POST',
        body: credentials,
      });
      const result = dataOf(response);
      const account = result?.user;
      if (account?.role?.code?.toLowerCase() !== 'admin') {
        throw new Error('Trang quản trị chỉ dành cho tài khoản Admin.');
      }
      localStorage.setItem('admin_access_token', result.accessToken);
      if (result.refreshToken) localStorage.setItem('admin_refresh_token', result.refreshToken);
      const adminProfile = { ...account, full_name: account.fullName };
      localStorage.setItem('admin_profile', JSON.stringify(adminProfile));
      setProfile(adminProfile);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Clear the local admin session even if the stateless logout endpoint is unavailable.
    }
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_profile');
    setProfile(null);
    setData({
      appointments: [], staff: [], patients: [], requests: [], symptoms: [], diseases: [],
      products: [], bodyParts: [], assignments: [], careLogs: [], dashboard: null,
    });
  };

  const openForm = (title, fields, onSubmit, values = {}) => {
    setModal({
      title,
      fields,
      values: Object.fromEntries(fields.map((field) => [
        field.name,
        values[field.name] ?? field.default ?? (field.type === 'multiselect' ? [] : ''),
      ])),
      onSubmit,
      error: '',
    });
  };

  const openAppointmentForm = (appointment) => {
    const staffChoices = data.staff
      .filter((person) => ['doctor', 'nurse'].includes(person.roles?.code))
      .map((person) => [person.id, `${person.full_name} · ${roleText(person)}`]);
    const fields = appointment
      ? [
          { name: 'staffId', label: 'Bác sĩ / điều dưỡng', type: 'select', options: staffChoices, required: true },
          { name: 'clinicRoom', label: 'Phòng khám' },
        ]
      : [
          { name: 'patientId', label: 'Bệnh nhân', type: 'select', required: true, options: data.patients.map((patient) => [patient.id, patient.full_name]) },
          { name: 'scheduledAt', label: 'Thời gian khám', type: 'datetime-local', required: true },
          { name: 'type', label: 'Loại lịch', type: 'select', options: [['first_visit', 'Khám lần đầu'], ['follow_up', 'Tái khám'], ['emergency', 'Cấp cứu']], default: 'first_visit' },
          { name: 'assignedStaffId', label: 'Bác sĩ / điều dưỡng', type: 'select', options: [['', 'Chưa phân công'], ...staffChoices] },
          { name: 'visitAddress', label: 'Địa chỉ khám' },
          { name: 'note', label: 'Ghi chú', type: 'textarea' },
        ];
    openForm(
      appointment ? 'Phân công nhân viên khám' : 'Tạo lịch hẹn khám',
      fields,
      async (values) => {
        const result = appointment
          ? await api(`/appointments/${appointment.id}/assign`, {
              method: 'PATCH',
              body: { staffId: values.staffId, clinicRoom: values.clinicRoom || undefined },
            })
          : await api('/appointments', {
              method: 'POST',
              body: {
                ...values,
                scheduledAt: new Date(values.scheduledAt).toISOString(),
                assignedStaffId: values.assignedStaffId || undefined,
                visitAddress: values.visitAddress || undefined,
                note: values.note || undefined,
              },
            });
        return result;
      },
      appointment
        ? { staffId: appointment.users_appointments_assigned_staff_idTousers?.id }
        : {}
    );
  };

  const openStatusForm = (appointment) =>
    openForm(
      'Cập nhật trạng thái lịch',
      [
        { name: 'status', label: 'Trạng thái', type: 'select', required: true, options: statusOptions, default: appointment.status },
        { name: 'note', label: 'Ghi chú', type: 'textarea' },
      ],
      (values) =>
        api(`/appointments/${appointment.id}/status`, {
          method: 'PATCH',
          body: { status: values.status, note: values.note || undefined },
        })
    );

  const openReview = (request, decision) => {
    const fields = [{ name: 'reviewNote', label: 'Ghi chú xử lý', type: 'textarea' }];
    if (request.initiated_by_role === 'doctor' && decision === 'approved' && request.patient_choice === 'change_doctor') {
      const currentDoctorId = request.appointments?.users_appointments_assigned_staff_idTousers?.id;
      fields.push({
        name: 'assignedStaffId',
        label: 'Bác sĩ thay thế',
        type: 'select',
        required: true,
        options: data.staff.filter((person) => person.roles?.code === 'doctor' && person.status === 'active' && person.id !== currentDoctorId).map((person) => [person.id, person.full_name]),
      });
    }
    openForm(decision === 'approved' ? 'Duyệt yêu cầu đổi / hủy' : 'Từ chối yêu cầu', fields, (values) =>
      api(`/appointments/change-requests/${request.id}/review`, {
        method: 'PATCH',
        body: {
          decision,
          reviewNote: values.reviewNote || undefined,
          assignedStaffId: values.assignedStaffId || undefined,
        },
      })
    );
  };

  const notifyPatientOfDoctorRequest = (request) =>
    perform('Đã gửi yêu cầu cho bệnh nhân chọn phương án.', () =>
      api(`/appointments/change-requests/${request.id}/notify-patient`, { method: 'POST' })
    );

  const openStaffForm = (person) => {
    const isEdit = Boolean(person);
    const fields = [
      { name: 'fullName', label: 'Họ và tên', required: true },
      ...(!isEdit ? [{ name: 'email', label: 'Email', required: true }] : []),
      { name: 'phone', label: 'Số điện thoại' },
      { name: 'roleId', label: 'Vai trò', type: 'select', required: true, options: roleOptions },
      { name: 'status', label: 'Trạng thái', type: 'select', options: [['active', 'Đang hoạt động'], ['inactive', 'Tạm khóa'], ['locked', 'Đã khóa']], default: 'active' },
      { name: 'password', label: isEdit ? 'Mật khẩu mới (không bắt buộc)' : 'Mật khẩu', type: 'password', required: !isEdit },
    ];
    openForm(
      isEdit ? 'Cập nhật tài khoản nhân viên' : 'Tạo tài khoản nhân viên',
      fields,
      (values) => {
        const body = {
          fullName: values.fullName,
          ...(values.email ? { email: values.email } : {}),
          phone: values.phone || undefined,
          roleId: Number(values.roleId),
          status: values.status,
          ...(values.password ? { password: values.password } : {}),
        };
        return api(isEdit ? `/users/${person.id}` : '/users', { method: isEdit ? 'PATCH' : 'POST', body });
      },
      person
        ? { fullName: person.full_name, phone: person.phone, roleId: String(person.role_id), status: person.status }
        : {}
    );
  };

  const openCatalogForm = (type, item) => {
    const isEdit = Boolean(item);
    let fields;
    let endpoint;
    let bodyFromValues;
    if (type === 'symptoms') {
      endpoint = '/symptoms';
      fields = [
        { name: 'name', label: 'Tên triệu chứng', required: true },
        { name: 'category', label: 'Nhóm triệu chứng' },
        { name: 'description', label: 'Mô tả', type: 'textarea' },
      ];
      bodyFromValues = (values) => ({ ...values, category: values.category || undefined, description: values.description || undefined });
    } else if (type === 'diseases') {
      endpoint = '/diseases';
      fields = [
        { name: 'name', label: 'Tên bệnh lý', required: true },
        { name: 'icdCode', label: 'Mã ICD-10' },
        { name: 'description', label: 'Mô tả', type: 'textarea' },
        { name: 'symptomIds', label: 'Triệu chứng liên quan', type: 'multiselect', options: data.symptoms.map((symptom) => [String(symptom.id), symptom.name]) },
      ];
      bodyFromValues = (values) => ({
        ...values,
        icdCode: values.icdCode || undefined,
        description: values.description || undefined,
        symptomIds: values.symptomIds.map(Number),
      });
    } else {
      endpoint = '/products';
      fields = [
        { name: 'name', label: 'Tên thuốc / sản phẩm', required: true },
        { name: 'type', label: 'Loại', type: 'select', options: [['medicine', 'Thuốc'], ['supplement', 'Thực phẩm bổ sung']], default: 'medicine' },
        { name: 'manufacturer', label: 'Nhà sản xuất' },
        { name: 'unit', label: 'Đơn vị' },
        { name: 'dosageForm', label: 'Dạng bào chế' },
        { name: 'price', label: 'Giá (VNĐ)', type: 'number', default: '0' },
        { name: 'stockQuantity', label: 'Số lượng tồn kho', type: 'number', default: '0' },
        { name: 'status', label: 'Trạng thái', type: 'select', options: [['active', 'Đang kinh doanh'], ['discontinued', 'Ngừng kinh doanh'], ['out_of_stock', 'Hết hàng']], default: 'active' },
        { name: 'usageInstruction', label: 'Hướng dẫn sử dụng', type: 'textarea' },
        { name: 'contraindication', label: 'Chống chỉ định', type: 'textarea' },
      ];
      bodyFromValues = (values) => ({
        ...values,
        price: Number(values.price || 0),
        stockQuantity: Number(values.stockQuantity || 0),
        manufacturer: values.manufacturer || undefined,
        unit: values.unit || undefined,
        dosageForm: values.dosageForm || undefined,
        usageInstruction: values.usageInstruction || undefined,
        contraindication: values.contraindication || undefined,
      });
    }
    const values = item
      ? type === 'symptoms'
        ? { name: item.name, category: item.category, description: item.description }
        : type === 'diseases'
          ? {
              name: item.name,
              icdCode: item.icd_code,
              description: item.description,
              symptomIds: (item.disease_symptoms || []).map((link) => String(link.symptom_id ?? link.symptoms?.id)).filter((id) => id !== 'undefined'),
            }
          : { name: item.name, type: item.type, manufacturer: item.manufacturer, unit: item.unit, dosageForm: item.dosage_form, price: item.price, stockQuantity: item.stock_quantity, status: item.status, usageInstruction: item.usage_instruction, contraindication: item.contraindication }
      : {};
    openForm(isEdit ? 'Cập nhật danh mục' : 'Thêm vào danh mục', fields, (formValues) =>
      api(`${endpoint}${isEdit ? `/${item.id}` : ''}`, {
        method: isEdit ? 'PATCH' : 'POST',
        body: bodyFromValues(formValues),
      }), values);
  };

  const loadRecommendations = async (type, item) => {
    const endpoint = type === 'symptoms' ? `/symptoms/${item.id}/recommendations` : `/diseases/${item.id}/recommendations`;
    const response = await api(endpoint);
    const result = dataOf(response);
    return {
      recommendations: result?.recommendations || [],
      disclaimer: result?.disclaimer || 'Gợi ý chỉ mang tính tham khảo sơ bộ, không thay thế chẩn đoán hoặc đơn thuốc chính thức.',
    };
  };

  const openRecommendations = async (type, item) => {
    setError('');
    try {
      const { recommendations, disclaimer } = await loadRecommendations(type, item);
      setModal({ kind: 'recommendations', title: `Gợi ý thuốc · ${item.name}`, type, item, recommendations, disclaimer, error: '' });
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  const saveRecommendation = async (values) => {
    if (!modal || modal.kind !== 'recommendations') return;
    const { type, item } = modal;
    const key = type === 'symptoms' ? 'symptomId' : 'diseaseId';
    const path = type === 'symptoms' ? 'symptom' : 'disease';
    setSaving(true);
    try {
      await api(`/products/recommendations/${path}`, {
        method: 'POST',
        body: {
          [key]: Number(item.id),
          productId: values.productId,
          recommendedDosage: values.recommendedDosage || undefined,
          priority: Number(values.priority || 1),
          note: values.note || undefined,
        },
      });
      const { recommendations, disclaimer } = await loadRecommendations(type, item);
      setModal((current) => current ? { ...current, recommendations, disclaimer, error: '' } : current);
      setToast('Đã cập nhật gợi ý sản phẩm.');
    } catch (reason) {
      setModal((current) => current ? { ...current, error: errorMessage(reason) } : current);
    } finally {
      setSaving(false);
    }
  };

  const deleteRecommendation = async (recommendation) => {
    if (!modal || modal.kind !== 'recommendations') return;
    const { type, item } = modal;
    const path = type === 'symptoms' ? 'symptom' : 'disease';
    const parentId = item.id;
    const productId = recommendation.product_id || recommendation.products?.id;
    if (!productId) {
      setModal((current) => current ? { ...current, error: 'Không xác định được mã sản phẩm để xóa gợi ý.' } : current);
      return;
    }
    setSaving(true);
    try {
      await api(`/products/recommendations/${path}/${parentId}/${productId}`, { method: 'DELETE' });
      const { recommendations, disclaimer } = await loadRecommendations(type, item);
      setModal((current) => current ? { ...current, recommendations, disclaimer, error: '' } : current);
      setToast('Đã xóa gợi ý sản phẩm.');
    } catch (reason) {
      setModal((current) => current ? { ...current, error: errorMessage(reason) } : current);
    } finally {
      setSaving(false);
    }
  };

  const openAssignCskh = () =>
    openForm(
      'Phân công CSKH phụ trách',
      [
        { name: 'patientId', label: 'Bệnh nhân', type: 'select', required: true, options: data.patients.map((patient) => [patient.id, patient.full_name]) },
        { name: 'cskhStaffId', label: 'Nhân viên CSKH', type: 'select', required: true, options: data.staff.filter((person) => person.roles?.code === 'cskh' && person.status === 'active').map((person) => [person.id, person.full_name]) },
      ],
      (values) => api('/cskh/assignments', { method: 'POST', body: values })
    );

  const openCareLog = () =>
    openForm(
      'Ghi nhật ký chăm sóc',
      [
        { name: 'patientId', label: 'Bệnh nhân', type: 'select', required: true, options: data.patients.map((patient) => [patient.id, patient.full_name]) },
        { name: 'interactionType', label: 'Hình thức tương tác', type: 'select', options: interactionOptions, default: 'call' },
        { name: 'content', label: 'Nội dung chăm sóc', type: 'textarea', required: true },
        { name: 'nextAction', label: 'Việc cần làm tiếp theo' },
        { name: 'nextActionDate', label: 'Ngày nhắc tiếp theo', type: 'date' },
      ],
      (values) => api('/cskh/care-logs', {
        method: 'POST',
        body: { ...values, nextAction: values.nextAction || undefined, nextActionDate: values.nextActionDate || undefined },
      })
    );

  const loadPatient = async (patient) => {
    setSelectedPatient(patient);
    setPatientLoading(true);
    setError('');
    try {
      const [history, exams] = await Promise.all([
        api(`/patients/${patient.id}/medical-history`),
        api(`/examinations/patient/${patient.id}`),
      ]);
      setPatientHistory(listOf(history));
      setPatientExams(listOf(exams));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPatientLoading(false);
    }
  };

  const openHistoryForm = () => {
    if (!selectedPatient) return;
    openForm('Thêm tiền sử bệnh', [
      { name: 'conditionName', label: 'Bệnh / tình trạng', required: true },
      { name: 'note', label: 'Ghi chú', type: 'textarea' },
    ], async (values) => {
      await api(`/patients/${selectedPatient.id}/medical-history`, { method: 'POST', body: values });
      const history = await api(`/patients/${selectedPatient.id}/medical-history`);
      setPatientHistory(listOf(history));
    });
  };

  const openExamForm = () => {
    if (!selectedPatient) return;
    const now = Date.now();
    const ownAppointments = data.appointments.filter((appointment) =>
      appointment.patients?.id === selectedPatient.id &&
      new Date(appointment.scheduled_at).getTime() <= now &&
      !['completed', 'cancelled'].includes(appointment.status) &&
      !patientExams.some((exam) => exam.appointment_id === appointment.id)
    );
    openForm('Ghi nhận kết quả khám', [
      { name: 'appointmentId', label: 'Lịch hẹn', type: 'select', required: true, options: ownAppointments.map((appointment) => [appointment.id, `${dateText(appointment.scheduled_at)} · ${statusText(appointment.status)}`]) },
      { name: 'diagnosisId', label: 'Chẩn đoán', type: 'select', options: [['', 'Chưa chọn mã bệnh'], ...data.diseases.map((disease) => [String(disease.id), `${disease.name}${disease.icd_code ? ` · ${disease.icd_code}` : ''}`])] },
      { name: 'diagnosisNote', label: 'Kết quả / ghi chú chẩn đoán', type: 'textarea', required: true },
      { name: 'nextVisitDate', label: 'Ngày tái khám', type: 'date' },
    ], async (values) => {
      await api('/examinations', {
        method: 'POST',
        body: {
          appointmentId: values.appointmentId,
          patientId: selectedPatient.id,
          diagnosisId: values.diagnosisId ? Number(values.diagnosisId) : undefined,
          diagnosisNote: values.diagnosisNote,
          nextVisitDate: values.nextVisitDate || undefined,
        },
      });
      const exams = await api(`/examinations/patient/${selectedPatient.id}`);
      setPatientExams(listOf(exams));
    });
  };

  const openPrescriptionForm = (exam) =>
    setModal({
      kind: 'prescription',
      title: 'Kê đơn thuốc điện tử',
      exam,
      items: [{ productId: '', quantity: '1', dosage: '', durationDays: '', usageInstruction: '' }],
      note: '',
      error: '',
    });

  const savePrescription = async ({ items, note }) => {
    if (!modal || modal.kind !== 'prescription') return;
    setSaving(true);
    try {
      await api(`/examinations/${modal.exam.id}/prescriptions`, {
        method: 'POST',
        body: {
          note: note || undefined,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            dosage: item.dosage.trim(),
            durationDays: item.durationDays ? Number(item.durationDays) : undefined,
            usageInstruction: item.usageInstruction || undefined,
          })),
        },
      });
      setModal(null);
      setToast('Đã tạo đơn thuốc điện tử.');
      if (selectedPatient) {
        const exams = await api(`/examinations/patient/${selectedPatient.id}`);
        setPatientExams(listOf(exams));
      }
    } catch (reason) {
      setModal((current) => current ? { ...current, error: errorMessage(reason) } : current);
    } finally {
      setSaving(false);
    }
  };

  const pendingRequests = data.requests.filter((request) => ['pending', 'awaiting_patient'].includes(request.status));
  const filteredAppointments = data.appointments.filter((item) => {
    const statusMatches = !queryStatus || item.status === queryStatus;
    const text = [item.patients?.full_name, item.patients?.phone, item.users_appointments_assigned_staff_idTousers?.full_name, item.id].filter(Boolean).join(' ').toLowerCase();
    return statusMatches && text.includes(search.toLowerCase());
  });
  const filteredPatients = data.patients.filter((item) =>
    [item.full_name, item.phone, item.address].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
  );
  const filteredStaff = data.staff.filter((item) =>
    [item.full_name, item.email, item.phone, roleText(item)].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
  );
  const catalogRows = data[catalogTab].filter((item) =>
    [item.name, item.category, item.icd_code, item.manufacturer].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
  );

  if (!profile) {
    return <LoginScreen error={error} loading={loginLoading} onSubmit={handleLogin} />;
  }

  const selectedNav = navItems.find((item) => item.id === section);
  const changeSection = (value) => {
    setSection(value);
    setSearch('');
    setQueryStatus('');
    setMobileNav(false);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><HeartPulse size={21} /></div>
          <div className="brand-copy"><strong>care<span>flow</span></strong><small>HEALTHCARE CRM</small></div>
          <button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Đóng menu"><X size={19} /></button>
        </div>
        <div className="nav-caption">QUẢN TRỊ HỆ THỐNG</div>
        <nav className="side-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-link ${section === id ? 'active' : ''}`} onClick={() => changeSection(id)}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {id === 'requests' && pendingRequests.length > 0 && <i className="nav-count">{pendingRequests.length}</i>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><CircleHelp size={17} /></div>
            <strong>Cần trợ giúp?</strong>
            <span>Xem tài liệu hệ thống</span>
            <button onClick={() => window.open('http://localhost:3000/docs', '_blank', 'noopener,noreferrer')}>Mở tài liệu <ArrowUpRightFromSquare size={13} /></button>
          </div>
          <div className="system-status"><i /> API sẵn sàng khi kết nối</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-toggle" onClick={() => setMobileNav(true)} aria-label="Mở menu"><Menu size={20} /></button>
            <div><div className="breadcrumb">Quản trị hệ thống <ChevronRight size={14} /> <b>{selectedNav?.label}</b></div><h1>{selectedNav?.label}</h1></div>
          </div>
          <div className="topbar-right">
            <span className="today-label">{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span>
            <button className="icon-button notification-button" title="Thông báo"><Bell size={19} /><i /></button>
            <span className="top-divider" />
            <div className="account-wrap"><div className="account-avatar">{profile.full_name?.slice(0, 1) || 'A'}</div><div className="account-name"><b>{profile.full_name}</b><small>Quản trị viên</small></div></div>
            <button className="icon-button logout-button" title="Đăng xuất" onClick={handleLogout}><LogOut size={18} /></button>
          </div>
        </header>

        <div className="page-content">
          {error && <div className="alert alert-error"><span>{error}</span><button className="icon-button" onClick={() => setError('')}><X size={17} /></button></div>}
          {toast && <div className="alert alert-success"><Check size={17} /><span>{toast}</span><button className="icon-button" onClick={() => setToast('')}><X size={17} /></button></div>}
          {loading && <div className="loading-strip"><RefreshCw size={15} className="spin" /> Đang tải dữ liệu...</div>}

          {section === 'overview' && (
            <Overview
              data={data}
              pendingRequests={pendingRequests}
              profile={profile}
              onNavigate={changeSection}
              onCreateAppointment={() => openAppointmentForm()}
              onCreateStaff={() => openStaffForm()}
            />
          )}
          {section === 'appointments' && (
            <AppointmentsPage
              appointments={filteredAppointments}
              queryStatus={queryStatus}
              setQueryStatus={setQueryStatus}
              search={search}
              setSearch={setSearch}
              onCreate={() => openAppointmentForm()}
              onAssign={openAppointmentForm}
              onStatus={openStatusForm}
            />
          )}
          {section === 'requests' && <RequestsPage requests={data.requests} onReview={openReview} onNotify={notifyPatientOfDoctorRequest} />}
          {section === 'patients' && (
            <PatientsPage
              patients={filteredPatients}
              search={search}
              setSearch={setSearch}
              selected={selectedPatient}
              loading={patientLoading}
              history={patientHistory}
              exams={patientExams}
              appointments={data.appointments}
              diseases={data.diseases}
              onSelect={loadPatient}
              onAddHistory={openHistoryForm}
              onAddExam={openExamForm}
              onPrescription={openPrescriptionForm}
            />
          )}
          {section === 'staff' && <StaffPage staff={filteredStaff} search={search} setSearch={setSearch} onCreate={() => openStaffForm()} onEdit={openStaffForm} />}
          {section === 'body-map' && <BodyMapPage bodyParts={data.bodyParts} search={search} setSearch={setSearch} />}
          {section === 'catalog' && (
            <CatalogPage
              tab={catalogTab}
              setTab={setCatalogTab}
              items={catalogRows}
              search={search}
              setSearch={setSearch}
              onCreate={() => openCatalogForm(catalogTab)}
              onEdit={(item) => openCatalogForm(catalogTab, item)}
              onRecommendations={(item) => void openRecommendations(catalogTab, item)}
              onDelete={(item) => {
                const isProduct = catalogTab === 'products';
                const confirmation = isProduct ? 'NGỪNG' : 'XÓA';
                openForm(
                  isProduct ? 'Ngừng kinh doanh sản phẩm' : 'Xóa khỏi danh mục',
                  [{ name: 'confirmation', label: `Nhập ${confirmation} để xác nhận “${item.name}”`, required: true }],
                  async (values) => {
                  if (values.confirmation !== confirmation) throw new Error(`Vui lòng nhập chính xác ${confirmation} để xác nhận.`);
                  const endpoint = catalogTab === 'symptoms' ? '/symptoms' : catalogTab === 'diseases' ? '/diseases' : '/products';
                  return api(`${endpoint}/${item.id}`, { method: 'DELETE' });
                  }
                );
              }}
            />
          )}
          {section === 'care' && <CarePage data={data} onAssign={openAssignCskh} onLog={openCareLog} />}
        </div>
        <footer className="page-footer"><span>CareFlow Admin <span className="footer-dot">·</span> Quản lý y tế an toàn</span><button onClick={refresh}><RefreshCw size={13} /> Làm mới dữ liệu</button></footer>
      </main>
      {mobileNav && <button className="mobile-scrim" aria-label="Đóng điều hướng" onClick={() => setMobileNav(false)} />}
      {modal && <FormModal modal={modal} setModal={setModal} saving={saving} products={data.products} onAddRecommendation={saveRecommendation} onRemoveRecommendation={deleteRecommendation} onSavePrescription={savePrescription} onSubmit={async () => {
        const values = modal.values;
        const missing = modal.fields.find((field) => field.required && !String(values[field.name] || '').trim());
        if (missing) {
          setModal((current) => ({ ...current, error: `Vui lòng nhập ${missing.label.toLowerCase()}.` }));
          return;
        }
        await perform('Đã lưu thay đổi thành công', () => modal.onSubmit(values));
      }} />}
    </div>
  );
}

function LoginScreen({ error, loading, onSubmit }) {
  const [email, setEmail] = useState('admin@hospital.local');
  const [password, setPassword] = useState('');
  return (
    <div className="login-page">
      <div className="login-art">
        <div className="login-brand"><div className="brand-mark"><HeartPulse size={22} /></div><strong>care<span>flow</span></strong></div>
        <div className="login-illustration">
          <div className="orb orb-one" /><div className="orb orb-two" />
          <div className="illustration-card"><HeartPulse size={52} /><div className="pulse-line" /></div>
          <div className="floating-card"><BadgeCheck size={17} /><span>Hệ thống y tế an toàn</span></div>
        </div>
        <div className="login-art-copy"><span>HOME HEALTHCARE CRM</span><h2>Chăm sóc tận tâm.<br />Quản trị thông minh.</h2><p>Nền tảng điều phối chăm sóc sức khỏe tại nhà, kết nối bệnh nhân và đội ngũ y tế.</p></div>
        <div className="login-art-bottom">© 2026 CareFlow Healthcare</div>
      </div>
      <div className="login-panel">
        <div className="login-panel-inner">
          <div className="login-mobile-brand"><div className="brand-mark"><HeartPulse size={21} /></div><strong>care<span>flow</span></strong></div>
          <div className="login-overline"><ShieldCheck size={15} /> CỔNG QUẢN TRỊ BẢO MẬT</div>
          <h1>Chào mừng trở lại</h1><p className="login-subtitle">Đăng nhập bằng tài khoản quản trị viên của bạn.</p>
          <form onSubmit={(event) => { event.preventDefault(); onSubmit({ email, password }); }}>
            <label>Email công việc</label>
            <div className="input-with-icon"><UserRound size={17} /><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@hospital.local" required /></div>
            <label>Mật khẩu</label>
            <input className="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" minLength={6} required />
            {error && <div className="login-error"><X size={16} /> {error}</div>}
            <button className="login-submit" disabled={loading}>{loading ? <><span className="button-spinner" /> Đang xác thực...</> : <>Đăng nhập quản trị <ChevronRight size={17} /></>}</button>
          </form>
          <div className="login-security"><ShieldCheck size={16} /><span>Phiên đăng nhập được bảo vệ bằng JWT. Tài khoản không phải Admin sẽ bị từ chối.</span></div>
          <div className="login-help">Cần hỗ trợ truy cập? Liên hệ quản trị hệ thống.</div>
        </div>
      </div>
    </div>
  );
}

function Overview({ data, pendingRequests, profile, onNavigate, onCreateAppointment, onCreateStaff }) {
  const upcoming = data.appointments.filter((item) => ['pending', 'confirmed', 'checked_in', 'in_progress'].includes(item.status));
  const completed = data.appointments.filter((item) => item.status === 'completed').length;
  const appointmentsToday = data.appointments.filter((item) => new Date(item.scheduled_at).toDateString() === new Date().toDateString()).length;
  const activeStaff = data.staff.filter((item) => item.status === 'active').length;
  const stats = [
    { label: 'Tổng lịch hẹn', value: data.appointments.length, change: `${appointmentsToday} lịch hôm nay`, icon: CalendarDays, tint: 'teal', trend: 'up' },
    { label: 'Đang chờ xử lý', value: pendingRequests.length, change: 'Yêu cầu đổi / hủy lịch', icon: Clock3, tint: 'amber', trend: 'flat' },
    { label: 'Hồ sơ bệnh nhân', value: data.patients.length, change: `${data.assignments.length} đang có CSKH`, icon: UsersRound, tint: 'violet', trend: 'up' },
    { label: 'Nhân sự hệ thống', value: data.staff.length, change: `${activeStaff} tài khoản hoạt động`, icon: Stethoscope, tint: 'rose', trend: 'up' },
  ];
  return <>
    <section className="welcome-banner">
      <div className="welcome-text"><div className="welcome-eyebrow"><span className="live-dot" /> THỨ HAI, {new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</div>
        <h2>Chào buổi sáng, {profile.full_name?.split(' ').at(-1) || 'Admin'} <span className="wave">✦</span></h2>
        <p>Đây là tình hình hoạt động của hệ thống chăm sóc hôm nay.</p>
        <div className="welcome-actions"><button className="button-primary" onClick={onCreateAppointment}><Plus size={16} /> Tạo lịch hẹn</button><button className="button-ghost" onClick={() => onNavigate('appointments')}>Xem lịch khám <ArrowUpRight size={15} /></button></div>
      </div>
      <div className="welcome-graphic"><div className="graphic-circle circle-a" /><div className="graphic-circle circle-b" /><div className="graphic-cross">+</div><div className="graphic-card"><HeartPulse size={29} /><span>Chăm sóc<br />toàn diện</span></div></div>
    </section>
    <section className="stats-grid">
      {stats.map(({ label, value, change, icon: Icon, tint, trend }) => <div className="stat-card" key={label}>
        <div className="stat-head"><div className={`stat-icon ${tint}`}><Icon size={19} /></div><button className="more-button"><MoreHorizontal size={19} /></button></div>
        <div className="stat-number">{value.toLocaleString('vi-VN')}</div><div className="stat-label">{label}</div>
        <div className={`stat-change ${trend}`}><ArrowUpRight size={14} /> {change}</div>
      </div>)}
    </section>
    <section className="overview-grid">
      <div className="panel recent-panel">
        <div className="panel-heading"><div><h3>Lịch hẹn gần đây</h3><p>Theo dõi các ca khám mới nhất</p></div><button className="text-button" onClick={() => onNavigate('appointments')}>Tất cả lịch <ChevronRight size={14} /></button></div>
        <AppointmentTable compact appointments={data.appointments.slice(0, 6)} onStatus={() => onNavigate('appointments')} onAssign={() => onNavigate('appointments')} />
      </div>
      <div className="panel quick-panel">
        <div className="panel-heading"><div><h3>Thao tác nhanh</h3><p>Lối tắt quản trị thường dùng</p></div><Settings2 size={18} className="muted-icon" /></div>
        <div className="shortcut-list">
          <Shortcut icon={CalendarDays} title="Lên lịch khám mới" subtitle="Đặt lịch cho bệnh nhân" onClick={onCreateAppointment} />
          <Shortcut icon={UserRoundPlus} title="Thêm nhân viên" subtitle="Cấp tài khoản và phân quyền" onClick={onCreateStaff} />
          <Shortcut icon={HeartPulse} title="Danh mục y tế" subtitle="Triệu chứng, bệnh lý, thuốc" onClick={() => onNavigate('catalog')} />
          <Shortcut icon={ClipboardList} title="Phân công CSKH" subtitle="Điều phối chăm sóc khách hàng" onClick={() => onNavigate('care')} />
        </div>
      </div>
    </section>
    <section className="bottom-grid">
      <div className="panel">
        <div className="panel-heading"><div><h3>Tình hình vận hành</h3><p>Tổng quan dịch vụ và điều phối</p></div><span className="period-pill">Toàn thời gian <ChevronDown size={13} /></span></div>
        <div className="operation-grid"><div><span className="operation-label">Lịch cần theo dõi</span><b>{upcoming.length}</b><small><span className="mini-dot amber-dot" /> Lịch đang hoạt động</small></div><div><span className="operation-label">Đã hoàn thành</span><b>{completed}</b><small><span className="mini-dot teal-dot" /> Ca khám hoàn tất</small></div><div><span className="operation-label">Đội ngũ CSKH</span><b>{data.staff.filter((item) => item.roles?.code === 'cskh').length}</b><small><span className="mini-dot violet-dot" /> Nhân viên phụ trách</small></div></div>
      </div>
      <div className="panel activity-panel">
        <div className="panel-heading"><div><h3>Hoạt động CSKH</h3><p>Nhật ký chăm sóc mới nhất</p></div><button className="text-button" onClick={() => onNavigate('care')}>Mở sổ nhật ký <ChevronRight size={14} /></button></div>
        {data.careLogs.slice(0, 3).map((log) => <div className="activity-row" key={log.id}><span className="activity-icon"><FileText size={15} /></span><div><b>{log.patients?.full_name || 'Bệnh nhân'}</b><p>{log.content}</p><small>{dateText(log.created_at)}</small></div></div>)}
        {data.careLogs.length === 0 && <Empty icon={BookOpen} text="Chưa có nhật ký chăm sóc" />}
      </div>
    </section>
  </>;
}

function AppointmentsPage({ appointments, queryStatus, setQueryStatus, search, setSearch, onCreate, onAssign, onStatus }) {
  return <div className="panel page-panel">
    <div className="panel-heading"><div><h3>Quản lý lịch hẹn</h3><p>Điều phối toàn bộ lịch khám và cập nhật tiến trình chuyên môn.</p></div><button className="button-primary" onClick={onCreate}><Plus size={16} /> Tạo lịch hẹn</button></div>
    <div className="toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Tìm bệnh nhân, số điện thoại..." /><div className="select-wrap"><Filter size={15} /><select value={queryStatus} onChange={(event) => setQueryStatus(event.target.value)}><option value="">Tất cả trạng thái</option>{statusOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><ChevronDown size={14} /></div></div>
    <AppointmentTable appointments={appointments} onStatus={onStatus} onAssign={onAssign} />
    <div className="table-footer">Đang hiển thị {appointments.length} lịch hẹn <span>· Tải tối đa 100 bản ghi</span></div>
  </div>;
}

function AppointmentTable({ appointments, onStatus, onAssign, compact = false }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>BỆNH NHÂN</th><th>NGÀY GIỜ</th><th>LOẠI KHÁM</th><th>NHÂN VIÊN</th><th>TRẠNG THÁI</th>{!compact && <th className="actions-th">THAO TÁC</th>}</tr></thead><tbody>
    {appointments.map((appointment) => <tr key={appointment.id}>
      <td><div className="person-cell"><span className="person-avatar">{appointment.patients?.full_name?.slice(0, 1) || 'B'}</span><div><b>{appointment.patients?.full_name || 'Bệnh nhân'}</b><small>{appointment.patients?.phone || appointment.id.slice(0, 8)}</small></div></div></td>
      <td><b className="cell-main">{dateText(appointment.scheduled_at)}</b></td>
      <td><span className="type-text">{({ first_visit: 'Khám lần đầu', follow_up: 'Tái khám', emergency: 'Cấp cứu' })[appointment.type] || appointment.type}</span></td>
      <td>{appointment.users_appointments_assigned_staff_idTousers?.full_name ? <span className="staff-cell"><Stethoscope size={14} /> {appointment.users_appointments_assigned_staff_idTousers.full_name}</span> : <span className="unassigned">Chưa phân công</span>}</td>
      <td><StatusBadge value={appointment.status} /></td>
      {!compact && <td><div className="row-actions"><button className="small-action" title="Phân công nhân viên" onClick={() => onAssign(appointment)}><UserRoundPlus size={15} /></button><button className="small-action" title="Cập nhật trạng thái" onClick={() => onStatus(appointment)}><Settings2 size={15} /></button></div></td>}
    </tr>)}
    {appointments.length === 0 && <tr><td colSpan={compact ? 5 : 6}><Empty icon={CalendarDays} text="Không có lịch hẹn phù hợp." /></td></tr>}
  </tbody></table></div>;
}

function RequestsPage({ requests, onReview, onNotify }) {
  return <div className="panel page-panel">
    <div className="panel-heading"><div><h3>Yêu cầu đổi / hủy lịch</h3><p>Xem xét yêu cầu từ bệnh nhân hoặc bác sĩ và xử lý lịch hẹn.</p></div><div className="pending-pill"><Clock3 size={15} /> {requests.filter((item) => ['pending', 'awaiting_patient'].includes(item.status)).length} cần xử lý</div></div>
    <div className="request-list">{requests.map((request) => <article className="request-card" key={request.id}>
      <div className="request-card-top"><div className="request-person"><span className="person-avatar">{(request.patients?.full_name || request.appointments?.patients?.full_name || 'B').slice(0, 1)}</span><div><h4>{request.patients?.full_name || request.appointments?.patients?.full_name || 'Bệnh nhân'}</h4><span>{request.action === 'cancel' ? 'Yêu cầu hủy lịch' : 'Yêu cầu đổi lịch'} <i>·</i> {request.initiated_by_role === 'doctor' ? 'Bác sĩ' : 'Bệnh nhân'}</span></div></div><StatusBadge value={request.status} /></div>
      <div className="request-info"><div><small>LỊCH HIỆN TẠI</small><b>{dateText(request.appointments?.scheduled_at)}</b></div>{request.requested_scheduled_at && <div><small>THỜI GIAN ĐỀ XUẤT</small><b>{dateText(request.requested_scheduled_at)}</b></div>}{request.patient_choice && <div><small>LỰA CHỌN BỆNH NHÂN</small><b>{request.patient_choice === 'change_doctor' ? 'Đổi bác sĩ phụ trách' : 'Đổi thời gian khám'}</b></div>}<div><small>LÝ DO</small><b>{request.reason || 'Không cung cấp lý do'}</b></div></div>
      {request.initiated_by_role === 'doctor' && request.status === 'pending' && !request.patient_choice && <div className="request-buttons"><button className="button-approve" onClick={() => onNotify(request)}><Bell size={15} /> Gửi bệnh nhân chọn phương án</button></div>}
      {request.status === 'awaiting_patient' && <div className="request-waiting"><Clock3 size={14} /> Đang chờ bệnh nhân chọn đổi ngày hoặc đổi bác sĩ</div>}
      {request.status === 'pending' && (request.initiated_by_role !== 'doctor' || Boolean(request.patient_choice)) && <div className="request-buttons"><button className="button-approve" onClick={() => onReview(request, 'approved')}><CheckCheck size={15} /> Duyệt yêu cầu</button><button className="button-reject" onClick={() => onReview(request, 'rejected')}><X size={15} /> Từ chối</button></div>}
    </article>)}
    {requests.length === 0 && <Empty icon={CheckCheck} text="Chưa có yêu cầu đổi hoặc hủy lịch." />}</div>
  </div>;
}

function PatientsPage({ patients, search, setSearch, selected, loading, history, exams, appointments, diseases, onSelect, onAddHistory, onAddExam, onPrescription }) {
  const hasUnexaminedAppointment = selected && appointments.some((appointment) =>
    appointment.patients?.id === selected.id &&
    new Date(appointment.scheduled_at).getTime() <= Date.now() &&
    !['completed', 'cancelled'].includes(appointment.status) &&
    !exams.some((exam) => exam.appointment_id === appointment.id)
  );
  return <div className="patient-layout">
    <section className="panel patient-directory"><div className="panel-heading"><div><h3>Bệnh nhân</h3><p>{patients.length} hồ sơ</p></div><span className="count-circle">{patients.length}</span></div><SearchBox value={search} onChange={setSearch} placeholder="Tìm bệnh nhân..." />
      <div className="patient-directory-list">{patients.map((patient) => <button className={`patient-list-item ${selected?.id === patient.id ? 'selected' : ''}`} key={patient.id} onClick={() => onSelect(patient)}><span className="person-avatar">{patient.full_name?.slice(0, 1)}</span><span className="patient-list-copy"><b>{patient.full_name}</b><small>{patient.phone || 'Chưa có số điện thoại'}</small></span><ChevronRight size={15} /></button>)}
      {patients.length === 0 && <Empty icon={UsersRound} text="Không tìm thấy hồ sơ." />}</div>
    </section>
    <section className="panel patient-record">
      {!selected ? <Empty icon={FileText} text="Chọn bệnh nhân để xem hồ sơ và lịch sử khám." /> : <>
        <div className="patient-profile-head"><div className="patient-large-avatar">{selected.full_name?.slice(0, 1)}</div><div className="patient-profile-copy"><span className="section-eyebrow">HỒ SƠ BỆNH NHÂN</span><h3>{selected.full_name}</h3><p>{selected.phone || 'Chưa cập nhật số điện thoại'}{selected.address ? ` · ${selected.address}` : ''}</p></div><div className="profile-buttons"><button className="button-outline" onClick={onAddHistory}><Plus size={15} /> Tiền sử</button><button className="button-primary" disabled={!hasUnexaminedAppointment} onClick={onAddExam}><FilePlus2 size={15} /> Ghi kết quả khám</button></div></div>
        {loading ? <div className="record-loading"><span className="button-spinner dark-spinner" /> Đang tải hồ sơ...</div> : <>
          <div className="record-section"><div className="record-section-heading"><div><h4>Tiền sử bệnh</h4><p>Các tình trạng đã ghi nhận trong hồ sơ</p></div><span className="count-circle">{history.length}</span></div>
            {history.map((entry) => <div className="history-entry" key={entry.id}><span className="history-indicator" /><div><b>{entry.condition_name}</b>{entry.note && <p>{entry.note}</p>}</div></div>)}
            {history.length === 0 && <div className="empty-inline">Chưa ghi nhận tiền sử bệnh.</div>}
          </div>
          <div className="record-section"><div className="record-section-heading"><div><h4>Kết quả khám & đơn thuốc</h4><p>Chẩn đoán và đơn thuốc điện tử</p></div><span className="count-circle">{exams.length}</span></div>
            {exams.map((exam) => <article className="exam-entry" key={exam.id}><div className="exam-entry-heading"><span className="exam-icon"><Stethoscope size={16} /></span><div className="exam-entry-copy"><b>{exam.diseases?.name || exam.diagnosis_note || 'Kết quả khám'}</b>            <small>{exam.diseases?.icd_code ? `${exam.diseases.icd_code} · ` : ''}{dateText(exam.examined_at || exam.created_at)}</small></div>{(!exam.prescriptions || exam.prescriptions.length === 0) && <button className="button-outline compact-button" onClick={() => onPrescription(exam)}><Pill size={14} /> Kê đơn</button>}</div>
              {exam.diagnosis_note && <p className="diagnosis-note">{exam.diagnosis_note}</p>}
              {exam.prescriptions?.length > 0 && <div className="prescription-label"><BadgeCheck size={14} /> Đã kê {exam.prescriptions.length} đơn thuốc</div>}
            </article>)}
            {exams.length === 0 && <div className="empty-inline">Chưa có kết quả khám.</div>}
          </div>
        </>}
      </>}
    </section>
  </div>;
}

function StaffPage({ staff, search, setSearch, onCreate, onEdit }) {
  return <div className="panel page-panel">
    <div className="panel-heading"><div><h3>Tài khoản nhân viên</h3><p>Quản lý tài khoản nội bộ và phân quyền theo vai trò.</p></div><button className="button-primary" onClick={onCreate}><UserRoundPlus size={15} /> Tạo tài khoản</button></div>
    <div className="toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Tìm tên, email, số điện thoại..." /><span className="result-count">{staff.length} nhân viên</span></div>
    <div className="staff-grid">{staff.map((person) => <article className="staff-card" key={person.id}><div className="staff-card-top"><span className="staff-avatar">{person.full_name?.slice(0, 1)}</span><StatusBadge value={person.status} /></div><h4>{person.full_name}</h4><span className="role-pill">{roleText(person)}</span><div className="staff-contact"><span><UserRound size={14} /> {person.email || 'Chưa có email'}</span><span><Activity size={14} /> {person.phone || 'Chưa có số điện thoại'}</span></div><button className="staff-edit" onClick={() => onEdit(person)}><Settings2 size={14} /> Chỉnh sửa tài khoản</button></article>)}
      {staff.length === 0 && <Empty icon={UsersRound} text="Không tìm thấy nhân viên." />}
    </div>
  </div>;
}

function CatalogPage({ tab, setTab, items, search, setSearch, onCreate, onEdit, onDelete, onRecommendations }) {
  const tabs = [['symptoms', 'Triệu chứng'], ['diseases', 'Bệnh lý'], ['products', 'Thuốc & TPCN']];
  return <div className="panel page-panel">
    <div className="panel-heading"><div><h3>Danh mục y tế</h3><p>Quản lý nội dung y khoa, thuốc và thực phẩm bổ sung.</p></div><button className="button-primary" onClick={onCreate}><Plus size={16} /> Thêm mới</button></div>
    <div className="catalog-toolbar"><div className="segmented">{tabs.map(([key, label]) => <button className={tab === key ? 'active' : ''} key={key} onClick={() => { setTab(key); setSearch(''); }}>{label}</button>)}</div><SearchBox value={search} onChange={setSearch} placeholder="Tìm trong danh mục..." /></div>
    <div className="table-scroll"><table className="data-table catalog-table"><thead><tr><th>TÊN</th><th>{tab === 'symptoms' ? 'PHÂN LOẠI' : tab === 'diseases' ? 'MÃ ICD-10' : 'LOẠI / NHÀ SẢN XUẤT'}</th>{tab === 'products' && <><th>GIÁ</th><th>TỒN KHO</th><th>TRẠNG THÁI</th></>}<th className="actions-th">THAO TÁC</th></tr></thead><tbody>
      {items.map((item) => <tr key={item.id}><td><div className="catalog-name"><span className={`catalog-icon ${tab}`}><HeartPulse size={16} /></span><div><b>{item.name}</b>{item.description && <small>{item.description}</small>}</div></div></td>
        <td>{tab === 'symptoms' ? item.category || '—' : tab === 'diseases' ? item.icd_code || '—' : <span>{item.type === 'medicine' ? 'Thuốc' : 'TPCN'} <small className="cell-sub">{item.manufacturer || ''}</small></span>}</td>
        {tab === 'products' && <><td>{moneyText(item.price)}</td><td>{item.stock_quantity ?? 0} {item.unit || ''}</td><td><StatusBadge value={item.status} /></td></>}
        <td><div className="row-actions">{tab !== 'products' && <button className="small-action" title="Quản lý gợi ý thuốc" onClick={() => onRecommendations(item)}><Pill size={15} /></button>}<button className="small-action" title="Chỉnh sửa" onClick={() => onEdit(item)}><Settings2 size={15} /></button><button className="small-action danger-action" title="Xóa" onClick={() => onDelete(item)}><Trash2 size={15} /></button></div></td>
      </tr>)}
      {items.length === 0 && <tr><td colSpan={tab === 'products' ? 6 : 3}><Empty icon={HeartPulse} text="Danh mục đang trống." /></td></tr>}
    </tbody></table></div>
  </div>;
}

function BodyMapPage({ bodyParts, search, setSearch }) {
  const [viewSide, setViewSide] = useState('front');
  const [region, setRegion] = useState('');
  const partsForSide = bodyParts.filter((part) => !part.view_side || part.view_side === viewSide);
  const regions = [...new Set(partsForSide.map((part) => part.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
  const query = search.trim().toLocaleLowerCase('vi');
  const filteredParts = partsForSide.filter((part) =>
    (!region || part.region === region) &&
    (!query || [part.name, part.code, part.region, part.model_node_id].some((value) => String(value || '').toLocaleLowerCase('vi').includes(query)))
  );
  const groupedParts = Object.groupBy
    ? Object.groupBy(filteredParts, (part) => part.region || 'Khác')
    : filteredParts.reduce((groups, part) => {
      const key = part.region || 'Khác';
      groups[key] = [...(groups[key] || []), part];
      return groups;
    }, {});
  return <div className="body-map-page">
    <section className="panel page-panel">
      <div className="panel-heading"><div><h3>Body Map & vị trí giải phẫu</h3><p>Tra cứu các vùng cơ thể được sử dụng trong luồng tự khai triệu chứng.</p></div><span className="result-count">{bodyParts.length} vị trí</span></div>
      <div className="body-map-toolbar">
        <div className="segmented" role="group" aria-label="Chọn mặt cơ thể">
          <button className={viewSide === 'front' ? 'active' : ''} onClick={() => { setViewSide('front'); setRegion(''); }}>Mặt trước</button>
          <button className={viewSide === 'back' ? 'active' : ''} onClick={() => { setViewSide('back'); setRegion(''); }}>Mặt sau</button>
        </div>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm vị trí, mã giải phẫu..." />
      </div>
      <div className="body-region-filters">
        <button className={!region ? 'active' : ''} onClick={() => setRegion('')}>Tất cả vùng</button>
        {regions.map((item) => <button className={region === item ? 'active' : ''} key={item} onClick={() => setRegion(item)}>{item}</button>)}
      </div>
      {filteredParts.length === 0 ? <Empty icon={Activity} text="Không có vị trí giải phẫu phù hợp với bộ lọc." /> :
        <div className="body-region-grid">{Object.entries(groupedParts).map(([group, parts]) =>
          <section className="body-region-card" key={group}>
            <div className="body-region-heading"><span className="body-region-icon"><Activity size={16} /></span><div><h4>{group}</h4><small>{parts.length} vị trí</small></div></div>
            <div className="body-part-list">{parts.map((part) => {
              const parent = bodyParts.find((candidate) => candidate.id === part.parent_id);
              return <article className="body-part-item" key={part.id}>
                <span className="body-part-marker" />
                <div><b>{part.name}</b><small>{part.code}{parent ? ` · Thuộc ${parent.name}` : ''}</small></div>
                {part.model_node_id && <span className="body-part-node" title="Mã nút mô hình">{part.model_node_id}</span>}
              </article>;
            })}</div>
          </section>
        )}</div>
      }
      <div className="body-map-note"><ShieldCheck size={16} /><span>Gợi ý sơ bộ được cấu hình tại <b>Danh mục y tế → Triệu chứng → Gợi ý thuốc</b>; mọi gợi ý chỉ mang tính tham khảo, không thay thế chỉ định của bác sĩ.</span></div>
    </section>
  </div>;
}

function CarePage({ data, onAssign, onLog }) {
  const careStaff = data.staff.filter((person) => person.roles?.code === 'cskh').length;
  const counters = [
    { label: 'Khách hàng được phụ trách', value: data.dashboard?.stats?.assignedPatients ?? data.assignments.length, icon: UsersRound, color: 'teal' },
    { label: 'Đội ngũ CSKH', value: careStaff, icon: HeartPulse, color: 'violet' },
    { label: 'Nhật ký tương tác', value: data.careLogs.length, icon: FileText, color: 'amber' },
  ];
  return <><section className="care-stats">{counters.map(({ label, value, icon: Icon, color }) => <div className="care-stat" key={label}><span className={`care-stat-icon ${color}`}><Icon size={19} /></span><div><b>{value}</b><small>{label}</small></div></div>)}</section>
    <div className="care-grid"><section className="panel page-panel"><div className="panel-heading"><div><h3>Phân công chăm sóc</h3><p>Một CSKH chính phụ trách mỗi bệnh nhân.</p></div><button className="button-primary" onClick={onAssign}><Plus size={15} /> Phân công CSKH</button></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>BỆNH NHÂN</th><th>LIÊN HỆ</th><th>CSKH PHỤ TRÁCH</th><th>TRẠNG THÁI</th></tr></thead><tbody>
        {data.assignments.map((assignment) => <tr key={assignment.id}><td><b>{assignment.patients?.full_name || 'Bệnh nhân'}</b></td><td>{assignment.patients?.phone || '—'}</td><td>{assignment.users?.full_name || '—'}</td><td><StatusBadge value="active" /></td></tr>)}
        {data.assignments.length === 0 && <tr><td colSpan="4"><Empty icon={UsersRound} text="Chưa có phân công CSKH đang hoạt động." /></td></tr>}
      </tbody></table></div>
    </section>
    <section className="panel care-logs"><div className="panel-heading"><div><h3>Nhật ký chăm sóc</h3><p>Tra cứu tương tác CRM gần đây.</p></div><button className="button-outline" onClick={onLog}><FilePlus2 size={15} /> Ghi nhật ký</button></div>
      <div className="care-log-list">{data.careLogs.slice(0, 30).map((log) => <article className="care-log" key={log.id}><div className="log-top"><div><b>{log.patients?.full_name || 'Bệnh nhân'}</b><small>{dateText(log.created_at)} · {log.users?.full_name || 'Admin'}</small></div><span className="interaction-pill">{interactionOptions.find(([key]) => key === log.interaction_type)?.[1] || log.interaction_type}</span></div><p>{log.content}</p>{log.next_action && <small className="next-action">Tiếp theo: {log.next_action}{log.next_action_date ? ` · ${dateText(log.next_action_date)}` : ''}</small>}</article>)}
        {data.careLogs.length === 0 && <Empty icon={BookOpen} text="Chưa có nhật ký chăm sóc." />}
      </div>
    </section></div>
  </>;
}

function FormModal({ modal, setModal, saving, products, onSubmit, onAddRecommendation, onRemoveRecommendation, onSavePrescription }) {
  if (modal.kind === 'recommendations') {
    return <RecommendationsModal modal={modal} setModal={setModal} saving={saving} onAdd={onAddRecommendation} onRemove={onRemoveRecommendation} products={products} />;
  }
  if (modal.kind === 'prescription') {
    return <PrescriptionModal modal={modal} setModal={setModal} saving={saving} products={products} onSave={onSavePrescription} />;
  }
  const setValue = (name, value) => setModal((current) => ({ ...current, values: { ...current.values, [name]: value }, error: '' }));
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
    <form className="form-modal" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <div className="modal-heading"><div><span className="section-eyebrow">QUẢN TRỊ HỆ THỐNG</span><h2>{modal.title}</h2></div><button type="button" className="icon-button" onClick={() => setModal(null)}><X size={20} /></button></div>
      <div className="modal-fields">{modal.fields.length === 0 ? <p className="empty-inline">Xác nhận thao tác này?</p> : modal.fields.map((field) => <label className="form-field" key={field.name}><span>{field.label}{field.required && <i> *</i>}</span>
        {field.type === 'multiselect' ? <div className="form-multiselect">{(field.options || []).map(([value, label]) => <label key={`${field.name}-${value}`}><input type="checkbox" checked={(modal.values[field.name] || []).includes(value)} onChange={(event) => setValue(field.name, event.target.checked ? [...(modal.values[field.name] || []), value] : (modal.values[field.name] || []).filter((item) => item !== value))} /><span>{label}</span></label>)}</div>
          : field.type === 'select' ? <div className="form-select"><select required={field.required} value={modal.values[field.name] || ''} onChange={(event) => setValue(field.name, event.target.value)}><option value="" disabled={field.required}>Chọn...</option>{(field.options || []).map(([value, label]) => <option key={`${field.name}-${value}`} value={value}>{label}</option>)}</select><ChevronDown size={15} /></div>
          : field.type === 'textarea' ? <textarea required={field.required} value={modal.values[field.name] || ''} onChange={(event) => setValue(field.name, event.target.value)} rows="3" placeholder={field.label} />
            : <input required={field.required} type={field.type || 'text'} min={field.type === 'number' ? 0 : undefined} value={modal.values[field.name] || ''} onChange={(event) => setValue(field.name, event.target.value)} placeholder={field.label} />}</label>)}</div>
      {modal.error && <div className="modal-error">{modal.error}</div>}
      <div className="modal-actions"><button type="button" className="button-outline" onClick={() => setModal(null)}>Hủy</button><button type="submit" className="button-primary" disabled={saving}>{saving ? 'Đang lưu...' : <><Check size={15} /> Lưu thay đổi</>}</button></div>
    </form>
  </div>;
}

function RecommendationsModal({ modal, setModal, saving, onAdd, onRemove, products }) {
  const [values, setValues] = useState({ productId: '', recommendedDosage: '', priority: '1', note: '' });
  const activeProducts = products.filter((product) => product.status === 'active');
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
    <section className="form-modal recommendations-modal">
      <div className="modal-heading"><div><span className="section-eyebrow">DANH MỤC Y TẾ</span><h2>{modal.title}</h2></div><button className="icon-button" onClick={() => setModal(null)}><X size={20} /></button></div>
      <div className="recommendation-content">
        <div className="reference-disclaimer"><ShieldCheck size={16} /><span>{modal.disclaimer}</span></div>
        <div className="recommendation-list">
          {modal.recommendations.map((recommendation) => <div className="recommendation-row" key={recommendation.id || `${recommendation.product_id}-${recommendation.priority}`}>
            <span className="catalog-icon products"><Pill size={15} /></span>
            <div className="recommendation-copy"><b>{recommendation.products?.name || 'Sản phẩm'}</b><small>{recommendation.recommended_dosage || 'Chưa có liều tham khảo'} · Ưu tiên {recommendation.priority || 1}</small>{recommendation.note && <small>{recommendation.note}</small>}</div>
            <button className="small-action danger-action" title="Xóa gợi ý" disabled={saving} onClick={() => onRemove(recommendation)}><Trash2 size={15} /></button>
          </div>)}
          {modal.recommendations.length === 0 && <div className="empty-inline">Chưa có gợi ý sản phẩm cho danh mục này.</div>}
        </div>
        <form className="recommendation-form" onSubmit={(event) => { event.preventDefault(); onAdd(values); }}>
          <h3>Thêm / cập nhật gợi ý</h3>
          <label className="form-field"><span>Thuốc / sản phẩm *</span><div className="form-select"><select required value={values.productId} onChange={(event) => setValues((current) => ({ ...current, productId: event.target.value }))}><option value="" disabled>Chọn sản phẩm</option>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><ChevronDown size={15} /></div></label>
          <div className="recommendation-fields">
            <label className="form-field"><span>Liều dùng tham khảo</span><input value={values.recommendedDosage} onChange={(event) => setValues((current) => ({ ...current, recommendedDosage: event.target.value }))} placeholder="Ví dụ: 1 viên / lần" maxLength="200" /></label>
            <label className="form-field"><span>Thứ tự ưu tiên</span><input type="number" min="1" value={values.priority} onChange={(event) => setValues((current) => ({ ...current, priority: event.target.value }))} /></label>
          </div>
          <label className="form-field"><span>Ghi chú</span><input value={values.note} onChange={(event) => setValues((current) => ({ ...current, note: event.target.value }))} placeholder="Ghi chú tham khảo" /></label>
          {modal.error && <div className="modal-error">{modal.error}</div>}
          <button className="button-primary" type="submit" disabled={saving || activeProducts.length === 0}><Plus size={15} /> {saving ? 'Đang lưu...' : 'Lưu gợi ý'}</button>
          {activeProducts.length === 0 && <div className="empty-inline">Cần có sản phẩm đang kinh doanh trước khi tạo gợi ý.</div>}
        </form>
      </div>
    </section>
  </div>;
}

function PrescriptionModal({ modal, setModal, saving, products, onSave }) {
  const availableProducts = products.filter((product) => product.status === 'active');
  const updateItem = (index, key, value) => setModal((current) => ({
    ...current,
    items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    error: '',
  }));
  const setNote = (note) => setModal((current) => ({ ...current, note, error: '' }));
  const submit = (event) => {
    event.preventDefault();
    if (!modal.items.length || modal.items.some((item) => !item.productId || !item.quantity || Number(item.quantity) < 1 || !item.dosage.trim())) {
      setModal((current) => ({ ...current, error: 'Mỗi dòng thuốc cần có sản phẩm, số lượng lớn hơn 0 và liều dùng.' }));
      return;
    }
    onSave({ items: modal.items, note: modal.note });
  };
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
    <form className="form-modal prescription-modal" onSubmit={submit}>
      <div className="modal-heading"><div><span className="section-eyebrow">HỒ SƠ KHÁM · {modal.exam.diseases?.name || 'KẾT QUẢ KHÁM'}</span><h2>{modal.title}</h2></div><button type="button" className="icon-button" onClick={() => setModal(null)}><X size={20} /></button></div>
      <div className="prescription-body">
        {modal.items.map((item, index) => <section className="prescription-item" key={`prescription-item-${index}`}>
          <div className="prescription-item-heading"><b>Thuốc {index + 1}</b>{modal.items.length > 1 && <button className="text-button remove-item" type="button" onClick={() => setModal((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={13} /> Xóa dòng</button>}</div>
          <label className="form-field"><span>Thuốc / sản phẩm *</span><div className="form-select"><select required value={item.productId} onChange={(event) => updateItem(index, 'productId', event.target.value)}><option value="" disabled>Chọn sản phẩm</option>{availableProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><ChevronDown size={15} /></div></label>
          <div className="prescription-fields">
            <label className="form-field"><span>Số lượng *</span><input type="number" min="1" required value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} /></label>
            <label className="form-field"><span>Thời gian dùng (ngày)</span><input type="number" min="1" value={item.durationDays} onChange={(event) => updateItem(index, 'durationDays', event.target.value)} /></label>
            <label className="form-field"><span>Liều dùng *</span><input required value={item.dosage} onChange={(event) => updateItem(index, 'dosage', event.target.value)} placeholder="Ví dụ: 1 viên × 2 lần/ngày" /></label>
            <label className="form-field"><span>Cách sử dụng</span><input value={item.usageInstruction} onChange={(event) => updateItem(index, 'usageInstruction', event.target.value)} placeholder="Ví dụ: Uống sau ăn" /></label>
          </div>
        </section>)}
        <button className="button-outline add-prescription-item" type="button" disabled={availableProducts.length === 0} onClick={() => setModal((current) => ({ ...current, items: [...current.items, { productId: '', quantity: '1', dosage: '', durationDays: '', usageInstruction: '' }] }))}><Plus size={14} /> Thêm thuốc vào đơn</button>
        <label className="form-field prescription-note"><span>Ghi chú đơn thuốc</span><textarea rows="2" value={modal.note} onChange={(event) => setNote(event.target.value)} placeholder="Lưu ý thêm cho bệnh nhân" /></label>
        {modal.error && <div className="modal-error">{modal.error}</div>}
        {availableProducts.length === 0 && <div className="empty-inline">Chưa có thuốc / sản phẩm đang kinh doanh.</div>}
      </div>
      <div className="modal-actions"><button type="button" className="button-outline" onClick={() => setModal(null)}>Hủy</button><button type="submit" className="button-primary" disabled={saving || availableProducts.length === 0}>{saving ? 'Đang lưu...' : <><Check size={15} /> Tạo đơn thuốc</>}</button></div>
    </form>
  </div>;
}

function SearchBox({ value, onChange, placeholder }) {
  return <div className="search-box"><Search size={16} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{value && <button onClick={() => onChange('')}><X size={15} /></button>}</div>;
}

function StatusBadge({ value }) {
  const tone = ['active', 'confirmed', 'completed', 'approved'].includes(value) ? 'green' : ['pending', 'awaiting_patient', 'checked_in', 'rescheduled'].includes(value) ? 'amber' : ['cancelled', 'rejected', 'locked', 'no_show', 'discontinued'].includes(value) ? 'red' : 'gray';
  return <span className={`status-badge ${tone}`}><i />{statusText(value)}</span>;
}

function Shortcut({ icon: Icon, title, subtitle, onClick }) {
  return <button className="shortcut" onClick={onClick}><span className="shortcut-icon"><Icon size={17} /></span><span><b>{title}</b><small>{subtitle}</small></span><ChevronRight size={16} /></button>;
}

function Empty({ icon: Icon, text }) {
  return <div className="empty-state"><span><Icon size={20} /></span><p>{text}</p></div>;
}

createRoot(document.getElementById('root')).render(<App />);
