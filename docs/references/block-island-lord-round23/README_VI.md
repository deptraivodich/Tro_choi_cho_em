# BLOCK ISLAND LORD — ROUND 2.3 — Bộ ảnh tham chiếu gốc

## Mục đích
Bộ 8 ảnh người dùng cung cấp để Codex sửa **Lãnh Chúa Đảo Khối** trong workspace `C:\Tro_choi_cho_em`.

- **Ảnh 1** `image(20261022-125053).png`: màn hình mobile hiện tại, ĐANG LỖI. Vẫn chia thành khu có nhãn "Khu 1/Khu 2", bố cục chật, không phải bố cục Round 2 mong muốn.
- **Ảnh 2** `image(20261022-125518).png`: kho chỉ có một khối đất cỏ còn giới hạn "3 khối"; cần thêm vật liệu không giới hạn, palette có phân loại và nút **Gợi ý xây**.
- **Ảnh 3** `image(20261022-125622).png`: các mẫu block vật liệu/cấu trúc tham khảo.
- **Ảnh 4** `image(20261022-125706).png`: các khối đá/đất cỏ phong cách isometric tham khảo.
- **Ảnh 5** `image(20261022-125901).png`: các khối cây xanh, bụi cây, hàng rào xanh tham khảo.
- **Ảnh 6** `image(20261022-130045).png`: mẫu cảnh đảo voxel núi, rừng, hồ.
- **Ảnh 7** `image(20261022-130120).png`: mẫu công viên/đảo voxel với cầu, cây, sông.
- **Ảnh 8** `image(20261022-130140).png`: mẫu đảo voxel cây hồng, vách đá, nước.

## Ý nghĩa chính xác của “khôi phục UI cũ”
Là bố cục **BLOCK ISLAND LORD — ROUND 2: VOXEL ISLAND BUILDING GAMEPLAY, AREA & PERIMETER CONSTRUCTION**, trước khi Round 2.1 biến thế giới thành nhiều khu độc lập. Yêu cầu bố cục kiểu Round 2, **hòn đảo to hơn**; vẫn giữ logic tiến trình mới sáu nhiệm vụ liên hoàn, niêm phong khối cũ, camera và toán đã đúng. Không được reset cả repository hoặc khôi phục gameplay chọn ô phẳng trước Round 2.

## Trọng tâm nhiệm vụ
1. Tìm/đối chiếu đúng UI Round 2 từ source/history/artifacts nếu có; **khôi phục chọn lọc** bố cục đó trên mobile, không phân vùng độc lập và không đặt nhãn Khu 1/2... trên bản đồ.
2. Mở rộng thế giới xây dựng, cho phép sáu nhiệm vụ xây tiếp trên công trình cũ, khối niêm phong không thể sửa nhưng dùng làm nền/xây bên cạnh được.
3. Bổ sung kho vật liệu **nhiều loại thực sự sử dụng được, không giới hạn số lượng trong gameplay**, thống nhất phong cách voxel từ ảnh 3–5; các ảnh chỉ là cảm hứng, không phải spritesheet sẵn dùng hoặc tài nguyên bản quyền được phép tái phân phối vào app.
4. Làm **nút Gợi ý xây thật**: từ trạng thái công trình hiện có, hiện blueprint/ghost preview có nghiệm đúng toán, không phá khối niêm phong và không tự đặt khối.
5. Tạo cảnh đảo sinh động, có chiều sâu, tham khảo ảnh 6–8; camera và hit test vẫn đúng.

## Cấu trúc & kiểm chứng
Ảnh được giữ **nguyên byte và nguyên tên file nguồn** dưới `references/`.
`MANIFEST.json` có vai trò từng ảnh, dung lượng và SHA-256.
ZIP không chứa `PROMPT_CODEX.md`.

## Hướng dẫn Codex
Giải nén ZIP vào `C:\Tro_choi_cho_em\docs\references\block-island-lord-round23`, sau đó đọc `README_VI.md`, `MANIFEST.json`, xem trực tiếp các ảnh trong `references/` trước khi sửa. Không thay chúng bằng ảnh trên mạng hoặc ảnh tạo giả làm ảnh tham chiếu người dùng. Đừng sao chép trực tiếp bitmap tham chiếu thành asset game; tạo artwork gốc cùng phong cách.
