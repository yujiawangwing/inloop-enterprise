-- ============================================================
-- Phase 1: profiles 表 + 注册触发器
-- ============================================================
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Phase 2: 清空业务数据 + 收紧约束
-- ============================================================
TRUNCATE TABLE public.tasks CASCADE;
TRUNCATE TABLE public.routines CASCADE;

ALTER TABLE public.tasks ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN creator_id SET NOT NULL;
ALTER TABLE public.routines ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.routines ALTER COLUMN creator_id SET NOT NULL;

-- ============================================================
-- Phase 3: 收紧 tasks RLS
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Anyone can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Anyone can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Anyone can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Debug allow public task reads" ON public.tasks;
DROP POLICY IF EXISTS "Debug allow public task creates" ON public.tasks;
DROP POLICY IF EXISTS "Debug allow public task edits" ON public.tasks;
DROP POLICY IF EXISTS "Debug allow public task deletes" ON public.tasks;

-- 撤销 anon 权限
REVOKE ALL ON public.tasks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

CREATE POLICY "Users view own or assigned tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = creator_id);

CREATE POLICY "Users create tasks as themselves"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users update own or assigned tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = creator_id)
  WITH CHECK (auth.uid() = owner_id OR auth.uid() = creator_id);

CREATE POLICY "Users delete own or assigned tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = creator_id);

-- ============================================================
-- Phase 4: 收紧 routines RLS
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view routines" ON public.routines;
DROP POLICY IF EXISTS "Anyone can insert routines" ON public.routines;
DROP POLICY IF EXISTS "Anyone can update routines" ON public.routines;
DROP POLICY IF EXISTS "Anyone can delete routines" ON public.routines;
DROP POLICY IF EXISTS "Debug allow public routine reads" ON public.routines;
DROP POLICY IF EXISTS "Debug allow public routine creates" ON public.routines;
DROP POLICY IF EXISTS "Debug allow public routine edits" ON public.routines;
DROP POLICY IF EXISTS "Debug allow public routine deletes" ON public.routines;

REVOKE ALL ON public.routines FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routines TO authenticated;
GRANT ALL ON public.routines TO service_role;

CREATE POLICY "Users view own or assigned routines"
  ON public.routines FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = creator_id);

CREATE POLICY "Users create routines as themselves"
  ON public.routines FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users update own or assigned routines"
  ON public.routines FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = creator_id)
  WITH CHECK (auth.uid() = owner_id OR auth.uid() = creator_id);

CREATE POLICY "Users delete own or assigned routines"
  ON public.routines FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = creator_id);

-- ============================================================
-- Phase 5: 存储桶 agenda-attachments 严格策略
-- ============================================================
DROP POLICY IF EXISTS "Public can upload to agenda-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public can read agenda-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload agenda-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read agenda-attachments" ON storage.objects;

CREATE POLICY "Public read agenda-attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'agenda-attachments');

CREATE POLICY "Authenticated users upload agenda-attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'agenda-attachments');

CREATE POLICY "Authenticated users update own agenda-attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'agenda-attachments' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'agenda-attachments' AND owner = auth.uid());

CREATE POLICY "Authenticated users delete own agenda-attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'agenda-attachments' AND owner = auth.uid());