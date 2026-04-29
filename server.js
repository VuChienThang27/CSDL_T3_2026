const express = require('express');
const session = require('express-session');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3000;

const mongoUri = 'mongodb://localhost:27017';
const dbName = 'Club_QL'; 
let db;

MongoClient.connect(mongoUri)
    .then(client => {
        db = client.db(dbName);
        console.log("Đã kết nối thành công tới MongoDB!");
    })
    .catch(err => console.error("Lỗi kết nối MongoDB:", err));

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
            .login-box { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); width: 320px; text-align: center; }
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
                <input type="text" name="student_id" placeholder="Mã sinh viên (VD: B21DCCN000)" required>
                <input type="password" name="password" placeholder="Mật khẩu" required>
                <button type="submit">Vào Hệ Thống</button>
            </form>
        </div>
    </body>
    </html>`;
}

function renderDashboard(user, queryStr = '', resultHTML = '') {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>Dashboard & Truy Vấn</title>
        <style>
            body { font-family: Arial; background: #1e1e1e; color: #fff; padding: 20px; transition: background 0.3s, color 0.3s; margin: 0; }
            .header { background: #2563eb; padding: 15px; border-radius: 8px; margin-bottom: 20px; color: white !important; }
            .header a { color: #ffffff; font-weight: bold; float: right; text-decoration: none; }
            .container { display: flex; gap: 20px; }
            .form-box { flex: 1; background: #2d2d2d; padding: 20px; border-radius: 8px; }
            .result-box { flex: 2; background: #2d2d2d; padding: 20px; border-radius: 8px; overflow-x: auto; min-height: 450px; }
            textarea { width: 95%; padding: 10px; background: #3d3d3d; color: #a6e22e; border: 1px solid #555; font-family: 'Courier New', monospace; font-size: 14px; }
            button { padding: 10px 20px; background: #10b981; color: white; border: none; cursor: pointer; margin-top: 10px; border-radius: 4px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #555; padding: 8px; text-align: left; }
            th { background: #444; }
            
            body.light-mode { background: #f0f2f5; color: #000; }
            body.light-mode .form-box, body.light-mode .result-box { background: #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            body.light-mode textarea { background: #fff; color: #2563eb; border: 1px solid #ddd; }
            body.light-mode td { color: #333; border: 1px solid #ddd; }

            .theme-toggle { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 15px; z-index: 1000; }
            .theme-btn { width: 50px; height: 50px; border-radius: 50%; border: none; cursor: pointer; font-size: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: 0.2s; }
            .sun-btn { background: #f1c40f; color: #fff; }
            .moon-btn { background: #34495e; color: #fff; }
            .hint { font-size: 12px; color: #888; margin-top: 10px; }
        </style>
    </head>
    <body>
        <div class="header">
            <a href="/logout">Đăng Xuất</a>
            <h2>Hệ thống Quản lý Câu Lạc Bộ</h2>
            <p>Chào mừng: ${user.full_name} | MSV: ${user.student_id}</p>
        </div>
        
        <div class="container">
            <div class="form-box">
                <h3>Nhập lệnh MongoDB Shell</h3>
                <form action="/query" method="POST">
                    <textarea name="query" rows="15">${queryStr || 'db.users.find({})'}</textarea>
                    <button type="submit">▶ Chạy Lệnh</button>
                </form>
                <div class="hint">
                    <b>Hỗ trợ:</b> insertOne, updateOne, deleteOne, find, aggregate...
                </div>
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
                document.body.classList.toggle('light-mode', theme === 'light');
                localStorage.setItem('theme', theme);
            }
            window.onload = () => { if (localStorage.getItem('theme') === 'light') setTheme('light'); };
        </script>
    </body>
    </html>`;
}

// ================= XỬ LÝ ROUTER =================

app.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.send(renderLogin());
});

app.post('/login', async (req, res) => {
    const { student_id, password } = req.body;
    try {
        const user = await db.collection('users').findOne({ student_id: student_id, hash_password: password });
        if (!user) return res.send(renderLogin("Mã sinh viên hoặc mật khẩu không đúng!"));
        
        await db.collection('users').updateOne({ _id: user._id }, { 
            $push: { login_history: { login_at: new Date(), status: "Success" } } 
        });

        req.session.user = user;
        res.redirect('/dashboard');
    } catch (err) { res.send(renderLogin("Lỗi hệ thống: " + err.message)); }
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.send(renderDashboard(req.session.user));
});

app.post('/query', async (req, res) => {
    if (!req.session.user) return res.redirect('/');
    const raw = req.body.query.trim();
    let resultHTML = "";

    try {
        const match = raw.match(/db\.([\w-]+)\.(\w+)\(([\s\S]*)\)/);
        if (!match) throw new Error("Cú pháp không đúng. Hãy dùng: db.collection.method(...)");

        const [, colName, method, argsStr] = match;
        const args = new Function(`return [${argsStr}]`)();
        
        let result = await db.collection(colName)[method](...args);

        if (result && typeof result.toArray === 'function') {
            result = await result.toArray();
        }

        if (Array.isArray(result)) {
            if (result.length > 0) {
                // Đã sửa dấu ngoặc thành backtick ở đây để template literal hoạt động
                resultHTML = "<table><thead><tr>" + Object.keys(result[0]).map(k => `<th>${k}</th>`).join('') + "</tr></thead><tbody>";
                result.forEach(row => {
                    resultHTML += "<tr>" + Object.values(row).map(v => `<td>${(typeof v === 'object' && v !== null) ? JSON.stringify(v) : v}</td>`).join('') + "</tr>";
                });
                resultHTML += "</tbody></table>";
            } else resultHTML = "<p>Không có dữ liệu trả về.</p>";
        } else {
            resultHTML = `<div style="background:#10b98122; padding:15px; border-left:5px solid #10b981;">
                <h4>Thao tác thành công!</h4>
                <pre>${JSON.stringify(result, null, 2)}</pre>
            </div>`;
        }
    } catch (err) {
        resultHTML = `<p style="color:#ff6b6b;"><b>Lỗi:</b> ${err.message}</p>`;
    }

    res.send(renderDashboard(req.session.user, raw, resultHTML));
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(port, () => console.log(`Server đang chạy tại http://localhost:3000`));