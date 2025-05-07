const templateService = require('../services/template.service');

// テンプレート一覧取得
exports.getTemplates = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.tenant.id;
    const { page, limit, status } = req.query;
    
    const result = await templateService.getTemplates(tenantId, { 
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

// テンプレート詳細取得
exports.getTemplate = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.tenant.id;
    const templateId = req.params.id;
    
    const template = await templateService.getTemplate(templateId, tenantId);
    
    res.status(200).json({
      success: true,
      template
    });
  } catch (err) {
    next(err);
  }
};

// デフォルトテンプレート取得
exports.getDefaultTemplate = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.tenant.id;
    
    const template = await templateService.getDefaultTemplate(tenantId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'デフォルトテンプレートが見つかりません'
      });
    }
    
    res.status(200).json({
      success: true,
      template
    });
  } catch (err) {
    next(err);
  }
};

// テンプレート作成
exports.createTemplate = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.tenant.id;
    const userId = req.user ? req.user.id : null;
    
    const template = await templateService.createTemplate(req.body, tenantId, userId);
    
    res.status(201).json({
      success: true,
      template
    });
  } catch (err) {
    next(err);
  }
};

// テンプレート更新
exports.updateTemplate = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.tenant.id;
    const templateId = req.params.id;
    const userId = req.user ? req.user.id : null;
    
    const template = await templateService.updateTemplate(templateId, req.body, tenantId, userId);
    
    res.status(200).json({
      success: true,
      template
    });
  } catch (err) {
    next(err);
  }
};

// テンプレート削除
exports.deleteTemplate = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.tenant.id;
    const templateId = req.params.id;
    
    await templateService.deleteTemplate(templateId, tenantId);
    
    res.status(200).json({
      success: true,
      message: 'テンプレートが削除されました'
    });
  } catch (err) {
    next(err);
  }
};

// テンプレート一括同期
exports.syncTemplates = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.tenant.id;
    const siteId = req.site.id;
    const templates = req.body.templates || [];
    
    const result = await templateService.syncTemplates(templates, tenantId, siteId);
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
}; 