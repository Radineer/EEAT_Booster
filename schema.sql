-- テナントテーブル
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  profiles_limit INTEGER NOT NULL DEFAULT 10,
  sites_limit INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- プロフィールテーブル
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  categories TEXT[] DEFAULT '{}',
  social_links JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'published',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- テンプレートテーブル
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  html TEXT NOT NULL,
  css TEXT DEFAULT '',
  is_default BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- サイト連携テーブル
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_sync TIMESTAMP WITH TIME ZONE,
  allowed_ips TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{"syncEnabled": true, "syncFrequency": "daily", "syncDirection": "both", "syncProfiles": true, "syncTemplates": true}',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 同期ログテーブル
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  success BOOLEAN DEFAULT TRUE,
  message TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 関数: テナントに属するユーザーか確認
CREATE OR REPLACE FUNCTION check_user_belongs_to_tenant(tenant_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  belongs BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_uuid 
    AND raw_user_meta_data->>'tenant_id' = tenant_uuid::TEXT
  ) INTO belongs;
  
  RETURN belongs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security ポリシー設定

-- テナントテーブルのRLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- テナントユーザーは自分のテナントのみ参照可能
CREATE POLICY tenant_users_select ON tenants
  FOR SELECT
  USING (
    check_user_belongs_to_tenant(id, auth.uid())
  );

-- プロフィールテーブルのRLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- テナントユーザーは自分のテナントのプロフィールのみ操作可能
CREATE POLICY profiles_tenant_access ON profiles
  FOR ALL
  USING (
    check_user_belongs_to_tenant(tenant_id, auth.uid())
  );

-- テンプレートテーブルのRLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- テナントユーザーは自分のテナントのテンプレートのみ操作可能
CREATE POLICY templates_tenant_access ON templates
  FOR ALL
  USING (
    check_user_belongs_to_tenant(tenant_id, auth.uid())
  );

-- サイトテーブルのRLS
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- テナントユーザーは自分のテナントのサイトのみ操作可能
CREATE POLICY sites_tenant_access ON sites
  FOR ALL
  USING (
    check_user_belongs_to_tenant(tenant_id, auth.uid())
  );

-- 同期ログテーブルのRLS
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- テナントユーザーは自分のテナントの同期ログのみ参照可能
CREATE POLICY sync_logs_tenant_access ON sync_logs
  FOR SELECT
  USING (
    check_user_belongs_to_tenant(tenant_id, auth.uid())
  );

-- API利用のためのストアドプロシージャ

-- テナント登録プロシージャ
CREATE OR REPLACE FUNCTION register_tenant(
  tenant_name TEXT,
  user_email TEXT,
  user_name TEXT,
  user_password TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_tenant_id UUID;
  new_user_id UUID;
  result JSONB;
BEGIN
  -- テナント作成
  INSERT INTO tenants (name) 
  VALUES (tenant_name)
  RETURNING id INTO new_tenant_id;
  
  -- ユーザー作成 (auth.usersテーブルを使用)
  INSERT INTO auth.users (
    email,
    raw_user_meta_data,
    is_super_admin
  ) VALUES (
    user_email,
    jsonb_build_object(
      'tenant_id', new_tenant_id,
      'name', user_name,
      'role', 'admin'
    ),
    FALSE
  )
  RETURNING id INTO new_user_id;
  
  -- 結果を返す
  result := jsonb_build_object(
    'tenant_id', new_tenant_id,
    'user_id', new_user_id
  );
  
  RETURN result;
END;
$$; 