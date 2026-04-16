/**
 * 把本地 SQLite dev.db 里的数据导出成 PostgreSQL INSERT SQL
 * 运行方式：node scripts/export-sqlite.mjs
 * 生成文件：scripts/seed-data.sql
 */

import Database from 'better-sqlite3'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = resolve(__dirname, '../dev.db')
const db = new Database(dbPath, { readonly: true })

function escape(val) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  return `'${String(val).replace(/'/g, "''")}'`
}

let sql = '-- 由 export-sqlite.mjs 自动生成\n'
sql += 'BEGIN;\n\n'

// 导出 Trade 表
const trades = db.prepare('SELECT * FROM Trade ORDER BY createdAt ASC').all()
sql += `-- Trade 表共 ${trades.length} 条\n`
for (const t of trades) {
  sql += `INSERT INTO "Trade" (id, symbol, name, direction, price, quantity, fee, date, strategy, notes, emotion, account, "createdAt", "updatedAt") VALUES (`
  sql += [
    escape(t.id),
    escape(t.symbol),
    escape(t.name),
    escape(t.direction),
    escape(t.price),
    escape(t.quantity),
    escape(t.fee),
    escape(t.date),
    escape(t.strategy),
    escape(t.notes),
    escape(t.emotion),
    escape(t.account),
    escape(t.createdAt),
    escape(t.updatedAt),
  ].join(', ')
  sql += `);\n`
}

sql += '\n'

// 导出 Watchlist 表
const watchlist = db.prepare('SELECT * FROM Watchlist ORDER BY addedAt ASC').all()
sql += `-- Watchlist 表共 ${watchlist.length} 条\n`
for (const w of watchlist) {
  sql += `INSERT INTO "Watchlist" (id, symbol, name, notes, "addedAt") VALUES (`
  sql += [
    escape(w.id),
    escape(w.symbol),
    escape(w.name),
    escape(w.notes),
    escape(w.addedAt),
  ].join(', ')
  sql += `);\n`
}

sql += '\nCOMMIT;\n'

const outPath = resolve(__dirname, 'seed-data.sql')
writeFileSync(outPath, sql, 'utf-8')

console.log(`✅ 导出完成！`)
console.log(`   Trade: ${trades.length} 条`)
console.log(`   Watchlist: ${watchlist.length} 条`)
console.log(`   输出文件: ${outPath}`)

db.close()
