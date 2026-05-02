require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.VOLUME_PATH 
    ? path.join(process.env.VOLUME_PATH, 'tako.db') 
    : path.join(__dirname, 'database', 'tako.db');

if (!process.env.VOLUME_PATH && !fs.existsSync(path.join(__dirname, 'database'))) {
    fs.mkdirSync(path.join(__dirname, 'database'));
}

const db = new sqlite3.Database(dbPath);

// 初始化 Table (直接執行，sqlite3 會自動排隊處理)
const initSql = fs.readFileSync(path.join(__dirname, 'database/init.sql'), 'utf8');
db.exec(initSql, (err) => {
    if (err) console.error('❌ Error initializing table:', err.message);
    else console.log('✅ Database Schema Initialized');
});

// 封裝 Promise 工具函式
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this); // 包含 lastID 和 changes
        });
    });
};

const all = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// 匯出 db 物件以及封裝好的工具
module.exports = { db, run, all };