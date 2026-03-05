import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ResumeUpload({
  onParsed,
}: {
  onParsed: (text: string) => void | Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("resume", file);
    try {
      const res = await fetch("http://localhost:5000/api/parse-resume", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        let message = "Failed to parse resume";
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
        } catch {
          // ignore JSON parse error
        }
        throw new Error(message);
      }
      const data = await res.json();
      const text = data?.text ?? "";
      await Promise.resolve(onParsed(text));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="block w-full text-sm text-muted-foreground"
        disabled={uploading}
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        variant="outline"
      >
        {uploading ? "Uploading & generating questions…" : "Upload Resume"}
      </Button>
      {error && <div className="text-red-500 text-sm">{error}</div>}
    </div>
  );
}
