-- update-pwd.sql
UPDATE users
SET password = '$2a$12$R.S4oO4Tj1.x0m1q7/Z9s.A.z1sEEXN95vLZX8Yx06x2Z71Q2iT/C' -- This is bcrypt hash for 'PodERP@2026'
WHERE email = 'gia.bao@baohuynh.io.vn';
