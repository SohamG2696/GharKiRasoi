-- supabase/migrations/20261021_03_auth_hooks_and_roles.sql
-- Step 4 in Migration Plan: Supabase Auth Integration Triggers & Role Provisioning

BEGIN;

-- 1. Ensure foreign key constraint from profiles to auth.users exists safely
DO $$
BEGIN
  -- Nullify any orphaned auth_user_id that doesn't exist in auth.users to prevent FK violation
  UPDATE public.profiles 
  SET auth_user_id = NULL 
  WHERE auth_user_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = public.profiles.auth_user_id);

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_profiles_auth_user' 
      AND table_schema = 'public' 
      AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT fk_profiles_auth_user 
      FOREIGN KEY (auth_user_id) 
      REFERENCES auth.users(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Trigger function to auto-create profile and user_roles when a user signs up via Supabase Auth
-- Prevents privilege escalation: normal users signing up cannot self-grant COOK, DELIVERY_PARTNER, or ADMIN
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role public.app_role;
  app_role_claim TEXT;
  existing_profile_id UUID;
  resolved_profile_id UUID;
BEGIN
  -- Strict Privilege Separation:
  -- Only server-side trusted app_metadata (raw_app_meta_data) can assign elevated roles during creation.
  -- Client-supplied raw_user_meta_data can NEVER assign COOK, DELIVERY_PARTNER, or ADMIN privileges.
  app_role_claim := NEW.raw_app_meta_data->>'role';

  IF app_role_claim IN ('CUSTOMER', 'COOK', 'DELIVERY_PARTNER', 'ADMIN') THEN
    default_role := app_role_claim::public.app_role;
  ELSE
    -- Every normal user signing up defaults strictly to CUSTOMER role
    default_role := 'CUSTOMER'::public.app_role;
  END IF;

  -- Resolve Profile idempotently to prevent duplicate or conflicting profiles
  SELECT id INTO existing_profile_id
  FROM public.profiles
  WHERE auth_user_id = NEW.id OR id = NEW.id OR email = NEW.email
  ORDER BY created_at ASC
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
    -- Update existing profile linkage without violating unique constraints
    UPDATE public.profiles
    SET auth_user_id = NEW.id,
        updated_at = NOW()
    WHERE id = existing_profile_id;

    resolved_profile_id := existing_profile_id;
  ELSE
    -- Insert new profile
    INSERT INTO public.profiles (
      id,
      auth_user_id,
      full_name,
      email,
      phone
    )
    VALUES (
      NEW.id,
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'fullName', NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
      NEW.raw_user_meta_data->>'phone'
    )
    RETURNING id INTO resolved_profile_id;
  END IF;

  -- Assign User Role to the resolved profile ID
  INSERT INTO public.user_roles (user_id, role)
  VALUES (resolved_profile_id, default_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 3. Attach Trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

COMMIT;
