-- Supabase SQL Schema for University Visitor Logbook & Map Navigation

-- 1. Buildings Table (Campus landmarks/structures)
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    floors INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    head_person TEXT,
    contact_email TEXT,
    x_coord NUMERIC,
    y_coord NUMERIC,
    color TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Rooms Table (Specific rooms/workspaces inside a building)
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    room_name TEXT NOT NULL,
    floor TEXT NOT NULL,
    x_coord NUMERIC NOT NULL,
    y_coord NUMERIC NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.1 Offices & Check-In Desks Table
CREATE TABLE IF NOT EXISTS public.offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    head_person TEXT,
    contact_email TEXT,
    operating_hours TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Profiles Table (RBAC roles & desk/room binding)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'security', 'staff')),
    office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Registered Visitors Table (Unique Visitor Profiles Directory)
CREATE TABLE IF NOT EXISTS public.registered_visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE, -- Optional email
    phone TEXT,        -- Optional phone
    photo_url TEXT,    -- Visitor face snapshot / image upload URL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4.1 Visitor Logs Table (Normalized 3NF Check-In Sessions)
CREATE TABLE IF NOT EXISTS public.visitor_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id UUID REFERENCES public.registered_visitors(id) ON DELETE CASCADE NOT NULL,
    office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL, -- Single Entry Point Office handling check-in/out
    purpose TEXT NOT NULL,
    host_person TEXT,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    check_out_time TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'checked_out', 'expired')),
    verification_status TEXT NOT NULL DEFAULT 'approved' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    pass_code TEXT UNIQUE NOT NULL,
    last_latitude NUMERIC,
    last_longitude NUMERIC,
    last_located_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4.2 Backward Compatibility View (Derives building, office, and room metadata via JOINs)
CREATE OR REPLACE VIEW public.visitors AS
SELECT 
    vl.id,
    rv.full_name,
    rv.first_name,
    rv.middle_name,
    rv.last_name,
    rv.email,
    rv.phone,
    vl.purpose,
    vl.office_id,
    o.name AS office_name,
    o.building_id,
    b.name AS building_name,
    o.room_id,
    r.room_number,
    vl.host_person,
    rv.photo_url,
    vl.check_in_time,
    vl.check_out_time,
    vl.status,
    vl.verification_status,
    vl.rejection_reason,
    vl.pass_code,
    vl.visitor_id,
    vl.last_latitude,
    vl.last_longitude,
    vl.last_located_at
FROM public.visitor_logs vl
JOIN public.registered_visitors rv ON vl.visitor_id = rv.id
LEFT JOIN public.offices o ON vl.office_id = o.id
LEFT JOIN public.buildings b ON o.building_id = b.id
LEFT JOIN public.rooms r ON o.room_id = r.id;

-- 5. Map Edges Table (Pathfinding network)
CREATE TABLE IF NOT EXISTS public.map_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_node TEXT NOT NULL,
    to_node TEXT NOT NULL,
    path JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registered_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_edges ENABLE ROW LEVEL SECURITY;

-- Security Definer Role Resolver (Bypasses RLS to avoid infinite recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role FROM public.profiles WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Allow public select profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow admins all access to profiles" ON public.profiles FOR ALL USING (
    public.get_user_role(auth.uid()) = 'admin'
);

-- Buildings Policies
CREATE POLICY "Public buildings read access" ON public.buildings FOR SELECT USING (true);
CREATE POLICY "Admin write access to buildings" ON public.buildings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Rooms Policies
CREATE POLICY "Public rooms read access" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Admin write access to rooms" ON public.rooms FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Registered Visitors Policies
CREATE POLICY "Public visitor registration insert" ON public.registered_visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "Public visitor profile read" ON public.registered_visitors FOR SELECT USING (true);
CREATE POLICY "Public visitor profile update" ON public.registered_visitors FOR UPDATE USING (true);
CREATE POLICY "Staff/Guard read all registered visitors" ON public.registered_visitors FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'security', 'staff'))
);

-- Visitor Logs Policies (Public inserts & checkouts, Guard/Staff management)
CREATE POLICY "Public visitor log insert" ON public.visitor_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public visitor log read" ON public.visitor_logs FOR SELECT USING (true);
CREATE POLICY "Public visitor log update" ON public.visitor_logs FOR UPDATE USING (true);
CREATE POLICY "Staff/Guard read all visitor logs" ON public.visitor_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'security', 'staff'))
);
CREATE POLICY "Staff/Guard update visitor logs" ON public.visitor_logs FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'security', 'staff'))
);

-- Map Edges Policies
CREATE POLICY "Public map_edges read access" ON public.map_edges FOR SELECT USING (true);
CREATE POLICY "Admin write access to map_edges" ON public.map_edges FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Auto-profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_room_id UUID;
    meta_room_id TEXT;
BEGIN
    -- Extract role from metadata, fallback to 'staff' if not set
    user_role := COALESCE(new.raw_user_meta_data->>'role', 'staff');
    
    -- Extract room_id text
    meta_room_id := new.raw_user_meta_data->>'room_id';
    
    -- Validate if room_id matches UUID format before casting
    IF meta_room_id IS NOT NULL AND meta_room_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
        user_room_id := meta_room_id::UUID;
    ELSE
        user_room_id := NULL;
    END IF;

    INSERT INTO public.profiles (id, email, role, room_id)
    VALUES (new.id, new.email, user_role, user_room_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket configuration for campus assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('campus-assets', 'campus-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the campus-assets bucket
CREATE POLICY "Allow public read access to campus assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'campus-assets');

CREATE POLICY "Allow authenticated admin uploads to campus assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'campus-assets' AND
    public.get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Allow authenticated admin updates to campus assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'campus-assets' AND
    public.get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Allow authenticated admin deletes to campus assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'campus-assets' AND
    public.get_user_role(auth.uid()) = 'admin'
);

-- ==========================================================
-- Supabase Realtime Publication Configuration
-- ==========================================================

-- Enable Realtime for dynamic session & location tracking tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.offices;

