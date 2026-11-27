-- =====================================================================
--  Database safety-rule and Row-Level Security tests.
--  Runs inside a transaction that is ROLLED BACK at the end, so it
--  leaves no data behind. Counts only its own test rows (ids 9001+,
--  'test.%' audit actions), so it is safe to run on a database that
--  already holds real data.
--  Run with:  npm run db:test
-- =====================================================================
\set ON_ERROR_STOP on
\set QUIET on
BEGIN;
\o /dev/null
CREATE TEMP TABLE test_failures (label text);

-- Helper: run a statement that MUST fail, and report PASS/FAIL.
CREATE FUNCTION pg_temp.expect_fail(label text, stmt text) RETURNS void AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
    RAISE WARNING 'FAIL  % (statement was accepted)', label;
    INSERT INTO test_failures VALUES (label);
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'PASS  % -> rejected: %', label, SQLERRM;
  END;
END $$ LANGUAGE plpgsql;

CREATE FUNCTION pg_temp.expect_ok(label text, stmt text) RETURNS void AS $$
BEGIN
  EXECUTE stmt;
  RAISE NOTICE 'PASS  % -> accepted', label;
EXCEPTION WHEN others THEN
  RAISE WARNING 'FAIL  % (rejected: %)', label, SQLERRM;
  INSERT INTO test_failures VALUES (label);
END $$ LANGUAGE plpgsql;

-- Checks that a query returns exactly the expected number.
CREATE FUNCTION pg_temp.expect_count(label text, stmt text, expected bigint) RETURNS void AS $$
DECLARE got bigint;
BEGIN
  EXECUTE stmt INTO got;
  IF got = expected THEN
    RAISE NOTICE 'PASS  % -> %', label, got;
  ELSE
    RAISE WARNING 'FAIL  % (expected %, got %)', label, expected, got;
    INSERT INTO test_failures VALUES (label);
  END IF;
EXCEPTION WHEN others THEN
  RAISE WARNING 'FAIL  % (error: %)', label, SQLERRM;
  INSERT INTO test_failures VALUES (label);
END $$ LANGUAGE plpgsql;

-- Switch the Row-Level Security identity (lasts until the transaction ends).
CREATE FUNCTION pg_temp.act_as(role text, school text DEFAULT '') RETURNS void AS $$
  SELECT set_config('app.role', role, true), set_config('app.school_id', school, true);
$$ LANGUAGE sql;

-- The constraint tests below run with full "system" access.
SELECT pg_temp.act_as('system');

-- ---------- Sample data: two schools ----------
INSERT INTO schools (id, name, slug, timezone, updated_at) VALUES
  (9001, 'Test School A', 'test-school-a', 'Asia/Karachi', now()),
  (9002, 'Test School B', 'test-school-b', 'Asia/Karachi', now());
INSERT INTO class_groups (id, school_id, name, updated_at) VALUES
  (9001, 9001, 'Grade 1', now()),
  (9002, 9002, 'Grade 1', now());
INSERT INTO students (id, school_id, student_code, full_name, class_group_id, qr_token, updated_at) VALUES
  (9001, 9001, 'A-001', 'Student A', 9001, 'tokenAAAAAAAAAAAAAAAAA', now()),
  (9002, 9002, 'B-001', 'Student B', 9002, 'tokenBBBBBBBBBBBBBBBBBB', now());
INSERT INTO plans (id, name, storage_limit_bytes, price_minor, currency, billing_period, updated_at) VALUES
  (9001, 'Test Plan', 524288000, 250000, 'PKR', 'MONTHLY', now());
\echo '--- Student photos ---'
SELECT pg_temp.expect_fail('Photo of a School B student filed under School A',
  $q$INSERT INTO student_photos (student_id, school_id, content_type, bytes, data) VALUES (9002, 9001, 'image/jpeg', 1, '\xff')$q$);
INSERT INTO student_photos (student_id, school_id, content_type, bytes, data) VALUES
  (9001, 9001, 'image/jpeg', 4, '\xffd8ffe0'),
  (9002, 9002, 'image/jpeg', 4, '\xffd8ffe0');
SELECT pg_temp.expect_fail('Photo must be an image type',
  $q$UPDATE student_photos SET content_type = 'text/html' WHERE student_id = 9001$q$);
SELECT pg_temp.expect_fail('Photo size must match its data',
  $q$UPDATE student_photos SET bytes = 999 WHERE student_id = 9001$q$);

\echo '--- Tenant isolation (cross-school links) ---'
SELECT pg_temp.expect_fail('Attendance for School B student filed under School A',
  $q$INSERT INTO attendance (student_id, date, school_id, status, source) VALUES (9002, '2026-11-24', 9001, 'PRESENT', 'QR_SCAN')$q$);
SELECT pg_temp.expect_fail('School A student placed in School B class',
  $q$UPDATE students SET class_group_id = 9002 WHERE id = 9001$q$);
-- (Both schools already have a class named 'Grade 1' in the sample data,
--  which proves the same class name is allowed in different schools.)

\echo '--- Attendance rules ---'
SELECT pg_temp.expect_ok('First attendance of the day',
  $q$INSERT INTO attendance (student_id, date, school_id, status, source) VALUES (9001, '2026-11-24', 9001, 'PRESENT', 'QR_SCAN')$q$);
SELECT pg_temp.expect_fail('Duplicate attendance same student same day',
  $q$INSERT INTO attendance (student_id, date, school_id, status, source) VALUES (9001, '2026-11-24', 9001, 'PRESENT', 'QR_SCAN')$q$);
SELECT pg_temp.expect_ok('Same student, next day',
  $q$INSERT INTO attendance (student_id, date, school_id, status, source) VALUES (9001, '2026-11-25', 9001, 'ABSENT', 'MANUAL')$q$);
SELECT pg_temp.expect_fail('Deleting a student who has attendance history',
  $q$DELETE FROM students WHERE id = 9001$q$);
SELECT pg_temp.expect_fail('Deleting a school that has data',
  $q$DELETE FROM schools WHERE id = 9001$q$);

\echo '--- Students ---'
SELECT pg_temp.expect_fail('Duplicate student code in same school',
  $q$INSERT INTO students (school_id, student_code, full_name, qr_token, updated_at) VALUES (9001, 'A-001', 'Dup', 'tokenCCCCCCCCCCCCCCCCCC', now())$q$);
SELECT pg_temp.expect_ok('Same student code in a different school',
  $q$INSERT INTO students (school_id, student_code, full_name, qr_token, updated_at) VALUES (9002, 'A-001', 'Other', 'tokenDDDDDDDDDDDDDDDDDD', now())$q$);
SELECT pg_temp.expect_fail('Duplicate QR token',
  $q$INSERT INTO students (school_id, student_code, full_name, qr_token, updated_at) VALUES (9001, 'A-002', 'X', 'tokenAAAAAAAAAAAAAAAAA', now())$q$);
SELECT pg_temp.expect_fail('QR token too short (guessable)',
  $q$INSERT INTO students (school_id, student_code, full_name, qr_token, updated_at) VALUES (9001, 'A-003', 'X', 'abc123', now())$q$);
SELECT pg_temp.expect_fail('Photo key without photo size',
  $q$UPDATE students SET photo_key = 'photos/x.jpg' WHERE id = 9001$q$);

\echo '--- Users ---'
SELECT pg_temp.expect_fail('School Admin without a school',
  $q$INSERT INTO users (role, email, full_name, password_hash, updated_at) VALUES ('SCHOOL_ADMIN', 'a@x.com', 'A', 'test-hash', now())$q$);
SELECT pg_temp.expect_fail('Super Admin attached to a school',
  $q$INSERT INTO users (role, school_id, email, full_name, password_hash, updated_at) VALUES ('SUPER_ADMIN', 9001, 'b@x.com', 'B', 'test-hash', now())$q$);
SELECT pg_temp.expect_fail('Email with capital letters',
  $q$INSERT INTO users (role, school_id, email, full_name, password_hash, updated_at) VALUES ('SCHOOL_ADMIN', 9001, 'Ali@X.com', 'C', 'test-hash', now())$q$);
SELECT pg_temp.expect_ok('Two admins for the same school',
  $q$INSERT INTO users (id, role, school_id, email, full_name, password_hash, updated_at) VALUES (9001, 'SCHOOL_ADMIN', 9001, 'one@x.com', 'One', 'test-hash', now()), (9002, 'SCHOOL_ADMIN', 9001, 'two@x.com', 'Two', 'test-hash', now())$q$);

SELECT pg_temp.expect_fail('User without a password hash',
  $q$INSERT INTO users (role, school_id, email, full_name, updated_at) VALUES ('SCHOOL_ADMIN', 9001, 'nopw@x.com', 'N', now())$q$);
SELECT pg_temp.expect_fail('Negative failed-login counter',
  $q$UPDATE users SET failed_login_count = -1 WHERE id = 9001$q$);

\echo '--- Sessions ---'
SELECT pg_temp.expect_ok('Session stored as a 64-char SHA-256 hash',
  $q$INSERT INTO sessions (id, user_id, expires_at) VALUES (repeat('a', 64), 9002, now() + interval '7 days')$q$);
SELECT pg_temp.expect_fail('Session id that is a raw token (not a hash)',
  $q$INSERT INTO sessions (id, user_id, expires_at) VALUES ('raw-cookie-token-value-should-never-be-stored-here-xxxxxxxxxxxxx', 9001, now())$q$);
SELECT pg_temp.expect_ok('Deleting a user removes their sessions automatically',
  $q$DELETE FROM users WHERE id = 9002$q$);
SELECT pg_temp.expect_fail('...and the session is really gone',
  $q$DO $d$ BEGIN IF EXISTS (SELECT 1 FROM sessions WHERE user_id = 9002) THEN RAISE EXCEPTION 'still there'; END IF; RAISE EXCEPTION 'gone (expected)'; END $d$$q$);

\echo '--- Schools, plans, subscriptions, payments ---'
SELECT pg_temp.expect_fail('School slug with spaces/capitals',
  $q$INSERT INTO schools (name, slug, timezone, updated_at) VALUES ('X', 'Bad Slug', 'UTC', now())$q$);
SELECT pg_temp.expect_fail('Plan with zero storage',
  $q$INSERT INTO plans (name, storage_limit_bytes, price_minor, currency, billing_period, updated_at) VALUES ('Zero', 0, 0, 'PKR', 'MONTHLY', now())$q$);
SELECT pg_temp.expect_fail('Invalid currency code',
  $q$INSERT INTO plans (name, storage_limit_bytes, price_minor, currency, billing_period, updated_at) VALUES ('Cur', 1, 0, 'rs', 'MONTHLY', now())$q$);
SELECT pg_temp.expect_ok('First active subscription',
  $q$INSERT INTO subscriptions (id, school_id, plan_id, status, storage_limit_bytes, price_minor, currency, starts_at, ends_at, updated_at) VALUES (9001, 9001, 9001, 'ACTIVE', 524288000, 250000, 'PKR', '2026-11-01', '2026-12-01', now())$q$);
SELECT pg_temp.expect_fail('Second active subscription for same school',
  $q$INSERT INTO subscriptions (school_id, plan_id, status, storage_limit_bytes, price_minor, currency, starts_at, ends_at, updated_at) VALUES (9001, 9001, 'TRIAL', 524288000, 0, 'PKR', '2026-11-01', '2026-12-01', now())$q$);
SELECT pg_temp.expect_ok('Old expired subscription alongside the active one',
  $q$INSERT INTO subscriptions (school_id, plan_id, status, storage_limit_bytes, price_minor, currency, starts_at, ends_at, updated_at) VALUES (9001, 9001, 'EXPIRED', 524288000, 250000, 'PKR', '2026-10-01', '2026-11-01', now())$q$);
SELECT pg_temp.expect_fail('Subscription ending before it starts',
  $q$INSERT INTO subscriptions (school_id, plan_id, status, storage_limit_bytes, price_minor, currency, starts_at, ends_at, updated_at) VALUES (9002, 9001, 'ACTIVE', 1, 0, 'PKR', '2026-12-01', '2026-11-01', now())$q$);
SELECT pg_temp.expect_fail('Payment by School B against School A subscription',
  $q$INSERT INTO payments (school_id, subscription_id, amount_minor, currency, method, paid_on) VALUES (9002, 9001, 1000, 'PKR', 'CASH', '2026-11-24')$q$);
SELECT pg_temp.expect_fail('Zero or negative payment',
  $q$INSERT INTO payments (school_id, amount_minor, currency, method, paid_on) VALUES (9001, 0, 'PKR', 'CASH', '2026-11-24')$q$);
SELECT pg_temp.expect_ok('Valid payment',
  $q$INSERT INTO payments (school_id, subscription_id, amount_minor, currency, method, paid_on) VALUES (9001, 9001, 250000, 'PKR', 'BANK_TRANSFER', '2026-11-24')$q$);


-- =====================================================================
--  ROW-LEVEL SECURITY
--  Sample data now: School A = 9001 (1 student), School B = 9002
--  (2 students), 1 plan, School A has subscriptions/payments.
-- =====================================================================
SELECT pg_temp.act_as('system');
INSERT INTO users (id, role, email, full_name, password_hash, updated_at)
  VALUES (9100, 'SUPER_ADMIN', 'root@x.com', 'Root', 'test-hash', now());
INSERT INTO users (id, role, school_id, email, full_name, password_hash, updated_at)
  VALUES (9200, 'SCHOOL_ADMIN', 9002, 'admin@b.com', 'Admin B', 'test-hash', now());
INSERT INTO sessions (id, user_id, expires_at) VALUES (repeat('b', 64), 9100, now() + interval '1 day');
INSERT INTO attendance (student_id, date, school_id, status, source) VALUES (9002, '2026-11-24', 9002, 'PRESENT', 'QR_SCAN');
INSERT INTO audit_logs (school_id, action) VALUES (9001, 'test.a'), (9002, 'test.b'), (NULL, 'test.platform');

\echo '--- RLS: no identity declared (must see nothing) ---'
SELECT pg_temp.act_as('');
SELECT pg_temp.expect_count('No identity: schools visible',  'SELECT count(*) FROM schools', 0);
SELECT pg_temp.expect_count('No identity: students visible', 'SELECT count(*) FROM students', 0);
SELECT pg_temp.expect_count('No identity: users visible',    'SELECT count(*) FROM users', 0);
SELECT pg_temp.expect_count('No identity: sessions visible', 'SELECT count(*) FROM sessions', 0);
SELECT pg_temp.expect_count('No identity: audit log visible','SELECT count(*) FROM audit_logs', 0);
SELECT pg_temp.expect_count('No identity: photos visible',  'SELECT count(*) FROM student_photos', 0);
SELECT pg_temp.expect_fail('No identity: insert a student',
  $q$INSERT INTO students (school_id, student_code, full_name, qr_token, updated_at) VALUES (9001, 'N-1', 'X', 'tokenNNNNNNNNNNNNNNNNNN', now())$q$);
SELECT pg_temp.act_as('hacker', '9001');
SELECT pg_temp.expect_count('Made-up role with a school id sees nothing', 'SELECT count(*) FROM students', 0);
SELECT pg_temp.act_as('super_admin', '9001');
SELECT pg_temp.expect_count('super_admin with a school id still sees platform', 'SELECT count(*) FROM schools WHERE id IN (9001, 9002)', 2);

\echo '--- RLS: School Admin of School A ---'
SELECT pg_temp.act_as('school_admin', '9001');
SELECT pg_temp.expect_count('Sees only own school row',              'SELECT count(*) FROM schools', 1);
SELECT pg_temp.expect_count('Sees only own students',                'SELECT count(*) FROM students', 1);
SELECT pg_temp.expect_count('Cannot read School B student by id',    'SELECT count(*) FROM students WHERE id = 9002', 0);
SELECT pg_temp.expect_count('Cannot see School B attendance',        'SELECT count(*) FROM attendance WHERE school_id = 9002', 0);
SELECT pg_temp.expect_count('Sees only own student photos',          'SELECT count(*) FROM student_photos', 1);
SELECT pg_temp.expect_count('Cannot read School B photo',            'SELECT count(*) FROM student_photos WHERE student_id = 9002', 0);
SELECT pg_temp.expect_count('Deleting School B photo changes nothing',
  $q$WITH d AS (DELETE FROM student_photos WHERE student_id = 9002 RETURNING 1) SELECT count(*) FROM d$q$, 0);
SELECT pg_temp.expect_count('Sees only own school''s admins',         'SELECT count(*) FROM users WHERE school_id IS DISTINCT FROM 9001', 0);
SELECT pg_temp.expect_count('Cannot see Super Admin accounts',        $q$SELECT count(*) FROM users WHERE role = 'SUPER_ADMIN'$q$, 0);
SELECT pg_temp.expect_count('Sees own subscriptions only',            'SELECT count(*) FROM subscriptions WHERE school_id <> 9001', 0);
SELECT pg_temp.expect_count('Can read the plan list',                 'SELECT count(*) FROM plans', 1);
SELECT pg_temp.expect_count('Cannot see any login sessions',          'SELECT count(*) FROM sessions', 0);
SELECT pg_temp.expect_count('Audit log: sees only own school entries','SELECT count(*) FROM audit_logs WHERE school_id IS DISTINCT FROM 9001', 0);

SELECT pg_temp.expect_ok('Can add a student to own school',
  $q$INSERT INTO students (school_id, student_code, full_name, qr_token, updated_at) VALUES (9001, 'A-100', 'New', 'tokenEEEEEEEEEEEEEEEEEE', now())$q$);
SELECT pg_temp.expect_ok('Can mark own student''s attendance',
  $q$INSERT INTO attendance (student_id, date, school_id, status, source) VALUES (9001, '2026-11-26', 9001, 'PRESENT', 'QR_SCAN')$q$);
SELECT pg_temp.expect_fail('Cannot add a student to School B',
  $q$INSERT INTO students (school_id, student_code, full_name, qr_token, updated_at) VALUES (9002, 'B-100', 'Evil', 'tokenFFFFFFFFFFFFFFFFFF', now())$q$);
SELECT pg_temp.expect_fail('Cannot store a photo for School B',
  $q$INSERT INTO student_photos (student_id, school_id, content_type, bytes, data) VALUES (9002, 9002, 'image/png', 1, '\x89')$q$);
SELECT pg_temp.expect_fail('Cannot mark School B attendance',
  $q$INSERT INTO attendance (student_id, date, school_id, status, source) VALUES (9002, '2026-11-26', 9002, 'PRESENT', 'QR_SCAN')$q$);
SELECT pg_temp.expect_fail('Cannot move own student into School B',
  $q$UPDATE students SET school_id = 9002 WHERE id = 9001$q$);
SELECT pg_temp.expect_count('Renaming a School B student changes nothing',
  $q$WITH u AS (UPDATE students SET full_name = 'Hacked' WHERE id = 9002 RETURNING 1) SELECT count(*) FROM u$q$, 0);
SELECT pg_temp.expect_count('Deleting School B attendance changes nothing',
  $q$WITH d AS (DELETE FROM attendance WHERE school_id = 9002 RETURNING 1) SELECT count(*) FROM d$q$, 0);
SELECT pg_temp.expect_count('Cannot edit own school record (read-only)',
  $q$WITH u AS (UPDATE schools SET name = 'Renamed' WHERE id = 9001 RETURNING 1) SELECT count(*) FROM u$q$, 0);
SELECT pg_temp.expect_count('Cannot extend own subscription',
  $q$WITH u AS (UPDATE subscriptions SET ends_at = ends_at + interval '10 years' RETURNING 1) SELECT count(*) FROM u$q$, 0);
SELECT pg_temp.expect_count('Cannot promote self to Super Admin',
  $q$WITH u AS (UPDATE users SET role = 'SUPER_ADMIN', school_id = NULL WHERE id = 9001 RETURNING 1) SELECT count(*) FROM u$q$, 0);
SELECT pg_temp.expect_count('Cannot change plan prices',
  $q$WITH u AS (UPDATE plans SET price_minor = 0 RETURNING 1) SELECT count(*) FROM u$q$, 0);
SELECT pg_temp.expect_fail('Cannot create a plan',
  $q$INSERT INTO plans (name, storage_limit_bytes, price_minor, currency, billing_period, updated_at) VALUES ('Free', 1, 0, 'PKR', 'YEARLY', now())$q$);
SELECT pg_temp.expect_fail('Cannot record a payment',
  $q$INSERT INTO payments (school_id, amount_minor, currency, method, paid_on) VALUES (9001, 1, 'PKR', 'CASH', '2026-11-24')$q$);
SELECT pg_temp.expect_fail('Cannot create a user',
  $q$INSERT INTO users (role, school_id, email, full_name, password_hash, updated_at) VALUES ('SCHOOL_ADMIN', 9001, 'new@x.com', 'N', 'h', now())$q$);
SELECT pg_temp.expect_fail('Cannot create a login session',
  $q$INSERT INTO sessions (id, user_id, expires_at) VALUES (repeat('c', 64), 9001, now() + interval '1 day')$q$);
SELECT pg_temp.expect_ok('Can write own school audit entry',
  $q$INSERT INTO audit_logs (school_id, action) VALUES (9001, 'test.ok')$q$);
SELECT pg_temp.expect_fail('Cannot write audit entry for School B',
  $q$INSERT INTO audit_logs (school_id, action) VALUES (9002, 'test.fake')$q$);
SELECT pg_temp.expect_fail('Cannot write platform-level audit entry',
  $q$INSERT INTO audit_logs (school_id, action) VALUES (NULL, 'test.fake')$q$);
SELECT pg_temp.expect_count('Cannot edit audit entries',
  $q$WITH u AS (UPDATE audit_logs SET action = 'x' WHERE action LIKE 'test.%' RETURNING 1) SELECT count(*) FROM u$q$, 0);
SELECT pg_temp.expect_count('Cannot delete audit entries',
  $q$WITH d AS (DELETE FROM audit_logs WHERE action LIKE 'test.%' RETURNING 1) SELECT count(*) FROM d$q$, 0);

\echo '--- RLS: School Admin of School B (mirror check) ---'
SELECT pg_temp.act_as('school_admin', '9002');
SELECT pg_temp.expect_count('School B sees its 2 students, not A''s', 'SELECT count(*) FROM students', 2);
SELECT pg_temp.expect_count('School B cannot see A''s new student', $q$SELECT count(*) FROM students WHERE student_code = 'A-100'$q$, 0);
SELECT pg_temp.expect_count('School B data untouched by A''s attempts', $q$SELECT count(*) FROM students WHERE full_name = 'Hacked'$q$, 0);

\echo '--- RLS: Super Admin ---'
SELECT pg_temp.act_as('super_admin');
SELECT pg_temp.expect_count('Sees all (test) schools',    'SELECT count(*) FROM schools WHERE id IN (9001, 9002)', 2);
SELECT pg_temp.expect_count('Sees all (test) students',   'SELECT count(*) FROM students WHERE school_id IN (9001, 9002)', 4);
SELECT pg_temp.expect_ok('Can edit a school',             $q$UPDATE schools SET name = 'Renamed A' WHERE id = 9001$q$);
SELECT pg_temp.expect_ok('Can create a plan',
  $q$INSERT INTO plans (name, storage_limit_bytes, price_minor, currency, billing_period, updated_at) VALUES ('Gold', 1073741824, 500000, 'PKR', 'YEARLY', now())$q$);
SELECT pg_temp.expect_count('Cannot see any login sessions', 'SELECT count(*) FROM sessions', 0);
SELECT pg_temp.expect_count('Reads all (test) audit entries, any school', $q$SELECT count(*) FROM audit_logs WHERE action LIKE 'test.%'$q$, 4);
SELECT pg_temp.expect_count('Cannot edit audit entries',
  $q$WITH u AS (UPDATE audit_logs SET action = 'x' WHERE action LIKE 'test.%' RETURNING 1) SELECT count(*) FROM u$q$, 0);
SELECT pg_temp.expect_count('Cannot delete audit entries',
  $q$WITH d AS (DELETE FROM audit_logs WHERE action LIKE 'test.%' RETURNING 1) SELECT count(*) FROM d$q$, 0);

\echo '--- Platform settings and notifications ---'
SELECT pg_temp.act_as('system');
INSERT INTO users (id, role, school_id, email, full_name, password_hash, updated_at) VALUES
  (9003, 'SCHOOL_ADMIN', 9002, 'b-admin@x.com', 'B Admin', 'test-hash', now());
INSERT INTO notifications (id, school_id, title, body) VALUES
  (9001, NULL, 'To all', 'Hello everyone'),
  (9002, 9001, 'To A',   'Only for A'),
  (9003, 9002, 'To B',   'Only for B');
SELECT pg_temp.expect_fail('Second settings row',
  $q$INSERT INTO platform_settings (id, updated_at) VALUES (2, now())$q$);
SELECT pg_temp.expect_fail('Blank platform name',
  $q$UPDATE platform_settings SET platform_name = '  ' WHERE id = 1$q$);
SELECT pg_temp.expect_fail('Notification without a title',
  $q$INSERT INTO notifications (title, body) VALUES (' ', 'x')$q$);
SELECT pg_temp.expect_fail('Read receipt linking a School A admin to School B',
  $q$INSERT INTO notification_reads (notification_id, user_id, school_id) VALUES (9001, 9001, 9002)$q$);

SELECT pg_temp.act_as('school_admin', '9001');
SELECT pg_temp.expect_count('School can read the settings',           'SELECT count(*) FROM platform_settings', 1);
SELECT pg_temp.expect_count('School cannot change the settings',
  $q$WITH u AS (UPDATE platform_settings SET platform_name = 'Hacked' RETURNING 1) SELECT count(*) FROM u$q$, 0);
SELECT pg_temp.expect_count('School A sees "all" + its own notifications', 'SELECT count(*) FROM notifications WHERE id IN (9001, 9002, 9003)', 2);
SELECT pg_temp.expect_count('School A cannot see School B''s notification', 'SELECT count(*) FROM notifications WHERE id = 9003', 0);
SELECT pg_temp.expect_fail('School cannot send a notification',
  $q$INSERT INTO notifications (school_id, title, body) VALUES (9001, 'Fake', 'x')$q$);
SELECT pg_temp.expect_count('School cannot delete a notification',
  $q$WITH d AS (DELETE FROM notifications WHERE id IN (9001, 9002) RETURNING 1) SELECT count(*) FROM d$q$, 0);
SELECT pg_temp.expect_ok('School A admin marks a notification read',
  $q$INSERT INTO notification_reads (notification_id, user_id, school_id) VALUES (9002, 9001, 9001)$q$);
SELECT pg_temp.expect_fail('Cannot mark School B''s notification read',
  $q$INSERT INTO notification_reads (notification_id, user_id, school_id) VALUES (9003, 9001, 9001)$q$);
SELECT pg_temp.expect_fail('Cannot write a read receipt for School B',
  $q$INSERT INTO notification_reads (notification_id, user_id, school_id) VALUES (9001, 9003, 9002)$q$);

SELECT pg_temp.act_as('school_admin', '9002');
SELECT pg_temp.expect_count('School B cannot see A''s read receipts', 'SELECT count(*) FROM notification_reads', 0);

SELECT pg_temp.act_as('super_admin');
SELECT pg_temp.expect_ok('Super Admin changes the settings',
  $q$UPDATE platform_settings SET support_email = 'help@x.com' WHERE id = 1$q$);
SELECT pg_temp.expect_count('Super Admin sees all notifications', 'SELECT count(*) FROM notifications WHERE id IN (9001, 9002, 9003)', 3);
SELECT pg_temp.expect_count('Super Admin sees School A''s read receipt', 'SELECT count(*) FROM notification_reads WHERE notification_id = 9002', 1);
SELECT pg_temp.expect_ok('Super Admin deletes a notification', 'DELETE FROM notifications WHERE id = 9002');
SELECT pg_temp.expect_count('...and its read receipts go with it', 'SELECT count(*) FROM notification_reads WHERE notification_id = 9002', 0);

SELECT pg_temp.act_as('');
SELECT pg_temp.expect_count('No identity: settings invisible',      'SELECT count(*) FROM platform_settings', 0);
SELECT pg_temp.expect_count('No identity: notifications invisible', 'SELECT count(*) FROM notifications', 0);

\echo '--- RLS: internal system scope ---'
SELECT pg_temp.act_as('system');
SELECT pg_temp.expect_count('System can read sessions (for login checks)', $q$SELECT count(*) FROM sessions WHERE id = repeat('b', 64)$q$, 1);
SELECT pg_temp.expect_count('Even system cannot delete audit entries',
  $q$WITH d AS (DELETE FROM audit_logs WHERE action LIKE 'test.%' RETURNING 1) SELECT count(*) FROM d$q$, 0);

-- Stop with an error if any check failed.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM test_failures;
  IF n > 0 THEN
    RAISE EXCEPTION '% CHECK(S) FAILED', n;
  END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;

ROLLBACK;
\echo '--- Done. All test data rolled back. ---'
