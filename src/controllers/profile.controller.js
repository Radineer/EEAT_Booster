const profileService = require('../services/profile.service');

// プロフィール一覧取得
exports.getProfiles = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.tenant.id;
    const { page, limit, status, search } = req.query;
    
    const result = await profileService.getProfiles(tenantId, { 
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

// プロフィール詳細取得
exports.getProfile = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.tenant.id;
    const profileId = req.params.id;
    
    const profile = await profileService.getProfile(profileId, tenantId);
    
    res.status(200).json({
      success: true,
      profile
    });
  } catch (err) {
    next(err);
  }
};

// プロフィール作成
exports.createProfile = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.tenant.id;
    const userId = req.user ? req.user.id : null;
    
    const profile = await profileService.createProfile(req.body, tenantId, userId);
    
    res.status(201).json({
      success: true,
      profile
    });
  } catch (err) {
    next(err);
  }
};

// プロフィール更新
exports.updateProfile = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.tenant.id;
    const profileId = req.params.id;
    const userId = req.user ? req.user.id : null;
    
    const profile = await profileService.updateProfile(profileId, req.body, tenantId, userId);
    
    res.status(200).json({
      success: true,
      profile
    });
  } catch (err) {
    next(err);
  }
};

// プロフィール削除
exports.deleteProfile = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.tenant.id;
    const profileId = req.params.id;
    
    await profileService.deleteProfile(profileId, tenantId);
    
    res.status(200).json({
      success: true,
      message: 'プロフィールが削除されました'
    });
  } catch (err) {
    next(err);
  }
};

// プロフィール一括同期
exports.syncProfiles = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.tenant.id;
    const siteId = req.site.id;
    const profiles = req.body.profiles || [];
    
    const result = await profileService.syncProfiles(profiles, tenantId, siteId);
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
}; 