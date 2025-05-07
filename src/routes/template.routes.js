const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const { authenticateJWT, authenticateApiKey, authorize } = require('../middleware/auth');

// テンプレート一覧取得
router.get('/', authenticateJWT, templateController.getTemplates);

// デフォルトテンプレート取得
router.get('/default', authenticateJWT, templateController.getDefaultTemplate);

// テンプレート詳細取得
router.get('/:id', authenticateJWT, templateController.getTemplate);

// テンプレート作成
router.post('/', authenticateJWT, templateController.createTemplate);

// テンプレート更新
router.put('/:id', authenticateJWT, templateController.updateTemplate);

// テンプレート削除
router.delete('/:id', authenticateJWT, templateController.deleteTemplate);

// テンプレート一括同期（APIキー認証）
router.post('/sync', authenticateApiKey, templateController.syncTemplates);

module.exports = router; 