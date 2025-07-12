-- Clear Database Script for DeGarda
-- This script safely removes all data while preserving the database structure

-- First, disable foreign key checks temporarily (if using PostgreSQL)
-- Note: In PostgreSQL, you need to drop constraints or delete in order

-- Delete in reverse dependency order to avoid foreign key violations

-- 1. Delete notifications (depends on staff)
DELETE FROM notifications;

-- 2. Delete staff unavailability (depends on staff)
DELETE FROM staff_unavailability;

-- 3. Delete shift swaps (depends on shifts and staff)
DELETE FROM shift_swaps;

-- 4. Delete shift reservations (depends on shifts and staff)
DELETE FROM shift_reservations;

-- 5. Delete shifts (depends on staff and hospitals)
DELETE FROM shifts;

-- 6. Delete staff (depends on hospitals)
DELETE FROM staff;

-- 7. Delete hospitals (no dependencies)
DELETE FROM hospitals;

-- Reset sequences to start from 1 again
ALTER SEQUENCE hospitals_id_seq RESTART WITH 1;
ALTER SEQUENCE staff_id_seq RESTART WITH 1;
ALTER SEQUENCE shifts_id_seq RESTART WITH 1;
ALTER SEQUENCE shift_reservations_id_seq RESTART WITH 1;
ALTER SEQUENCE shift_swaps_id_seq RESTART WITH 1;
ALTER SEQUENCE staff_unavailability_id_seq RESTART WITH 1;
ALTER SEQUENCE notifications_id_seq RESTART WITH 1;

-- Confirm completion
SELECT 'Database cleared successfully!' as status;