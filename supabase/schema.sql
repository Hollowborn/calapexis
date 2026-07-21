-- Supabase SQL Schema for University Visitor Logbook & Map Navigation

-- 1. Offices Table
CREATE TABLE IF NOT EXISTS offices (
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
CREATE TABLE IF NOT EXISTS rooms (
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

-- 3. Visitors Table (Digital Logbook)
CREATE TABLE IF NOT EXISTS visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    purpose TEXT NOT NULL,
    office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
    office_name TEXT,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    room_number TEXT,
    host_person TEXT,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    check_out_time TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'checked_out', 'expired')),
    pass_code TEXT UNIQUE NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- Allow public read access to offices and rooms
CREATE POLICY "Public offices read access" ON offices FOR SELECT USING (true);
CREATE POLICY "Public rooms read access" ON rooms FOR SELECT USING (true);

-- Allow public inserts for visitor check-in
CREATE POLICY "Public visitor check-in insert" ON visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "Public visitor read pass" ON visitors FOR SELECT USING (true);
CREATE POLICY "Public visitor checkout update" ON visitors FOR UPDATE USING (true);
