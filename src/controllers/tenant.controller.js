const tenantService = require('../services/tenant.service');

// テナント一覧取得（管理者用）
exports.getTenants = async (req, res, next) => {
  try {
    const { page, limit, status, search } = req.query;
    
    const result = await tenantService.getTenants({ 
      page, 
      limit, 
      status, 
      search 
    });
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
};

// テナント詳細取得
exports.getTenant = async (req, res, next) => {
  try {
    const tenantId = req.params.id;
    
    const tenant = await tenantService.getTenant(tenantId);
    
    res.status(200).json({
      success: true,
      tenant
    });
  } catch (err) {
    next(err);
  }
};

// 現在のテナント情報取得
exports.getCurrentTenant = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    
    const tenant = await tenantService.getTenant(tenantId);
    
    res.status(200).json({
      success: true,
      tenant
    });
  } catch (err) {
    next(err);
  }
};

// テナント作成（管理者用）
exports.createTenant = async (req, res, next) => {
  try {
    const tenant = await tenantService.createTenant(req.body);
    
    res.status(201).json({
      success: true,
      tenant
    });
  } catch (err) {
    next(err);
  }
};

// テナント更新（管理者用）
exports.updateTenant = async (req, res, next) => {
  try {
    const tenantId = req.params.id;
    
    const tenant = await tenantService.updateTenant(tenantId, req.body);
    
    res.status(200).json({
      success: true,
      tenant
    });
  } catch (err) {
    next(err);
  }
};

// テナント削除（管理者用、論理削除）
exports.deleteTenant = async (req, res, next) => {
  try {
    const tenantId = req.params.id;
    
    await tenantService.deleteTenant(tenantId);
    
    res.status(200).json({
      success: true,
      message: 'テナントが無効化されました'
    });
  } catch (err) {
    next(err);
  }
};

// テナントの使用状況取得
exports.getTenantStats = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    
    const stats = await tenantService.getTenantStats(tenantId);
    
    res.status(200).json({
      success: true,
      ...stats
    });
  } catch (err) {
    next(err);
  }
};

// テナント登録（サインアップ）
exports.registerTenant = async (req, res, next) => {
  try {
    const { tenant: tenantData, user: userData } = req.body;
    
    if (!tenantData || !userData) {
      return res.status(400).json({
        success: false,
        message: 'テナント情報とユーザー情報が必要です'
      });
    }
    
    const result = await tenantService.registerTenant(tenantData, userData);
    
    res.status(201).json({
      success: true,
      message: 'テナントとユーザーが正常に作成されました',
      tenant_id: result.tenant_id,
      user_id: result.user_id
    });
  } catch (err) {
    next(err);
  }
};

// テナントのユーザー一覧取得
exports.getTenantUsers = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    
    const users = await tenantService.getTenantUsers(tenantId);
    
    res.status(200).json({
      success: true,
      users
    });
  } catch (err) {
    next(err);
  }
}; 