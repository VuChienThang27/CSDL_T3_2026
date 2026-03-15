const express = require('express');
const sql = require('mssql');
const app = express();

const config = {
    user: 'sa',
    password: '123456', 
    server: 'localhost', 
    database: 'QuanLyTruongDaiHoc',
    options: { encrypt: true, trustServerCertificate: true }
};

app.use(express.urlencoded({ extended: true }));

function renderUI(sqlQuery = '', resultHTML = 'Nơi hiện kết quả truy vấn...', isInitial = true, executionTime = null) {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hệ thống Truy vấn SQL - Nhóm 8 PTIT</title>
        <style>
            :root { 
                --bg-main: #f4f6f8; 
                --text-main: #334155; 
                --border-color: #e2e8f0;
                --primary: #2563eb;
            }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background-color: var(--bg-main); 
                margin: 0; 
                padding: 30px 20px; 
                color: var(--text-main); 
            }
            .container { 
                max-width: 95%; /* Mở rộng container ra gần hết màn hình */
                margin: auto; 
                display: flex; 
                flex-direction: column; 
                gap: 25px; 
            }
            
            /* Tiêu đề */
            .header-title {
                text-align: center;
                color: #0f172a;
                margin: 0 0 10px 0;
                font-size: 32px; /* Tăng cỡ chữ tiêu đề */
            }

            /* --- Khu vực Code Editor --- */
            .editor-wrapper {
                background: #1e1e1e; 
                border-radius: 10px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .editor-header {
                background: #2d2d2d;
                color: #d4d4d4;
                padding: 12px 20px;
                font-size: 15px;
                font-weight: 600;
                border-bottom: 1px solid #404040;
            }
            textarea.box { 
                width: 100%; 
                height: 250px; /* Tăng chiều cao ô nhập code */
                padding: 20px; 
                background: transparent;
                color: #9cdcfe; 
                font-family: 'Consolas', 'Courier New', monospace;
                font-size: 18px; /* Tăng cỡ chữ code */
                border: none; 
                outline: none; 
                resize: vertical; 
                box-sizing: border-box; 
                line-height: 1.6;
            }
            textarea.box::placeholder { color: #6b7280; font-family: 'Segoe UI', sans-serif; }

            /* Action Bar */
            .action-bar { 
                background: #ffffff;
                padding: 15px 20px;
                display: flex; 
                align-items: center; 
                gap: 15px; 
                border-bottom-left-radius: 10px;
                border-bottom-right-radius: 10px;
                border: 1px solid var(--border-color);
                border-top: none;
            }
            .btn {
                padding: 12px 28px; /* Nút bấm to hơn */
                border-radius: 6px;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
                transition: 0.2s ease-in-out;
                text-decoration: none;
                display: inline-block;
            }
            .btn-execute {
                background-color: var(--primary); 
                color: white;
                border: none;
            }
            .btn-execute:hover { background-color: #1d4ed8; }
            .btn-reset {
                color: #64748b; 
                background: #f1f5f9;
                border: 1px solid #cbd5e1; 
            }
            .btn-reset:hover { background-color: #e2e8f0; color: #0f172a; }
            .execution-time {
                margin-left: auto;
                color: #059669; 
                font-size: 16px; 
                font-weight: bold;
                background: #d1fae5;
                padding: 8px 15px;
                border-radius: 4px;
            }

            /* --- Khu vực Kết quả --- */
            .result-wrapper {
                background: #ffffff;
                border-radius: 10px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                border: 1px solid var(--border-color);
                min-height: 450px; /* Bảng kết quả cao hơn để chứa nhiều data */
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            .result-header {
                padding: 15px 20px;
                background: #f8fafc;
                border-bottom: 1px solid var(--border-color);
                font-weight: 600;
                color: #0f172a;
                font-size: 16px;
            }
            .result-content {
                padding: ${isInitial || resultHTML.includes('error') || resultHTML === 'Không có dữ liệu trả về.' ? '40px 20px' : '0'};
                overflow-x: auto;
                max-height: 600px; /* Cho phép scroll dài hơn */
                text-align: ${isInitial ? 'center' : 'left'};
                color: ${isInitial ? '#94a3b8' : 'inherit'};
                font-size: 18px; /* Tăng cỡ chữ dòng thông báo chờ */
            }

            /* Bảng dữ liệu SQL */
            table { 
                border-collapse: collapse; 
                width: 100%; 
                color: #334155; 
                white-space: nowrap; 
                font-size: 16px; /* Chữ trong bảng to hơn */
            }
            th, td { 
                padding: 16px 20px; /* Ô rộng rãi hơn */
                border-bottom: 1px solid var(--border-color);
                text-align: left; 
            }
            th { 
                background-color: #f1f5f9; 
                position: sticky; 
                top: 0; 
                z-index: 1; 
                font-weight: 600;
                color: #475569;
                border-bottom: 2px solid #cbd5e1;
            }
            tr:hover td { background-color: #f8fafc; }

            .error { 
                color: #b91c1c; 
                background: #fef2f2;
                padding: 20px;
                border-left: 5px solid #ef4444;
                border-radius: 4px;
                margin: 0;
                font-weight: 500;
                font-size: 16px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2 class="header-title">Hệ thống Truy vấn SQL - Nhóm 8 PTIT</h2>
            <form action="/execute" method="POST">
                
                <div class="editor-wrapper">
                    <div class="editor-header">
                        T-SQL Query Editor
                    </div>
                    <textarea name="sql" class="box" spellcheck="false" placeholder="Nhập câu lệnh SELECT vào đây...">${sqlQuery}</textarea>
                </div>

                <div class="action-bar">
                    <button type="submit" class="btn btn-execute">▶ Thực thi Query</button>
                    ${!isInitial ? `<a href="/" class="btn btn-reset">↺ Làm mới</a>` : ''}
                    ${executionTime ? `<div class="execution-time">⏱ Thời gian thực thi: ${executionTime}s</div>` : ''}
                </div>

                <div class="result-wrapper" style="margin-top: 15px;">
                    <div class="result-header">Kết quả truy vấn</div>
                    <div class="result-content">
                        ${resultHTML}
                    </div>
                </div>

            </form>
        </div>
    </body>
    </html>
    `;
}

app.get('/', (req, res) => res.send(renderUI()));

app.post('/execute', async (req, res) => {
    let query = req.body.sql.trim();
    const forbidden = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER"];
    const isForbidden = forbidden.some(word => query.toUpperCase().includes(word));

    if (!query || !query.toUpperCase().startsWith("SELECT") || isForbidden) {
        return res.send(renderUI(query, "<p class='error'>LỖI: Hệ thống chỉ chấp nhận lệnh SELECT để bảo mật!</p>", false));
    }

    try {
        let pool = await sql.connect(config);
        const startTime = performance.now();
        let result = await pool.request().query(query);
        const endTime = performance.now();
        const executionTimeSec = ((endTime - startTime) / 1000).toFixed(3);

        let htmlTable = "";
        if (result.recordset.length > 0) {
            htmlTable = "<table><thead><tr>" + Object.keys(result.recordset[0]).map(k => `<th>${k}</th>`).join('') + "</tr></thead><tbody>";
            result.recordset.forEach(row => {
                htmlTable += "<tr>" + Object.values(row).map(v => `<td>${v}</td>`).join('') + "</tr>";
            });
            htmlTable += "</tbody></table>";
        } else {
            htmlTable = "Không có dữ liệu trả về.";
        }

        res.send(renderUI(query, htmlTable, false, executionTimeSec));
    } catch (err) {
        res.send(renderUI(query, `<p class='error'>Lỗi SQL: ${err.message}</p>`, false));
    }
});

app.listen(3000, () => console.log('Web đang chạy tại http://localhost:3000'));