const { run, all } = require('./db');

async function test() {
    console.log('--- 開始資料庫測試 ---');
    try {
        // 稍微延遲 500ms 確保 init.sql 執行完畢
        await new Promise(res => setTimeout(res, 500));

        console.log('測試：新增一筆紀錄...');
        const result = await run(
            'INSERT INTO expenses (user_id, amount, description) VALUES (?, ?, ?)',
            ['test_user_123', 500, '測試火鍋']
        );
        console.log('✅ 新增成功，ID 為:', result.lastID);

        console.log('測試：讀取所有紀錄...');
        const rows = await all('SELECT * FROM expenses');
        console.table(rows);

        console.log('--- 測試全部通過！ ---');
    } catch (err) {
        console.error('❌ 測試失敗：', err.message);
    } finally {
        process.exit();
    }
}

test();