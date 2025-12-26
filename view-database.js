// Скрипт для просмотра всех пользователей и ключей в базе данных
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err);
        process.exit(1);
    }
});

console.log('\n=== БАЗА ДАННЫХ VODKACLIENT ===\n');

// Пользователи
db.all('SELECT * FROM users ORDER BY uid', [], (err, rows) => {
    if (err) {
        console.error('Ошибка чтения данных:', err);
        process.exit(1);
    }

    console.log('📋 ПОЛЬЗОВАТЕЛИ:');
    if (rows.length === 0) {
        console.log('Пользователей нет.\n');
    } else {
        console.log(`Всего: ${rows.length}\n`);
        
        rows.forEach(user => {
            console.log(`UID: ${user.uid}`);
            console.log(`Логин: ${user.username}`);
            console.log(`Подписка: ${user.subscription_type || 'Нет'}`);
            if (user.subscription_expires) {
                const expires = new Date(user.subscription_expires);
                const isActive = expires > new Date();
                console.log(`Действует до: ${expires.toLocaleString('ru-RU')} ${isActive ? '✅' : '❌'}`);
            }
            console.log(`Дата регистрации: ${new Date(user.created_at).toLocaleString('ru-RU')}`);
            console.log('---');
        });
    }
    
    // Ключи
    db.all('SELECT * FROM keys ORDER BY id DESC', [], (err, keys) => {
        if (err) {
            console.error('Ошибка чтения ключей:', err);
        } else {
            console.log('\n🔑 КЛЮЧИ АКТИВАЦИИ:');
            if (keys.length === 0) {
                console.log('Ключи не созданы.\n');
            } else {
                console.log(`Всего: ${keys.length}\n`);
                
                keys.forEach(key => {
                    console.log(`Ключ: ${key.key_code}`);
                    console.log(`Тип: ${key.subscription_type}`);
                    console.log(`Длительность: ${key.duration_days} дней`);
                    console.log(`Статус: ${key.used ? '❌ Использован (UID: ' + key.used_by + ')' : '✅ Активен'}`);
                    console.log(`Создан: ${new Date(key.created_at).toLocaleString('ru-RU')}`);
                    if (key.used_at) {
                        console.log(`Использован: ${new Date(key.used_at).toLocaleString('ru-RU')}`);
                    }
                    console.log('---');
                });
            }
        }
        
        db.close();
    });
});
