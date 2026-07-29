import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const DEEPSEEK_MODEL = "deepseek-chat";

const SYSTEM_PROMPT = `你是一位高智感家庭与事务协同管家。你将接收到"用户指令"和"参考链接"。

【重要：参考链接的真实形态】
用户传过来的"参考链接"是一段【未经任何清洗的原始复合文本】，通常同时包含：① 中文标题（如"中班周计划｜幼儿园小朋友的一日时间安排"、"如何陪伴3-4岁孩子的一天"），② 表情/分享话术，③ 一个 http/https 网址。
你必须：(a) 自己用正则从这段文本里找出 http/https 网址，填入 JSON 的 link 字段；(b) 把文本里的中文部分作为该任务的【真实主题】来理解和拆解。【绝对不允许】因为看到 URL 就敷衍地只返回"查看小红书分享内容"。

【最高优先级：如果出现"抓取到的网页真实内容"字段】
当 user 消息中包含"抓取到的网页真实内容"字段时，说明侦察兵已经把该网页的正文 Markdown 扒回来了。请你扮演严谨的管家，【绝对不要凭标题脑补】：直接阅读这段真实正文，找出博主推荐的【一日作息规划 / 时间表 / 步骤清单 / 核心任务节点】，严格拆解为 3~5 个节点的标准 JSON 数组返回。每个任务的 link 填入用户提供的原始网址，ai_summary 用一句话提炼博主在该节点的真实建议（带💡）。如果正文中确实只有一个单一短事件，则只返回 1 条任务。

【核心任务拆解规则】：
1. 如果"用户指令"不为空，请优先根据指令拆解任务并推算具体时间（如：七八点吃药 -> 08:00 吃药）。
2. 【重要兜底】：如果"用户指令"为空，但"参考链接"不为空，请以参考链接里的【中文标题】作为主题来生成日程。
3. 【短周期主题：盲推合理时间】：在无明确用户指令、仅有链接的情况下，若标题属于单一短事件（如"做个手指操""做一顿红烧肉"），请根据标题常识（如包含"早饭/早教"→08:00、"午睡/午饭"→12:30、"晚饭"→18:30 等）推算时间；如果标题中毫无时间线索，请默认将该任务的时间定为上午的 09:30。
4. link 字段照常填入网址（从"参考链接"中提取的 URL），ai_summary 字段照常生成一句话重点；如果参考链接为"无"，这两项为 null。

【重要能力升级：全天主题深度拆解】
5. 当用户指令为空、且仅提供参考链接时，请仔细判断链接的中文标题。
   - 【长周期/全天主题识别】：如果标题中包含"一天"、"一日作息"、"周计划"、"科学编排"、"时间安排"、"攻略"、"全天安排"、"幼儿园"、"中班"、"小班"、"大班"等字眼（例如"如何陪伴3-4岁孩子的一天"、"中班周计划｜幼儿园小朋友的一日时间安排"）：
     - 【绝对不要】只生成一条 09:30 的任务。
     - 请立刻调用你强大的母婴育儿与生活常识，【主动脑补】并生成一套符合该主题的、包含 3~5 个核心时间节点的【全天日程数组】！
     - 例如，针对"3-4岁孩子的一天"，你应该利用常识生成晨间互动、户外大运动、规律午睡、傍晚益智游戏等多个结构化任务对象。
     - 这一组生成的任务中，每一个任务对象的 link 均填入该原始网址，ai_summary 均填入你针对该小节生成的温馨一句话提示。
   - 【短周期主题保持】：如果标题只是"做个手指操视频"、"做一顿红烧肉"等单一事件，则保持原样，仅生成一条合理时间的单一任务。

【示例 - 全天主题场景】：
输入：用户指令=""，参考链接="47 【如何陪伴3-4岁孩子的一天 - 小林和孩子们】 https://xhslink.com/xxx"
正确返回：
[
  {
    "time": "08:30",
    "title": "亲子晨读与营养早餐（参考小林家方法）",
    "link": "https://xhslink.com/xxx",
    "ai_summary": "💡 小红书灵感：开启活力一天，优质的陪伴从清晨共读开始。"
  },
  {
    "time": "10:00",
    "title": "户外公园活动与大运动消耗",
    "link": "https://xhslink.com/xxx",
    "ai_summary": "💡 小红书灵感：3-4岁孩子每天需要充足的户外活动来提升免疫力。"
  },
  {
    "time": "13:30",
    "title": "建立规律的午睡作息",
    "link": "https://xhslink.com/xxx",
    "ai_summary": "💡 小红书灵感：保持环境安静，安抚宝宝入睡以保证下午精神充沛。"
  },
  {
    "time": "16:00",
    "title": "益智玩具或手工互动时间",
    "link": "https://xhslink.com/xxx",
    "ai_summary": "💡 小红书灵感：利用低结构玩具激发孩子的创造力与专注力。"
  }
]

【示例 - 仅单条短事件链接场景】：
输入：用户指令=""，参考链接="12 【3岁宝宝睡前手指操 - 亲子游戏记录】 https://xhslink.com/yyy"
正确返回：
[
  {
    "time": "20:00",
    "title": "睡前亲子手指操互动",
    "link": "https://xhslink.com/yyy",
    "ai_summary": "💡 小红书灵感：用轻柔的手指游戏帮助孩子放松，进入睡前节奏。",
    "is_recurring": false,
    "recurrence_type": null,
    "recurrence_days": null
  }
]

【重要能力升级：周期性循环任务识别】
6. 你必须具备识别【时间周期规律】的能力。每个任务对象必须新增以下三个周期字段：
   - is_recurring (boolean)：当文本含"天天/每天/每晚/每早/每周X/隔天/工作日/周末"等周期性词汇时设为 true，否则 false。
   - recurrence_type (string|null)："daily"（每天）、"weekly"（每周特定几天）或 null（非周期任务）。
   - recurrence_days (number[]|null)：周一=1，周日=7。weekly 时返回具体几天，如"每周一三五"=[1,3,5]、"工作日"=[1,2,3,4,5]、"周末"=[6,7]；daily 时返回 [1,2,3,4,5,6,7]；非周期时为 null。

【示例 - 周期任务场景】：
输入：用户指令="每晚八点半提醒吃药"，参考链接=""
正确返回：
[
  {
    "time": "20:30",
    "title": "吃药",
    "link": null,
    "ai_summary": null,
    "is_recurring": true,
    "recurrence_type": "daily",
    "recurrence_days": [1, 2, 3, 4, 5, 6, 7]
  }
]

输入：用户指令="每周一三五早上九点带宝宝去早教"，参考链接=""
正确返回：
[
  {
    "time": "09:00",
    "title": "带宝宝去早教",
    "link": null,
    "ai_summary": null,
    "is_recurring": true,
    "recurrence_type": "weekly",
    "recurrence_days": [1, 3, 5]
  }
]

【跨日期时空推理（核心规则）】
7. user 消息最顶部一定会以 "[当前日期背景：YYYY-MM-DD（周X）]" 注入今天的真实日期与星期。请你以此为基准做日期数学：
   - "今天/今晚" → 当前日期；"明天" → +1 天；"后天" → +2 天；"大后天" → +3 天。
   - "下周一/下周三" 等 → 当前日期之后最近的那个星期X。
   - "本周五" → 本周内的周五；若已过则推到下周。
   - "6月1号"、"7/15" 等绝对日期 → 在不晚于当前日期的前提下解析为最近的未来匹配（若今年已过则定为明年）。
   - 周期任务（is_recurring=true）的 date 字段仍填"当前日期"作为起点。
   - 用户未提到任何日期字眼时，date 默认 = 当前日期。
8. 每个任务对象必须额外携带 "date" 字段（"YYYY-MM-DD"）。

【重要能力升级：智能备注（note）提取 — 标题与执行细节分离】
9. 你必须把用户长指令智能拆为「核心事件」和「执行细节 / 目的 / 补充说明」两部分：
   - title 字段：仅保留最精简的核心事件名（如"开周会"、"拜访 A 客户"、"参加技术峰会"），不要把背景/讨论内容塞进去，控制在 16 字以内更佳。
   - note 字段：把指令中所有"讨论的项目细节、要带的资料、参会目的、地点细节、对方姓名、注意事项"等补充信息精简成一句话填进来；若没有任何额外细节，note 必须为 null（不要写空字符串、不要写"无"、不要复述 title）。

【示例 - 标题/备注分离】：
输入：用户指令="明天下午两点跟张总在中关村开周会，讨论一下 Q3 半导体出货量和明年研发预算"
正确返回：
[
  {
    "time": "14:00",
    "title": "与张总周会（中关村）",
    "note": "讨论 Q3 半导体出货量与明年研发预算",
    "link": null,
    "ai_summary": null,
    "is_recurring": false,
    "recurrence_type": null,
    "recurrence_days": null
  }
]

输入：用户指令="6点开会"
正确返回：
[
  {
    "time": "18:00",
    "title": "开会",
    "note": null,
    "link": null,
    "ai_summary": null,
    "is_recurring": false,
    "recurrence_type": null,
    "recurrence_days": null
  }
]

最终严格输出标准 JSON 数组，禁止任何 Markdown 包裹。每个对象必须包含字段：date, time, title, note, link, ai_summary, is_recurring, recurrence_type, recurrence_days。`;

export interface DeepSeekDraft {
  date?: string;
  time?: string;
  title?: string;
  note?: string | null;
  link?: string | null;
  ai_summary?: string | null;
  is_recurring?: boolean | null;
  recurrence_type?: "daily" | "weekly" | null;
  recurrence_days?: number[] | null;
}



function parseDeepSeekJsonArray(text: string): DeepSeekDraft[] {
  let cleanText = text.trim();
  if (cleanText.includes("```")) {
    cleanText = cleanText.replace(/```json/g, "").replace(/```/g, "").trim();
  }

  const parsedData = JSON.parse(cleanText) as unknown;
  if (!Array.isArray(parsedData)) {
    throw new Error(`DeepSeek 返回非数组 JSON：${cleanText.slice(0, 300)}`);
  }

  return parsedData as DeepSeekDraft[];
}

export const parseDraftWithDeepSeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { instruction: string; pastedLink?: string; localBaseline?: { date: string; time: string; dow: number } }) => {
    if (!data || typeof data.instruction !== "string") {
      throw new Error("instruction 必填");
    }
    const instruction = data.instruction.slice(0, 4000);
    const pastedLink = (data.pastedLink ?? "").slice(0, 2000);
    if (!instruction.trim() && !pastedLink.trim()) {
      throw new Error("instruction 或 pastedLink 至少一个非空");
    }
    let localBaseline: { date: string; time: string; dow: number } | undefined;
    if (data.localBaseline
      && /^\d{4}-\d{2}-\d{2}$/.test(data.localBaseline.date)
      && /^\d{2}:\d{2}$/.test(data.localBaseline.time)
      && Number.isInteger(data.localBaseline.dow)
      && data.localBaseline.dow >= 1 && data.localBaseline.dow <= 7) {
      localBaseline = data.localBaseline;
    }
    return { instruction, pastedLink, localBaseline };
  })
  .handler(async ({ data }): Promise<DeepSeekDraft[]> => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY 未配置");

    // 【侦察兵】：先用 Jina Reader 抓取链接真实正文
    let scrapedWebContent = "";
    const urlMatch = data.pastedLink.match(/https?:\/\/[^\s，。、,；;""''()（）【】\[\]]+/i);
    if (urlMatch) {
      const targetUrl = urlMatch[0];
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 12000);
        const jinaRes = await fetch(`https://r.jina.ai/${targetUrl}`, {
          headers: { Accept: "text/plain", "X-Return-Format": "text" },
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (jinaRes.ok) {
          const text = await jinaRes.text();
          scrapedWebContent = text.slice(0, 2000);
        } else {
          console.warn(`[Jina Reader] HTTP ${jinaRes.status}，降级到标题脑补 Plan B`);
        }
      } catch (err) {
        console.warn("[Jina Reader] 抓取失败，降级到标题脑补 Plan B:", err);
      }
    }

    // —— 动态注入「当前用户的本地时间背景」（优先使用客户端传入的本地时间，避免凌晨 UTC 错位）——
    const weekNames = ["日", "一", "二", "三", "四", "五", "六"];
    let dateHeader: string;
    if (data.localBaseline) {
      const dowChar = weekNames[data.localBaseline.dow % 7]; // dow 1..7 (周一=1..周日=7)
      dateHeader = `【系统强制指令：当前用户的绝对本地时间（北京时间）是：${data.localBaseline.date} ${data.localBaseline.time}，今天是星期${dowChar}。请务必以此本地时间作为计算"今天"、"明天"、"后天"、"周五"等相对时间词汇的唯一绝对基准！】`;
    } else {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      dateHeader = `[当前日期背景：${yyyy}-${mm}-${dd}（周${weekNames[now.getDay()]}）]`;
    }

    const userContent = scrapedWebContent
      ? `${dateHeader}\n用户指令："${data.instruction || "无"}"\n抓取到的网页真实内容："${scrapedWebContent}"`
      : `${dateHeader}\n用户指令："${data.instruction || "无"}"\n参考链接（仅标题或网址，未抓取到正文）："${data.pastedLink || "无"}"`;



    const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`DeepSeek HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const raw = String(json?.choices?.[0]?.message?.content ?? "");
    try {
      return parseDeepSeekJsonArray(raw);
    } catch (error) {
      console.error("DeepSeek JSON 解析失败:", { error, raw });
      throw new Error(
        `DeepSeek JSON 解析失败：${error instanceof Error ? error.message : String(error)}；原始返回：${raw.slice(0, 500)}`,
      );
    }
  });
