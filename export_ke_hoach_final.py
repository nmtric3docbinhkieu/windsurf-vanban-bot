from pathlib import Path

from render_ke_hoach import render_document
from renderer_engine import clean_content, parse_content_to_blocks

root = Path(__file__).resolve().parent
md_path = root / 'VAN-BAN-CAN-CHINH-THE-THUC' / 'KH TUAN LE HOC TAP CONG DAN DAU NAM 2026-2027.md'
output_dir = root / 'van-ban-di'
output_dir.mkdir(parents=True, exist_ok=True)
output_path = output_dir / 'KH_TUAN_LE_HOC_TAP_CONG_DAN_DAU_NAM_2026_2027.docx'
template_path = root / 'TEMPLATE.docx'

text = md_path.read_text(encoding='utf-8')
lines = []
for raw in text.splitlines():
    s = raw.strip()
    if not s:
        lines.append('')
        continue

    s = s.replace('**', '').replace('*', '').replace('_', '').replace('---', '').replace('```', '')
    if s.startswith('# '):
        s = s[2:]
    elif s.startswith('## '):
        s = s[3:]
    elif s.startswith('### '):
        s = s[4:]
    elif s.startswith('#### '):
        s = s[5:]

    if s.startswith('- '):
        s = s[2:]

    if s.startswith('|'):
        s = s.strip('|').replace(' | ', '; ').replace('|', '; ')

    lines.append(s)

content = '\n'.join(lines).strip()
content_clean = clean_content(content)
blocks = parse_content_to_blocks(content_clean)

metadata = {
    'loai_van_ban': 'KẾ HOẠCH',
    'so_ky_hieu': '/KH-THPTĐBK',
    'ngay_thang': 'Đốc Binh Kiều, ngày 17 tháng 8 năm 2026',
    'trich_yeu': 'Tổ chức sinh hoạt công dân đầu năm học 2026 - 2027',
    'noi_nhan': 'Sở GDĐT Đồng Tháp (để b/c); Các Phó Hiệu trưởng (để chỉ đạo); Đoàn TNCS Hồ Chí Minh; Tổ Tư vấn tâm lý; Giáo viên chủ nhiệm các lớp; Lưu: VT.',
    'nguoi_ky': 'Nguyễn Minh Trí',
    'chuc_vu_ky': 'KT. HIỆU TRƯỞNG\nPHÓ HIỆU TRƯỞNG',
}

render_document(template_path, output_path, metadata, blocks)
print(f'OUTPUT={output_path}')
print(f'BLOCKS={len(blocks)}')
