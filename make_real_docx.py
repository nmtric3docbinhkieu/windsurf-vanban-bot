import os
import zipfile
from pathlib import Path

root = Path(r'd:\VIET-PHAN-MEM\VANBAN-BOT')
out_dir = root / 'van-ban-di'
out_dir.mkdir(parents=True, exist_ok=True)
out_file = out_dir / 'KH_TUAN_LE_HOC_TAP_CONG_DAN_DAU_NAM_2026_2027.docx'

content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
'''

rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
'''

core = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>KẾ HOẠCH</dc:title>
  <dc:creator>VANBAN-BOT</dc:creator>
  <cp:lastModifiedBy>VANBAN-BOT</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-08-17T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-08-17T00:00:00Z</dcterms:modified>
</cp:coreProperties>
'''

app = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
</Properties>
'''

document = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>SỞ GIÁO DỤC VÀ ĐÀO TẠO</w:t></w:r></w:p>
    <w:p><w:r><w:t>TRƯỜNG THPT ĐỐC BINH KIỀU</w:t></w:r></w:p>
    <w:p><w:r><w:t>KẾ HOẠCH</w:t></w:r></w:p>
    <w:p><w:r><w:t>Tổ chức sinh hoạt công dân đầu năm học 2026 - 2027</w:t></w:r></w:p>
    <w:p><w:r><w:t>Căn cứ Kế hoạch số 935/KH-SGDĐT ngày 31 tháng 7 năm 2026 của Sở Giáo dục và Đào tạo Đồng Tháp;</w:t></w:r></w:p>
    <w:p><w:r><w:t>Trường THPT Đốc Binh Kiều ban hành Kế hoạch tổ chức sinh hoạt công dân đầu năm học 2026 - 2027, cụ thể như sau:</w:t></w:r></w:p>
    <w:p><w:r><w:t>I. MỤC ĐÍCH, YÊU CẦU</w:t></w:r></w:p>
    <w:p><w:r><w:t>1. Mục đích</w:t></w:r></w:p>
    <w:p><w:r><w:t>a) Giáo dục lý tưởng cách mạng, đạo đức, lối sống văn hóa, trách nhiệm công dân, ý thức chấp hành pháp luật cho học sinh.</w:t></w:r></w:p>
    <w:p><w:r><w:t>III. TỔ CHỨC THỰC HIỆN</w:t></w:r></w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
'''

styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
</w:styles>
'''

with zipfile.ZipFile(out_file, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', content_types)
    z.writestr('_rels/.rels', rels)
    z.writestr('docProps/core.xml', core)
    z.writestr('docProps/app.xml', app)
    z.writestr('word/document.xml', document)
    z.writestr('word/styles.xml', styles)
    z.writestr('word/_rels/document.xml.rels', '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>
''')

print(f'CREATED={out_file}')
print(f'EXISTS={out_file.exists()}')
print(f'SIZE={out_file.stat().st_size if out_file.exists() else 0}')
