"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import mammoth from "mammoth";

interface WordPreviewProps {
  fileId: string;
  fileName: string;
}

export function WordPreview({ fileId, fileName }: WordPreviewProps) {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocument() {
      try {
        setLoading(true);
        setError(null);

        // 파일 다운로드
        const response = await fetch(`/api/files/${fileId}/preview`);
        if (!response.ok) throw new Error("Failed to fetch file");

        const arrayBuffer = await response.arrayBuffer();

        // mammoth로 HTML 변환
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setHtml(result.value);

        if (result.messages.length > 0) {
          console.warn("Mammoth warnings:", result.messages);
        }
      } catch (err) {
        console.error("Error loading Word document:", err);
        setError("문서를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }

    loadDocument();
  }, [fileId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">문서를 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="word-preview-container">
      <style jsx global>{`
        .word-preview-container {
          background: white;
          padding: 2rem;
          max-height: 70vh;
          overflow-y: auto;
        }
        .word-preview-container p {
          margin-bottom: 1em;
          line-height: 1.6;
        }
        .word-preview-container h1 {
          font-size: 2em;
          font-weight: bold;
          margin-bottom: 0.5em;
        }
        .word-preview-container h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-bottom: 0.5em;
        }
        .word-preview-container h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin-bottom: 0.5em;
        }
        .word-preview-container table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1em;
        }
        .word-preview-container td,
        .word-preview-container th {
          border: 1px solid #ddd;
          padding: 8px;
        }
        .word-preview-container ul,
        .word-preview-container ol {
          margin-left: 2em;
          margin-bottom: 1em;
        }
        .word-preview-container img {
          max-width: 100%;
          height: auto;
        }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
