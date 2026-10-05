# CareFlow Admin Web

Ứng dụng quản trị chạy độc lập trên trình duyệt, không phụ thuộc Expo hay React Native.

## Chạy local

```powershell
cd admin-web
npm install
npm run dev
```

Mở URL Vite in trong terminal. Mặc định ứng dụng gọi API tại `http://localhost:3000/api`; backend cần được chạy trước.

Để thay đổi địa chỉ BE, tạo file `.env` trong `admin-web/`:

```env
VITE_API_URL=http://localhost:3000/api
```

Đăng nhập bằng email/mật khẩu nhân viên. Giao diện chỉ chấp nhận tài khoản có role `admin`; BE tiếp tục kiểm soát quyền trên từng API. Tài khoản Admin mặc định từ seed BE: `admin@hospital.local` / `Admin@123`.

## Chức năng

- Dashboard tổng quan lịch hẹn, yêu cầu, bệnh nhân, nhân sự và CSKH.
- Xem/tạo lịch hẹn, phân công bác sĩ/điều dưỡng, cập nhật trạng thái và xử lý yêu cầu đổi/hủy.
- Tra cứu vị trí giải phẫu Body Map theo mặt trước/sau và vùng cơ thể; xem cấu hình gợi ý sơ bộ trong danh mục triệu chứng.
- Tra cứu hồ sơ và tiền sử; ghi kết quả khám, chẩn đoán và đơn thuốc.
- Tạo/cập nhật tài khoản nhân viên theo role.
- CRUD triệu chứng, bệnh lý và thuốc/TPCN.
- Phân công nhân viên CSKH và ghi nhật ký chăm sóc.
