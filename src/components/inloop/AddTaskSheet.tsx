import { useState, useEffect } from "react";
import { Repeat, Calendar as CalendarIcon, Check } from "lucide-react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ImageUploader } from "./ImageUploader";
import { OwnerSelector } from "./OwnerSelector";
import { ME_SENTINEL_ID, type Contact } from "@/lib/contacts";

export type Recurrence = "none" | "daily" | "weekly";

export interface NewTaskPayload {
  time: string;
  title: string;
  note?: string;
  date: Date;
  recurrence: Recurrence;
  image_url?: string;
  owner_ids: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (payload: NewTaskPayload) => void;
  currentUserId?: string | null;
  contacts: Contact[];
  onManageTeam?: () => void;
}


function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function AddTaskSheet({ open, onOpenChange, onAdd, currentUserId, contacts, onManageTeam }: Props) {
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const meId = currentUserId ?? ME_SENTINEL_ID;
  const [ownerIds, setOwnerIds] = useState<string[]>([meId]);
  useEffect(() => {
    if (currentUserId) {
      setOwnerIds((prev) => prev.map((id) => (id === ME_SENTINEL_ID ? currentUserId : id)));
    }
  }, [currentUserId]);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const today = new Date();
  const isToday = isSameDay(date, today);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!time || !title.trim()) return;
    onAdd({
      time,
      title: title.trim(),
      note: note.trim() || undefined,
      date,
      recurrence,
      image_url: imageUrl ?? undefined,
      owner_ids: ownerIds,
    });
    setTime("");
    setTitle("");
    setNote("");
    setDate(new Date());
    setRecurrence("none");
    setImageUrl(null);
    setOwnerIds([meId]);
    onOpenChange(false);
  }


  const recurrenceOptions: { value: Recurrence; label: string }[] = [
    { value: "none", label: "不重复" },
    { value: "daily", label: "每天" },
    { value: "weekly", label: "每周" },
  ];

  const recurrenceLabel =
    recurrenceOptions.find((o) => o.value === recurrence)?.label ?? "不重复";
  const recurrenceActive = recurrence !== "none";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-foreground/10 bg-background px-6 pb-8 pt-6"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-foreground/15" />
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg font-semibold tracking-tight">
            新建任务
          </SheetTitle>
          <SheetDescription className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground">
            添加到核心日程看板或未来行程
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {/* Time + Date side-by-side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="time"
                className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
              >
                时间
              </Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-12 rounded-xl border-foreground/25 bg-background text-base"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                日期
              </Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-12 w-full items-center justify-between rounded-xl border border-foreground/25 bg-background px-3 text-left text-base"
                  >
                    <span className={cn(!isToday && "text-foreground")}>
                      {isToday ? "今天" : format(date, "M月d日")}
                    </span>
                    <CalendarIcon className="h-4 w-4 text-foreground/45" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-auto rounded-2xl border-foreground/15 bg-background p-0"
                >
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      if (d) {
                        setDate(d);
                        setDateOpen(false);
                      }
                    }}
                    disabled={(d) => {
                      const t = new Date();
                      t.setHours(0, 0, 0, 0);
                      return d < t;
                    }}
                    initialFocus
                    className={cn("pointer-events-auto p-3")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="title"
              className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              任务
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="例如：午睡安抚"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 rounded-xl border-foreground/25 bg-background text-base"
              required
            />

            {/* Recurrence pill */}
            <div className="pt-1">
              <Popover open={repeatOpen} onOpenChange={setRepeatOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      recurrenceActive
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-foreground/15 text-foreground/55 hover:border-foreground/30 hover:text-foreground/80",
                    )}
                  >
                    <Repeat className="h-3 w-3" />
                    {recurrenceLabel}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-48 rounded-xl border-foreground/15 bg-background p-1.5"
                >
                  {recurrenceOptions.map((opt) => {
                    const selected = recurrence === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setRecurrence(opt.value);
                          setRepeatOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                          selected
                            ? "bg-primary/10 text-primary"
                            : "text-foreground/75 hover:bg-foreground/[0.04]",
                        )}
                      >
                        {opt.label}
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="note"
              className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              📝 任务备注 / 详情描述
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="添加附加信息或执行细节（可选）..."
              rows={3}
              className="min-h-[72px] rounded-xl border-foreground/25 bg-background text-[13.5px] leading-relaxed"
            />
          </div>


          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              👥 协同目标 (To:)
            </Label>
            <OwnerSelector
              value={ownerIds}
              onChange={setOwnerIds}
              currentUserId={currentUserId}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              📸 行程截图 / 邀请函（可选）
            </Label>
            <ImageUploader value={imageUrl} onChange={setImageUrl} />
          </div>


          <Button
            type="submit"
            className="mt-2 h-12 w-full rounded-xl bg-foreground text-background hover:bg-foreground/90"
          >
            加入时间轴
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
