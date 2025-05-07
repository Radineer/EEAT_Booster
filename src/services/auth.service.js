const { supabase, supabaseAdmin } = require('../config/supabase');
const jwt = require('jsonwebtoken');
require('dotenv').config();

class AuthService {
  // ログイン
  async login(email, password) {
    // Supabaseでログイン
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      throw error;
    }
    
    // ユーザーのメタデータを取得
    const userId = data.user.id;
    const tenantId = data.user.user_metadata.tenant_id;
    
    // テナント情報を取得
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();
    
    if (tenantError || !tenant) {
      const error = new Error('テナント情報の取得に失敗しました');
      error.statusCode = 401;
      throw error;
    }
    
    if (tenant.status !== 'active') {
      const error = new Error('このテナントは現在無効化されています');
      error.statusCode = 403;
      throw error;
    }
    
    // カスタムJWTを生成
    const customToken = jwt.sign(
      {
        id: userId,
        email: data.user.email,
        name: data.user.user_metadata.name,
        role: data.user.user_metadata.role || 'user',
        tenantId: tenantId
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    return {
      token: customToken,
      user: {
        id: userId,
        email: data.user.email,
        name: data.user.user_metadata.name,
        role: data.user.user_metadata.role || 'user'
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan
      }
    };
  }
  
  // ログアウト
  async logout(userId) {
    // Supabaseでログアウト（すべてのセッション）
    const { error } = await supabaseAdmin.auth.admin.signOut(userId);
    
    if (error) {
      throw error;
    }
    
    return true;
  }
  
  // パスワードリセットメール送信
  async sendPasswordResetEmail(email) {
    // メールアドレスの存在確認
    const { data: userExists, error: checkError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (checkError) {
      throw checkError;
    }
    
    const exists = userExists.some(user => user.email === email);
    
    if (!exists) {
      const error = new Error('このメールアドレスは登録されていません');
      error.statusCode = 404;
      throw error;
    }
    
    // パスワードリセットメール送信
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });
    
    if (error) {
      throw error;
    }
    
    return true;
  }
  
  // パスワード変更
  async updatePassword(userId, currentPassword, newPassword) {
    // 現在のパスワードを確認（ユーザーの認証情報が必要）
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: userId, // 実際にはメールアドレスが必要
      password: currentPassword
    });
    
    if (authError) {
      const error = new Error('現在のパスワードが正しくありません');
      error.statusCode = 401;
      throw error;
    }
    
    // パスワード更新
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });
    
    if (error) {
      throw error;
    }
    
    return true;
  }
  
  // パスワードリセット（トークン使用）
  async resetPassword(token, newPassword) {
    // リセットトークンでパスワード更新
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      throw error;
    }
    
    return true;
  }
  
  // ユーザー情報更新
  async updateUserProfile(userId, userData) {
    // ユーザーのメタデータ更新
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: userData
    });
    
    if (error) {
      throw error;
    }
    
    return data;
  }
  
  // 新規ユーザー追加（テナント内）
  async createUser(tenantId, userData) {
    // メールアドレスの重複確認
    const { data: existingUsers, error: checkError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (checkError) {
      throw checkError;
    }
    
    const exists = existingUsers.some(user => user.email === userData.email);
    
    if (exists) {
      const error = new Error('このメールアドレスは既に使用されています');
      error.statusCode = 400;
      throw error;
    }
    
    // ユーザー作成
    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      user_metadata: {
        name: userData.name,
        role: userData.role || 'user',
        tenant_id: tenantId
      },
      email_confirm: true
    });
    
    if (error) {
      throw error;
    }
    
    return {
      id: user.id,
      email: user.email,
      name: userData.name,
      role: userData.role || 'user'
    };
  }
  
  // ユーザー削除
  async deleteUser(userId) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (error) {
      throw error;
    }
    
    return true;
  }
}

module.exports = new AuthService(); 