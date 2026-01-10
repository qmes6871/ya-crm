"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Loader2, Paperclip, X, FileText, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Attachment {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
}

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  attachments: Attachment[];
}

interface ProjectCommunicationProps {
  project: {
    id: string;
    comments: Comment[];
  };
}

export function ProjectCommunication({ project }: ProjectCommunicationProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("content", content);
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`/api/projects/${project.id}/comments`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to add comment");

      setContent("");
      setFiles([]);
      router.refresh();
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("코멘트 추가에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("이 코멘트를 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/projects/${project.id}/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete comment");

      router.refresh();
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("코멘트 삭제에 실패했습니다.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          커뮤니케이션
        </CardTitle>
        <CardDescription>프로젝트 관련 의견을 나눕니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="코멘트를 입력하세요..."
            rows={3}
          />
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm"
                >
                  <FileText className="h-4 w-4" />
                  <span className="max-w-32 truncate">{file.name}</span>
                  <button onClick={() => removeFile(index)}>
                    <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="mr-2 h-4 w-4" />
                파일 첨부
              </Button>
            </div>
            <Button onClick={handleSubmit} disabled={isLoading || (!content.trim() && files.length === 0)}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  등록 중...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  등록
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="border-t pt-6 space-y-6">
          {project.comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">코멘트가 없습니다</h3>
              <p className="mt-2 text-gray-500">첫 번째 코멘트를 남겨보세요.</p>
            </div>
          ) : (
            project.comments.map((comment) => (
              <div key={comment.id} className="flex gap-4">
                <Avatar>
                  <AvatarFallback>
                    {comment.user.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{comment.user.name}</span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(comment.createdAt), "yyyy.MM.dd HH:mm", {
                          locale: ko,
                        })}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  {comment.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {comment.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={`/api/files/${attachment.id}/download`}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-50 border rounded-lg hover:bg-gray-100 text-sm"
                        >
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="max-w-40 truncate">{attachment.fileName}</span>
                          <span className="text-gray-400">
                            ({formatFileSize(attachment.fileSize)})
                          </span>
                          <Download className="h-4 w-4 text-gray-500" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
