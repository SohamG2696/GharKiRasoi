-- supabase/migrations/20261021_02_row_level_security.sql
-- Step 3 in Migration Plan: Comprehensive Row Level Security (RLS)
-- Roles: CUSTOMER, COOK, DELIVERY_PARTNER, ADMIN

BEGIN;

-- ==============================================================================
-- 1. SECURITY DEFINER HELPER FUNCTIONS (Prevent Recursive RLS Evaluation)
-- Includes search_path lockdown and NULL short-circuit evaluation
-- ==============================================================================

-- 1.1 Get the public.profiles id for the currently authenticated Supabase Auth user
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN NULL
    ELSE (
      SELECT id FROM public.profiles 
      WHERE auth_user_id = auth.uid() OR id = auth.uid() 
      LIMIT 1
    )
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 1.2 Check if current user has a specific role (or is ADMIN)
CREATE OR REPLACE FUNCTION public.has_role(required_role public.app_role)
RETURNS BOOLEAN AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN FALSE
    ELSE EXISTS (
      SELECT 1 
      FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid())
        AND (ur.role = required_role OR ur.role = 'ADMIN'::public.app_role)
    )
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 1.3 Check if current user is an ADMIN
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL THEN FALSE
    ELSE EXISTS (
      SELECT 1 
      FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid())
        AND ur.role = 'ADMIN'::public.app_role
    )
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 1.4 Check if current user owns a given kitchen
CREATE OR REPLACE FUNCTION public.is_kitchen_owner(target_kitchen_id UUID)
RETURNS BOOLEAN AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL OR target_kitchen_id IS NULL THEN FALSE
    ELSE EXISTS (
      SELECT 1 
      FROM public.kitchens k
      WHERE k.id = target_kitchen_id 
        AND (k.owner_id = public.get_current_profile_id() OR public.is_admin())
    )
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- 1.5 Check if current user is the delivery partner assigned to an order
CREATE OR REPLACE FUNCTION public.is_assigned_rider_for_order(target_order_id UUID)
RETURNS BOOLEAN AS $$
  SELECT CASE 
    WHEN auth.uid() IS NULL OR target_order_id IS NULL THEN FALSE
    ELSE EXISTS (
      SELECT 1 
      FROM public.delivery_assignments da
      JOIN public.delivery_partners dp ON dp.id = da.partner_id
      WHERE da.order_id = target_order_id 
        AND (dp.user_id = public.get_current_profile_id() OR public.is_admin())
    )
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Explicitly grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.get_current_profile_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_kitchen_owner(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_assigned_rider_for_order(UUID) TO authenticated, anon;


-- ==============================================================================
-- 2. ENABLE ROW LEVEL SECURITY ON ALL ACTIVE & LEGACY TABLES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Defensively ensure any legacy backup/archive tables also have RLS enabled
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
      AND (tablename LIKE 'legacy_%' OR tablename LIKE 'archive_%') 
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated;', tbl);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO postgres, service_role;', tbl);
  END LOOP;
END $$;


-- ==============================================================================
-- 3. VERIFICATION INTEGRITY TRIGGER (Prevents Self-Verification Privilege Escalation)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.protect_service_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified AND NOT public.is_admin() THEN
    -- Prevent non-admin users from altering is_verified status
    NEW.is_verified := OLD.is_verified;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_kitchen_verification ON public.kitchens;
CREATE TRIGGER trg_protect_kitchen_verification
  BEFORE UPDATE ON public.kitchens
  FOR EACH ROW EXECUTE FUNCTION public.protect_service_verification();

DROP TRIGGER IF EXISTS trg_protect_partner_verification ON public.delivery_partners;
CREATE TRIGGER trg_protect_partner_verification
  BEFORE UPDATE ON public.delivery_partners
  FOR EACH ROW EXECUTE FUNCTION public.protect_service_verification();


-- ==============================================================================
-- 4. RLS POLICIES: PROFILES & USER ROLES
-- ==============================================================================

-- Profiles: Users can view their own profile; admins view all; cooks & riders visible for discovery
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (
    auth.uid() = auth_user_id 
    OR id = auth.uid()
    OR public.is_admin()
    -- Allow customers to see cook name/avatar for kitchens they view
    OR id IN (SELECT owner_id FROM public.kitchens)
    -- Allow customers/cooks to see assigned rider name
    OR id IN (SELECT user_id FROM public.delivery_partners)
  );

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = auth_user_id 
    OR id = auth.uid() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE 
  USING (
    auth.uid() = auth_user_id 
    OR id = auth.uid() 
    OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = auth_user_id 
    OR id = auth.uid() 
    OR public.is_admin()
  );

-- User Roles: Read own role; Only Admins can modify roles
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
CREATE POLICY "user_roles_select_policy" ON public.user_roles
  FOR SELECT USING (
    user_id = public.get_current_profile_id() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "user_roles_admin_modify_policy" ON public.user_roles;
CREATE POLICY "user_roles_admin_modify_policy" ON public.user_roles
  FOR ALL USING (public.is_admin());


-- ==============================================================================
-- 5. RLS POLICIES: KITCHENS & MENU ITEMS (Cook Isolation)
-- ==============================================================================

-- Kitchens: Public browse; Cooks can only create/edit/delete their OWN kitchens
DROP POLICY IF EXISTS "kitchens_select_policy" ON public.kitchens;
CREATE POLICY "kitchens_select_policy" ON public.kitchens
  FOR SELECT USING (true); -- Public marketplace discovery

DROP POLICY IF EXISTS "kitchens_insert_policy" ON public.kitchens;
CREATE POLICY "kitchens_insert_policy" ON public.kitchens
  FOR INSERT WITH CHECK (
    (
      owner_id = public.get_current_profile_id() 
      AND public.has_role('COOK'::public.app_role)
      AND is_verified = FALSE -- Must start unverified
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "kitchens_update_policy" ON public.kitchens;
CREATE POLICY "kitchens_update_policy" ON public.kitchens
  FOR UPDATE 
  USING (
    owner_id = public.get_current_profile_id() 
    OR public.is_admin()
  )
  WITH CHECK (
    owner_id = public.get_current_profile_id() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "kitchens_delete_policy" ON public.kitchens;
CREATE POLICY "kitchens_delete_policy" ON public.kitchens
  FOR DELETE USING (
    owner_id = public.get_current_profile_id() 
    OR public.is_admin()
  );

-- Menu Items: Public browse; Cooks manage only items for kitchens they own
DROP POLICY IF EXISTS "menu_items_select_policy" ON public.menu_items;
CREATE POLICY "menu_items_select_policy" ON public.menu_items
  FOR SELECT USING (true); -- Public food browsing

DROP POLICY IF EXISTS "menu_items_insert_policy" ON public.menu_items;
CREATE POLICY "menu_items_insert_policy" ON public.menu_items
  FOR INSERT WITH CHECK (
    public.is_kitchen_owner(kitchen_id)
  );

DROP POLICY IF EXISTS "menu_items_update_policy" ON public.menu_items;
CREATE POLICY "menu_items_update_policy" ON public.menu_items
  FOR UPDATE USING (
    public.is_kitchen_owner(kitchen_id)
  );

DROP POLICY IF EXISTS "menu_items_delete_policy" ON public.menu_items;
CREATE POLICY "menu_items_delete_policy" ON public.menu_items
  FOR DELETE USING (
    public.is_kitchen_owner(kitchen_id)
  );


-- ==============================================================================
-- 6. RLS POLICIES: CUSTOMER ADDRESSES
-- ==============================================================================
DROP POLICY IF EXISTS "addresses_select_policy" ON public.customer_addresses;
CREATE POLICY "addresses_select_policy" ON public.customer_addresses
  FOR SELECT USING (
    customer_id = public.get_current_profile_id() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "addresses_modify_policy" ON public.customer_addresses;
CREATE POLICY "addresses_modify_policy" ON public.customer_addresses
  FOR ALL USING (
    customer_id = public.get_current_profile_id() 
    OR public.is_admin()
  );


-- ==============================================================================
-- 7. RLS POLICIES: ORDERS & ORDER ITEMS (Customer, Cook, Rider, Admin Strict Access)
-- ==============================================================================

-- Orders:
-- 1. Customer: access ONLY their own orders
-- 2. Cook: access orders for THEIR kitchen
-- 3. Rider: access assigned orders, or unassigned orders ready for pickup
-- 4. Admin: full access
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
CREATE POLICY "orders_select_policy" ON public.orders
  FOR SELECT USING (
    customer_id = public.get_current_profile_id()
    OR public.is_kitchen_owner(kitchen_id)
    OR public.is_assigned_rider_for_order(id)
    OR (
      -- Available orders for online riders to view and claim
      public.has_role('DELIVERY_PARTNER'::public.app_role) 
      AND status IN ('PACKED'::public.order_status, 'PREPARING'::public.order_status)
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
CREATE POLICY "orders_insert_policy" ON public.orders
  FOR INSERT WITH CHECK (
    customer_id = public.get_current_profile_id() 
    OR public.is_admin()
  );

-- Orders Update: Correctly handles customer cancellation transition, cook progression, and rider delivery
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
CREATE POLICY "orders_update_policy" ON public.orders
  FOR UPDATE 
  USING (
    -- Customer can cancel while awaiting kitchen
    (customer_id = public.get_current_profile_id() AND status = 'AWAITING_KITCHEN'::public.order_status)
    -- Cook can accept, prepare, pack, reject
    OR public.is_kitchen_owner(kitchen_id)
    -- Rider can update pickup / transit / delivered
    OR public.is_assigned_rider_for_order(id)
    OR public.is_admin()
  )
  WITH CHECK (
    -- Customer transition: can only set CANCELLED on their own order
    (customer_id = public.get_current_profile_id() AND status = 'CANCELLED'::public.order_status)
    -- Cook can update orders for their kitchen
    OR public.is_kitchen_owner(kitchen_id)
    -- Rider can update assigned order
    OR public.is_assigned_rider_for_order(id)
    OR public.is_admin()
  );

-- Order Items: Viewable by anyone with permission to see the parent order
DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;
CREATE POLICY "order_items_select_policy" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id)
  );

DROP POLICY IF EXISTS "order_items_insert_policy" ON public.order_items;
CREATE POLICY "order_items_insert_policy" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_items.order_id 
        AND (o.customer_id = public.get_current_profile_id() OR public.is_admin())
    )
  );

-- Order Status Events: Audit log viewable by order stakeholders, insertion verified
DROP POLICY IF EXISTS "order_events_select_policy" ON public.order_events;
CREATE POLICY "order_events_select_policy" ON public.order_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_events.order_id)
  );

DROP POLICY IF EXISTS "order_events_insert_policy" ON public.order_events;
CREATE POLICY "order_events_insert_policy" ON public.order_events
  FOR INSERT WITH CHECK (
    (actor_id = public.get_current_profile_id() OR actor_id IS NULL OR public.is_admin())
    AND EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_events.order_id 
        AND (
          o.customer_id = public.get_current_profile_id() 
          OR public.is_kitchen_owner(o.kitchen_id) 
          OR public.is_assigned_rider_for_order(o.id) 
          OR public.is_admin()
        )
    )
  );


-- ==============================================================================
-- 8. RLS POLICIES: PAYMENTS
-- ==============================================================================
DROP POLICY IF EXISTS "payments_select_policy" ON public.payments;
CREATE POLICY "payments_select_policy" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = payments.order_id 
        AND (
          o.customer_id = public.get_current_profile_id() 
          OR public.is_kitchen_owner(o.kitchen_id) 
          OR public.is_admin()
        )
    )
  );

DROP POLICY IF EXISTS "payments_insert_policy" ON public.payments;
CREATE POLICY "payments_insert_policy" ON public.payments
  FOR INSERT WITH CHECK (
    -- Normal users can only initiate PENDING payments; status SUCCESS requires server-side verification
    (status = 'PENDING'::public.payment_status OR public.is_admin())
    AND EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = payments.order_id 
        AND (o.customer_id = public.get_current_profile_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "payments_admin_update_policy" ON public.payments;
CREATE POLICY "payments_admin_update_policy" ON public.payments
  FOR UPDATE USING (public.is_admin());


-- ==============================================================================
-- 9. RLS POLICIES: DELIVERY PARTNERS & ASSIGNMENTS (Rider Protection)
-- ==============================================================================

-- Delivery Partners: Riders can update their own status (online, GPS coordinates)
DROP POLICY IF EXISTS "delivery_partners_select_policy" ON public.delivery_partners;
CREATE POLICY "delivery_partners_select_policy" ON public.delivery_partners
  FOR SELECT USING (
    user_id = public.get_current_profile_id()
    OR public.is_admin()
    -- Cooks and Customers can see rider assigned to their active order
    OR id IN (
      SELECT partner_id FROM public.delivery_assignments da
      JOIN public.orders o ON o.id = da.order_id
      WHERE o.customer_id = public.get_current_profile_id() 
         OR public.is_kitchen_owner(o.kitchen_id)
    )
  );

DROP POLICY IF EXISTS "delivery_partners_insert_policy" ON public.delivery_partners;
CREATE POLICY "delivery_partners_insert_policy" ON public.delivery_partners
  FOR INSERT WITH CHECK (
    (
      user_id = public.get_current_profile_id() 
      AND public.has_role('DELIVERY_PARTNER'::public.app_role)
      AND is_verified = FALSE -- Must start unverified
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "delivery_partners_update_policy" ON public.delivery_partners;
CREATE POLICY "delivery_partners_update_policy" ON public.delivery_partners
  FOR UPDATE 
  USING (
    user_id = public.get_current_profile_id() 
    OR public.is_admin()
  )
  WITH CHECK (
    user_id = public.get_current_profile_id() 
    OR public.is_admin()
  );

-- Delivery Assignments: Atomic assignment & tracking
DROP POLICY IF EXISTS "delivery_assignments_select_policy" ON public.delivery_assignments;
CREATE POLICY "delivery_assignments_select_policy" ON public.delivery_assignments
  FOR SELECT USING (
    partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = public.get_current_profile_id())
    OR EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = delivery_assignments.order_id 
        AND (o.customer_id = public.get_current_profile_id() OR public.is_kitchen_owner(o.kitchen_id))
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "delivery_assignments_insert_policy" ON public.delivery_assignments;
CREATE POLICY "delivery_assignments_insert_policy" ON public.delivery_assignments
  FOR INSERT WITH CHECK (
    (
      partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = public.get_current_profile_id())
      AND public.has_role('DELIVERY_PARTNER'::public.app_role)
      AND EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = delivery_assignments.order_id 
          AND o.status IN ('PACKED'::public.order_status, 'PREPARING'::public.order_status)
      )
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "delivery_assignments_update_policy" ON public.delivery_assignments;
CREATE POLICY "delivery_assignments_update_policy" ON public.delivery_assignments
  FOR UPDATE 
  USING (
    partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = public.get_current_profile_id())
    OR public.is_admin()
  )
  WITH CHECK (
    partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = public.get_current_profile_id())
    OR public.is_admin()
  );


-- ==============================================================================
-- 10. RLS POLICIES: SUBSCRIPTIONS & REVIEWS
-- ==============================================================================

-- Subscriptions: Customer can view/manage their subscriptions; Cook views subscriptions for their kitchen
DROP POLICY IF EXISTS "subscriptions_select_policy" ON public.subscriptions;
CREATE POLICY "subscriptions_select_policy" ON public.subscriptions
  FOR SELECT USING (
    customer_id = public.get_current_profile_id()
    OR public.is_kitchen_owner(kitchen_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "subscriptions_insert_policy" ON public.subscriptions;
CREATE POLICY "subscriptions_insert_policy" ON public.subscriptions
  FOR INSERT WITH CHECK (
    customer_id = public.get_current_profile_id() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "subscriptions_update_policy" ON public.subscriptions;
CREATE POLICY "subscriptions_update_policy" ON public.subscriptions
  FOR UPDATE 
  USING (
    customer_id = public.get_current_profile_id() 
    OR public.is_admin()
  )
  WITH CHECK (
    customer_id = public.get_current_profile_id() 
    OR public.is_admin()
  );

-- Reviews: Public view; Customers submit reviews for their completed orders
DROP POLICY IF EXISTS "reviews_select_policy" ON public.reviews;
CREATE POLICY "reviews_select_policy" ON public.reviews
  FOR SELECT USING (true); -- Public review transparency

DROP POLICY IF EXISTS "reviews_insert_policy" ON public.reviews;
CREATE POLICY "reviews_insert_policy" ON public.reviews
  FOR INSERT WITH CHECK (
    customer_id = public.get_current_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = reviews.order_id 
        AND o.customer_id = public.get_current_profile_id()
        AND o.status = 'DELIVERED'::public.order_status
    )
  );

DROP POLICY IF EXISTS "reviews_delete_policy" ON public.reviews;
CREATE POLICY "reviews_delete_policy" ON public.reviews
  FOR DELETE USING (
    customer_id = public.get_current_profile_id() 
    OR public.is_admin()
  );


-- ==============================================================================
-- 11. GRANT PERMISSIONS FOR POSTGREST & SUPABASE ROLES
-- ==============================================================================
-- Public / Anon access: read-only for public marketplace browsing
GRANT SELECT ON public.kitchens, public.menu_items, public.reviews, public.profiles TO anon;

-- Authenticated access: governed and isolated by RLS policies above
GRANT SELECT, INSERT, UPDATE, DELETE ON 
  public.profiles, 
  public.kitchens, 
  public.menu_items, 
  public.customer_addresses, 
  public.orders, 
  public.order_items, 
  public.order_events, 
  public.payments, 
  public.delivery_partners, 
  public.delivery_assignments, 
  public.subscriptions, 
  public.reviews 
TO authenticated;

GRANT SELECT ON public.user_roles TO authenticated;

COMMIT;
