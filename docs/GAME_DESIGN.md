# HỒ SƠ THIẾT KẾ 10 TRÒ CHƠI TOÁN HỌC (GAME DESIGN DOCUMENT)

> **Dự án**: Trò chơi rèn luyện cho em  
> **Đối tượng người chơi**: Học sinh tiểu học (Lớp 1 đến Lớp 5)  
> **Nguyên tắc sư phạm**: Học qua trải nghiệm 2D (Playful Learning), trực quan sinh động, không tạo áp lực trừng phạt, giải thích cặn kẽ sau mỗi bước tính toán.

---

## BẢNG TỔNG QUAN 10 TRÒ CHƠI

| # | Mã Game (`gameId`) | Tên hiển thị | Trọng tâm Toán học | Lớp phù hợp | Thời lượng ván |
|---|---|---|---|---|---|
| 1 | `energy-defense` | Thủ thành năng lượng | Phép cộng/trừ số thập phân và phân số | Lớp 4 - 5 | 6 phút (wave chuẩn) / 1-2p (thử nghiệm) |
| 2 | `planet-rescue` | Giải cứu hành tinh | Rút gọn & quy đồng mẫu số phân số | Lớp 4 - 5 | 10 - 15 phút (5-7 phòng) |
| 3 | `terrain-racing` | Siêu xe vượt địa hình | Toán chuyển động đều: $v = s / t$ | Lớp 5 | 1 - 2 phút/chặng (10 chặng) |
| 4 | `race-to-finish` | Đua về đích | Nhận biết chẵn/lẻ, đếm bước tiến lùi & suy luận chiến thuật | Lớp 3 - 5 | 5 - 8 phút (ván đấu 21 ô) |
| 5 | `block-island` | Lãnh chúa đảo khối | Diện tích & chu vi (lưới, tam giác, hình thang) | Lớp 3 - 5 | 3 - 5 phút/nhiệm vụ (sandbox tự do) |
| 6 | `vault-code` | Mật mã cửa hầm | Giá trị hàng số thập phân & dấu hiệu chia hết | Lớp 4 - 5 | 3 - 5 phút (3 mã/ngày x 5 lượt) |
| 7 | `floating-market` | Thương nhân chợ nổi | Đổi đơn vị khối lượng & bài toán Lời / Lỗ | Lớp 4 - 5 | 3 - 5 phút (chuyến rút ngắn) |
| 8 | `rhythm-bakery` | Tiệm bánh nhịp điệu | Phân số đơn vị & hỗn số ($2 \frac{1}{2} = 5 \times \frac{1}{2}$) | Lớp 4 - 5 | 2 - 3 phút/bài nhạc |
| 9 | `treasure-dive` | Thợ lặn truy tìm kho báu | Đọc biểu đồ cột & phân phối xác suất thống kê | Lớp 4 - 5 | 3 phút/chuyến lặn |
| 10 | `royal-artillery` | Xưởng đúc pháo cung đình | Đo góc nhọn/tù & ước lượng lực bắn thập phân | Lớp 4 - 5 | 5 - 7 phút/trận đấu |

---

## CHI TIẾT THIẾT KẾ TỪNG TRÒ CHƠI

### 1. Thủ thành năng lượng (`energy-defense`)
- **Kiến thức trọng tâm**: Phép tính cộng/trừ số thập phân (ví dụ: $0.5 + 1.0 = 1.5$) và phân số (ví dụ: $\frac{1}{2} + \frac{1}{4} = \frac{3}{4}$).
- **Bàn chơi 2D**:
  - Đường đi uốn lượn dành cho quái vật (creeps) hoạt hình tiến về căn cứ bảo vệ.
  - Vị trí ụ pháo phòng thủ (Laser Defense Tower) cần nạp đủ năng lượng mục tiêu.
  - Khay chứa các lõi năng lượng với giá trị thập phân hoặc phân số.
- **Cơ chế tương tác**:
  - Người chơi chạm vào các mảnh năng lượng để đưa vào ô kích hoạt pháo.
  - Hệ thống kiểm tra tổng chính xác: Khi tổng mảnh ghép bằng đúng năng lượng đòi hỏi của ụ pháo, pháo kích hoạt bắn chùm tia laser tiêu diệt quái vật.
  - Nếu tổng vượt quá hoặc sai lệch: Không phạt trừ máu căn cứ; hệ thống hoàn trả mảnh ghép về khay kèm giải thích ngắn ("Cần thêm 0.5 nữa để đủ 1.5").
- **Độ khó**:
  - *Dễ*: Số thập phân tròn $0.5$, $1.0$, $1.5$; $2$ mảnh ghép.
  - *Vừa*: Số thập phân có $0.25$, $0.75$; hoặc phân số cùng mẫu số.
  - *Khó*: Phân số khác mẫu số cần quy đồng nhẩm ($\frac{1}{2}$, $\frac{1}{4}$, $\frac{3}{4}$).

---

### 2. Giải cứu hành tinh (`planet-rescue`)
- **Kiến thức trọng tâm**: Rút gọn phân số về phân số tối giản và quy đồng mẫu số.
- **Bàn chơi 2D**:
  - Bản đồ ngục tối vũ trụ (Dungeon Run) gồm 5 đến 7 phòng nối tiếp.
  - Đối thủ là các tàu tuần tra ngoài hành tinh với lá chắn năng lượng (ví dụ: Lá chắn $\frac{8}{12}$).
  - Bộ bài toán học của người chơi gồm thẻ "Rút gọn" (đưa $\frac{8}{12} \rightarrow \frac{2}{3}$) và thẻ "Đòn đánh năng lượng" có điều kiện mẫu số tương thích.
- **Cơ chế tương tác**:
  - Lượt chơi theo lượt (Turn-based), không tính giờ đếm ngược gây căng thẳng suy nghĩ cho trẻ.
  - Trẻ chọn thẻ rút gọn -> hệ thống kiểm tra phép tính ước chung lớn nhất (UCLN) -> phá vỡ lá chắn của địch -> ra đòn tấn công dứt điểm.
  - Tiến độ được tự động lưu lại sau mỗi phòng, cho phép tạm dừng và tiếp tục hành trình bất kỳ lúc nào.

---

### 3. Siêu xe vượt địa hình (`terrain-racing`)
- **Kiến thức trọng tâm**: Công thức chuyển động đều tiểu học: $v = s / t$, $s = v \times t$, $t = s / v$.
- **Bàn chơi 2D**:
  - Đường đua địa hình đồi dốc dải cao trình và khe núi sâu (Canyon).
  - Bảng đồng hồ trung tâm hiển thị thông số chặng: Quãng đường $s$ (km hoặc m) và Thời gian yêu cầu $t$ (giờ, phút hoặc giây).
  - Núm gạt điều chỉnh vận tốc động cơ $v$ kèm các nút lựa chọn cấu hình máy.
- **Cơ chế tương tác**:
  - Học sinh tính nhẩm hoặc nháp ra vận tốc $v = s / t$, điều chỉnh xe đạt đúng dải vận tốc quy chuẩn.
  - Khi nhấn "Xuất phát", hoạt ảnh 2D mô phỏng xe tăng tốc, leo dốc và phóng qua khe núi an toàn nếu tính đúng. Nếu tính sai vận tốc (quá chậm rơi xuống dốc hoặc quá nhanh mất thăng bằng), xe dừng lại nhẹ nhàng và hiển thị gợi ý điều chỉnh.
  - Bộ 10 chặng đua với độ khó tăng dần từ số nguyên chẵn đến số thập phân nhẹ.

---

### 4. Đua về đích (`race-to-finish`)
- **Kiến thức trọng tâm**: Nhận biết tính chẵn/lẻ của số tự nhiên, đếm bước tiến lùi trên trục số/bàn cờ, tư duy chiến thuật quản lý vật phẩm (khiên bảo vệ, quyền giải trừ).
- **Bàn chơi 2D**:
  - Đường đua zíc zắc gồm đúng 21 ô đá uốn lượn xuyên qua khu rừng phiêu lưu, xuất phát tại ván gỗ ô 0 và cán đích tại cúp vàng ô 21.
  - 4 nhân vật độc đáo: Cáo Lém Lĩnh, Chim Cánh Cụt, Thỏ Bông Tím, Rùa Kiên Trì với đầy đủ bộ tư thế: đứng chờ, bước đi, bị phạt và chiến thắng.
  - Bảng điều khiển xúc xắc 3D phía dưới thể hiện chấm thật 1–6, túi đồ vật phẩm và ticker tường thuật trực tiếp.
- **Cơ chế tương tác**:
  - Gieo xúc xắc 1–6: Lẻ (1, 3, 5) tiến 1 ô; Chẵn (2, 4, 6) tiến 2 ô.
  - Ô Thưởng (2, 5, 9, 13, 17): Tiến thêm 1–2 ô, nhận Khiên Phép (chặn 1 lần phạt) hoặc Sao Giải Bất Lợi (chủ động giải trừ).
  - Ô Phạt (4, 7, 11, 14, 19): Lùi 1–2 ô, mất lượt kế tiếp, hoặc bị cổng xoáy đưa về xuất phát (chỉ ở ô 7).
  - Hai chế độ chơi: Solo đấu với Máy (AI bot có thuật toán dùng vật phẩm thông minh) và Chơi Cùng Bạn (bàn giao thiết bị cục bộ 2–4 người).

---

### 5. Lãnh chúa đảo khối (`block-island`)
- **Kiến thức trọng tâm**: Diện tích ($S$) và Chu vi ($P$) trên lưới ô vuông; công thức tính diện tích hình chữ nhật, hình vuông, hình tam giác ($S = \frac{1}{2} a \times h$) và hình thang ($S = \frac{(a + b) \times h}{2}$).
- **Bàn chơi 2D**:
  - Đảo nổi lưới $8 \times 8$ ô vuông trên nền biển xanh.
  - Khay chứa các khối đất, khối gỗ và công trình.
  - Bảng nhiệm vụ xây dựng từ Hoàng gia Đảo (ví dụ: "Xây kho lương diện tích $12$ ô vuông và chu vi $16$ đơn vị").
- **Cơ chế tương tác**:
  - Học sinh chạm đặt các khối lên lưới.
  - Thuật toán tự động tính diện tích thực tế (số ô không trùng) và chu vi thực tế (tổng các cạnh biên ngoài, đã loại bỏ toàn bộ các cạnh tiếp giáp nội bộ).
  - Có chế độ ghé thăm "Đảo của Thuyền trưởng Gió" (NPC máy offline) để tham khảo các công trình mẫu.
  - Hết Stamina làm nhiệm vụ vẫn có thể thỏa sức xây dựng tự do trong chế độ Kiến trúc sư.

---

### 6. Mật mã cửa hầm (`vault-code`)
- **Kiến thức trọng tâm**: Cấu tạo số thập phân (hàng chục, hàng đơn vị, hàng phần mười, hàng phần trăm) và các dấu hiệu chia hết cho $2, 3, 5, 9$.
- **Bàn chơi 2D**:
  - Cánh cửa hầm bảo mật bằng thép với bàn phím số tương tác.
  - Bảng hiển thị mật mã dạng $4$ ô số: `[Hàng chục] [Hàng đơn vị] . [Phần mười] [Phần trăm]`.
  - Màn hình radar phân tích dữ liệu gợi ý của máy tính.
- **Cơ chế tương tác**:
  - Mỗi ngày có đúng $3$ mật mã bảo mật, mỗi mật mã có tối đa $5$ lượt phỏng đoán.
  - Sau mỗi lượt đoán, máy tính đưa ra gợi ý logic tuyệt đối chuẩn xác:
    - So sánh lớn hơn / nhỏ hơn ($>$ hoặc $<$).
    - Điều kiện chia hết chuẩn hóa: Áp dụng cụ thể cho phần nguyên hoặc tổng các chữ số (ví dụ: "Phần nguyên là số chia hết cho 3").
  - Lưu trữ cố định tiến độ theo ngày (Daily Seed), thoát app vào lại không bị reset mất lượt đoán.
  - Tích hợp thêm "Chế độ luyện tập" không giới hạn để rèn luyện kỹ năng tự do.

---

### 7. Thương nhân chợ nổi (`floating-market`)
- **Kiến thức trọng tâm**: Bảng đơn vị đo khối lượng (tấn, tạ, yến, kg, g), bảng quy đổi thập phân và bài toán tính Doanh thu - Chi phí - Lợi nhuận (Lời / Lỗ).
- **Bàn chơi 2D**:
  - Khung cảnh sông nước miền Tây với chiếc ghe thương hồ, bến thu mua và chợ đầu mối.
  - Các mặt hàng nông sản phong phú: Dưa hấu, Bưởi năm roi, Xoài cát, Sầu riêng.
  - Cân điện tử quy đổi đơn vị hàng hóa trực quan.
- **Cơ chế tương tác**:
  - Ví dụ: Mua sỉ $1.5$ tấn dưa hấu với giá $8.000$ đ/kg. Trẻ phải thực hiện bước đổi $1.5\text{ tấn} = 1.500\text{ kg}$.
  - Nhập giá bán lẻ (ví dụ: $12.000$ đ/kg) -> Hệ thống tính toán Doanh thu, trừ đi Chi phí vốn và phí xăng dầu ghe thuyền -> Cho ra mức Lời cụ thể.
  - Ràng buộc thực tế: Không cho phép mua vượt quá vốn hiện có hoặc vượt quá tải trọng của ghe xuồng.

---

### 8. Tiệm bánh nhịp điệu (`rhythm-bakery`)
- **Kiến thức trọng tâm**: Phân số đơn vị và hỗn số (Ví dụ: Đơn hàng cần $2 \frac{1}{2}$ chiếc bánh, mỗi phần cắt là $\frac{1}{2}$, trẻ cần thu thập đúng $5$ miếng bánh).
- **Bàn chơi 2D**:
  - Băng chuyền bánh ngọt di chuyển nhịp nhàng theo giai điệu vui tươi.
  - Bảng đơn hàng hiển thị hỗn số trực quan với hình minh họa các lát bánh.
  - Thanh nhịp điệu (Rhythm Beat Bar) với vòng tròn đón nhịp (Perfect / Good).
- **Cơ chế tương tác**:
  - Trẻ chạm nhặt các phần bánh khi trôi vào vùng hứng.
  - **Tách biệt sư phạm công bằng**: Điểm Toán học (tính đúng số lượng phần bánh của hỗn số) và Điểm Nhịp điệu (bắt đúng nhịp) được chấm độc lập. Trẻ làm đúng toán nhưng bấm lệch nhịp vẫn được khen thưởng làm đúng bài toán, không bị đánh giá sai kiến thức toán.
  - Có chế độ chạy chậm (Slow Mode) dành riêng cho các em nhỏ cần thêm thời gian thao tác.

---

### 9. Thợ lặn truy tìm kho báu (`treasure-dive`)
- **Kiến thức trọng tâm**: Đọc và phân tích dữ liệu trên biểu đồ cột (Bar Chart), bảng số liệu thống kê và khái niệm cơ bản về xác suất / rủi ro.
- **Bàn chơi 2D**:
  - Con tàu ngầm thám hiểm màu vàng lặn qua $3$ tầng đại dương: Tầng rạn san hô ($50$m), Tầng hoàng hôn ($150$m), Tầng vực thẳm ($300$m).
  - Bảng radar hiển thị biểu đồ cột tỉ lệ xuất hiện Rương báu, Sao biển và Đá ngầm.
  - Đồng hồ đo bình dưỡng khí Oxy tiêu hao theo từng độ sâu.
- **Cơ chế tương tác**:
  - Học sinh quan sát số liệu trên biểu đồ thực tế để trả lời các câu hỏi phân tích dữ liệu (ví dụ: "Tầng nào có tỉ lệ rương vàng cao nhất?", "Tổng số mẫu vật quan sát được là bao nhiêu?").
  - Quyết định lặn sâu tiếp hay quay về tàu mẹ để bảo toàn số kho báu đã thu thập được.
  - Mọi kho báu mang về được lưu trữ vĩnh viễn trong "Viện bảo tàng đại dương" của học sinh.

---

### 10. Xưởng đúc pháo cung đình (`royal-artillery`)
- **Kiến thức trọng tâm**: Đo và ước lượng góc (góc nhọn $<90^\circ$, góc vuông $90^\circ$, góc tù $>90^\circ$) và lực bắn thập phân; hiểu bản chất hướng bắn theo độ dốc hình học.
- **Bàn chơi 2D**:
  - Thành lũy cổ kính với khẩu thần công đặt tại vị trí trung tâm chiến trường.
  - Mục tiêu bia đỡ hoặc chướng ngại vật được bố trí linh hoạt ở cả **hai phía** (bên phải thành và bên trái thành).
  - Thước đo góc nửa hình tròn ($0^\circ - 180^\circ$) hiển thị trực quan quanh nòng pháo.
- **Cơ chế tương tác**:
  - **Quy tắc toán học chuẩn xác**:
    - Khi góc bắn $<90^\circ$ (góc nhọn): Nòng pháo hướng sang phải, đạn bay sang phải ($V_x > 0$).
    - Khi góc bắn bằng $90^\circ$: Đạn bay thẳng đứng lên trên ($V_x = 0$).
    - Khi góc bắn $>90^\circ$ (góc tù, ví dụ $120^\circ$): Nòng pháo xoay sang trái, đạn bay sang trái ($V_x < 0$). Tuyệt đối không xử lý nhầm $120^\circ$ thành $60^\circ$.
  - Trẻ điều chỉnh góc và kéo lực bắn thập phân ($1.0$ đến $5.0$). Quỹ đạo đường đạn parabol 2D hiển thị dấu vết mờ giúp trẻ ước lượng và điều chỉnh góc cho phát bắn tiếp theo.
