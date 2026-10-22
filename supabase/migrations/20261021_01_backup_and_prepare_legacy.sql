-- supabase/migrations/20261021_01_backup_and_prepare_legacy.sql
-- Step 1 in Migration Plan: Non-destructive Backup and Schema Conflict Preparation
-- Safely archives existing legacy tables (chefs, menu, orders) before applying relational PostGIS schema.

BEGIN;

-- 1. Create safety backup snapshot tables if legacy tables exist and contain data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chefs') THEN
    CREATE TABLE IF NOT EXISTS public.legacy_backup_chefs AS SELECT * FROM public.chefs;
    RAISE NOTICE 'Backed up legacy chefs table to legacy_backup_chefs.';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'menu') THEN
    CREATE TABLE IF NOT EXISTS public.legacy_backup_menu AS SELECT * FROM public.menu;
    RAISE NOTICE 'Backed up legacy menu table to legacy_backup_menu.';
  END IF;

  -- Only backup orders if it is indeed a legacy table with bigint/integer ID (or archive doesn't exist yet)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND data_type IN ('bigint', 'integer')
  ) THEN
    CREATE TABLE IF NOT EXISTS public.legacy_backup_orders AS SELECT * FROM public.orders;
    RAISE NOTICE 'Backed up legacy orders table to legacy_backup_orders.';
  END IF;
END $$;

-- 2. Rename existing legacy tables so the new UUID relational schema can be created cleanly
DO $$
BEGIN
  -- If legacy orders has bigint id (conflicting with UUID foreign keys), rename to archive_legacy_orders
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'orders' 
      AND data_type IN ('bigint', 'integer')
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'archive_legacy_orders'
  ) THEN
    ALTER TABLE public.orders RENAME TO archive_legacy_orders;
    RAISE NOTICE 'Renamed legacy orders table (bigint ID) to archive_legacy_orders.';
  END IF;

  -- Rename legacy chefs to archive_legacy_chefs
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chefs'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'archive_legacy_chefs'
  ) THEN
    ALTER TABLE public.chefs RENAME TO archive_legacy_chefs;
    RAISE NOTICE 'Renamed legacy chefs table to archive_legacy_chefs.';
  END IF;

  -- Rename legacy menu to archive_legacy_menu
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'menu'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'archive_legacy_menu'
  ) THEN
    ALTER TABLE public.menu RENAME TO archive_legacy_menu;
    RAISE NOTICE 'Renamed legacy menu table to archive_legacy_menu.';
  END IF;
END $$;

-- 3. Lock down permissions and enable RLS on all legacy backup and archive tables
-- Prevents unauthorized public exposure via PostgREST / Supabase REST API
DO $$
DECLARE
  target_table TEXT;
  legacy_tables TEXT[] := ARRAY[
    'legacy_backup_chefs', 
    'legacy_backup_menu', 
    'legacy_backup_orders', 
    'archive_legacy_chefs', 
    'archive_legacy_menu', 
    'archive_legacy_orders'
  ];
BEGIN
  FOREACH target_table IN ARRAY legacy_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = target_table
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', target_table);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated;', target_table);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO postgres, service_role;', target_table);
      RAISE NOTICE 'Secured % with RLS and restricted permissions.', target_table;
    END IF;
  END LOOP;
END $$;

COMMIT;
