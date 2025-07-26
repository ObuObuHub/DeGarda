-- SQL Migration to add max_shifts_per_month column
-- Run this if you have an existing database

ALTER TABLE users ADD COLUMN max_shifts_per_month INTEGER DEFAULT 8;

-- Optionally update specific users who need different limits
-- Examples:
UPDATE users SET max_shifts_per_month = 6 WHERE personal_code = 'RUS1';  -- Rusu Raul
UPDATE users SET max_shifts_per_month = 5 WHERE personal_code = 'DUM1';  -- Dumitras Stefana
UPDATE users SET max_shifts_per_month = 7 WHERE personal_code = 'PRE1';  -- Preda Carla
UPDATE users SET max_shifts_per_month = 6 WHERE personal_code = 'APO1';  -- Apostu Teodora
UPDATE users SET max_shifts_per_month = 4 WHERE personal_code = 'LUP1';  -- Lupu Cosmina