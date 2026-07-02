# Cau truc du an vanban-bot

## Muc tieu
Sap xep lai du an theo nhom chuc nang de de theo doi, nhung van giu cac entry point chinh o thu muc goc de tranh gay workflow hien tai.

## Cac nhom thu muc

- `crawler/`: cac script quet VPDT, doi ten file, di chuyen file da doi ten, doc PDF.
- `integrations/`: cac ket noi thong bao va callback ben ngoai nhu Telegram, Zalo, callback server.
- `tools/`: cac script tien ich, script mot lan, script ho tro OCR/docx/chuan hoa.
- `tests/`: cac bai test, script kiem tra va du lieu test/phat sinh tu test.
- `docs/guides/`: huong dan cai dat, su dung, tich hop, van hanh.
- `docs/architecture/`: tai lieu kien truc va migration.
- `examples/`: vi du su dung renderer.
- `state/`: state nho gon phuc vu cloud check.

## File giu o goc `vanban-bot`

Day la cac file van con o goc de giu tuong thich va vi chung la entry point hoac tai nguyen dung truc tiep:

- `soan_van_ban_di.py`: workflow soan van ban di chinh.
- `render_ke_hoach_from_txt.py`: render ke hoach tu file txt.
- `render_ke_hoach.py`, `render_cong_van.py`, `renderer_engine.py`, `render_411.py`: lop renderer hien tai.
- `run_ke_hoach.py`, `run_ai_free_draft.py`: script chay thu/cong cu noi bo.
- `package.json`, `requirements.txt`: khai bao phu thuoc.
- `TEMPLATE.docx`, `TEMPLATE_CV.docx`, `style_config.json`: tai nguyen render dang duoc tham chieu truc tiep.
- `noi_dung_*.json`, `noi_dung_ke_hoach.txt`, `prompt_ke_hoach_web.txt`: du lieu mau/noi dung dau vao.
- `THONG TIN TRUONG THPT DOC BINH KIEU 2026.docx`: ho so truong duoc workflow doc truc tiep.

## Ghi chu

- Chua xoa bat ky file nao trong dot sap xep nay.
- Neu muon don tiep, uu tien buoc sau la tach them nhom `resources/` va `renderers/`, nhung can cap nhat them nhieu duong dan/runtime.
- Cac file nghi ngo du thua se duoc xem rieng va chi xoa sau khi co xac nhan.
