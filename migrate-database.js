// Скрипт миграции базы данных - добавление полей подписки
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err);
        process.exit(1);
    }
});

console.log('\n🔄 Миграция базы данных...\n');

// Добавляем новые поля в таблицу users
db.run(`ALTER TABLE users ADD COLUMN subscription_type TEXT DEFAULT NULL`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('Ошибка добавления subscription_type:', err.message);
    } else {
        console.log('✅ Поле subscription_type добавлено');
    }
});

db.run(`ALTER TABLE users ADD COLUMN subscription_expires DATETIME DEFAULT NULL`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('Ошибка добавления subscription_expires:', err.message);
    } else {
        console.log('✅ Поле subscription_expires добавлено');
    }
});

// Создаем таблицу ключей
db.run(`CREATE TABLE IF NOT EXISTS keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_code TEXT UNIQUE NOT NULL,
    subscription_type TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    used INTEGER DEFAULT 0,
    used_by INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME DEFAULT NULL
)`, (err) => {
    if (err) {
        console.error('Ошибка создания таблицы keys:', err.message);
    } else {
        console.log('✅ Таблица keys создана');
    }
    
    console.log('\n✅ Миграция завершена!\n');
    db.close();
});
