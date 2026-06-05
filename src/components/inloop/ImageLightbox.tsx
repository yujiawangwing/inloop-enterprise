import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface Props {
  src: string | null;
  onClose: () => void;
}

export function ImageLightbox({ src, onClose }: Props) {
  useEffect(() => {
    if (!src) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [src, onClose]);

  if (!src) return null;
  if (typeof document === "undefined") return null;

  const handleClose = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClose();
  };

  const swallow = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      onPointerDown={swallow}
      onPointerUp={swallow}
      onMouseDown={swallow}
      onMouseUp={swallow}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm animate-in fade-in"
    >
      <button
        type="button"
        onClick={handleClose}
        onPointerDown={swallow}
        onMouseDown={swallow}
        aria-label="关闭大图"
        className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95"
      >
        <X className="h-4 w-4" />
      </button>
      <img
        src={src}
        alt="行程截图大图"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={swallow}
        onMouseDown={swallow}
        className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
      />
    </div>,
    document.body,
  );
}
