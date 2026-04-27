"""
Module: soan_van_ban_di.py
Mục đích: Đọc văn bản đến từ Sở GDĐT, dùng AI soạn văn bản đi phù hợp
với đặc thù Trường THPT Đốc Binh Kiều.
"""

import os
import re
import json
import subprocess
from pathlib import Path
from datetime import datetime
from openai import OpenAI
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from dotenv import load_dotenv

# Load biến môi trường từ file .env
load_dotenv()

# ============================================================
# CẤU HÌNH
# ============================================================
THONG_TIN_TRUONG = """
- Tên đầy đủ: Trường Trung học Phổ thông Đốc Binh Kiều
- Địa chỉ: Ấp 3, xã Đốc Binh Kiều, huyện Tháp Mười, tỉnh Đồng Tháp
- Điện thoại: 02773826878 | Email: thptdocbinhkieu@dongthap.edu.vn
- Cơ quan chủ quản: Sở Giáo dục và Đào tạo Đồng Tháp
- Người ký văn bản: PHÓ HIỆU TRƯỞNG Nguyễn Minh Trí (đang khuyết Hiệu trưởng)
- Tổng số lớp: 13 lớp (Khối 10: 4 lớp, Khối 11: 5 lớp, Khối 12: 4 lớp)
- Tổng số học sinh: 506 em (Nam: 274, Nữ: 232)
- Tổng số giáo viên: 30 giáo viên
- Đặc điểm: Trường vùng nông thôn, học sinh chủ yếu từ xã Đốc Binh Kiều,
  xã Tháp Mười và một số xã thuộc tỉnh Tây Ninh giáp ranh.
  Điều kiện kinh tế gia đình học sinh còn nhiều khó khăn.
  Giáo viên nhiệt tình, đoàn kết; học sinh chăm ngoan, có ý thức học tập.
- Thành tích nổi bật: Trường đạt chuẩn quốc gia, hoàn thành tốt các chỉ tiêu
  chuyên môn hằng năm, có học sinh đạt giải thi học sinh giỏi cấp tỉnh.
- Tên viết tắt dùng trong văn bản: Trường THPT Đốc Binh Kiều
"""

# Tiêu đề cơ quan ban hành (góc trái)
CO_QUAN_BAN_HANH = "TRƯỜNG THPT ĐỐC BÌNH KIỀU"
CO_QUAN_CHU_QUAN = "SỞ GDĐT ĐỒNG THÁP"

# Thư mục - điều chỉnh đúng với thực tế
THU_MUC_VAN_BAN_DEN = "../van-ban-den-xu-ly"  # thư mục chứa văn bản đến đã xử lý
THU_MUC_VAN_BAN_DI  = "../van-ban-di"          # thư mục xuất văn bản đi

# DeepSeek API Configuration
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEEPSEEK_MODEL = "deepseek-chat"  # Model phổ biến, giá hợp lý, đã test hoạt động

# ============================================================
# BƯỚC 1: ĐỌC NỘI DUNG FILE VĂN BẢN ĐẾN
# ============================================================

def doc_noi_dung_file(duong_dan: str) -> str:
    """Đọc nội dung văn bản đến (docx hoặc pdf)."""
    ext = Path(duong_dan).suffix.lower()
    
    if ext == ".docx":
        try:
            # Dùng python-docx để đọc trực tiếp
            doc = Document(duong_dan)
            noi_dung = []
            for para in doc.paragraphs:
                if para.text.strip():
                    noi_dung.append(para.text.strip())
            return "\n".join(noi_dung)
        except Exception as e:
            print(f"⚠️  Lỗi đọc file DOCX: {e}")
            return f"[Không đọc được file DOCX: {e}]"
    
    elif ext == ".pdf":
        # Gọi script Node.js pdf-reader.js để đọc PDF
        try:
            script_path = Path(__file__).parent / "pdf-reader.js"
            result = subprocess.run(
                ["node", "-e", f"""
const readPDF = require('{script_path}').readPDF;
readPDF('{duong_dan}').then(result => {{
    console.log(result.text);
}}).catch(err => {{
    console.error('ERROR:', err.message);
    process.exit(1);
}});
"""],
                capture_output=True, text=True, timeout=60
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
            else:
                return f"[Không đọc được file PDF: {result.stderr}]"
        except Exception as e:
            return f"[Không đọc được file PDF: {e}]"
    
    else:
        return f"[Định dạng file không hỗ trợ: {ext}]"


# ============================================================
# BƯỚC 2: PHÂN TÍCH LOẠI VĂN BẢN VÀ GỌI AI SOẠN
# ============================================================

PROMPT_SYSTEM = f"""
Bạn là chuyên gia soạn thảo văn bản hành chính nhà nước Việt Nam,
chuyên hỗ trợ trường THPT. Bạn có nhiệm vụ đọc văn bản đến từ
Sở Giáo dục và Đào tạo Đồng Tháp rồi soạn văn bản đi phù hợp
với đơn vị trường sau:

{THONG_TIN_TRUONG}

==== QUY TẮC QUAN TRỌNG ====

Trả lời theo cấu trúc markdown sau (bắt buộc theo đúng format):

---
LOAI_VAN_BAN: cong_van|ke_hoach|bao_cao|to_trinh|quyet_dinh
SO_KY_HIEU: /CV-THPTĐBK hoặc /KH-THPTĐBK hoặc /BC-THPTĐBK
TRICH_YEU: tiêu đề ngắn
TOM_TAT_YEU_CAU: tóm tắt ngắn yêu cầu
NOI_NHAN: Sở GDĐT Đồng Tháp; Lưu: VT, HS
---
NOI_DUNG:
[nội dung văn bản đi ở đây, dùng markdown, **in đậm** cho tiêu đề]
---

YÊU CẦU NỘI DUNG:
- Bám sát yêu cầu của Sở nhưng CHỈ lấy phần liên quan đến THPT
- Phù hợp quy mô trường (13 lớp, 506 HS, vùng nông thôn)
- Cô đọng, súc tích, ngôn ngữ hành chính chuẩn
- Đánh số mục rõ ràng (I, II, III... hoặc 1, 2, 3...)
- KHÔNG điền ngày tháng cụ thể
- KHÔNG bao gồm header (QUỐC HIỆU, TIÊU NGỮ, SỐ, NGÀY, TÊN CƠ QUAN) trong NOI_DUNG
- KHÔNG bao gồm báo cáo - chỉ soạn văn bản đi chính
"""

def goi_ai_soan_van_ban(noi_dung_van_ban_den: str) -> dict:
    """Gọi DeepSeek API để soạn văn bản đi, trả về dict."""
    
    if not DEEPSEEK_API_KEY:
        raise ValueError("DEEPSEEK_API_KEY không có trong biến môi trường")
    
    client = OpenAI(
        api_key=DEEPSEEK_API_KEY,
        base_url=DEEPSEEK_BASE_URL
    )
    
    # Không giới hạn độ dài - đọc toàn bộ nội dung
    
    prompt_user = f"""
Đây là nội dung văn bản đến từ Sở GDĐT Đồng Tháp:

===== BẮT ĐẦU VĂN BẢN ĐẾN =====
{noi_dung_van_ban_den}
===== KẾT THÚC VĂN BẢN ĐẾN =====

Hãy soạn văn bản đi phù hợp với Trường THPT Đốc Bình Kiều theo đúng yêu cầu.
Trả về theo format markdown như hướng dẫn.
"""
    
    try:
        response = client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": PROMPT_SYSTEM},
                {"role": "user", "content": prompt_user}
            ],
            temperature=0.3,
            max_tokens=8000
        )
        
        raw = response.choices[0].message.content.strip()
        print(f"🔍 AI trả về (đầu 500 ký tự): {raw[:500]}")
        
        return _parse_markdown_response(raw)
    
    except Exception as e:
        print(f"❌ Lỗi gọi DeepSeek API: {e}")
        raise


def _parse_markdown_response(text: str) -> dict:
    """Parse markdown response từ AI thành dict."""
    result = {}
    
    # Parse các trường metadata
    patterns = {
        'LOAI_VAN_BAN': r'LOAI_VAN_BAN:\s*(.+)',
        'SO_KY_HIEU': r'SO_KY_HIEU:\s*(.+)',
        'TRICH_YEU': r'TRICH_YEU:\s*(.+)',
        'TOM_TAT_YEU_CAU': r'TOM_TAT_YEU_CAU:\s*(.+)',
        'NOI_NHAN': r'NOI_NHAN:\s*(.+)',
    }
    
    for key, pattern in patterns.items():
        match = re.search(pattern, text, re.MULTILINE)
        if match:
            value = match.group(1).strip()
            if key == 'CAN_BAO_CAO':
                value = value.lower() == 'true'
            result[key.lower()] = value
    
    # Map tên trường
    field_map = {
        'loai_van_ban': 'loai_van_ban',
        'so_ky_hieu': 'so_ky_hieu_goi_y',
        'trich_yeu': 'trich_yeu',
        'tom_tat_yeu_cau': 'tom_tat_yeu_cau',
        'noi_nhan': 'noi_nhan',
    }
    
    mapped_result = {}
    for old_key, new_key in field_map.items():
        if old_key in result:
            mapped_result[new_key] = result[old_key]
    
    # Parse NOI_DUNG (phần sau ---NOI_DUNG:---)
    noi_dung_match = re.search(r'---\s*NOI_DUNG:\s*(.+?)\s*---', text, re.DOTALL)
    if noi_dung_match:
        noi_dung = noi_dung_match.group(1).strip()
        # Loại bỏ dòng "NOI_DUNG:" nếu AI vẫn thêm vào
        noi_dung = re.sub(r'^NOI_DUNG:\s*', '', noi_dung, flags=re.MULTILINE)
        mapped_result['noi_dung'] = noi_dung.strip()
    else:
        # Fallback: lấy phần sau --- cuối cùng
        parts = text.split('---')
        if len(parts) > 1:
            noi_dung = parts[-1].strip()
            noi_dung = re.sub(r'^NOI_DUNG:\s*', '', noi_dung, flags=re.MULTILINE)
            mapped_result['noi_dung'] = noi_dung.strip()
    
    return mapped_result


# ============================================================
# BƯỚC 3: TẠO FILE WORD THEO ĐÚNG THỂ THỨC
# ============================================================

def tao_van_ban_docx(du_lieu: dict, ten_file_goc: str) -> str:
    """Tạo file .docx văn bản đi theo thể thức hành chính."""
    
    # Tạo thư mục van-ban-di nếu chưa có
    duong_dan_thu_muc = Path(__file__).parent / THU_MUC_VAN_BAN_DI
    duong_dan_thu_muc.mkdir(parents=True, exist_ok=True)
    
    loai = du_lieu.get("loai_van_ban", "cong_van")
    so_ky_hieu = du_lieu.get("so_ky_hieu_goi_y", "/CV-THPTĐBK")
    trich_yeu = du_lieu.get("trich_yeu", "")
    noi_dung  = du_lieu.get("noi_dung", "")
    noi_nhan  = du_lieu.get("noi_nhan", "")
    
    doc = Document()
    
    # === Cài đặt trang ===
    section = doc.sections[0]
    section.page_width  = Cm(21.0)
    section.page_height = Cm(29.7)
    section.left_margin   = Cm(3.0)
    section.right_margin  = Cm(2.0)
    section.top_margin    = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    
    # Set default font size cho Normal style
    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style.font.size = Pt(13)
    
    def set_font(run, name="Times New Roman", size=13, bold=False, italic=False, color=None):
        # Set font properties
        run.font.name = name
        run.font.bold = bold
        run.font.italic = italic
        if color:
            run.font.color.rgb = RGBColor(*color)
        
        # Set size bằng twips (13pt = 260 twips)
        run.font.size = Pt(size)
        
        # Set size bằng XML để đảm bảo áp dụng
        r = run._r
        rPr = r.get_or_add_rPr()
        
        # Font size (half-points: 13pt = 26)
        sz = OxmlElement('w:sz')
        sz.set(qn('w:val'), str(size * 2))
        rPr.append(sz)
        szCs = OxmlElement('w:szCs')
        szCs.set(qn('w:val'), str(size * 2))
        rPr.append(szCs)
        
        # Font tiếng Việt
        rFonts = OxmlElement('w:rFonts')
        rFonts.set(qn('w:ascii'), name)
        rFonts.set(qn('w:hAnsi'), name)
        rFonts.set(qn('w:eastAsia'), name)
        rFonts.set(qn('w:cs'), name)
        rPr.append(rFonts)
    
    def add_para(text="", align=WD_ALIGN_PARAGRAPH.LEFT, bold=False,
                 italic=False, size=13, space_before=0, space_after=6,
                 color=None):
        p = doc.add_paragraph()
        p.alignment = align
        pf = p.paragraph_format
        pf.space_before = Pt(space_before)
        pf.space_after  = Pt(space_after)
        pf.line_spacing = Pt(18)
        if text:
            run = p.add_run(text)
            set_font(run, size=size, bold=bold, italic=italic, color=color)
        return p
    
    # ===================================================
    # PHẦN I: QUỐC HIỆU + TIÊU NGỮ (bảng 2 cột)
    # ===================================================
    table_header = doc.add_table(rows=1, cols=2)
    table_header.style = "Table Grid"
    # Ẩn đường viền
    for cell in table_header.rows[0].cells:
        tc = cell._tc
        tcPr = tc.get_or_add_tcPr()
        tcBorders = OxmlElement('w:tcBorders')
        for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
            border = OxmlElement(f'w:{border_name}')
            border.set(qn('w:val'), 'none')
            tcBorders.append(border)
        tcPr.append(tcBorders)
    
    # Cột trái: Cơ quan ban hành
    cell_left = table_header.cell(0, 0)
    cell_left.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    
    p1 = cell_left.paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r1 = p1.add_run(CO_QUAN_CHU_QUAN)
    set_font(r1, size=12, bold=False)
    
    p2 = cell_left.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = p2.add_run(CO_QUAN_BAN_HANH)
    set_font(r2, size=13, bold=True)
    
    # Đường gạch dưới tên cơ quan
    p2_fmt = p2.paragraph_format
    p2_fmt.space_after = Pt(2)
    pPr = p2._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '6')
    bottom.set(qn('w:space'), '1')
    bottom.set(qn('w:color'), '000000')
    pBdr.append(bottom)
    pPr.append(pBdr)
    
    # Cột phải: Quốc hiệu - Tiêu ngữ
    cell_right = table_header.cell(0, 1)
    cell_right.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    
    pr1 = cell_right.paragraphs[0]
    pr1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rr1 = pr1.add_run("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM")
    set_font(rr1, size=13, bold=True)
    
    pr2 = cell_right.add_paragraph()
    pr2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rr2 = pr2.add_run("Độc lập – Tự do – Hạnh phúc")
    set_font(rr2, size=13, bold=True)
    
    # Gạch dưới tiêu ngữ
    pr2_fmt = pr2.paragraph_format
    pr2_fmt.space_after = Pt(2)
    pPr2 = pr2._p.get_or_add_pPr()
    pBdr2 = OxmlElement('w:pBdr')
    bottom2 = OxmlElement('w:bottom')
    bottom2.set(qn('w:val'), 'single')
    bottom2.set(qn('w:sz'), '6')
    bottom2.set(qn('w:space'), '1')
    bottom2.set(qn('w:color'), '000000')
    pBdr2.append(bottom2)
    pPr2.append(pBdr2)
    
    # ===================================================
    # PHẦN II: SỐ VĂN BẢN + NGÀY THÁNG (bảng 2 cột)
    # ===================================================
    doc.add_paragraph()  # khoảng cách
    
    table_so = doc.add_table(rows=1, cols=2)
    table_so.style = "Table Grid"
    for cell in table_so.rows[0].cells:
        tc = cell._tc
        tcPr = tc.get_or_add_tcPr()
        tcBorders = OxmlElement('w:tcBorders')
        for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
            border = OxmlElement(f'w:{border_name}')
            border.set(qn('w:val'), 'none')
            tcBorders.append(border)
        tcPr.append(tcBorders)
    
    # Số ký hiệu
    cell_so = table_so.cell(0, 0)
    p_so = cell_so.paragraphs[0]
    p_so.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r_so = p_so.add_run(f"Số:       {so_ky_hieu}")
    set_font(r_so, size=13)
    
    # Ngày tháng năm
    cell_ngay = table_so.cell(0, 1)
    p_ngay = cell_ngay.paragraphs[0]
    p_ngay.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_ngay = p_ngay.add_run("Đốc Bình Kiều, ngày    tháng    năm 2026")
    set_font(r_ngay, size=13, italic=True)
    
    # Trích yếu (chỉ với công văn)
    if loai == "cong_van":
        p_vv = doc.add_paragraph()
        p_vv.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r_vv = p_vv.add_run(f"V/v {trich_yeu}")
        set_font(r_vv, size=13)
    
    # ===================================================
    # PHẦN III: TIÊU ĐỀ VĂN BẢN (kế hoạch, báo cáo...)
    # ===================================================
    if loai in ["ke_hoach", "bao_cao", "to_trinh", "quyet_dinh"]:
        loai_label = {
            "ke_hoach": "KẾ HOẠCH",
            "bao_cao": "BÁO CÁO",
            "to_trinh": "TỜ TRÌNH",
            "quyet_dinh": "QUYẾT ĐỊNH"
        }.get(loai, "VĂN BẢN")
        
        add_para(loai_label, align=WD_ALIGN_PARAGRAPH.CENTER,
                 bold=True, size=14, space_before=12)
        add_para(trich_yeu, align=WD_ALIGN_PARAGRAPH.CENTER,
                 bold=True, size=13, space_before=0)
        add_para("", space_before=6)
    
    # ===================================================
    # PHẦN IV: KÍNH GỬI
    # ===================================================
    if loai == "cong_van":
        doc.add_paragraph()
        p_kg = doc.add_paragraph()
        p_kg.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r_kg = p_kg.add_run("Kính gửi: Sở Giáo dục và Đào tạo Đồng Tháp")
        set_font(r_kg, size=13)
        doc.add_paragraph()
    
    # ===================================================
    # PHẦN V: NỘI DUNG CHÍNH
    # ===================================================
    _viet_noi_dung_markdown(doc, noi_dung, set_font, add_para)
    
    # ===================================================
    # PHẦN VI: NƠI NHẬN + CHỮ KÝ (bảng 2 cột)
    # ===================================================
    doc.add_paragraph()
    
    table_ky = doc.add_table(rows=1, cols=2)
    table_ky.style = "Table Grid"
    for cell in table_ky.rows[0].cells:
        tc = cell._tc
        tcPr = tc.get_or_add_tcPr()
        tcBorders = OxmlElement('w:tcBorders')
        for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
            border = OxmlElement(f'w:{border_name}')
            border.set(qn('w:val'), 'none')
            tcBorders.append(border)
        tcPr.append(tcBorders)
    
    # Cột trái: Nơi nhận
    cell_nn = table_ky.cell(0, 0)
    p_nn_title = cell_nn.paragraphs[0]
    r_nn_title = p_nn_title.add_run("Nơi nhận:")
    set_font(r_nn_title, size=11, italic=True, bold=True)
    
    danh_sach_nn = [x.strip() for x in noi_nhan.split(";") if x.strip()]
    # Luôn có: Sở GDĐT, Lưu VT
    if not any("Sở GDĐT" in s or "Sở Giáo dục" in s for s in danh_sach_nn):
        danh_sach_nn.insert(0, "Sở GDĐT Đồng Tháp (để báo cáo)")
    if not any("Lưu" in s for s in danh_sach_nn):
        danh_sach_nn.append("Lưu: VT, HS.")
    
    for nn in danh_sach_nn:
        p_nn = cell_nn.add_paragraph()
        r_nn = p_nn.add_run(f"- {nn};")
        set_font(r_nn, size=11)
    
    # Cột phải: Chữ ký
    cell_ky = table_ky.cell(0, 1)
    cell_ky.vertical_alignment = WD_ALIGN_VERTICAL.TOP
    
    p_ky1 = cell_ky.paragraphs[0]
    p_ky1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_ky1 = p_ky1.add_run("KT. HIỆU TRƯỞNG")
    set_font(r_ky1, size=13, bold=True)
    
    p_ky2 = cell_ky.add_paragraph()
    p_ky2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_ky2 = p_ky2.add_run("PHÓ HIỆU TRƯỞNG")
    set_font(r_ky2, size=13, bold=True)
    
    # Khoảng trống ký tên
    for _ in range(4):
        p_blank = cell_ky.add_paragraph()
        p_blank.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    p_ten = cell_ky.add_paragraph()
    p_ten.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_ten = p_ten.add_run("Nguyễn Minh Trí")
    set_font(r_ten, size=13, bold=True)
    
    # ===================================================
    # LƯU FILE
    # ===================================================
    # Đặt tên file - thêm timestamp để tránh trùng
    from datetime import datetime
    timestamp = datetime.now().strftime("%H%M%S")
    ten_file_cu = Path(ten_file_goc).stem
    ten_file_moi = f"VBDi_{ten_file_cu}_{loai}_{timestamp}.docx"
    duong_dan_luu = duong_dan_thu_muc / ten_file_moi
    doc.save(str(duong_dan_luu))
    return str(duong_dan_luu)


def _viet_noi_dung_markdown(doc, noi_dung: str, set_font_fn, add_para_fn):
    """Chuyển nội dung markdown đơn giản thành đoạn văn Word."""
    lines = noi_dung.split("\n")
    for line in lines:
        line = line.rstrip()
        if not line:
            add_para_fn("", space_before=0, space_after=3)
            continue
        
        # Tiêu đề mục chính (bắt đầu bằng ** hoặc #)
        if re.match(r"^#{1,3}\s+", line) or re.match(r"^\*\*[IVX\d]+[\.:]", line):
            text = re.sub(r"^#+\s+", "", line)
            text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after  = Pt(3)
            run = p.add_run(text)
            set_font_fn(run, size=13, bold=True)
        
        # Dòng in đậm bình thường
        elif line.startswith("**") and line.endswith("**"):
            text = line.strip("*")
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after  = Pt(3)
            run = p.add_run(text)
            set_font_fn(run, size=13, bold=True)
        
        # Dòng bullet/gạch đầu dòng
        elif line.startswith("- ") or line.startswith("+ "):
            text = line[2:].strip()
            text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.left_indent  = Cm(0.75)
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after  = Pt(3)
            p.paragraph_format.line_spacing = Pt(18)
            run = p.add_run(f"- {text}")
            set_font_fn(run, size=13)
        
        # Dòng đánh số
        elif re.match(r"^\d+\.", line) or re.match(r"^[IVX]+\.", line):
            text = re.sub(r"\*\*(.+?)\*\*", r"\1", line)
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after  = Pt(3)
            p.paragraph_format.line_spacing = Pt(18)
            run = p.add_run(text)
            set_font_fn(run, size=13)
        
        # Dòng thường
        else:
            text = re.sub(r"\*\*(.+?)\*\*", r"\1", line)
            text = re.sub(r"\*(.+?)\*", r"\1", text)
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.paragraph_format.first_line_indent = Cm(1.0)
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after  = Pt(3)
            p.paragraph_format.line_spacing = Pt(18)
            run = p.add_run(text)
            set_font_fn(run, size=13)


# ============================================================
# HÀM SOẠN BÁO CÁO (nếu có yêu cầu)
# ============================================================

def tao_bao_cao_docx(du_lieu: dict, ten_file_goc: str) -> str:
    """Tạo file báo cáo riêng nếu văn bản đến có yêu cầu báo cáo."""
    noi_dung_bc = du_lieu.get("noi_dung_bao_cao", "")
    if not noi_dung_bc:
        return None
    
    # Dùng lại hàm tạo docx nhưng với dữ liệu báo cáo
    du_lieu_bc = {
        "loai_van_ban": "bao_cao",
        "so_ky_hieu_goi_y": "/BC-THPTĐBK",
        "trich_yeu": du_lieu.get("trich_yeu", ""),
        "noi_dung": noi_dung_bc,
        "noi_nhan": du_lieu.get("noi_nhan", ""),
        "can_bao_cao": False,
    }
    ten_file_bc = Path(ten_file_goc).stem + "_baocao"
    return tao_van_ban_docx(du_lieu_bc, ten_file_bc)


# ============================================================
# HÀM CHÍNH: XỬ LÝ 1 FILE VĂN BẢN ĐẾN
# ============================================================

def xu_ly_mot_van_ban(duong_dan_file: str) -> dict:
    """
    Xử lý một file văn bản đến:
    1. Đọc nội dung
    2. Gọi AI soạn
    3. Tạo file Word
    4. Trả về kết quả
    """
    ten_file = Path(duong_dan_file).name
    print(f"\n{'='*60}")
    print(f"📄 Đang xử lý: {ten_file}")
    print(f"{'='*60}")
    
    # Bước 1: Đọc nội dung
    print("⏳ Đọc nội dung file...")
    noi_dung = doc_noi_dung_file(duong_dan_file)
    if not noi_dung or len(noi_dung) < 100:
        print(f"⚠️  File rỗng hoặc không đọc được: {ten_file}")
        return {"loi": "Không đọc được file"}
    
    # Bước 2: Gọi AI
    print("🤖 Đang nhờ DeepSeek AI soạn văn bản...")
    try:
        du_lieu = goi_ai_soan_van_ban(noi_dung)
    except json.JSONDecodeError as e:
        print(f"❌ Lỗi parse JSON từ AI: {e}")
        return {"loi": f"Lỗi parse JSON: {e}"}
    except Exception as e:
        print(f"❌ Lỗi gọi API: {e}")
        return {"loi": str(e)}
    
    # In tóm tắt
    print(f"\n📋 Tóm tắt yêu cầu:")
    print(f"   {du_lieu.get('tom_tat_yeu_cau', '')}")
    print(f"\n📝 Loại văn bản đi: {du_lieu.get('loai_van_ban', '').upper()}")
    print(f"   Trích yếu: {du_lieu.get('trich_yeu', '')}")
    
    # Bước 3: Tạo file Word
    print("\n💾 Đang tạo file Word...")
    ket_qua = {"ten_file_goc": ten_file}
    
    try:
        duong_dan_vbd = tao_van_ban_docx(du_lieu, duong_dan_file)
        ket_qua["van_ban_di"] = duong_dan_vbd
        print(f"✅ Đã tạo: {duong_dan_vbd}")
    except Exception as e:
        print(f"❌ Lỗi tạo file Word: {e}")
        ket_qua["loi_van_ban_di"] = str(e)
    
    # Bước 4: Không tạo báo cáo (để tiết kiệm token)
    
    return ket_qua


# ============================================================
# XỬ LÝ NHIỀU FILE (TẤT CẢ TRONG THƯ MỤC)
# ============================================================

def xu_ly_thu_muc(thu_muc: str = None) -> list:
    """Xử lý tất cả file trong thư mục văn bản đến."""
    thu_muc = thu_muc or THU_MUC_VAN_BAN_DEN
    
    # Chuyển đường dẫn tương đối thành tuyệt đối
    duong_dan_thu_muc = Path(__file__).parent / thu_muc
    
    if not duong_dan_thu_muc.exists():
        print(f"❌ Thư mục không tồn tại: {duong_dan_thu_muc}")
        return []
    
    files = [
        str(duong_dan_thu_muc / f)
        for f in os.listdir(duong_dan_thu_muc)
        if f.lower().endswith((".docx", ".pdf"))
    ]
    
    if not files:
        print(f"📂 Không có file nào trong: {thu_muc}")
        return []
    
    print(f"\n🗂️  Tìm thấy {len(files)} file cần xử lý trong '{duong_dan_thu_muc}'")
    
    ket_qua_tat_ca = []
    for f in sorted(files):
        kq = xu_ly_mot_van_ban(f)
        ket_qua_tat_ca.append(kq)
    
    # Tổng kết
    thanh_cong = sum(1 for k in ket_qua_tat_ca if "van_ban_di" in k)
    co_bao_cao = sum(1 for k in ket_qua_tat_ca if "bao_cao" in k)
    
    print(f"\n{'='*60}")
    print(f"🎉 HOÀN THÀNH!")
    print(f"   ✅ Soạn thành công: {thanh_cong}/{len(files)} văn bản")
    print(f"   📊 Có báo cáo kèm: {co_bao_cao} văn bản")
    print(f"   📁 File lưu tại: {duong_dan_thu_muc.parent / 'van-ban-di'}/")
    print(f"{'='*60}")
    
    return ket_qua_tat_ca


# ============================================================
# CHẠY TRỰC TIẾP (test với 1 file)
# ============================================================
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Xử lý file cụ thể
        duong_dan = sys.argv[1]
        xu_ly_mot_van_ban(duong_dan)
    else:
        # Xử lý toàn bộ thư mục
        xu_ly_thu_muc()
