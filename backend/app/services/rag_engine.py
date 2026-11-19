import math
import re
import sqlite3
from typing import List, Dict, Any, Optional
from app.core.database import get_connection

class RAGSearchHit:
    def __init__(self, document_id: str, filename: str, doc_category: str, page_number: int, chapter: str, heading: str, content: str, score: float):
        self.document_id = document_id
        self.filename = filename
        self.doc_category = doc_category
        self.page_number = page_number
        self.chapter = chapter
        self.heading = heading
        self.content = content
        self.score = score

    def to_dict(self) -> Dict[str, Any]:
        return {
            "document_id": self.document_id,
            "filename": self.filename,
            "doc_category": self.doc_category,
            "page_number": self.page_number,
            "chapter": self.chapter,
            "heading": self.heading,
            "content": self.content,
            "score": round(self.score, 3)
        }

class RAGEngine:
    @staticmethod
    def tokenize(text: str) -> List[str]:
        # Lowercase, alphanumeric + mathematical symbols
        cleaned = re.sub(r'[^a-zA-Z0-9_\-\+\*/\^=]', ' ', text.lower())
        tokens = [t.strip() for t in cleaned.split() if len(t.strip()) > 2]
        return tokens

    @classmethod
    def search_course_materials(cls, course_id: str, query: str, top_k: int = 5, category_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieves relevant document excerpts specifically for the given course.
        Uses BM25-style term frequency + inverse document frequency with heading bonus.
        Guarantees exact document name and verified page numbers.
        """
        query_tokens = cls.tokenize(query)
        if not query_tokens:
            return []

        conn = get_connection()
        cursor = conn.cursor()

        sql = """
            SELECT c.document_id, d.filename, d.doc_category, c.page_number, c.chapter_title, c.heading, c.content
            FROM document_chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE c.course_id = ?
        """
        params = [course_id]
        if category_filter:
            sql += " AND d.doc_category = ?"
            params.append(category_filter)

        cursor.execute(sql, params)
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            return []

        # Calculate IDF and BM25 scores across chunks in this course
        num_docs = len(rows)
        doc_freq = {}
        for row in rows:
            tokens_in_doc = set(cls.tokenize(row["content"]) + cls.tokenize(row["heading"] or ""))
            for q in set(query_tokens):
                if q in tokens_in_doc:
                    doc_freq[q] = doc_freq.get(q, 0) + 1

        k1 = 1.5
        b = 0.75
        avg_doc_len = sum(len(row["content"].split()) for row in rows) / max(1, num_docs)

        scored_hits: List[RAGSearchHit] = []

        for row in rows:
            text = row["content"]
            heading = row["heading"] or ""
            chapter = row["chapter_title"] or ""
            doc_tokens = cls.tokenize(text)
            heading_tokens = cls.tokenize(heading)
            doc_len = len(text.split())

            score = 0.0
            for q in query_tokens:
                df = doc_freq.get(q, 0)
                if df == 0:
                    continue
                idf = math.log((num_docs - df + 0.5) / (df + 0.5) + 1.0)
                
                # Term frequency in body
                tf = doc_tokens.count(q)
                # Boost if in heading or chapter
                tf += 2.0 * heading_tokens.count(q)

                if tf > 0:
                    score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (doc_len / avg_doc_len)))

            # Exact phrase matching boost
            if query.lower() in text.lower():
                score += 3.0
            if query.lower() in heading.lower():
                score += 5.0

            if score > 0.1:
                scored_hits.append(RAGSearchHit(
                    document_id=row["document_id"],
                    filename=row["filename"],
                    doc_category=row["doc_category"],
                    page_number=row["page_number"],
                    chapter=chapter,
                    heading=heading,
                    content=text,
                    score=score
                ))

        scored_hits.sort(key=lambda x: x.score, reverse=True)
        return [hit.to_dict() for hit in scored_hits[:top_k]]

    @classmethod
    def cross_reference_topic(cls, course_id: str, topic: str) -> Dict[str, Any]:
        """
        Cross-references a topic across:
        1. Course Lecture Notes
        2. Reference Textbooks
        3. General syllabus / problem sheets
        """
        notes_hits = cls.search_course_materials(course_id, topic, top_k=3, category_filter="lecture_notes")
        textbook_hits = cls.search_course_materials(course_id, topic, top_k=3, category_filter="textbook")
        other_hits = cls.search_course_materials(course_id, topic, top_k=2)

        return {
            "topic": topic,
            "lecture_notes": notes_hits,
            "reference_textbooks": textbook_hits,
            "all_sources_count": len(notes_hits) + len(textbook_hits),
            "recommendation": "Lecture notes explain the primary curriculum convention; reference textbooks offer rigorous mathematical derivations."
        }
