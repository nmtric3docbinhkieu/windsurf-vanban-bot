#!/usr/bin/env python3
"""Tạo văn bản đi ở chế độ test miễn phí (không gọi DeepSeek).

Mục tiêu:
- Dùng nội dung do Copilot soạn trực tiếp để test render DOCX nhiều lần.
- Tránh lỗi dấu tiếng Việt do nhập liệu qua terminal.
"""

from pathlib import Path
from soan_van_ban_di import tao_van_ban_docx


def main() -> None:
    input_name = "329-KH_ATGT VA KEO GIAM TAI NAN GIAO THONG_SGD 07-04-2026"

    du_lieu = {
        "loai_van_ban": "ke_hoach",
        "so_ky_hieu_goi_y": "/KH-THPTĐBK",
        "trich_yeu": (
            "Triển khai thực hiện công tác bảo đảm trật tự, an toàn giao thông năm 2026 "
            "và các giải pháp kiềm chế, kéo giảm tai nạn giao thông"
        ),
        "tom_tat_yeu_cau": (
            "Triển khai kế hoạch ATGT năm 2026 trong nhà trường; đẩy mạnh tuyên truyền, "
            "cam kết chấp hành và phối hợp Nhà trường - Gia đình - Xã hội."
        ),
        "noi_nhan": "Sở GDĐT Đồng Tháp (báo cáo); Lưu: VT",
        "noi_dung": """Căn cứ Kế hoạch số 329/KH-SGDĐT ngày 07 tháng 4 năm 2026 của Sở Giáo dục và Đào tạo Đồng Tháp về triển khai thực hiện công tác bảo đảm trật tự, an toàn giao thông năm 2026 và các giải pháp kiềm chế, kéo giảm tai nạn giao thông trong ngành Giáo dục;
Trường THPT Đốc Binh Kiều xây dựng kế hoạch triển khai thực hiện với các nội dung như sau:

I. MỤC ĐÍCH, YÊU CẦU
1. Quán triệt đầy đủ các quy định của pháp luật về trật tự, an toàn giao thông đến toàn thể cán bộ, giáo viên, nhân viên và học sinh.
2. Nâng cao ý thức tự giác chấp hành pháp luật khi tham gia giao thông; góp phần kiềm chế, kéo giảm tai nạn giao thông liên quan đến học sinh.
3. Đưa nội dung chấp hành pháp luật giao thông thành tiêu chí đánh giá thi đua của tập thể, cá nhân trong năm học.

II. NHIỆM VỤ, GIẢI PHÁP
1. Công tác tuyên truyền, giáo dục pháp luật giao thông
Tổ chức phổ biến, tuyên truyền các quy định về an toàn giao thông thông qua tiết sinh hoạt lớp, sinh hoạt dưới cờ, hoạt động Đoàn - Hội và các kênh truyền thông của nhà trường.
Lồng ghép nội dung giáo dục an toàn giao thông vào hoạt động dạy học phù hợp với từng khối lớp.
Mỗi học kỳ tổ chức ít nhất 01 chuyên đề tuyên truyền pháp luật giao thông cho học sinh.

2. Công tác quản lý, xây dựng môi trường giao thông an toàn
Tổ chức cho 100% cán bộ, giáo viên, nhân viên và học sinh ký cam kết chấp hành nghiêm quy định về trật tự, an toàn giao thông.
Duy trì, củng cố mô hình Cổng trường an toàn giao thông; phối hợp lực lượng chức năng và chính quyền địa phương điều tiết giao thông giờ cao điểm.
Nhắc nhở phụ huynh không giao phương tiện cho học sinh khi chưa đủ điều kiện điều khiển theo quy định của pháp luật.

3. Công tác phối hợp Nhà trường - Gia đình - Xã hội
Tăng cường phối hợp giữa nhà trường với cha mẹ học sinh trong quản lý việc chấp hành quy định giao thông của học sinh ngoài giờ học.
Phối hợp Công an địa phương tiếp nhận thông tin học sinh vi phạm để kịp thời giáo dục, uốn nắn.

III. TỔ CHỨC THỰC HIỆN
1. Ban Giám hiệu
Chỉ đạo chung, xây dựng kế hoạch chi tiết; tổ chức kiểm tra, đánh giá định kỳ việc thực hiện tại các tổ chuyên môn, giáo viên chủ nhiệm và học sinh.

2. Giáo viên chủ nhiệm, tổ chuyên môn, Đoàn trường
Triển khai nội dung kế hoạch đến từng lớp; theo dõi, nhắc nhở học sinh thực hiện nghiêm; phối hợp phụ huynh trong công tác giáo dục.

3. Văn phòng nhà trường
Tổng hợp kết quả thực hiện, tham mưu báo cáo định kỳ theo yêu cầu của cấp trên.

IV. CHẾ ĐỘ THÔNG TIN, BÁO CÁO
Các bộ phận liên quan báo cáo tình hình triển khai, kết quả thực hiện và các khó khăn, vướng mắc về Ban Giám hiệu để tổng hợp báo cáo Sở GDĐT đúng thời hạn.
""",
    }

    out_path = tao_van_ban_docx(du_lieu, input_name)
    print(out_path)


if __name__ == "__main__":
    main()
