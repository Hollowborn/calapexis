-- Supabase SQL Schema for University Visitor Logbook & Map Navigation

-- 1. Offices Table
CREATE TABLE IF NOT EXISTS public.offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    building TEXT NOT NULL,
    floor TEXT NOT NULL,
    description TEXT,
    head_person TEXT,
    contact_email TEXT,
    x_coord NUMERIC,
    y_coord NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    room_name TEXT NOT NULL,
    building TEXT NOT NULL,
    floor TEXT NOT NULL,
    x_coord NUMERIC NOT NULL,
    y_coord NUMERIC NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Profiles Table (RBAC roles & department binding)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'security', 'staff')),
    office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Visitors Table (Digital Logbook)
CREATE TABLE IF NOT EXISTS public.visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    purpose TEXT NOT NULL,
    office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
    office_name TEXT,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    room_number TEXT,
    host_person TEXT,
    photo_url TEXT, -- Face snapshot URL
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    check_out_time TIMESTAMP WITH TIME ZONE,
    room_check_in_time TIMESTAMP WITH TIME ZONE, -- Check-in timestamp inside target office/room
    status TEXT NOT NULL DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'checked_out', 'expired')),
    verification_status TEXT NOT NULL DEFAULT 'approved' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    pass_code TEXT UNIQUE NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

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

-- Offices Policies
CREATE POLICY "Public offices read access" ON public.offices FOR SELECT USING (true);
CREATE POLICY "Admin write access to offices" ON public.offices FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Rooms Policies
CREATE POLICY "Public rooms read access" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Admin write access to rooms" ON public.rooms FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Visitors Policies (Public inserts & checkouts, Guard/Staff management)
CREATE POLICY "Public visitor check-in insert" ON public.visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "Public visitor read pass" ON public.visitors FOR SELECT USING (true);
CREATE POLICY "Public visitor checkout update" ON public.visitors FOR UPDATE USING (true);
CREATE POLICY "Staff/Guard read all visitors" ON public.visitors FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'security', 'staff'))
);
CREATE POLICY "Staff/Guard update visitor status" ON public.visitors FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'security', 'staff'))
);

-- Auto-profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (new.id, new.email, 'staff'); -- Default role
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
