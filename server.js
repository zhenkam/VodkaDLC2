const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));
app.use(session({
    secret: 'vodka-client-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 дней
    }
}));

// Инициализация базы данных
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err);
    } else {
        console.log('Подключено к базе данных SQLite');
    }
});

// Создание таблицы пользователей
db.run(`CREATE TABLE IF NOT EXISTS users (
    uid INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    subscription_type TEXT DEFAULT NULL,
    subscription_expires DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Создание таблицы ключей
db.run(`CREATE TABLE IF NOT EXISTS keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_code TEXT UNIQUE NOT NULL,
    subscription_type TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    used INTEGER DEFAULT 0,
    used_by INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME DEFAULT NULL
)`);

// API: Регистрация
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Заполните все поля' });
    }

    if (username.length < 3) {
        return res.status(400).json({ success: false, message: 'Логин должен быть минимум 3 символа' });
    }

    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Пароль должен быть минимум 6 символов' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ success: false, message: 'Пользователь уже существует' });
                }
                return res.status(500).json({ success: false, message: 'Ошибка сервера' });
            }

            const uid = this.lastID;
            req.session.userId = uid;
            req.session.username = username;

            res.json({ 
                success: true, 
                message: 'Регистрация успешна!',
                uid: uid,
                username: username
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// API: Вход
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Заполните все поля' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }

        if (!user) {
            return res.status(400).json({ success: false, message: 'Неверный логин или пароль' });
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(400).json({ success: false, message: 'Неверный логин или пароль' });
        }

        req.session.userId = user.uid;
        req.session.username = user.username;

        res.json({ 
            success: true, 
            message: 'Вход выполнен!',
            uid: user.uid,
            username: user.username
        });
    });
});

// API: Проверка авторизации
app.get('/api/check-auth', (req, res) => {
    if (req.session.userId) {
        db.get('SELECT uid, username, created_at, subscription_type, subscription_expires FROM users WHERE uid = ?', [req.session.userId], (err, user) => {
            if (err || !user) {
                return res.json({ authenticated: false });
            }
            
            // Проверка активности подписки
            let isActive = false;
            if (user.subscription_type) {
                if (user.subscription_type === 'lifetime') {
                    isActive = true;
                } else if (user.subscription_expires) {
                    isActive = new Date(user.subscription_expires) > new Date();
                }
            }
            
            res.json({ 
                authenticated: true, 
                uid: user.uid,
                username: user.username,
                created_at: user.created_at,
                subscription_type: user.subscription_type,
                subscription_expires: user.subscription_expires,
                subscription_active: isActive
            });
        });
    } else {
        res.json({ authenticated: false });
    }
});

// API: Выход
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Выход выполнен' });
});

// API: Получить всех пользователей (для админ-панели)
app.get('/api/admin/users', (req, res) => {
    db.all('SELECT uid, username, created_at, subscription_type, subscription_expires FROM users ORDER BY uid', [], (err, users) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
        res.json({ success: true, users: users });
    });
});

// API: Удалить пользователя (для админ-панели)
app.post('/api/admin/delete-user', (req, res) => {
    const { uid } = req.body;
    
    db.run('DELETE FROM users WHERE uid = ?', [uid], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
        res.json({ success: true, message: 'Пользователь удален' });
    });
});

// API: Генерация ключа (для админ-панели)
app.post('/api/admin/generate-key', (req, res) => {
    const { subscription_type, duration_days } = req.body;
    
    // Генерация уникального ключа
    const keyCode = 'VDK-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    db.run('INSERT INTO keys (key_code, subscription_type, duration_days) VALUES (?, ?, ?)', 
        [keyCode, subscription_type, duration_days], 
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Ошибка сервера' });
            }
            res.json({ success: true, key: keyCode });
        }
    );
});

// API: Получить все ключи (для админ-панели)
app.get('/api/admin/keys', (req, res) => {
    db.all('SELECT * FROM keys ORDER BY id DESC', [], (err, keys) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
        res.json({ success: true, keys: keys });
    });
});

// API: Активация ключа
app.post('/api/activate-key', (req, res) => {
    const { key_code } = req.body;
    const userId = req.session.userId;
    
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Не авторизован' });
    }
    
    if (!key_code) {
        return res.status(400).json({ success: false, message: 'Введите ключ' });
    }
    
    // Проверка ключа
    db.get('SELECT * FROM keys WHERE key_code = ?', [key_code], (err, key) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
        
        if (!key) {
            return res.status(400).json({ success: false, message: 'Ключ не найден' });
        }
        
        if (key.used) {
            return res.status(400).json({ success: false, message: 'Ключ уже использован' });
        }
        
        // Активация подписки
        let expiresDate = null;
        if (key.subscription_type === 'lifetime') {
            // LifeTime = 1337 лет
            const now = new Date();
            now.setFullYear(now.getFullYear() + 1337);
            expiresDate = now.toISOString();
        } else {
            const now = new Date();
            now.setDate(now.getDate() + key.duration_days);
            expiresDate = now.toISOString();
        }
        
        db.run('UPDATE users SET subscription_type = ?, subscription_expires = ? WHERE uid = ?',
            [key.subscription_type, expiresDate, userId],
            function(err) {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Ошибка активации' });
                }
                
                // Отметить ключ как использованный
                db.run('UPDATE keys SET used = 1, used_by = ?, used_at = CURRENT_TIMESTAMP WHERE key_code = ?',
                    [userId, key_code],
                    function(err) {
                        if (err) {
                            console.error('Ошибка обновления ключа:', err);
                        }
                    }
                );
                
                res.json({ 
                    success: true, 
                    message: 'Подписка активирована!',
                    subscription_type: key.subscription_type,
                    expires: expiresDate
                });
            }
        );
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
