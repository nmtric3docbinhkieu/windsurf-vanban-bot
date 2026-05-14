# Migration Notes

## Version History

### v1.0 - Renderer Architecture (2026-05-10)

**Major architectural refactoring from script automation to document rendering platform.**

#### Changes

1. **New File Structure**
   - Created `renderer_engine.py` - Independent rendering module
   - Created `style_config.json` - Externalized styling configuration
   - Created `README_RENDERER.md` - Architecture documentation
   - Created `examples/` - Example usage directory
   - Created `docs/architecture/` - Architecture documentation

2. **Block Schema v1.0**
   - Introduced standardized block schema with metadata:
     ```json
     {
       "type": "heading1|heading2|heading3|paragraph|bullet",
       "text": "content",
       "meta": {
         "numbering": true/false,
         "indent": true/false
       }
     }
     ```
   - Schema version frozen for backward compatibility

3. **Architecture Layers**
   - **AI Parser Layer**: `parse_content_to_blocks()` - Converts text to structured blocks
   - **Validation Layer**: `validate_blocks()` - Validates block schema
   - **Renderer Engine**: `render_document()` - Renders blocks to DOCX
   - **Style Config**: JSON-based styling rules
   - **Orchestration Layer**: `soan_van_ban_di.py` - Workflow coordination

4. **API Changes**
   - Old: `tao_van_ban_docx()` - Manual DOCX generation with inline styling
   - New: `render_document(template_path, output_path, metadata, blocks)` - Clean API

5. **Removed Code**
   - Deleted ~300 lines of manual DOCX generation code from `soan_van_ban_di.py`
   - Removed inline styling logic (set_font, add_para, _viet_noi_dung_markdown)
   - Removed table generation code (now handled by template)

#### Breaking Changes

- `tao_van_ban_docx()` signature unchanged internally, but now uses renderer_engine
- Old styling functions removed from `soan_van_ban_di.py`
- `_viet_noi_dung_markdown()` function removed (functionality moved to renderer_engine)

#### Migration Guide

**For existing code using old API:**
```python
# Old way (removed)
doc = Document()
set_font(run, bold=True, size=14)
add_para(text, align=WD_ALIGN_PARAGRAPH.CENTER)

# New way
blocks = parse_content_to_blocks(content)
render_document(template_path, output_path, metadata, blocks)
```

**For custom styling:**
```python
# Old way (inline)
set_font(run, bold=True, size=14)

# New way (config)
# Edit style_config.json
{
  "styles": {
    "heading1": {
      "bold": true,
      "font_size": 14
    }
  }
}
```

#### Benefits

- **Separation of Concerns**: AI content separate from presentation
- **Configurability**: Style changes via JSON, no code changes needed
- **Maintainability**: Centralized styling logic
- **Extensibility**: Easy to add new block types via registry pattern
- **Validation**: Production-ready schema validation

#### Future Compatibility

- Block schema v1.0 frozen - backward compatible
- New block types can be added without breaking existing ones
- Style config can evolve independently

---

## Pre-v1.0 (Script Automation Era)

**Characteristics:**
- Monolithic `tao_van_ban_docx()` function
- Inline styling logic
- Hardcoded formatting rules
- No separation between content and presentation
- ~400 lines of DOCX manipulation code

**Limitations:**
- Difficult to maintain
- Hard to change styles
- No reusability
- Tight coupling between AI and DOCX
