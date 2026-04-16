-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT,
    "direction" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "fee" REAL NOT NULL DEFAULT 0,
    "date" DATETIME NOT NULL,
    "strategy" TEXT,
    "notes" TEXT,
    "emotion" TEXT,
    "account" TEXT NOT NULL DEFAULT '默认账户',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Trade" ("createdAt", "date", "direction", "emotion", "fee", "id", "name", "notes", "price", "quantity", "strategy", "symbol", "updatedAt") SELECT "createdAt", "date", "direction", "emotion", "fee", "id", "name", "notes", "price", "quantity", "strategy", "symbol", "updatedAt" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
