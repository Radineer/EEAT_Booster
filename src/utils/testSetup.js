const { supabaseAdmin } = require('../config/supabase');
require('dotenv').config();

/**
 * テスト用のテナントとユーザーを作成するスクリプト
 */
async function createTestTenant() {
  try {
    console.log('テスト用テナントを作成中...');
    
    // テナント作成
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: 'テスト用テナント',
        plan: 'free',
        profiles_limit: 10,
        sites_limit: 2,
        status: 'active'
      })
      .select()
      .single();
    
    if (tenantError) {
      throw tenantError;
    }
    
    console.log('テナント作成成功:', tenant);
    
    // テスト用ユーザー作成
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: 'test@example.com',
      password: 'password123',
      user_metadata: {
        name: 'テストユーザー',
        role: 'admin',
        tenant_id: tenant.id
      },
      email_confirm: true
    });
    
    if (userError) {
      throw userError;
    }
    
    console.log('ユーザー作成成功:', user);
    
    // テスト用サイト作成
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .insert({
        tenant_id: tenant.id,
        name: 'テストサイト',
        url: 'https://test.example.com',
        api_key: '123456789abcdef',
        status: 'active',
        settings: {
          syncEnabled: true,
          syncFrequency: 'daily',
          syncDirection: 'both',
          syncProfiles: true,
          syncTemplates: true
        }
      })
      .select()
      .single();
    
    if (siteError) {
      throw siteError;
    }
    
    console.log('サイト作成成功:', site);
    
    // テスト用テンプレート作成
    const { data: template, error: templateError } = await supabaseAdmin
      .from('templates')
      .insert({
        tenant_id: tenant.id,
        name: 'デフォルトテンプレート',
        description: 'テスト用のデフォルトテンプレート',
        html: '<div class="profile-box"><div class="profile-image">{{image}}</div><div class="profile-content"><h3>{{name}}</h3><p class="title">{{title}}</p><p class="description">{{description}}</p></div></div>',
        css: '.profile-box { display: flex; border: 1px solid #ddd; padding: 15px; } .profile-image { flex: 0 0 100px; } .profile-content { flex: 1; padding-left: 15px; }',
        is_default: true,
        status: 'active'
      })
      .select()
      .single();
    
    if (templateError) {
      throw templateError;
    }
    
    console.log('テンプレート作成成功:', template);
    
    // テスト用プロフィール作成
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        tenant_id: tenant.id,
        name: '山田 太郎',
        title: '医師',
        description: 'テスト用プロフィールです。',
        status: 'published',
        social_links: {
          twitter: 'https://twitter.com/example',
          website: 'https://example.com'
        }
      })
      .select()
      .single();
    
    if (profileError) {
      throw profileError;
    }
    
    console.log('プロフィール作成成功:', profile);
    
    console.log('テスト環境のセットアップが完了しました');
    console.log('ログイン情報:');
    console.log('Email: test@example.com');
    console.log('Password: password123');
    console.log('テナントID:', tenant.id);
    
    return { tenant, user, site, template, profile };
  } catch (err) {
    console.error('テスト環境の作成に失敗しました:', err);
    throw err;
  }
}

// スクリプトとして実行された場合のみ実行
if (require.main === module) {
  createTestTenant()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { createTestTenant }; 