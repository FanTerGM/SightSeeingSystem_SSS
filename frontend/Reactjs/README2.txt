============================================================
HƯỚNG DẪN CẤU HÌNH BIẾN MÔI TRƯỜNG (.env)
============================================================

Dự án này yêu cầu file cấu hình riêng tư (.env) để chứa các Key bảo mật.
File này không có sẵn trên Git, bạn cần tự tạo thủ công trên máy mình.

BƯỚC 1: TẠO FILE
------------------------------------------------------------
1. Đi tới thư mục gốc của Frontend (nơi chứa file package.json):
   D:\ProjectGit\SightSeeingSystem_SSS\frontend\Reactjs

2. Tại đây, tạo một file mới.
3. Đặt tên file chính xác là: .env
   (Lưu ý: Tên file bắt đầu bằng dấu chấm, không có đuôi .txt)

BƯỚC 2: NHẬP NỘI DUNG
------------------------------------------------------------
Mở file .env vừa tạo (bằng Notepad hoặc VS Code).
Copy toàn bộ nội dung dưới đây dán vào.
Sau đó, thay thế phần chữ bên phải dấu bằng (=) thành Key thật của bạn.

# --- BẮT ĐẦU COPY TỪ ĐÂY ---

# API Keys (Hỏi Leader hoặc quản trị viên để lấy Key thật)
GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE
VIETMAP_API_KEY=YOUR_VIETMAP_KEY_HERE

# Cấu hình hệ thống
AUTH_TOKEN=YOUR_AUTH_TOKEN_HERE
API_BASE_URL=http://localhost:8000/api

# --- KẾT THÚC COPY ---

BƯỚC 3: CHẠY DỰ ÁN
------------------------------------------------------------
1. Lưu file lại (Ctrl + S).
2. Tắt server đang chạy và khởi động lại bằng lệnh:
   npm start

LƯU Ý QUAN TRỌNG:
- Tuyệt đối KHÔNG commit file .env này lên Git.
- Đây là file chứa thông tin bảo mật riêng tư.