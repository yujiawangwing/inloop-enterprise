import { X } from "lucide-react";

interface Props {
  src: string | null;
  onClose: () => void;
}

/**
 * 极简大图预览：纯 Tailwind fixed 遮罩，无 Portal、无 Radix、无 Focus Trap。
 * 父组件通过 `src` 条件渲染控制开关，关闭事件只切换父级 boolean，
 * 因此绝不会干扰任何同级 Dialog/Sheet 的草稿状态。
 */
export function ImageLightbox({ src, onClose }: Props) {
  if (!src) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-4 py-6 cursor-zoom-out"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭大图"
        className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95"
      >
        <X className="h-4 w-4" />
      </button>
      <img
        src={src}
        alt="大图预览"
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-lg object-contain shadow-2xl cursor-default"
      />
    </div>
  );
}
