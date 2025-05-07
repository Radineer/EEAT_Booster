// エラーハンドリングミドルウェア
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  let statusCode = err.statusCode || 500;
  let message = err.message || 'サーバーエラーが発生しました';
  
  // Supabaseエラーハンドリング
  if (err.code) {
    switch (err.code) {
      case '23505': // 一意制約違反
        statusCode = 400;
        message = '既に存在するデータです';
        break;
      case '23503': // 外部キー制約違反
        statusCode = 400;
        message = '関連するリソースが存在しません';
        break;
      case '42P01': // テーブルが存在しない
        statusCode = 500;
        message = 'データベースエラーが発生しました';
        break;
      case 'P0001': // 手動でraiseされたエラー
        statusCode = 400;
        message = err.message || 'データ処理エラーが発生しました';
        break;
    }
  }
  
  // JWT関連のエラー
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '無効なトークンです';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'トークンの有効期限が切れています';
  }
  
  // 本番環境ではスタックトレースを返さない
  const error = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };
  
  res.status(statusCode).json(error);
};

module.exports = errorHandler; 