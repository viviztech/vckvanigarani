-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "rank" INTEGER NOT NULL DEFAULT 0;

-- Backfill: real hierarchy order (state down to town), as given at seed time.
UPDATE "Post" SET "rank" = 1 WHERE name = 'முதன்மைச் செயலாளர்';
UPDATE "Post" SET "rank" = 2 WHERE name = 'ஒருங்கிணைப்பாளர்';
UPDATE "Post" SET "rank" = 3 WHERE name = 'நிதிச் செயலாளர்';
UPDATE "Post" SET "rank" = 4 WHERE name = 'மாநிலச் செயலாளர்';
UPDATE "Post" SET "rank" = 5 WHERE name = 'மாநில துணைச் செயலாளர்';
UPDATE "Post" SET "rank" = 6 WHERE name = 'மாவட்ட அமைப்பாளர்';
UPDATE "Post" SET "rank" = 7 WHERE name = 'மாவட்ட நிதிச் செயலாளர்';
UPDATE "Post" SET "rank" = 8 WHERE name = 'மாவட்ட துணை அமைப்பாளர்';
UPDATE "Post" SET "rank" = 9 WHERE name = 'ஒன்றிய அமைப்பாளர்';
UPDATE "Post" SET "rank" = 10 WHERE name = 'ஒன்றிய துணை அமைப்பாளர்';
UPDATE "Post" SET "rank" = 11 WHERE name = 'நகர அமைப்பாளர்';
UPDATE "Post" SET "rank" = 12 WHERE name = 'நகர துணை அமைப்பாளர்';
