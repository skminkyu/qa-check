import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'qa.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'editor',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS qa_templates (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      item_name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id),
      name TEXT NOT NULL,
      partner_name TEXT,
      md_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS qa_records (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      template_id TEXT NOT NULL REFERENCES qa_templates(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT '미완료',
      qa_notes TEXT,
      standard_notes TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(product_id, template_id)
    );

    CREATE TABLE IF NOT EXISTS share_tokens (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedDefaults(db);
}

function seedDefaults(db: Database.Database) {
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount > 0) return;

  const { v4: uuidv4 } = require('uuid');
  const bcrypt = require('bcryptjs');

  // Default admin
  const adminId = uuidv4();
  const hash = bcrypt.hashSync('admin1234', 10);
  db.prepare('INSERT INTO users (id, email, name, password_hash, role) VALUES (?,?,?,?,?)').run(
    adminId, 'admin@qa.com', '관리자', hash, 'admin'
  );

  // Default category: 화장품
  const catId = uuidv4();
  db.prepare('INSERT INTO categories (id, name) VALUES (?,?)').run(catId, '화장품');

  // Default QA templates for 화장품
  const items = [
    '제품명 (한글/영문)',
    '전성분 표기',
    '내용량',
    '사용기한 / 제조일자',
    '제조사 / 제조국',
    '책임판매업자',
    '사용 시 주의사항',
    '바코드 (EAN-13)',
    '화장품법 준수 여부',
    '식약처 기능성 인증 여부',
    'MSDS (물질안전보건자료)',
    '제품 시험성적서',
    '포장재 규격 확인',
    '브랜드 로고/디자인 최종본',
    'MD 최종 승인',
  ];
  const stmt = db.prepare('INSERT INTO qa_templates (id, category_id, item_name, sort_order) VALUES (?,?,?,?)');
  items.forEach((name, i) => stmt.run(uuidv4(), catId, name, i));
}
