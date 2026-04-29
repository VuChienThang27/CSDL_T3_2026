const express = require('express');
const session = require('express-session');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3000;

// Cấu hình kết nối MongoDB
const mongoUri = 'mongodb://localhost:27017';
const dbName = 'Club_QL'; // Tên DB của bạn
let db;

// Kết nối database
MongoClient.connect(mongoUri)
    .then(client => {
        db = client.db(dbName);
        console.log("Đã kết nối thành công tới MongoDB!");
    })
    .catch(err => console.error("Lỗi kết nối MongoDB:", err));

// Cấu hình Express
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'club_secret_key',
    resave: false,
    saveUninitialized: true
}));

// ================= GIAO DIỆN HTML =================
function renderLogin(errorMsg = '') {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>Đăng nhập Câu Lạc Bộ</title>
        <style>
            body { font-family: Arial; background: #f4f4f9; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .login-box { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); width: 300px; text-align: center; }
            input { width: 90%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px; }
            button { width: 100%; padding: 10px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; }
            .error { color: red; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="login-box">
            <h2>Đăng Nhập</h2>
            ${errorMsg ? `<p class="error">${errorMsg}</p>` : ''}
            <form action="/login" method="POST">
                <input type="text" name="username" placeholder="Tên đăng nhập (VD: user_0)" required>
                <input type="password" name="password" placeholder="Mật khẩu" required>
                <button type="submit">Vào Hệ Thống</button>
            </form>
        </div>
    </body>
    </html>`;
}

function renderDashboard(user, collectionName = '', queryStr = '', resultHTML = '') {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>Dashboard & Truy Vấn</title>
        <style>
            /* CSS GỐC */
            body { font-family: Arial; background: #1e1e1e; color: #fff; padding: 20px; transition: background 0.3s, color 0.3s; }
            .header { background: #2563eb; padding: 15px; border-radius: 8px; margin-bottom: 20px; color: white !important; }
            .header h2, .header p { color: white !important; }
            .container { display: flex; gap: 20px; }
            .form-box { flex: 1; background: #2d2d2d; padding: 20px; border-radius: 8px; transition: background 0.3s; }
            .result-box { flex: 2; background: #2d2d2d; padding: 20px; border-radius: 8px; overflow-x: auto; transition: background 0.3s; }
            input, textarea { width: 95%; padding: 10px; margin-top: 5px; background: #3d3d3d; color: white; border: 1px solid #555; }
            button { padding: 10px 20px; background: #10b981; color: white; border: none; cursor: pointer; margin-top: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #555; padding: 8px; text-align: left; }
            th { background: #444; }
            .header a { color: #ffffff; font-weight: bold; float: right; }

            /* CHẾ ĐỘ BAN NGÀY (LIGHT MODE) */
            body.light-mode { background: #f0f2f5; color: #000; }
            body.light-mode .form-box, body.light-mode .result-box { background: #ffffff; color: #000; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            body.light-mode h3, body.light-mode label { color: #000; }
            body.light-mode input, body.light-mode textarea { background: #fff; color: #000; border: 1px solid #ddd; }
            body.light-mode th { background: #f8f9fa; color: #000; }
            body.light-mode td { color: #333; border: 1px solid #ddd; }
            body.light-mode .header a { color: #ffffff; font-weight: bold; }

            /* NÚT CHUYỂN ĐỔI */
            .theme-toggle { position: fixed; bottom: 20px; left: 20px; display: flex; gap: 10px; z-index: 1000; }
            .theme-btn { width: 45px; height: 45px; border-radius: 50%; border: none; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.2); transition: transform 0.2s; }
            .theme-btn:hover { transform: scale(1.1); }
            .sun-btn { background: #f1c40f; color: #fff; }
            .moon-btn { background: #34495e; color: #fff; }
        </style>
    </head>
    <body>
        <div class="header">
            <a href="/logout">Đăng Xuất</a>
            <h2>Xin chào, ${user.full_name} (${user.username})</h2>
            <p>Chức vụ: ${user.rank} | Điểm: ${user.points} | Trạng thái: ${user.status}</p>
        </div>
        
        <div class="container">
            <div class="form-box">
                <h3>Giao diện Truy vấn MongoDB</h3>
                <form action="/query" method="POST">
                    <label>Tên Collection (VD: users, projects):</label>
                    <input type="text" name="collection" value="${collectionName}" required>
                    
                    <label>Điều kiện lọc (JSON Format):</label>
                    <textarea name="query" rows="5" placeholder='VD: { "status": "Active" }'>${queryStr}</textarea>
                    
                    <button type="submit">▶ Execute Query</button>
                </form>
            </div>
            
            <div class="result-box">
                <h3>Kết Quả</h3>
                ${resultHTML}
            </div>
        </div>

        <div class="theme-toggle">
            <button class="theme-btn sun-btn" onclick="setTheme('light')">☀️</button>
            <button class="theme-btn moon-btn" onclick="setTheme('dark')">🌙</button>
        </div>

        <script>
            function setTheme(theme) {
                if (theme === 'light') {
                    document.body.classList.add('light-mode');
                } else {
                    document.body.classList.remove('light-mode');
                }
                localStorage.setItem('theme', theme);
            }

            window.onload = () => {
                const savedTheme = localStorage.getItem('theme');
                if (savedTheme === 'light') {
                    document.body.classList.add('light-mode');
                }
            };
        </script>
    </body>
    </html>`;
}

// ================= XỬ LÝ ROUTER =================

app.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.send(renderLogin());
});

// 2. Xử lý Đăng nhập (Đã sửa để dùng username)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Tìm user trong CSDL bằng trường username
        const user = await db.collection('users').findOne({ username: username, hash_password: password });

        if (!user) {
            return res.send(renderLogin("Sai tên đăng nhập hoặc mật khẩu!"));
        }

        // Lưu thông tin đăng nhập vào mảng login_history của user vừa tìm được
        await db.collection('users').updateOne(
            { _id: user._id },
            { 
                $push: { 
                    login_history: { 
                        login_at: new Date(), 
                        ip_address: req.ip || "127.0.0.1", 
                        device_info: req.headers['user-agent'], 
                        status: "Success" 
                    } 
                } 
            }
        );

        // Lưu session
        req.session.user = user;
        res.redirect('/dashboard');

    } catch (err) {
        res.send(renderLogin("Lỗi hệ thống: " + err.message));
    }
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.send(renderDashboard(req.session.user, 'users', '{}', '<p>Vui lòng nhập truy vấn bên trái.</p>'));
});

app.post('/query', async (req, res) => {
    if (!req.session.user) return res.redirect('/');
    
    let { collection, query } = req.body;
    let resultHTML = "";

    try {
        let queryObj = JSON.parse(query || "{}");
        let result;

        if (Array.isArray(queryObj)) {
            result = await db.collection(collection).aggregate(queryObj).toArray();
        } else {
            result = await db.collection(collection).find(queryObj).toArray();
        }

        if (result && result.length > 0) {
            resultHTML = "<table><thead><tr>";
            Object.keys(result[0]).forEach(k => resultHTML += `<th>${k}</th>`);
            resultHTML += "</tr></thead><tbody>";
            
            result.forEach(row => {
                resultHTML += "<tr>";
                Object.values(row).forEach(v => {
                    let display = (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
                    resultHTML += `<td>${display}</td>`;
                });
                resultHTML += "</tr>";
            });
            resultHTML += "</tbody></table>";
        } else {
            resultHTML = "<p>Không tìm thấy dữ liệu.</p>";
        }

    } catch (err) {
        resultHTML = `<p style="color:#ff6b6b;"><b>Lỗi:</b> ${err.message}</p>`;
    }

    res.send(renderDashboard(req.session.user, collection, query, resultHTML));
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(3000, () => {
    console.log(`Web đang chạy tại: http://localhost:3000`);
});