-- Switch OTP login/registration identity from phone to email.
-- phone stays required (still the dedup key BearersService.create() upserts
-- on) -- only email moves from optional to required + unique.

-- AlterTable
ALTER TABLE "Bearer" ALTER COLUMN "email" SET NOT NULL;
CREATE UNIQUE INDEX "Bearer_email_key" ON "Bearer"("email");

-- AlterTable
ALTER TABLE "PendingRegistration" ALTER COLUMN "email" SET NOT NULL;
