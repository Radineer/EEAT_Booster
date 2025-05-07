const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateJWT, authorize } = require('../middleware/auth');

// ログイン
router.post('/login', authController.login);

// ログアウト
router.post('/logout', authenticateJWT, authController.logout);

// パスワードリセットメール送信
router.post('/forgot-password', authController.sendPasswordResetEmail);

// パスワードリセット（トークン使用）
router.post('/reset-password', authController.resetPassword);

// 現在のユーザー情報取得
router.get('/me', authenticateJWT, authController.getCurrentUser);

// パスワード変更（ログイン中）
router.post('/change-password', authenticateJWT, authController.updatePassword);

// ユーザー情報更新
router.put('/profile', authenticateJWT, authController.updateProfile);

// 新規ユーザー追加（テナント管理者のみ）
router.post('/users', authenticateJWT, authorize('admin'), authController.createUser);

// ユーザー削除（テナント管理者のみ）
router.delete('/users/:id', authenticateJWT, authorize('admin'), authController.deleteUser);

module.exports = router; 