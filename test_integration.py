#!/usr/bin/env python3
"""Test integration renderer_engine với soan_van_ban_di.py"""

from soan_van_ban_di import tao_van_ban_docx

# Test data
du_lieu_test = {
    "loai_van_ban": "ke_hoach",
    "so_ky_hieu_goi_y": "123/KH-THPTĐBK",
    "trich_yeu": "Triển khai thực hiện Chỉ thị số 03/CT-TTg về ngăn chặn bạo lực học đường",
    "noi_dung": """Căn cứ Chỉ thị số 03/CT-TTg ngày 30/01/2026 của Thủ tướng Chính phủ về việc ngăn chặn, đẩy lùi bạo lực học đường;
Căn cứ Kế hoạch số 369/KH-UBND ngày 29 tháng 3 năm 2026 của Ủy ban nhân dân tỉnh Đồng Tháp về việc triển khai thực hiện Chỉ thị số 03/CT-TTg ngày 30/01/2026 của Thủ tướng Chính phủ về việc ngăn chặn, đẩy lùi bạo lực học đường trên địa bàn tỉnh Đồng Tháp;
Căn cứ Kế hoạch số 391/KH-SGDĐT ngày 21 tháng 4 năm 2026 của Sở Giáo dục và Đào tạo Đồng Tháp về việc triển khai thực hiện Chỉ thị số 03/CT-TTg ngày 30/01/2026 của Thủ tướng Chính phủ về việc ngăn chặn, đẩy lùi bạo lực học đường trong ngành Giáo dục tỉnh Đồng Tháp;
Trường THPT Đốc Binh Kiều xây dựng Kế hoạch triển khai thực hiện với các nội dung cụ thể như sau:

I. MỤC ĐÍCH, YÊU CẦU
Cụ thể hóa các nhiệm vụ được UBND tỉnh và Sở GDĐT giao, qua đó quán triệt và chỉ đạo, hướng dẫn thực hiện nghiêm túc các quy định về bảo đảm môi trường giáo dục an toàn, lành mạnh, thân thiện, gắn liền với việc giáo dục đạo đức, lối sống, văn hóa ứng xử và kỹ năng sống cho học sinh.
Quá trình phân công nhiệm vụ phải tuân thủ triệt để nguyên tắc "06 rõ: Rõ người, rõ việc, rõ thẩm quyền, rõ trách nhiệm, rõ thời gian, rõ kết quả", nhằm đề cao trách nhiệm của người đứng đầu nhà trường (hiện nay là Phó Hiệu trưởng phụ trách chung), đồng thời thiết lập cơ chế phối hợp thông tin hai chiều chặt chẽ giữa Nhà trường - Gia đình - Xã hội để quản lý, bảo vệ học sinh một cách thấu đáo, tận tâm nhất.

II. NHIỆM VỤ VÀ GIẢI PHÁP THỰC HIỆN
1. Đối với Ban Giám hiệu nhà trường (đồng chí Nguyễn Minh Trí – Phó Hiệu trưởng được phân công phụ trách)
Nhận thức sâu sắc và chịu trách nhiệm trực tiếp, toàn diện về công tác bảo đảm an toàn trong trường học; khẩn trương phân công rõ ràng nhiệm vụ, trách nhiệm đối với từng giáo viên chủ nhiệm, giáo viên bộ môn, cán bộ Đoàn, nhân viên và học sinh trong việc tổ chức thực hiện các quy định phòng, chống bạo lực học đường.
Đẩy mạnh tuyên truyền nâng cao nhận thức, trách nhiệm của cán bộ quản lý, giáo viên, học sinh, gia đình và cộng đồng về phòng, chống bạo lực học đường; bồi dưỡng, tập huấn cho giáo viên, nhân viên về kỹ năng tư vấn tâm lý, kiểm soát cảm xúc và giải quyết các tình huống sư phạm; phối hợp các cơ quan chuyên môn hướng dẫn tập huấn các kỹ năng tự bảo vệ bản thân, phòng chống vi phạm pháp luật và tệ nạn xã hội cho học sinh.

Nơi nhận:
Sở GDĐT Đồng Tháp (báo cáo); Lưu: VT""",
    "noi_nhan": "Sở GDĐT Đồng Tháp (báo cáo); Lưu: VT",
    "can_bao_cao": False
}

ten_file_test = "test_ke_hoach"

print("=== TEST INTEGRATION ===")
print(f"Loại văn bản: {du_lieu_test['loai_van_ban']}")
print(f"Số ký hiệu: {du_lieu_test['so_ky_hieu_goi_y']}")
print(f"Trích yếu: {du_lieu_test['trich_yeu']}")
print()

try:
    duong_dan_output = tao_van_ban_docx(du_lieu_test, ten_file_test)
    print(f"✅ Test thành công!")
    print(f"📁 File output: {duong_dan_output}")
except Exception as e:
    print(f"❌ Test thất bại: {e}")
    import traceback
    traceback.print_exc()
