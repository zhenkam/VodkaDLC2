// Скрипт для тестирования - создание тестового ключа и активация подписки
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err);
        process.exit(1);
    }
});

// Генерация тестового ключа LifeTime
const testKey = 'VDK-TEST1234-LIFETIME';

db.run('INSERT INTO keys (key_code, subscription_type, duration_days) VALUES (?, ?, ?)', 
    [testKey, 'lifetime', 0], 
    function(err) {
        if (err) {
            console.error('Ошибка создания ключа:', err.message);
        } else {
            console.log('✅ Тестовый ключ создан!');
            console.log(`Ключ: ${testKey}`);
            console.log('Тип: LifeTime');
            console.log('\nИспользуйте этот ключ в личном кабинете для активации подписки.');
        }
        
        db.close();
    }
);
