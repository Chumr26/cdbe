Tổng quan dự án Book Store

Mục tiêu: xây dựng REST API cho hệ thống bán sách
Phạm vi: backend Node.js/Express + MongoDB
Có tích hợp dịch vụ bên thứ ba (email, thanh toán, Gemini API)
---

Thông tin môn học & nhóm thực hiện

Môn học: Chuyên đề Backend
Sinh viên: Nguyễn Anh Khoa – MSSV 501240434
Giảng viên hướng dẫn: ThS. Minh Hải
---

Bài toán & giá trị mang lại

Chuẩn hóa luồng mua sách online: tìm kiếm → giỏ hàng → thanh toán
Tăng trải nghiệm người dùng với tìm kiếm ngữ nghĩa
Tách biệt rõ ràng module để dễ mở rộng và bảo trì
---

Kiến trúc hệ thống

RESTful API theo mô hình MVC
Phân lớp routes/controllers/models/middleware
Swagger hỗ trợ tài liệu hóa API
---

Thiết kế cơ sở dữ liệu

MongoDB linh hoạt, phù hợp dữ liệu sản phẩm
Mongoose giúp định nghĩa schema và validation
Có index cho tìm kiếm và hiệu năng
---

Tính năng nổi bật (Customer)

Tìm kiếm sách, xem danh mục và chi tiết
Giỏ hàng: thêm/cập nhật số lượng
Đa ngôn ngữ + mã giảm giá + email thông báo
---

Tính năng nổi bật (Admin)

Quản lý sách và tồn kho
Quản lý đơn hàng và trạng thái
Quản lý người dùng & phân quyền
---

Tìm kiếm ngữ nghĩa (Gemini API + MongoDB Atlas)

Sinh embedding cho sản phẩm và truy vấn
Vector search để xếp hạng theo ngữ nghĩa
Cải thiện tìm kiếm vượt qua giới hạn keyword
---

Thanh toán & thông báo

Thanh toán online qua QR/PayOS
Webhook cập nhật trạng thái đơn hàng
Email xác nhận tài khoản, quên mật khẩu, thông báo đơn
---

Triển khai trên cloud

Backend: Render
Database: MongoDB Atlas
Frontend demo: Vercel
Tên miền: Namecheap
---

Công nghệ chính & lý do chọn

Node.js/Express: nhanh, nhiều thư viện
MongoDB/Mongoose: linh hoạt, dễ mở rộng
JWT: xác thực và phân quyền an toàn
---

Kết quả đạt được

Hoàn thiện backend theo chuẩn REST
Đầy đủ module e-commerce cốt lõi
Tích hợp thanh toán + semantic search
---

Hướng phát triển

Bổ sung test tự động (Jest/Supertest)
Tối ưu vector search + gợi ý thông minh
Mở rộng analytics và dashboard quản trị
