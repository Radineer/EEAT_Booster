# Radineer EEAT-Booster API

Radineer EEAT-Booster のバックエンドAPI（Supabase版）

## 概要

このプロジェクトは、Radineer EEAT-Booster WordPressプラグインのSaaS版バックエンドAPIです。
Supabaseを活用してマルチテナント対応のRESTful APIを提供します。

## 機能

- マルチテナント対応の監修者プロフィール管理
- セキュアなAPIアクセスと認証
- テンプレート管理
- サイト連携＆同期管理
- Row Level Security（RLS）による堅牢なセキュリティ

## 技術スタック

- Node.js + Express
- Supabase (PostgreSQL + Auth)
- JWT認証

## 必要条件

- Node.js 16以上
- Supabaseアカウントとプロジェクト

## インストール方法

```bash
# パッケージのインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集して必要な環境変数を設定

# 開発サーバーの起動
npm run dev
```

## 環境変数

`.env`ファイルに以下の環境変数を設定する必要があります：

```
# サーバー設定
PORT=3000
NODE_ENV=development

# フロントエンドURL（CORS設定用）
FRONTEND_URL=http://localhost:3001

# Supabase設定
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key

# JWT設定
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h
```

## Supabaseセットアップ

1. Supabaseでプロジェクトを作成
2. schema.sqlファイルの内容をSQL Editorで実行
3. 環境変数を設定

## テスト環境のセットアップ

テスト用のデータを自動的に作成するスクリプトを用意しています：

```bash
npm run setup-test
```

これにより以下が作成されます：
- テスト用テナント
- 管理者ユーザー（test@example.com / password123）
- テスト用サイト
- デフォルトテンプレート
- テスト用プロフィール

## API ドキュメント

主要なエンドポイント：

### 認証

- `POST /api/v1/auth/login` - ログイン
- `POST /api/v1/auth/logout` - ログアウト
- `GET /api/v1/auth/me` - 現在のユーザー情報取得

### プロフィール

- `GET /api/v1/profiles` - プロフィール一覧取得
- `GET /api/v1/profiles/:id` - プロフィール詳細取得
- `POST /api/v1/profiles` - プロフィール作成
- `PUT /api/v1/profiles/:id` - プロフィール更新
- `DELETE /api/v1/profiles/:id` - プロフィール削除
- `POST /api/v1/profiles/sync` - プロフィール同期（APIキー認証）

### テンプレート

- `GET /api/v1/templates` - テンプレート一覧取得
- `GET /api/v1/templates/default` - デフォルトテンプレート取得
- `GET /api/v1/templates/:id` - テンプレート詳細取得
- `POST /api/v1/templates` - テンプレート作成
- `PUT /api/v1/templates/:id` - テンプレート更新
- `DELETE /api/v1/templates/:id` - テンプレート削除
- `POST /api/v1/templates/sync` - テンプレート同期（APIキー認証）

### テナント

- `GET /api/v1/tenants/me` - 現在のテナント情報取得
- `GET /api/v1/tenants/stats` - テナントの使用状況取得
- `POST /api/v1/tenants/register` - テナント登録（サインアップ）

### サイト

- `GET /api/v1/sites` - サイト一覧取得
- `GET /api/v1/sites/:id` - サイト詳細取得
- `POST /api/v1/sites` - サイト作成
- `PUT /api/v1/sites/:id` - サイト更新
- `DELETE /api/v1/sites/:id` - サイト削除
- `POST /api/v1/sites/:id/regenerate-key` - APIキー再生成
- `GET /api/v1/sites/:id/logs` - 同期ログ取得

## WordPress連携

WordPressプラグインとの連携：

1. サイトの設定画面でAPIキーとテナントIDを取得
2. WordPressプラグインの連携設定画面で入力
3. 同期設定を構成（方向、スケジュール等）
4. 同期実行

## ライセンス

ISC License 