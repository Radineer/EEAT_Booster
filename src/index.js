const express = require('express');
const cors = require('cors');
require('dotenv').config();

// ミドルウェア
const errorHandler = require('./middleware/error');

// ルート
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const templateRoutes = require('./routes/template.routes');
const tenantRoutes = require('./routes/tenant.routes');
const siteRoutes = require('./routes/site.routes');

// アプリの作成
const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェアの設定
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// ルーティングの設定
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profiles', profileRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/sites', siteRoutes);

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// 404ハンドラー
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `エンドポイントが見つかりません: ${req.originalUrl}`
  });
});

// エラーハンドラーミドルウェア
app.use(errorHandler);

// サーバーの起動
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});

// プロセスの終了を処理
process.on('SIGTERM', () => {
  console.log('サーバーをシャットダウンしています...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('サーバーをシャットダウンしています...');
  process.exit(0);
});

module.exports = app; 