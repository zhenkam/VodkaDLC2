// Скрипт для обновления существующих LifeTime подписок
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err);
        process.exit(1);
    }
});

console.log('\n🔄 Обновление LifeTime подписок...\n');

// Находим всех пользователей с lifetime подпиской
db.all("SELECT uid, username FROM users WHERE subscription_type = 'lifetime'", [], (err, users) => {
    if (err) {
        console.error('Ошибка:', err);
        db.close();
        return;
    }
    
    if (users.length === 0) {
        console.log('Нет пользователей с LifeTime подпиской');
        db.close();
        return;
    }
    
    console.log(`Найдено пользователей с LifeTime: ${users.length}\n`);
    
    // Устанавливаем дату на 1337 лет вперед
    const expiresDate = new Date();
    expiresDate.setFullYear(expiresDate.getFullYear() + 1337);
    const expiresISO = expiresDate.toISOString();
    
    users.forEach(user => {
        db.run('UPDATE users SET subscription_expires = ? WHERE uid = ?', 
            [expiresISO, user.uid],
            function(err) {
                if (err) {
                    console.error(`❌ Ошибка обновления ${user.username}:`, err);
                } else {
                    console.log(`✅ ${user.username} (UID: ${user.uid}) - подписка до ${expiresDate.toLocaleDateString('ru-RU')}`);
                }
                
                // Закрываем БД после последнего пользователя
                if (user.uid === users[users.length - 1].uid) {
                    console.log('\n✅ Обновление завершено!\n');
                    db.close();
                }
            }
        );
    });
});
