const { supabase, supabaseAdmin } = require('../config/supabase');

class TenantService {
  // テナント一覧取得（管理者用）
  async getTenants(options = {}) {
    const { page = 1, limit = 10, status, search } = options;
    const offset = (page - 1) * limit;
    
    let query = supabaseAdmin
      .from('tenants')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    // ステータスフィルター
    if (status) {
      query = query.eq('status', status);
    }
    
    // 検索フィルター
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    // ページネーション
    const { data: tenants, error, count } = await query
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw error;
    }
    
    return {
      tenants,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / limit)
    };
  }
  
  // テナント詳細取得
  async getTenant(id) {
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      throw error;
    }
    
    return tenant;
  }
  
  // テナント作成
  async createTenant(tenantData) {
    // テナント作成
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: tenantData.name,
        plan: tenantData.plan || 'free',
        profiles_limit: tenantData.profiles_limit || 10,
        sites_limit: tenantData.sites_limit || 1,
        status: tenantData.status || 'active'
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return tenant;
  }
  
  // テナント更新
  async updateTenant(id, tenantData) {
    // 既存テナント確認
    const { data: existingTenant, error: getError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();
    
    if (getError) {
      throw getError;
    }
    
    if (!existingTenant) {
      const error = new Error('テナントが見つかりません');
      error.statusCode = 404;
      throw error;
    }
    
    // テナント更新
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .update({
        name: tenantData.name !== undefined ? tenantData.name : existingTenant.name,
        plan: tenantData.plan !== undefined ? tenantData.plan : existingTenant.plan,
        profiles_limit: tenantData.profiles_limit !== undefined ? tenantData.profiles_limit : existingTenant.profiles_limit,
        sites_limit: tenantData.sites_limit !== undefined ? tenantData.sites_limit : existingTenant.sites_limit,
        status: tenantData.status !== undefined ? tenantData.status : existingTenant.status,
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return tenant;
  }
  
  // テナント削除（論理削除）
  async deleteTenant(id) {
    // 既存テナント確認
    const { data: existingTenant, error: getError } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('id', id)
      .single();
    
    if (getError || !existingTenant) {
      const error = new Error('テナントが見つかりません');
      error.statusCode = 404;
      throw error;
    }
    
    // テナントの論理削除（ステータスを非アクティブに）
    const { error } = await supabaseAdmin
      .from('tenants')
      .update({
        status: 'inactive',
        updated_at: new Date()
      })
      .eq('id', id);
    
    if (error) {
      throw error;
    }
    
    return true;
  }
  
  // テナントの使用状況取得
  async getTenantStats(tenantId) {
    // プロフィール数取得
    const { count: profilesCount, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    if (profilesError) {
      throw profilesError;
    }
    
    // テンプレート数取得
    const { count: templatesCount, error: templatesError } = await supabaseAdmin
      .from('templates')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    if (templatesError) {
      throw templatesError;
    }
    
    // サイト数取得
    const { count: sitesCount, error: sitesError } = await supabaseAdmin
      .from('sites')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    if (sitesError) {
      throw sitesError;
    }
    
    // テナント情報取得
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();
    
    if (tenantError) {
      throw tenantError;
    }
    
    // 最近の同期ログを取得
    const { data: recentSyncs, error: syncsError } = await supabaseAdmin
      .from('sync_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (syncsError) {
      throw syncsError;
    }
    
    return {
      tenant: tenant,
      usage: {
        profiles: {
          count: profilesCount,
          limit: tenant.profiles_limit,
          percentage: Math.round((profilesCount / tenant.profiles_limit) * 100)
        },
        sites: {
          count: sitesCount,
          limit: tenant.sites_limit,
          percentage: Math.round((sitesCount / tenant.sites_limit) * 100)
        },
        templates: {
          count: templatesCount
        }
      },
      recent_syncs: recentSyncs
    };
  }
  
  // テナントのユーザー一覧取得
  async getTenantUsers(tenantId) {
    // Supabaseのauthユーザーから、特定のテナントIDを持つユーザーを取得
    // 注意: これはサービスロール権限が必要
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }
    
    // テナントIDでフィルタリング
    const tenantUsers = users.filter(user => {
      return user.user_metadata && user.user_metadata.tenant_id === tenantId;
    }).map(user => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata.name || '',
      role: user.user_metadata.role || 'user',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at
    }));
    
    return tenantUsers;
  }
  
  // テナント登録（サインアップ）
  async registerTenant(tenantData, userData) {
    try {
      // ストアドプロシージャを使用してテナントとユーザーを作成
      const { data, error } = await supabaseAdmin.rpc('register_tenant', {
        tenant_name: tenantData.name,
        user_email: userData.email,
        user_name: userData.name,
        user_password: userData.password
      });
      
      if (error) {
        throw error;
      }
      
      return {
        tenant_id: data.tenant_id,
        user_id: data.user_id
      };
    } catch (err) {
      // エラーを再スロー
      throw err;
    }
  }
}

module.exports = new TenantService(); 