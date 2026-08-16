-- Backing sequence for auto-generated membership numbers (format: VA000001,
-- VA000002, ...). A Postgres SEQUENCE gives atomic nextval() under
-- concurrent bearer creation without a separate counter-table lock.
CREATE SEQUENCE "bearer_membership_seq" START 1;
