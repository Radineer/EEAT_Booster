const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');
const { authenticateJWT, authorize } = require('../middleware/auth');

// 現在のテナント情報取得
router.get('/me', authenticateJWT, tenantController.getCurrentTenant);

// テナントの使用状況取得
router.get('/stats', authenticateJWT, tenantController.getTenantStats);

// テナントのユーザー一覧取得
router.get('/users', authenticateJWT, authorize('admin'), tenantController.getTenantUsers);

// テナント登録（サインアップ）- 認証不要
router.post('/register', tenantController.registerTenant);

// 以下は管理者用API

// テナント一覧取得（スーパー管理者用）
router.get('/', authenticateJWT, authorize('super_admin'), tenantController.getTenants);

// テナント詳細取得（スーパー管理者用）
router.get('/:id', authenticateJWT, authorize('super_admin'), tenantController.getTenant);

// テナント作成（スーパー管理者用）
router.post('/', authenticateJWT, authorize('super_admin'), tenantController.createTenant);

// テナント更新（スーパー管理者用）
router.put('/:id', authenticateJWT, authorize('super_admin'), tenantController.updateTenant);

// テナント削除（スーパー管理者用）
router.delete('/:id', authenticateJWT, authorize('super_admin'), tenantController.deleteTenant);

module.exports = router; 