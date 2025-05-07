const express = require('express');
const router = express.Router();
const siteController = require('../controllers/site.controller');
const { authenticateJWT, authorize } = require('../middleware/auth');

// サイト一覧取得
router.get('/', authenticateJWT, siteController.getSites);

// サイト詳細取得
router.get('/:id', authenticateJWT, siteController.getSite);

// サイト作成
router.post('/', authenticateJWT, authorize('admin'), siteController.createSite);

// サイト更新
router.put('/:id', authenticateJWT, authorize('admin'), siteController.updateSite);

// サイト削除
router.delete('/:id', authenticateJWT, authorize('admin'), siteController.deleteSite);

// APIキー再生成
router.post('/:id/regenerate-key', authenticateJWT, authorize('admin'), siteController.regenerateApiKey);

// 同期ログ取得
router.get('/:id/logs', authenticateJWT, siteController.getSyncLogs);

// 全サイトの同期ログ取得
router.get('/logs', authenticateJWT, siteController.getSyncLogs);

module.exports = router; 