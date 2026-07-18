-- ============================================================
-- Campus Connect — Supabase Database Schema
-- Run this entire script in your Supabase SQL Editor once.
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- ── Users (mirrors Firebase Auth) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  uid          TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('student', 'professor', 'admin')),
  college      TEXT DEFAULT '',
  department   TEXT DEFAULT '',
  roll_number  TEXT DEFAULT '',
  employee_id  TEXT DEFAULT '',
  photo_url    TEXT DEFAULT '',
  joined_classes TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Classes ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject        TEXT NOT NULL,
  name           TEXT NOT NULL,
  department     TEXT NOT NULL,
  year           TEXT NOT NULL,
  division       TEXT NOT NULL,
  semester       TEXT NOT NULL,
  college        TEXT DEFAULT '',
  professor_id   TEXT NOT NULL,
  professor_name TEXT NOT NULL,
  join_code      TEXT NOT NULL UNIQUE,
  students       TEXT[] DEFAULT '{}',
  archived       BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Assignments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  instructions    TEXT NOT NULL DEFAULT '',
  subject         TEXT NOT NULL DEFAULT '',
  due_date        TEXT NOT NULL,
  attachment_url  TEXT DEFAULT '',
  attachment_name TEXT DEFAULT '',
  created_by      TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'completed')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Submissions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    TEXT NOT NULL,
  student_name  TEXT NOT NULL,
  file_url      TEXT NOT NULL DEFAULT '',
  file_name     TEXT NOT NULL DEFAULT '',
  comment       TEXT DEFAULT '',
  status        TEXT DEFAULT 'submitted',
  marks         INTEGER,
  remarks       TEXT DEFAULT '',
  submitted_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Attendance ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id       UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date           TEXT NOT NULL,
  subject        TEXT NOT NULL DEFAULT '',
  professor_id   TEXT NOT NULL,
  professor_name TEXT NOT NULL DEFAULT '',
  records        JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Resources ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  subject       TEXT NOT NULL DEFAULT '',
  unit          TEXT DEFAULT '',
  type          TEXT NOT NULL,
  file_url      TEXT NOT NULL DEFAULT '',
  file_name     TEXT NOT NULL DEFAULT '',
  file_size     BIGINT DEFAULT 0,
  uploaded_by   TEXT NOT NULL,
  uploader_name TEXT NOT NULL DEFAULT '',
  visibility    TEXT DEFAULT 'all',
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Announcements ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL DEFAULT '',
  attachment_url  TEXT DEFAULT '',
  pinned          BOOLEAN DEFAULT FALSE,
  created_by      TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Meetings ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  date            TEXT NOT NULL,
  time            TEXT NOT NULL,
  meeting_link    TEXT NOT NULL DEFAULT '',
  agenda          TEXT DEFAULT '',
  created_by      TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Queries ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS queries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type           TEXT NOT NULL,
  subject        TEXT NOT NULL DEFAULT '',
  class_id       UUID REFERENCES classes(id),
  student_id     TEXT NOT NULL,
  student_name   TEXT NOT NULL,
  professor_id   TEXT NOT NULL,
  professor_name TEXT NOT NULL DEFAULT '',
  message        TEXT NOT NULL,
  attachment_url TEXT DEFAULT '',
  status         TEXT DEFAULT 'open',
  reply          TEXT DEFAULT '',
  replied_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Chat Messages ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  sender_id   TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  reply_to    UUID REFERENCES chat_messages(id),
  reported    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  link       TEXT DEFAULT '',
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security (open policies — Firebase Auth handles auth layer) ──────
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance     ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources      ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

-- Allow all anon key operations (Firebase Auth handles role enforcement in app layer)
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY['users','classes','assignments','submissions','attendance',
                          'resources','announcements','meetings','queries',
                          'chat_messages','notifications'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Drop policy if exists (PostgreSQL does not support CREATE POLICY IF NOT EXISTS)
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_%s" ON %I', tbl, tbl);
    -- Create the policy
    EXECUTE format(
      'CREATE POLICY "allow_all_%s" ON %I FOR ALL USING (true) WITH CHECK (true)',
      tbl, tbl
    );
  END LOOP;
END $$;
