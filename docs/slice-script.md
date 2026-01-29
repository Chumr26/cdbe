Slice 1
- Tên môn học: Chuyên đề backend
- Tên đồ án: Book Store
- Tên sinh viên: Nguyễn Anh Khoa - MSSV: 501240434
- Giảng viên hướng dẫn: ThS. Minh Hải
- Thời gian thực hiện: Từ 01/12/2025 đến 1/2/2026

---

Slice 2: Giới thiệu đồ án
- Thiết kế database 
- Thiết kế API sử dụng kiến trúc mvc
- Tích hợp các dịch vụ bên thứ 3 như mail thông báo, qr thanh toán, gemini api.

---

Slice 3: Giới thiệu tính năng và demo các tính năng nổi bật
- Customer
- Tìm kiếm sách
- Xem danh mục sách 
- Xem chi tiết sách
- Giỏ hàng: Thêm sách vào giỏ hàng, cập nhật số lượng
- Đa ngôn ngữ
* Hệ thống mã giảm giá
* Thanh toán: Thực hiện thanh toán đơn hàng qua phương thức thanh toán trực tuyến.
* Nhận email thông báo: Xác nhận tài khoản, link quên mật khẩu, xác nhận đơn hàng
* Tìm kiếm ngữ nghĩa: Tìm kiếm sách theo ngữ nghĩa sử dụng gemini api
* Triển khai trên cloud: Render, Atlas, nhà đăng ký tên miền Namecheap

- Admin
- Quản lý sách: thêm, sửa, xóa sách, quản lý kho.
- Quản lý đơn hàng: cập nhật trạng thái đơn hàng, theo dõi đơn hàng.
- Quản lý người dùng: Đăng ký, đăng nhập, phân quyền người dùng (admin, khách hàng).
- Quản lý mã giảm giá

- Demo

---

Slice 4: Giới thiệu công nghệ sử dụng và lý do chọn công nghệ
- Nodejs với framework Express: Phổ biến, nhiều thư viện hỗ trợ, dễ triển khai.
- MongoDB: Cơ sở dữ liệu NoSQL, linh hoạt, dễ mở rộng.
- Mongoose: Thư viện ODM cho MongoDB, giúp quản lý dữ liệu dễ dàng
- JWT (JSON Web Tokens): Bảo mật và xác thực người dùng.
- Third-party services:
  - SendGrid: Gửi email thông báo.
  - Gemini API: Tìm kiếm ngữ nghĩa.
  - QR Code Generator: Tạo mã QR cho thanh toán.

---

Slice 5: Kiến trúc hệ thống
- Kiến trúc MVC (Model-View-Controller): Tách biệt logic ứng dụng, giao diện và dữ liệu.
- RESTful API: Thiết kế API theo chuẩn REST để dễ dàng tích hợp và mở rộng.
- Bảo mật: Sử dụng JWT để bảo vệ các endpoint quan trọng và xác thực người dùng.

