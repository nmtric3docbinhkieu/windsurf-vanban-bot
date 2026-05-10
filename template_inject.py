#!/usr/bin/env python3
"""
Script inject nội dung vào template DOCX bằng docxtpl
Đây là phương án mới: dùng template sẵn + inject thay vì tạo từ đầu
"""

from docx import Document
from docxtpl import DocxTemplate, RichText
from pathlib import Path
import re

def parse_content_to_richtext(content):
    """
    Chuyển nội dung text có đề mục (I, 1, a,...) thành RichText cho docxtpl
    """
    lines = content.split('\n')
    rt = RichText()
    
    for line in lines:
        line = line.rstrip()
        if not line:
            rt.add('\n')
            continue
        
        # Đề mục cấp I, II, III (in đậm, không thụt đầu dòng)
        if re.match(r'^[IVX]+\.', line):
            rt.add(line + '\n', bold=True)
        # Đề mục cấp 1, 2, 3 (in đậm, thụt đầu dòng 1cm)
        elif re.match(r'^\d+\.', line):
            rt.add(line + '\n', bold=True)
            # Thụt đầu dòng bằng cách thêm tab
        # Đề mục cấp a, b, c (thụt đầu dòng 2cm)
        elif re.match(r'^[a-z]+\.', line):
            rt.add(line + '\n')
        # Tiêu đề in đậm (trong **)
        elif line.startswith('**') and line.endswith('**'):
            clean = line.strip('*')
            rt.add(clean + '\n', bold=True)
        # Bullet
        elif line.startswith('- ') or line.startswith('+ '):
            clean = line[2:].strip()
            clean = clean.replace('**', '').replace('*', '')
            rt.add('• ' + clean + '\n')
        # Dòng thường (thụt đầu dòng 1.25cm)
        else:
            clean = line.replace('**', '').replace('*', '')
            rt.add(clean + '\n')
    
    return rt

def clean_content_simple(content):
    """Chuẩn hóa nội dung đơn giản (lọc bỏ tiêu đề, footer)"""
    lines = content.split('\n')
    result = []
    
    # Bỏ dòng đầu tiên nếu là loại văn bản (KẾ HOẠCH, QUYẾT ĐỊNH, v.v.)
    if lines and lines[0].strip().upper() in ["KẾ HOẠCH", "QUYẾT ĐỊNH", "BÁO CÁO", "TỜ TRÌNH", "BIÊN BẢN", "CÔNG VĂN"]:
        lines = lines[1:]
    
    # Bỏ dòng thứ hai nếu là trích yếu
    if lines and lines[0].strip():
        lines = lines[1:]
    
    # Bỏ dòng trống tiếp theo
    if lines and not lines[0].strip():
        lines = lines[1:]
    
    # Lọc nội dung chính, bỏ phần footer
    found_footer = False
    for line in lines:
        line = line.strip()
        
        # Tìm dấu hiệu footer
        if "Nơi nhận:" in line or re.match(r"^[^,]+,\s*ngày\s+\d+\s+tháng\s+\d+\s+năm\s+\d+", line, re.IGNORECASE):
            found_footer = True
            break
        
        if line:
            # Loại bỏ markdown
            clean = line.replace('**', '').replace('*', '')
            result.append(clean)
        else:
            result.append('')
    
    return '\n'.join(result)

def inject_van_ban_di(template_path, data, output_path, use_richtext=True):
    """
    Inject dữ liệu vào template DOCX
    
    Args:
        template_path: Đường dẫn file template
        data: Dict chứa dữ liệu cần inject
            - so_ky_hieu: Số ký hiệu
            - ngay_thang: Ngày tháng
            - trich_yeu: Trích yếu
            - noi_dung: Nội dung chính
            - can_cus: Danh sách căn cứ (cho quyết định)
            - noi_nhan: Nơi nhận
            - nguoi_ky: Người ký
            - chuc_vu: Chức vụ
        output_path: Đường dẫn file output
        use_richtext: Có dùng RichText cho nội dung hay không
    """
    # Load template
    doc = DocxTemplate(template_path)
    
    # Chuẩn hóa nội dung
    if 'noi_dung' in data:
        if use_richtext:
            data['noi_dung'] = parse_content_to_richtext(data['noi_dung'])
        else:
            data['noi_dung'] = clean_content_simple(data['noi_dung'])
    
    # Chuẩn hóa danh sách căn cứ (nếu có)
    if 'can_cus' in data and isinstance(data['can_cus'], list):
        # Chuyển thành RichText với in nghiêng
        rt_can_cus = RichText()
        for i, can_cu in enumerate(data['can_cus']):
            rt_can_cus.add(can_cu + '\n', italic=True)
        data['can_cus'] = rt_can_cus
    
    # Inject dữ liệu
    doc.render(data)
    
    # Save
    doc.save(output_path)
    print(f"✅ Đã tạo file: {output_path}")

def get_template_path(loai_van_ban):
    """
    Trả về đường dẫn template theo loại văn bản
    
    Args:
        loai_van_ban: loai_van_ban (cong_van, quyet_dinh, ke_hoach, bao_cao, to_trinh)
    
    Returns:
        Đường dẫn file template
    """
    base_dir = Path(__file__).parent
    
    # Mapping loại văn bản -> template file
    template_map = {
        'cong_van': base_dir / 'TEMPLATE_CONGVAN.docx',
        'quyet_dinh': base_dir / 'TEMPLATE_QUYETDINH.docx',
        'ke_hoach': base_dir / 'TEMPLATE.docx',
        'bao_cao': base_dir / 'TEMPLATE.docx',
        'to_trinh': base_dir / 'TEMPLATE.docx'
    }
    
    template_path = template_map.get(loai_van_ban, base_dir / 'TEMPLATE.docx')
    
    # Nếu template riêng không tồn tại, dùng template mặc định
    if not template_path.exists():
        template_path = base_dir / 'TEMPLATE.docx'
    
    return template_path

def test_with_sample_data():
    """Test với dữ liệu mẫu (kế hoạch)"""
    template_path = Path(__file__).parent / "TEMPLATE.docx"
    output_path = Path(__file__).parent.parent / "van-ban-di" / "test_template_final.docx"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Đọc nội dung mẫu
    content_file = Path(__file__).parent / "noi_dung_ke_hoach.txt"
    noi_dung = content_file.read_text(encoding='utf-8')
    
    data = {
        'so_ky_hieu': '123/KH-THPTĐBK',
        'ngay_thang': 'Đốc Bình Kiều, ngày 10 tháng 5 năm 2026',
        'trich_yeu': 'Triển khai thực hiện Chỉ thị số 03/CT-TTg về ngăn chặn bạo lực học đường',
        'noi_dung': noi_dung,
        'noi_nhan': 'Sở GDĐT Đồng Tháp (báo cáo); Lưu: VT',
        'nguoi_ky': 'Nguyễn Minh Trí',
        'chuc_vu_ky': 'KT. HIỆU TRƯỞNG\nPHÓ HIỆU TRƯỞNG'
    }
    
    inject_van_ban_di(template_path, data, output_path, use_richtext=False)

def test_quyet_dinh():
    """Test với dữ liệu mẫu quyết định (có căn cứ in nghiêng)"""
    template_path = Path(__file__).parent / "TEMPLATE_QUYETDINH.docx"
    output_path = Path(__file__).parent.parent / "van-ban-di" / "test_template_quyetdinh.docx"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Nếu template quyết định chưa có, thông báo
    if not template_path.exists():
        print(f"⚠️  Chưa có file {template_path.name}, hãy tạo template cho quyết định trước")
        return
    
    data = {
        'so_ky_hieu': '45/QĐ-THPTĐBK',
        'ngay_thang': 'Đốc Bình Kiều, ngày 10 tháng 5 năm 2026',
        'trich_yeu': 'Về việc bổ nhiệm tổ trưởng tổ chuyên môn',
        'can_cus': [
            'Căn cứ Luật Giáo dục năm 2019',
            'Căn cứ Quy chế tổ chức và hoạt động của trường THPT',
            'Căn cứ Quyết định số 123/QĐ-UBND ngày 01/01/2026'
        ],
        'noi_dung': """I. NHIỆM VỤ
1. Tổ trưởng tổ chuyên môn có trách nhiệm:
   - Chỉ đạo, điều hành hoạt động chuyên môn của tổ
   - Bồi dưỡng chuyên môn cho giáo viên trong tổ
   - Tham mưu cho Ban Giám hiệu về công tác chuyên môn

II. QUYỀN HẠN
- Được đề xuất phương hướng hoạt động chuyên môn
- Được tham gia các cuộc họp chuyên môn cấp trường""",
        'noi_nhan': 'Sở GDĐT Đồng Tháp; Các tổ chuyên môn; Lưu: VT',
        'nguoi_ky': 'Nguyễn Minh Trí',
        'chuc_vu_ky': 'KT. HIỆU TRƯỞNG\nPHÓ HIỆU TRƯỞNG'
    }
    
    inject_van_ban_di(template_path, data, output_path, use_richtext=False)

if __name__ == "__main__":
    test_with_sample_data()
