import { useEffect, useState } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { API_BASE } from "../../api/client";
export function EvidenceGallery({ ids }: { ids: string[] }) {
  const { token } = useAuth();
  const [images, setImages] = useState<string[]>([]),
    [error, setError] = useState("");
  const key = ids.join(",");
  useEffect(() => {
    const controller = new AbortController(),
      urls: string[] = [];
    setImages([]);
    setError("");
    void (async () => {
      try {
        for (const id of ids) {
          const r = await fetch(
            `${API_BASE}/evidence/${encodeURIComponent(id)}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
            },
          );
          if (!r.ok) throw new Error("Evidence could not be loaded.");
          const blob = await r.blob();
          if (controller.signal.aborted) return;
          urls.push(URL.createObjectURL(blob));
        }
        if (!controller.signal.aborted) setImages([...urls]);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Evidence unavailable");
      }
    })();
    return () => {
      controller.abort();
      urls.forEach(URL.revokeObjectURL);
    };
  }, [key, token]);
  return (
    <div>
      {images.map((url, i) => (
        <a key={url} href={url} target="_blank" rel="noreferrer">
          <img
            src={url}
            alt={`Delivery evidence ${i + 1}`}
            style={{
              maxWidth: 240,
              maxHeight: 180,
              display: "inline-block",
              margin: 8,
            }}
          />
        </a>
      ))}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
