const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('../config/supabase');
require('dotenv').config();

// JWTトークン検証ミドルウェア
exports.authenticateJWT = async (req, res, next) => {
  try {
    let token;
    
    // Authorization ヘッダーからトークンを取得
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '認証が必要です。ログインしてください。'
      });
    }
    
    // トークンを検証
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ユーザーIDをもとにSupabaseからユーザー情報を取得
    const { data: user, error } = await supabase.auth.admin.getUserById(decoded.id);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: '認証に失敗しました。再度ログインしてください。'
      });
    }
    
    // ユーザーのメタデータから必要な情報を取得
    const tenantId = user.user_metadata.tenant_id;
    const userRole = user.user_metadata.role || 'user';
    
    // テナント情報を取得
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();
    
    if (tenantError || !tenant) {
      return res.status(401).json({
        success: false,
        message: 'テナント情報の取得に失敗しました。'
      });
    }
    
    if (tenant.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'このテナントは現在無効化されています。'
      });
    }
    
    // リクエストオブジェクトにユーザー情報とテナント情報を追加
    req.user = {
      id: user.id,
      email: user.email,
      name: user.user_metadata.name,
      role: userRole,
      tenantId: tenantId
    };
    
    req.tenant = tenant;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '認証に失敗しました。',
      error: error.message
    });
  }
};

// 特定のロールを持つユーザーのみアクセス可能にするミドルウェア
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'このアクションを実行する権限がありません。'
      });
    }
    next();
  };
};

// APIキーによる認証（WPプラグインからのリクエスト用）
exports.authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const tenantId = req.headers['x-tenant-id'];
    
    if (!apiKey || !tenantId) {
      return res.status(401).json({
        success: false,
        message: 'APIキーとテナントIDが必要です。'
      });
    }
    
    // APIキーをサイト情報から検証
    const { data: site, error } = await supabaseAdmin
      .from('sites')
      .select('*')
      .eq('api_key', apiKey)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single();
    
    if (error || !site) {
      return res.status(401).json({
        success: false,
        message: '無効なAPIキーです。'
      });
    }
    
    // IPアドレス制限がある場合は検証
    if (site.allowed_ips && site.allowed_ips.length > 0) {
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!site.allowed_ips.includes(clientIp)) {
        return res.status(403).json({
          success: false,
          message: 'このIPアドレスからのアクセスは許可されていません。'
        });
      }
    }
    
    // テナント情報を取得
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();
    
    if (tenantError || !tenant || tenant.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'このテナントは現在無効です。'
      });
    }
    
    // リクエストオブジェクトにサイト情報とテナント情報を追加
    req.site = site;
    req.tenant = tenant;
    req.tenantId = site.tenant_id;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '認証に失敗しました。',
      error: error.message
    });
  }
}; 