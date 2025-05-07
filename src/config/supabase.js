const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabaseクライアントの作成
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// 通常の認証済みユーザー用クライアント
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 管理者操作用のサービスロールクライアント（RLSをバイパス）
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = { supabase, supabaseAdmin }; 