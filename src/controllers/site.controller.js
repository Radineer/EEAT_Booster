const siteService = require('../services/site.service');

// サイト一覧取得
exports.getSites = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { page, limit, status } = req.query;
    
    const result = await siteService.getSites(tenantId, { 
      page, 
      limit, 
      status 
    });
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
};

// サイト詳細取得
exports.getSite = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const siteId = req.params.id;
    
    const site = await siteService.getSite(siteId, tenantId);
    
    res.status(200).json({
      success: true,
      site
    });
  } catch (err) {
    next(err);
  }
};

// サイト作成
exports.createSite = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const userId = req.user ? req.user.id : null;
    
    const site = await siteService.createSite(req.body, tenantId, userId);
    
    res.status(201).json({
      success: true,
      site
    });
  } catch (err) {
    next(err);
  }
};

// サイト更新
exports.updateSite = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const siteId = req.params.id;
    const userId = req.user ? req.user.id : null;
    
    const site = await siteService.updateSite(siteId, req.body, tenantId, userId);
    
    res.status(200).json({
      success: true,
      site
    });
  } catch (err) {
    next(err);
  }
};

// サイト削除
exports.deleteSite = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const siteId = req.params.id;
    
    await siteService.deleteSite(siteId, tenantId);
    
    res.status(200).json({
      success: true,
      message: 'サイトが削除されました'
    });
  } catch (err) {
    next(err);
  }
};

// APIキー再生成
exports.regenerateApiKey = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const siteId = req.params.id;
    
    const site = await siteService.regenerateApiKey(siteId, tenantId);
    
    res.status(200).json({
      success: true,
      message: 'APIキーが再生成されました',
      site
    });
  } catch (err) {
    next(err);
  }
};

// 同期ログ取得
exports.getSyncLogs = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const siteId = req.params.id; // オプショナル
    const { page, limit, action } = req.query;
    
    const result = await siteService.getSyncLogs(tenantId, siteId, {
      page,
      limit,
      action
    });
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
}; 