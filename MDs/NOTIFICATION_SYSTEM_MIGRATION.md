# Calapexis Real-Time Notification System Database Migration

To enable the database-level notification trigger functions and persistent notification records in Supabase, run the following SQL script in your **[Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)**:

---

```sql
-- ==========================================================
-- 1. Create Notifications Table
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_role TEXT CHECK (recipient_role IN ('admin', 'security', 'staff', 'all')),
    office_id UUID REFERENCES public.offices(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pass_registered', 'desk_arrival', 'checkout', 'system')),
    link_url TEXT,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================================
-- 2. Enable Row Level Security (RLS) & Policies
-- ==========================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read notifications" ON public.notifications
    FOR SELECT TO authenticated USING (
        recipient_role = 'all'
        OR recipient_role = public.get_user_role(auth.uid())
        OR public.get_user_role(auth.uid()) = 'admin'
        OR (
            recipient_role = 'staff'
            AND office_id IN (SELECT office_id FROM public.profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Allow authenticated update own notifications" ON public.notifications
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow system/trigger insert notifications" ON public.notifications
    FOR INSERT TO public WITH CHECK (true);

-- ==========================================================
-- 3. Automatic Notification Trigger Function
-- ==========================================================
CREATE OR REPLACE FUNCTION public.handle_visitor_notification()
RETURNS TRIGGER AS $$
DECLARE
    visitor_name TEXT;
    office_title TEXT;
BEGIN
    -- Fetch visitor full name
    SELECT full_name INTO visitor_name FROM public.registered_visitors WHERE id = NEW.visitor_id;
    IF visitor_name IS NULL THEN
        visitor_name := 'Visitor';
    END IF;

    -- Fetch target office name
    SELECT name INTO office_title FROM public.offices WHERE id = NEW.office_id;
    IF office_title IS NULL THEN
        office_title := 'Campus Office';
    END IF;

    -- Event 1: New Visitor Registered / Entered Campus (Alert Security & Admin)
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.notifications (recipient_role, office_id, title, message, type, link_url)
        VALUES (
            'security',
            NEW.office_id,
            '🚨 New Visitor Registered',
            visitor_name || ' registered for ' || office_title || ' (Pass: ' || NEW.pass_code || ').',
            'pass_registered',
            '/dashboard/security'
        );
    END IF;

    -- Event 2: Visitor Arrived / Checked into Office Desk (Alert Office Staff)
    IF (TG_OP = 'UPDATE' AND NEW.status = 'checked_in' AND (OLD.status IS DISTINCT FROM 'checked_in')) THEN
        INSERT INTO public.notifications (recipient_role, office_id, title, message, type, link_url)
        VALUES (
            'staff',
            NEW.office_id,
            '🛎️ Visitor Arrived at Desk',
            visitor_name || ' has checked in at your desk for ' || NEW.purpose || '.',
            'desk_arrival',
            '/dashboard/staff'
        );
    END IF;

    -- Event 3: Visitor Checked Out (Alert Staff & Security)
    IF (TG_OP = 'UPDATE' AND NEW.status = 'checked_out' AND (OLD.status IS DISTINCT FROM 'checked_out')) THEN
        INSERT INTO public.notifications (recipient_role, office_id, title, message, type, link_url)
        VALUES (
            'staff',
            NEW.office_id,
            '👋 Visitor Departed',
            visitor_name || ' has checked out of ' || office_title || '.',
            'checkout',
            '/dashboard/staff'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to visitor_logs table
DROP TRIGGER IF EXISTS on_visitor_log_notification ON public.visitor_logs;
CREATE TRIGGER on_visitor_log_notification
    AFTER INSERT OR UPDATE ON public.visitor_logs
    FOR EACH ROW EXECUTE FUNCTION public.handle_visitor_notification();

-- ==========================================================
-- 4. Supabase Realtime Publication
-- ==========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

---

### Verification
Once run in Supabase, your database will automatically broadcast events to the `NotificationModal` and `NotificationBell` components via Supabase Realtime WebSockets!
