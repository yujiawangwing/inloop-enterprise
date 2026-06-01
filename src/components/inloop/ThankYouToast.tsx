import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const MESSAGES = [
  "任务已同步！今天辛苦啦，有你在后方我特别安心。 ☕️",
  "收到啦！感谢你给宝宝满分的爱，今晚回去给你带好吃的！ ❤️",
  "打卡成功！谢谢你帮我守护大后方，等我下班回家接棒。 🏃‍♀️",
  "收到同步，今天又是全家合作无间的一天，辛苦啦！ 🥇",
];

interface Props {
  show: boolean;
  onDone: () => void;
}

export function ThankYouToast({ show, onDone }: Props) {
  const [message, setMessage] = useState(MESSAGES[0]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
    // next frame → trigger slide-in
    const a = requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => setVisible(false), 2400);
    const t2 = setTimeout(() => onDone(), 2800);
    return () => {
      cancelAnimationFrame(a);
      clearTimeout(t);
      clearTimeout(t2);
      setVisible(false);
    };
  }, [show, onDone]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 mx-auto flex max-w-md justify-center px-6 pt-6">
      <div
        className={cn(
          "rounded-2xl border border-primary/25 bg-[oklch(0.955_0.012_140)] px-5 py-3.5 shadow-[0_18px_40px_-18px_rgba(107,122,106,0.45)] transition-all duration-500 ease-out",
          visible ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0",
        )}
      >
        <p className="text-[15px] font-medium leading-snug tracking-tight text-primary">
          {message}
        </p>
      </div>
    </div>
  );
}
