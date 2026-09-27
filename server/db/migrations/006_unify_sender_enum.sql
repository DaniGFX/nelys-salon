-- ====================================================================
-- Migration: 006_unify_sender_enum.sql
-- Unify sender ENUM from ('customer', 'salon') to ('customer', 'admin', 'salon')
-- and migrate existing records to 'admin'
-- ====================================================================

ALTER TABLE `messages` 
  MODIFY COLUMN `sender` ENUM('customer', 'admin', 'salon') NOT NULL DEFAULT 'customer';

UPDATE `messages` 
  SET `sender` = 'admin' 
  WHERE `sender` = 'salon';
