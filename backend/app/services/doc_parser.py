import os
import re
from pathlib import Path
from typing import Dict, List, Any, Optional

try:
    import fitz # PyMuPDF
except ImportError:
    fitz = None

try:
    import docx
except ImportError:
    docx = None

try:
    from pptx import Presentation
except ImportError:
    Presentation = None

try:
    import openpyxl
except ImportError:
    openpyxl = None

class ParsedChunk:
    def __init__(self, page_number: int, content: str, heading: Optional[str] = None, chapter: Optional[str] = None):
        self.page_number = page_number
        self.content = content.strip()
        self.heading = heading or ""
        self.chapter = chapter or ""

class DocumentParserService:
    @staticmethod
    def extract_document(file_path: str, filename: str) -> Dict[str, Any]:
        """
        Parses multi-format documents and returns structured pages and chunks with exact page numbering.
        """
        ext = Path(filename).suffix.lower()
        if ext == ".pdf":
            return DocumentParserService._parse_pdf(file_path)
        elif ext in [".docx", ".doc"]:
            return DocumentParserService._parse_docx(file_path)
        elif ext in [".pptx", ".ppt"]:
            return DocumentParserService._parse_pptx(file_path)
        elif ext in [".xlsx", ".xls", ".csv"]:
            return DocumentParserService._parse_spreadsheet(file_path, ext)
        elif ext in [".txt", ".md"]:
            return DocumentParserService._parse_text(file_path)
        else:
            return DocumentParserService._parse_text(file_path)

    @staticmethod
    def _parse_pdf(file_path: str) -> Dict[str, Any]:
        if not fitz:
            raise RuntimeError("PyMuPDF is not installed")
        
        doc = fitz.open(file_path)
        page_count = len(doc)
        pages_data = []
        chunks: List[ParsedChunk] = []
        
        current_chapter = "General"
        
        for page_idx in range(page_count):
            page_num = page_idx + 1
            page = doc[page_idx]
            text = page.get_text("text")
            
            # Simple heuristic to extract headings and chapters
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            heading = ""
            for line in lines[:3]:
                if re.match(r'^(Chapter|Section|\d+\.|\bUNIT\b)', line, re.IGNORECASE) or (len(line) < 60 and line.isupper()):
                    heading = line
                    if "chapter" in line.lower():
                        current_chapter = line
                    break
            
            pages_data.append({
                "page_number": page_num,
                "text": text,
                "heading": heading
            })
            
            # Semantic chunking inside the page if text is long, keeping page provenance
            paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 30]
            if not paragraphs:
                paragraphs = [text.strip()] if text.strip() else []
                
            for para in paragraphs:
                chunks.append(ParsedChunk(
                    page_number=page_num,
                    content=para,
                    heading=heading,
                    chapter=current_chapter
                ))
                
        doc.close()
        
        # Build quick summary
        summary = f"PDF document containing {page_count} pages."
        if pages_data and pages_data[0]["heading"]:
            summary += f" Begins with '{pages_data[0]['heading']}'."
            
        return {
            "page_count": page_count,
            "pages": pages_data,
            "chunks": chunks,
            "summary": summary
        }

    @staticmethod
    def _parse_docx(file_path: str) -> Dict[str, Any]:
        if not docx:
            raise RuntimeError("python-docx is not installed")
            
        doc = docx.Document(file_path)
        chunks: List[ParsedChunk] = []
        pages_data = []
        
        current_heading = "Overview"
        current_chapter = "General"
        page_estimate = 1
        word_count = 0
        
        full_text = []
        current_section_paras = []
        
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
                
            word_count += len(text.split())
            page_estimate = max(1, (word_count // 350) + 1)
            
            if para.style and "Heading" in para.style.name:
                current_heading = text
                if "1" in para.style.name:
                    current_chapter = text
            else:
                chunks.append(ParsedChunk(
                    page_number=page_estimate,
                    content=text,
                    heading=current_heading,
                    chapter=current_chapter
                ))
                full_text.append(text)
                
        return {
            "page_count": page_estimate,
            "pages": [{"page_number": 1, "text": "\n".join(full_text[:10]), "heading": current_heading}],
            "chunks": chunks,
            "summary": f"DOCX document with approximately {page_estimate} pages."
        }

    @staticmethod
    def _parse_pptx(file_path: str) -> Dict[str, Any]:
        if not Presentation:
            raise RuntimeError("python-pptx is not installed")
            
        prs = Presentation(file_path)
        slide_count = len(prs.slides)
        chunks: List[ParsedChunk] = []
        pages_data = []
        
        for idx, slide in enumerate(prs.slides):
            slide_num = idx + 1
            slide_text = []
            title = f"Slide {slide_num}"
            
            for shape in slide.shapes:
                if shape.has_text_frame:
                    for paragraph in shape.text_frame.paragraphs:
                        txt = paragraph.text.strip()
                        if txt:
                            slide_text.append(txt)
                            
            if slide_text:
                title = slide_text[0]
                content = "\n".join(slide_text)
                chunks.append(ParsedChunk(
                    page_number=slide_num,
                    content=content,
                    heading=title,
                    chapter=f"Slide {slide_num}"
                ))
                pages_data.append({
                    "page_number": slide_num,
                    "text": content,
                    "heading": title
                })
                
        return {
            "page_count": slide_count,
            "pages": pages_data,
            "chunks": chunks,
            "summary": f"Presentation slide deck with {slide_count} slides."
        }

    @staticmethod
    def _parse_spreadsheet(file_path: str, ext: str) -> Dict[str, Any]:
        chunks: List[ParsedChunk] = []
        if ext == ".csv":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            chunks.append(ParsedChunk(page_number=1, content=content[:4000], heading="Data Table"))
            return {"page_count": 1, "pages": [{"page_number": 1, "text": content[:1000], "heading": "CSV"}], "chunks": chunks, "summary": "Tabular CSV dataset."}
            
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet_names = wb.sheetnames
        full_text = []
        for idx, name in enumerate(sheet_names):
            sheet = wb[name]
            rows = []
            for r in list(sheet.iter_rows(values_only=True))[:50]:
                row_str = " | ".join([str(c) for c in r if c is not None])
                if row_str:
                    rows.append(row_str)
            text = "\n".join(rows)
            chunks.append(ParsedChunk(page_number=idx+1, content=text, heading=f"Sheet: {name}"))
            full_text.append(text)
            
        return {
            "page_count": len(sheet_names),
            "pages": [{"page_number": i+1, "text": full_text[i][:500], "heading": sheet_names[i]} for i in range(len(sheet_names))],
            "chunks": chunks,
            "summary": f"Excel workbook with sheets: {', '.join(sheet_names)}."
        }

    @staticmethod
    def _parse_text(file_path: str) -> Dict[str, Any]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
            
        sections = re.split(r'\n(?=#{1,3}\s+)', text)
        chunks: List[ParsedChunk] = []
        
        for idx, sec in enumerate(sections):
            sec = sec.strip()
            if not sec:
                continue
            lines = sec.split("\n")
            heading = lines[0].lstrip("#").strip() if lines[0].startswith("#") else f"Section {idx+1}"
            chunks.append(ParsedChunk(
                page_number=idx + 1,
                content=sec,
                heading=heading,
                chapter=heading
            ))
            
        return {
            "page_count": max(1, len(chunks)),
            "pages": [{"page_number": i+1, "text": c.content[:300], "heading": c.heading} for i, c in enumerate(chunks)],
            "chunks": chunks,
            "summary": f"Text / Markdown notes document with {len(chunks)} sections."
        }
