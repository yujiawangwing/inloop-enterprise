import { CheckCircle2, Minus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const compareRows = [
  { feature: "AI 智能同步", free: "每月 3 次", pro: "无限次一键排班" },
  { feature: "网页链接提炼", free: "仅展示原链接", pro: "AI 自动提炼重点" },
  { feature: "终端设备绑定", free: "最多 2 台", pro: "全家无限绑定" },
];

export function PaywallModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent
        className="left-1/2 top-1/2 max-h-[calc(100vh-40px)] w-[calc(100vw-40px)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border-0 bg-[#F5F4F0] p-0 shadow-2xl sm:rounded-3xl"
      >
        <DialogHeader className="space-y-1 px-6 pb-3 pt-6 text-left">
          <DialogTitle className="text-[17px] font-semibold tracking-tight text-foreground">
            升级「全能协同主理人 Pro」
          </DialogTitle>
          <p className="text-[11.5px] text-foreground/50">
            打破多终端沟通壁垒，让协同井然有序。
          </p>
        </DialogHeader>

        {/* Compare Table */}
        <div className="px-5 pb-3 pt-1">
          <div className="overflow-hidden rounded-3xl bg-[#F0F4F0]">
            <table className="w-full border-collapse text-[11.5px]">
              <colgroup>
                <col style={{ width: "50%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "25%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold text-[#222222]">
                    核心功能
                  </th>
                  <th className="px-2 py-3 text-center text-[11px] font-medium text-[#666666]">
                    免费版
                  </th>
                  <th className="px-2 py-3 text-center text-[11px] font-bold text-[#222222]">
                    协同 Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap px-5 py-5 text-left font-semibold text-[#222222]">
                      {row.feature}
                    </td>
                    <td className="px-2 py-5 text-center align-middle text-[10.5px] text-[#888888]">
                      <span className="inline-flex items-center justify-center gap-1">
                        <Minus size={11} className="shrink-0 text-[#BBBBBB]" />
                        <span className="whitespace-nowrap">{row.free}</span>
                      </span>
                    </td>
                    <td className="px-2 py-5 text-center align-middle text-[10.5px] font-bold text-[#222222]">
                      <span className="inline-flex items-center justify-center gap-1">
                        <CheckCircle2 size={13} className="shrink-0 text-primary" />
                        <span className="whitespace-nowrap">{row.pro}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-2 gap-3 px-5 pb-3">
          {/* Monthly */}
          <div className="flex flex-col rounded-2xl border border-foreground/10 bg-card p-4">
            <span className="text-[10.5px] font-medium tracking-wide text-foreground/60">
              月付主理人
            </span>
            <div className="mt-1.5 flex items-baseline gap-0.5">
              <span className="text-[22px] font-semibold tracking-tight text-foreground">¥9.9</span>
              <span className="text-[11px] text-foreground/50">/ 月</span>
            </div>
            <span className="mt-1.5 text-[10px] leading-tight text-foreground/45">
              随时可取消，适合短期体验
            </span>
          </div>

          {/* Yearly (highlighted) */}
          <div className="relative flex flex-col rounded-2xl border border-primary/30 bg-card p-4">
            <span className="absolute -top-2.5 left-3 rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold tracking-wider text-primary-foreground">
              早鸟特惠
            </span>
            <span className="mt-1 text-[10.5px] font-medium tracking-wide text-foreground/60">
              年卡主理人
            </span>
            <div className="mt-1.5 flex items-baseline gap-0.5">
              <span className="text-[22px] font-semibold tracking-tight text-foreground">¥48</span>
              <span className="text-[11px] text-foreground/50">/ 年</span>
            </div>
            <span className="mt-1.5 text-[10px] leading-tight text-foreground/45">
              折合 ¥4 / 月，极高性价比
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-2 px-5 pb-5 pt-2">
          <button
            type="button"
            onClick={() => {/* TODO: payment flow */}}
            className="h-11 w-full rounded-full bg-primary text-[13px] font-semibold tracking-wide text-primary-foreground shadow-[0_8px_22px_-10px_rgba(107,122,106,0.65)] transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            开通全能协同 Pro
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-[11.5px] font-medium text-foreground/45 transition-colors hover:text-foreground/70"
          >
            暂不升级
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
