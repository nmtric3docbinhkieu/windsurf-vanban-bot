# Document Rendering Platform Architecture

## Overview

This system is a **Document Rendering Platform** that transforms AI-generated content into formatted Word documents through a structured rendering pipeline.

**Architecture Pattern**: Compiler Architecture
- **Source**: AI output (text)
- **AST**: Structured blocks (semantic layer)
- **Compiler**: Renderer engine
- **Target**: DOCX document

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AI Layer                              │
│  (Generates semantic content, knows nothing about DOCX)      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Parser Layer                            │
│  parse_content_to_blocks() → structured blocks              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Validation Layer                           │
│  validate_blocks() → schema validation                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Orchestration Layer                          │
│  soan_van_ban_di.py → workflow coordination                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                Renderer Engine Layer                         │
│  render_document() → DOCX rendering                         │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
┌────────────┐ ┌──────────┐ ┌─────────────┐
│ Style Config│ │ Template │ │ Block Reg  │
│   (JSON)   │ │ (.docx)  │ │  Pattern   │
└────────────┘ └──────────┘ └─────────────┘
         │           │           │
         └───────────┴───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    DOCX Output                              │
└─────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. AI Layer
**Responsibility**: Generate semantic content only
- Output: Plain text with structure
- No knowledge of DOCX formatting
- No knowledge of styling rules

### 2. AI Parser Layer
**File**: `renderer_engine.py`
**Function**: `parse_content_to_blocks()`
**Responsibility**: Convert text to structured blocks
- Input: Plain text from AI
- Output: List of structured blocks with metadata
- Schema: Block Schema v1.0

### 3. Validation Layer
**File**: `renderer_engine.py`
**Function**: `validate_blocks()`
**Responsibility**: Ensure blocks conform to schema
- Checks: Required fields, valid types, metadata structure
- Fails fast: Raises error before rendering
- Production requirement: Prevents crashes from malformed AI output

### 4. Orchestration Layer
**File**: `soan_van_ban_di.py`
**Responsibility**: Workflow coordination
- Calls AI API
- Calls parser
- Calls renderer
- Handles file I/O
- NO styling logic
- NO DOCX manipulation

### 5. Renderer Engine Layer
**File**: `renderer_engine.py`
**Function**: `render_document()`
**Responsibility**: Transform blocks to DOCX
- Uses docxtpl for metadata placeholders
- Uses python-docx for paragraph rendering
- Applies styling from config
- Preserves template header/footer

### 6. Style Config
**File**: `style_config.json`
**Responsibility**: Define styling rules
- Font settings
- Paragraph formatting
- Block-specific styles
- Configurable without code changes

### 7. Template
**File**: `TEMPLATE.docx`
**Responsibility**: Visual branding and layout
- Header/footer
- Logo
- Table structure
- Placeholders for metadata

### 8. Block Registry
**File**: `renderer_engine.py`
**Pattern**: Registry pattern
**Responsibility**: Map block types to renderers
- Avoids if/else spaghetti
- Easy to extend with new block types
- Future: table, quote, decision box, etc.

## Block Schema v1.0

### Schema Definition

```json
{
  "type": "heading1|heading2|heading3|paragraph|bullet",
  "text": "content string",
  "meta": {
    "numbering": true/false,
    "indent": true/false
  }
}
```

### Block Types

| Type      | Description                     | Numbering | Indent |
| --------- | ------------------------------- | --------- | ------ |
| heading1  | Roman numerals (I, II, III)    | true      | false  |
| heading2  | Arabic numbers (1, 2, 3)       | true      | true   |
| heading3  | Letters (a, b, c)              | true      | true   |
| paragraph | Normal text                    | false     | true   |
| bullet    | Bullet points                  | true      | true   |

### Metadata Fields

- `numbering`: Whether this block should be numbered
- `indent`: Whether this block should have first-line indent
- **Future**: level, style_class, page_break, etc.

## Rendering Flow

### Step-by-Step

1. **AI Generation**
   - AI generates plain text content
   - No formatting knowledge required

2. **Content Cleaning**
   - `clean_content()` removes headers, footers
   - Removes document type labels
   - Prepares text for parsing

3. **Block Parsing**
   - `parse_content_to_blocks()` converts text to blocks
   - Identifies block types by regex patterns
   - Adds metadata to each block

4. **Validation**
   - `validate_blocks()` checks schema compliance
   - Raises error if invalid
   - Prevents renderer crashes

5. **Metadata Preparation**
   - Orchestration layer prepares metadata dict
   - Includes: loai_van_ban, so_ky_hieu, ngay_thang, etc.

6. **Template Rendering**
   - docxtpl renders metadata placeholders
   - Creates temporary file
   - Preserves template structure

7. **Anchor Finding**
   - Locates `{{noi_dung}}` placeholder
   - Saves footer paragraphs
   - Removes anchor and content

8. **Block Rendering**
   - Iterates through blocks
   - Creates Word paragraphs
   - Applies styling from config
   - Uses block registry pattern

9. **Footer Restoration**
   - Re-adds saved footer paragraphs
   - Preserves styling
   - Maintains template structure

10. **Final Output**
    - Saves DOCX file
    - Cleans up temporary files

## Style Configuration

### Structure

```json
{
  "styles": {
    "heading1": {
      "bold": true,
      "font_size": 14,
      "indent_cm": 0,
      "spacing_before": 6,
      "spacing_after": 3,
      "line_spacing": 18
    },
    "paragraph": {
      "bold": false,
      "font_size": 13,
      "indent_cm": 1.25
    }
  },
  "font": {
    "name": "Times New Roman",
    "vietnamese_support": true
  },
  "paragraph": {
    "alignment": "justify"
  }
}
```

### Benefits

- **Configurable**: Change styles without code changes
- **Multi-template**: Different configs for different document types
- **Versioning**: Track style changes separately from code
- **Themeable**: Easy to create color schemes

## Design Patterns

### 1. Registry Pattern
**Location**: Block renderers
**Purpose**: Avoid if/else spaghetti
**Implementation**: `BLOCK_RENDERERS` dict

### 2. Strategy Pattern
**Location**: Style application
**Purpose**: Different styling strategies per block type
**Implementation**: `set_paragraph_format()` with block_type parameter

### 3. Template Method Pattern
**Location**: `render_document()`
**Purpose**: Define rendering skeleton, override specific steps
**Implementation**: Main flow with pluggable steps

### 4. Configuration Pattern
**Location**: Style config
**Purpose**: Externalize configuration
**Implementation**: JSON-based config

## Future Extensibility

### Planned Block Types

- `table`: Structured tables with headers/rows
- `quote`: Quoted text blocks
- `decision`: Decision boxes
- `checklist`: Interactive checklists
- `signature`: Signature blocks
- `appendix`: Appendix sections

### Planned Features

- **Real Numbering**: Word XML numbering definitions
- **Page Breaks**: Control page breaks via metadata
- **TOC Generation**: Automatic table of contents
- **Multi-column**: Multi-column layouts
- **Section Breaks**: Document sections
- **Cross-references**: Internal document references

### Multi-Output Support

Current architecture supports future expansion to:
- PDF output
- HTML output
- Markdown output
- Email body
All from the same semantic block layer.

## Quality Attributes

### Maintainability
- Separation of concerns
- Clear layer boundaries
- Centralized styling
- Extensible block registry

### Testability
- Each layer can be tested independently
- Validation layer catches errors early
- Snapshot examples for regression testing

### Configurability
- Style externalized to JSON
- Template-based layout
- No hardcoded formatting

### Extensibility
- New block types via registry
- New output formats via new renderers
- New styles via config

### Performance
- Single-pass rendering
- No unnecessary parsing
- Efficient template reuse

## Comparison with Similar Systems

| System        | Pattern                     | Similar To               |
| ------------- | --------------------------- | ------------------------ |
| React         | Virtual DOM → Renderer     | Our Blocks → DOCX       |
| Flutter       | Widget Tree → Render Tree  | Our Blocks → DOCX       |
| LaTeX         | AST → PDF                  | Our Blocks → DOCX       |
| Browser       | DOM → Layout Engine        | Our Blocks → DOCX       |
| This System   | Blocks → DOCX              | All of the above        |

## Key Architectural Decisions

### 1. Semantic Intermediate Layer
**Decision**: Use structured blocks as intermediate representation
**Rationale**: Separates AI content from presentation
**Benefit**: AI doesn't need to know DOCX specifics

### 2. Externalized Configuration
**Decision**: Move styling to JSON config
**Rationale**: Configurability without code changes
**Benefit**: Easy theming, multi-template support

### 3. Validation Layer
**Decision**: Validate blocks before rendering
**Rationale**: Production systems must be robust
**Benefit**: Fail fast, prevent crashes

### 4. Registry Pattern
**Decision**: Use registry for block renderers
**Rationale**: Avoid if/else spaghetti
**Benefit**: Easy to extend with new block types

### 5. Template-Based Layout
**Decision**: Use DOCX template for header/footer
**Rationale**: Reuse existing document designs
**Benefit**: Professional appearance, easy branding

## Migration Path

See `MIGRATION.md` for detailed migration notes from pre-v1.0 to v1.0.

## Version History

- **v1.0** (2026-05-10): Initial renderer architecture
  - Block Schema v1.0 frozen
  - Validation layer added
  - Block registry pattern implemented
  - Style externalization completed
