
-- 1. 给 tasks / routines 增加 user_id 用于按用户隔离（模拟登录下由前端写入 mock user_id）
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS user_id uuid;

-- 2. tasks 增加 image_url 用于"上传行程截图/附件"
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS image_url text;

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_routines_user_id ON public.routines(user_id);

-- 4. Storage 桶：行程附件（公共可读，便于直接显示截图）
INSERT INTO storage.buckets (id, name, public)
VALUES ('agenda-attachments', 'agenda-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS：公开读 + 任意写（高保真模拟阶段；接入真实 Auth 后再收紧到 auth.uid() 路径前缀）
DROP POLICY IF EXISTS "Public read agenda attachments" ON storage.objects;
CREATE POLICY "Public read agenda attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'agenda-attachments');

DROP POLICY IF EXISTS "Anyone can upload agenda attachments" ON storage.objects;
CREATE POLICY "Anyone can upload agenda attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'agenda-attachments');

DROP POLICY IF EXISTS "Anyone can delete agenda attachments" ON storage.objects;
CREATE POLICY "Anyone can delete agenda attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'agenda-attachments');
