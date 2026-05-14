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


def dinh_dang_ngay_thang_hien_tai() -> str:
    """Trả về chuỗi ngày tháng để gắn vào template.

    Template đã chứa sẵn tiền tố "Đồng Tháp, ", nên ở đây chỉ trả về phần
    "ngày ... tháng ... năm ...".
    """
    hom_nay = datetime.now()
    return f"ngày {hom_nay.day} tháng {hom_nay.month} năm {hom_nay.year}"

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
Bạn là chuyên gia soạn thảo văn bản hành chính cho Trường THPT Đốc Bình Kiều.

Thông tin trường:
{THONG_TIN_TRUONG}

Yêu cầu: Đọc văn bản đến từ Sở GDĐT, soạn văn bản đi phù hợp với trường.
- Bám sát yêu cầu, chỉ lấy phần liên quan THPT
- Phù hợp quy mô: 13 lớp, 506 HS, vùng nông thôn
- Cô đọng, ngôn ngữ hành chính chuẩn
- Đánh số mục rõ ràng (I, II, III... hoặc 1, 2, 3...)
- KHÔNG điền ngày tháng cụ thể trong nội dung

Trả về JSON (không markdown).
"""

def goi_ai_soan_van_ban(noi_dung_van_ban_den: str) -> dict:
    """Gọi DeepSeek API để soạn văn bản đi, trả về dict."""
    
    if not DEEPSEEK_API_KEY:
        raise ValueError("DEEPSEEK_API_KEY không có trong biến môi trường")
    
    client = OpenAI(
        api_key=DEEPSEEK_API_KEY,
        base_url=DEEPSEEK_BASE_URL
    )
    
    prompt_user = f"""
Văn bản đến:
{noi_dung_van_ban_den}

Soạn văn bản đi và trả về JSON với cấu trúc:
{{
  "loai_van_ban": "cong_van|ke_hoach|bao_cao|to_trinh|quyet_dinh",
  "so_ky_hieu_goi_y": "/CV-THPTĐBK hoặc /KH-THPTĐBK",
  "trich_yeu": "tiêu đề ngắn gọn",
  "tom_tat_yeu_cau": "tóm tắt yêu cầu",
  "noi_nhan": "nơi nhận",
  "noi_dung": "nội dung văn bản đi (markdown format)"
}}
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
        print(f"🔍 AI trả về (đầu 300 ký tự): {raw[:300]}")
        
        return _parse_json_response(raw)
    
    except Exception as e:
        print(f"❌ Lỗi gọi DeepSeek API: {e}")
        raise


def _parse_json_response(text: str) -> dict:
    """Parse JSON response từ AI thành dict."""
    # Tìm JSON trong response (có thể có text trước/sau)
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    
    if json_match:
        try:
            json_str = json_match.group(0)
            result = json.loads(json_str)
            return result
        except json.JSONDecodeError as e:
            print(f"⚠️  Lỗi parse JSON: {e}")
            print(f"   JSON nhận được: {json_str[:200]}")
            # Fallback: trả về dict rỗng
            return {
                'loai_van_ban': 'cong_van',
                'so_ky_hieu_goi_y': '/CV-THPTĐBK',
                'trich_yeu': 'Văn bản không xác định',
                'tom_tat_yeu_cau': '',
                'noi_nhan': 'Sở GDĐT Đồng Tháp',
                'noi_dung': 'Lỗi parse response từ AI'
            }
    else:
        print(f"⚠️  Không tìm thấy JSON trong response")
        print(f"   Response: {text[:200]}")
        return {
            'loai_van_ban': 'cong_van',
            'so_ky_hieu_goi_y': '/CV-THPTĐBK',
            'trich_yeu': 'Văn bản không xác định',
            'tom_tat_yeu_cau': '',
            'noi_nhan': 'Sở GDĐT Đồng Tháp',
            'noi_dung': 'Không nhận được response từ AI'
        }


# ============================================================
# BƯỚC 3: TẠO FILE WORD THEO ĐÚNG THỂ THỨC
# ============================================================

def tao_van_ban_docx(du_lieu: dict, ten_file_goc: str) -> str:
    """
    Tạo file .docx văn bản đi theo thể thức hành chính.
    
    Orchestration layer: Chuẩn bị metadata và gọi renderer_engine.
    Không làm styling - đó là trách nhiệm của renderer_engine.
    """
    from renderer_engine import render_document, parse_content_to_blocks, clean_content
    
    # Tạo thư mục van-ban-di nếu chưa có
    duong_dan_thu_muc = Path(__file__).parent / THU_MUC_VAN_BAN_DI
    duong_dan_thu_muc.mkdir(parents=True, exist_ok=True)
    
    # Chuẩn bị metadata từ AI output
    loai = du_lieu.get("loai_van_ban", "cong_van")
    loai_key = str(loai).strip().lower()
    loai_hien_thi = {
        "cong_van": "CÔNG VĂN",
        "ke_hoach": "KẾ HOẠCH",
        "bao_cao": "BÁO CÁO",
        "to_trinh": "TỜ TRÌNH",
        "quyet_dinh": "QUYẾT ĐỊNH",
    }.get(loai_key, str(loai).strip().upper() if loai else "KẾ HOẠCH")
    so_ky_hieu = du_lieu.get("so_ky_hieu_goi_y", "/CV-THPTĐBK")
    trich_yeu = du_lieu.get("trich_yeu", "")
    noi_dung  = du_lieu.get("noi_dung", "")
    noi_nhan  = du_lieu.get("noi_nhan", "")
    
    # Parse nội dung thành structured blocks (AI Parser layer)
    content_clean = clean_content(noi_dung)
    blocks = parse_content_to_blocks(content_clean)
    
    # Chuẩn bị metadata cho renderer
    metadata = {
        'loai_van_ban': loai_hien_thi,
        'so_ky_hieu': so_ky_hieu,
        'ngay_thang': du_lieu.get('ngay_thang', dinh_dang_ngay_thang_hien_tai()),
        'trich_yeu': trich_yeu,
        'noi_nhan': noi_nhan,
        'nguoi_ky': 'Nguyễn Minh Trí',  # Có thể lấy từ du_lieu
        'chuc_vu_ky': 'KT. HIỆU TRƯỞNG\nPHÓ HIỆU TRƯỞNG'  # Có thể lấy từ du_lieu
    }
    
    # Lấy template path
    template_path = Path(__file__).parent / "TEMPLATE.docx"
    
    # Đặt tên file - thêm timestamp để tránh trùng
    from datetime import datetime
    timestamp = datetime.now().strftime("%H%M%S")
    ten_file_cu = Path(ten_file_goc).stem
    ten_file_moi = f"VBDi_{ten_file_cu}_{loai}_{timestamp}.docx"
    duong_dan_luu = duong_dan_thu_muc / ten_file_moi
    
    # Render document (Renderer Engine layer)
    render_document(
        template_path=template_path,
        output_path=duong_dan_luu,
        metadata=metadata,
        blocks=blocks
    )
    
    return str(duong_dan_luu)


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
