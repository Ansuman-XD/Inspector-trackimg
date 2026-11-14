import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { tokenStorage } from "@/services/apiClient";

const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL || "http://localhost:3001").replace(
  /\/$/,
  ""
);

export function resolvePhotoUrl(src?: string | null): string | null {
  if (!src) return null;
  if (
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    src.startsWith("http://") ||
    src.startsWith("https://")
  ) {
    return src;
  }
  const path = src.startsWith("/") ? src : `/${src}`;
  return `${API_BASE_URL}${path}`;
}

export function AuthenticatedImage({
  src,
  alt,
  className,
  onClick,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    async function load() {
      setError(false);
      setObjectUrl(null);

      const resolved = resolvePhotoUrl(src);
      if (!resolved) {
        setError(true);
        return;
      }

      if (resolved.startsWith("data:") || resolved.startsWith("blob:")) {
        if (!cancelled) setObjectUrl(resolved);
        return;
      }

      setLoading(true);
      try {
        const headers: HeadersInit = {};
        const token = tokenStorage.getAccessToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(resolved, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className || ""}`}>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error || !objectUrl) {
    return (
      <div
        className={`flex items-center justify-center gap-2 bg-muted text-xs text-muted-foreground ${className || ""}`}
      >
        <ImageOff className="h-4 w-4" />
        Photo unavailable
      </div>
    );
  }

  const img = <img src={objectUrl} alt={alt} className={className} />;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full">
        {img}
      </button>
    );
  }
  return img;
}