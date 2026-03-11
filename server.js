const express = require('express');
const sql = require('mssql');
const app = express();

const config = {
    user: 'sa',
    password: '123456', 
    server: 'localhost', 
    database: 'University_Management',
    options: { encrypt: true, trustServerCertificate: true }
};

app.use(express.urlencoded({ extended: true }));

function renderUI(sqlQuery = '', resultHTML = 'Nơi hiện kết quả truy vấn...', isInitial = true, executionTime = null) {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px; }
            
            .container { max-width: 95%; margin: auto; text-align: center; }
            
            h2 { color: #2c3e50; margin-bottom: 30px; }
            
            .main-layout { display: flex; gap: 20px; justify-content: center; margin-bottom: 20px; min-height: 600px; }

            /* Định dạng chung cho 2 ô */
            .box {
                flex: 1; height: 600px; padding: 15px; border-radius: 12px;
                font-size: 20px; font-family: Arial, monospace;
                box-sizing: border-box; overflow: auto; background: white;
            }

            /* Ô nhập */
            textarea.box { border: 2px solid #3498db; outline: none; resize: none; color: #333; font-size: 20px; }
            textarea.box::placeholder { color: #888; opacity: 1; font-family: Arial, sans-serif; }

            /* Ô kết quả */
            .result-box { 
                border: 2px solid #2ecc71; text-align: left; 
                color: ${isInitial ? '#888' : '#000'}; 
                font-size: 20px;
            }

            /* Khu vực nút bấm */
            .button-group { display: flex; flex-direction: column; align-items: center; gap: 15px; margin-top: 10px; }
            
            .btn-execute {
                padding: 12px 50px; background-color: #2980b9; color: white;
                border: none; border-radius: 8px; cursor: pointer; font-size: 18px; font-weight: bold;
                transition: 0.2s;
            }
            .btn-execute:hover { background-color: #1c5980; }

            .btn-reset {
                text-decoration: none; color: #7f8c8d; font-size: 15px; font-weight: normal;
                padding: 8px 20px; border: 1px solid #bdc3c7; border-radius: 5px; transition: 0.3s;
            }
            .btn-reset:hover { background-color: #ecf0f1; color: #2c3e50; }

            /* CSS cho phần hiển thị thời gian */
            .execution-time {
                color: #e67e22; font-size: 20px; font-weight: bold; margin-top: 5px;
            }

            /* Tinh chỉnh Table */
            table { border-collapse: collapse; width: 100%; color: #000; white-space: nowrap; }
            th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; }
            th { background-color: #f2f2f2; position: sticky; top: 0; z-index: 1; }
            .error { color: red; font-family: Arial, sans-serif; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Hệ thống Truy vấn SQL - Nhóm 8 PTIT</h2>
            <form action="/execute" method="POST">
                <div class="main-layout">
                    <textarea name="sql" class="box" placeholder="Nhập code truy vấn SQL tại đây...">${sqlQuery}</textarea>
                    
                    <div class="box result-box">${resultHTML}</div>
                </div>
                <div class="button-group">
                    <button type="submit" class="btn-execute">Execute SQL</button>
                    ${!isInitial ? `<a href="/" class="btn-reset">Tiếp tục truy vấn</a>` : ''}
                    ${executionTime ? `<div class="execution-time">Thời gian chạy truy vấn: ${executionTime} giây</div>` : ''}
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
        
        // Bắt đầu bấm giờ
        const startTime = performance.now();
        
        // Thực thi SQL
        let result = await pool.request().query(query);
        
        // Dừng bấm giờ và tính số giây
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
        
        // Truyền thời gian vào giao diện
        res.send(renderUI(query, htmlTable, false, executionTimeSec));
    } catch (err) {
        res.send(renderUI(query, `<p class='error'>Lỗi SQL: ${err.message}</p>`, false));
    }
});

app.listen(3000, () => console.log('Web đang chạy tại http://localhost:3000'));