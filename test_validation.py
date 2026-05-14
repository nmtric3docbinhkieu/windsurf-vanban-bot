#!/usr/bin/env python3
"""Test validation layer"""

from renderer_engine import validate_blocks, parse_content_to_blocks

# Test 1: Valid blocks
print("=== TEST 1: Valid blocks ===")
valid_blocks = [
    {"type": "heading1", "text": "I. MỤC ĐÍCH", "meta": {"numbering": True, "indent": False}},
    {"type": "paragraph", "text": "Cụ thể hóa các nhiệm vụ", "meta": {"numbering": False, "indent": True}},
]
errors = validate_blocks(valid_blocks)
print(f"Errors: {errors}")
assert errors == [], "Valid blocks should have no errors"

# Test 2: Missing type field
print("\n=== TEST 2: Missing type field ===")
invalid_blocks_1 = [
    {"text": "Missing type", "meta": {"numbering": True}},
]
errors = validate_blocks(invalid_blocks_1)
print(f"Errors: {errors}")
assert len(errors) > 0, "Missing type should raise error"

# Test 3: Invalid type
print("\n=== TEST 3: Invalid type ===")
invalid_blocks_2 = [
    {"type": "invalid_type", "text": "Invalid", "meta": {}},
]
errors = validate_blocks(invalid_blocks_2)
print(f"Errors: {errors}")
assert len(errors) > 0, "Invalid type should raise error"

# Test 4: Missing metadata
print("\n=== TEST 4: Missing metadata ===")
invalid_blocks_3 = [
    {"type": "paragraph", "text": "No meta"},
]
errors = validate_blocks(invalid_blocks_3)
print(f"Errors: {errors}")
assert len(errors) > 0, "Missing metadata should raise error"

# Test 5: Parse and validate real content
print("\n=== TEST 5: Parse and validate real content ===")
content = """Căn cứ Chỉ thị số 03/CT-TTg ngày 30/01/2026;
Trường THPT Đốc Binh Kiều xây dựng Kế hoạch với nội dung:

I. MỤC ĐÍCH, YÊU CẦU
Cụ thể hóa các nhiệm vụ được UBND tỉnh và Sở GDĐT giao.

II. NHIỆM VỤ VÀ GIẢI PHÁP
1. Đối với Ban Giám hiệu
Nhận thức sâu sắc về công tác bảo đảm an toàn."""

blocks = parse_content_to_blocks(content)
print(f"Parsed {len(blocks)} blocks")
errors = validate_blocks(blocks)
print(f"Validation errors: {errors}")
assert errors == [], "Parsed blocks should be valid"

print("\n✅ All validation tests passed!")
