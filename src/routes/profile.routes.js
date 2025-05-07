const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { authenticateJWT, authenticateApiKey, authorize } = require('../middleware/auth');

// プロフィール一覧取得
router.get('/', authenticateJWT, profileController.getProfiles);

// プロフィール詳細取得
router.get('/:id', authenticateJWT, profileController.getProfile);

// プロフィール作成
router.post('/', authenticateJWT, profileController.createProfile);

// プロフィール更新
router.put('/:id', authenticateJWT, profileController.updateProfile);

// プロフィール削除
router.delete('/:id', authenticateJWT, profileController.deleteProfile);

// プロフィール一括同期（APIキー認証）
router.post('/sync', authenticateApiKey, profileController.syncProfiles);

module.exports = router; 