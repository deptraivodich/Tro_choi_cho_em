# LÃNH CHÚA ĐẢO KHỐI — ROUND 2: XÂY DỰNG VOXEL / TOÁN DIỆN TÍCH & CHU VI

## Ảnh gốc từ người dùng
- `references/image(20261022-033138).png`: phong cách đảo nổi voxel/isometric nhiều tầng, cây cối, đất cỏ, cầu/thang.
- `references/image(20261022-033455).png`: phong cách thế giới voxel/isometric với cây, hồ nước, thác, nhiều kiểu địa hình.

Các hình này là **tư liệu hướng mỹ thuật**, không phải yêu cầu sao chép asset hoặc bản đồ y hệt, và không phải ảnh giao diện hiện tại của game.

## Ý định thiết kế
Thay UI chọn ô phẳng thiếu hấp dẫn bằng trải nghiệm **xếp/đặt những khối 1 m × 1 m trong một khu vườn voxel/isometric**, mục tiêu đạt diện tích/chu vi cho trước. Trẻ nhìn thấy khu vườn lớn dần theo mỗi khối đặt.

Toán học phải xác định từ mặt bằng ô vuông (footprint): diện tích là số ô chiếm trên mặt bằng × 1 m², chu vi là số cạnh ngoài × 1 m; KHÔNG dùng số khối xếp chồng theo chiều cao làm diện tích mặt bằng hoặc các mặt của khối làm chu vi.

Phân biệt rõ: đặt khối vào ô nền có tác dụng với diện tích/chu vi; cây, hàng rào, vật thể trang trí hoặc chồng khối lên cao chỉ là trang trí nếu game không công khai có cơ chế khác.

Mỗi mục tiêu được sinh phải giải được trong kích thước bản đồ và số lượng khối; với mục tiêu cả diện tích và chu vi, tính toán cặp hợp lệ trước khi giao. Hạn chế việc trẻ phải điều khiển camera 3D khó; ưu tiên isometric touch-friendly.

## Lưu ý triển khai
- Source: `C:\Tro_choi_cho_em`, tìm module của 'Lãnh Chúa Đảo Khối' từ source/route hiện tại.
- Đọc `MANIFEST.json` để xác minh ảnh và hàm băm SHA-256.
- Dùng chính hai file ảnh gốc, không đổi tên và không coi chúng là asset có thể nhúng trực tiếp vào sản phẩm.
- Bảo vệ bốn game đã nghiệm thu và worktree Antigravity.
- Prompt giao việc đầy đủ ở phần chat, **không nằm trong ZIP**.
