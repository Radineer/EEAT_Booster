const authService = require('../services/auth.service');

// ログイン
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'メールアドレスとパスワードが必要です'
      });
    }
    
    const authData = await authService.login(email, password);
    
    res.status(200).json({
      success: true,
      ...authData
    });
  } catch (err) {
    // Supabaseのエラーをわかりやすいメッセージに変換
    if (err.message === 'Invalid login credentials') {
      err.message = 'メールアドレスまたはパスワードが正しくありません';
      err.statusCode = 401;
    }
    next(err);
  }
};

// ログアウト
exports.logout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    await authService.logout(userId);
    
    res.status(200).json({
      success: true,
      message: 'ログアウトしました'
    });
  } catch (err) {
    next(err);
  }
};

// パスワードリセットメール送信
exports.sendPasswordResetEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'メールアドレスが必要です'
      });
    }
    
    await authService.sendPasswordResetEmail(email);
    
    res.status(200).json({
      success: true,
      message: 'パスワードリセットメールを送信しました'
    });
  } catch (err) {
    next(err);
  }
};

// パスワード変更（ログイン中）
exports.updatePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '現在のパスワードと新しいパスワードが必要です'
      });
    }
    
    await authService.updatePassword(userId, currentPassword, newPassword);
    
    res.status(200).json({
      success: true,
      message: 'パスワードを変更しました'
    });
  } catch (err) {
    next(err);
  }
};

// パスワードリセット（トークン使用）
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'トークンと新しいパスワードが必要です'
      });
    }
    
    await authService.resetPassword(token, newPassword);
    
    res.status(200).json({
      success: true,
      message: 'パスワードをリセットしました'
    });
  } catch (err) {
    next(err);
  }
};

// 現在のユーザー情報取得
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = req.user;
    const tenant = req.tenant;
    
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan
      }
    });
  } catch (err) {
    next(err);
  }
};

// ユーザー情報更新
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userData = req.body;
    
    // 更新できる項目を制限
    const updateData = {
      name: userData.name
    };
    
    const updatedUser = await authService.updateUserProfile(userId, updateData);
    
    res.status(200).json({
      success: true,
      message: 'プロフィールを更新しました',
      user: updatedUser
    });
  } catch (err) {
    next(err);
  }
};

// 新規ユーザー追加（テナント内）
exports.createUser = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const userData = req.body;
    
    if (!userData.email || !userData.password || !userData.name) {
      return res.status(400).json({
        success: false,
        message: 'メールアドレス、パスワード、名前が必要です'
      });
    }
    
    const user = await authService.createUser(tenantId, userData);
    
    res.status(201).json({
      success: true,
      message: 'ユーザーを作成しました',
      user
    });
  } catch (err) {
    next(err);
  }
};

// ユーザー削除
exports.deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    await authService.deleteUser(userId);
    
    res.status(200).json({
      success: true,
      message: 'ユーザーを削除しました'
    });
  } catch (err) {
    next(err);
  }
}; 