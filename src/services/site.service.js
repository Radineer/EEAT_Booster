const { supabase, supabaseAdmin } = require('../config/supabase');
const crypto = require('crypto');

class SiteService {
  // サイト一覧取得
  async getSites(tenantId, options = {}) {
    const { page = 1, limit = 10, status } = options;
    const offset = (page - 1) * limit;
    
    let query = supabaseAdmin
      .from('sites')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    
    // ステータスフィルター
    if (status) {
      query = query.eq('status', status);
    }
    
    // ページネーション
    const { data: sites, error, count } = await query
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw error;
    }
    
    return {
      sites,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / limit)
    };
  }
  
  // サイト取得
  async getSite(id, tenantId) {
    const { data: site, error } = await supabaseAdmin
      .from('sites')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error) {
      throw error;
    }
    
    return site;
  }
  
  // サイト作成
  async createSite(siteData, tenantId, userId = null) {
    // サイト数の上限チェック
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('sites_limit')
      .eq('id', tenantId)
      .single();
    
    if (tenantError) {
      throw tenantError;
    }
    
    // 現在のサイト数を取得
    const { count, error: countError } = await supabaseAdmin
      .from('sites')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    if (countError) {
      throw countError;
    }
    
    // 上限チェック
    if (count >= tenant.sites_limit) {
      const error = new Error(`サイト数が上限（${tenant.sites_limit}）に達しています。プランをアップグレードしてください。`);
      error.statusCode = 403;
      throw error;
    }
    
    // APIキー生成
    const apiKey = this.generateApiKey();
    
    // サイト作成
    const { data: site, error } = await supabaseAdmin
      .from('sites')
      .insert({
        name: siteData.name,
        url: siteData.url,
        api_key: apiKey,
        tenant_id: tenantId,
        allowed_ips: siteData.allowed_ips || [],
        settings: siteData.settings || {
          syncEnabled: true,
          syncFrequency: 'daily',
          syncDirection: 'both',
          syncProfiles: true,
          syncTemplates: true
        },
        status: siteData.status || 'active',
        created_by: userId,
        updated_by: userId
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return site;
  }
  
  // サイト更新
  async updateSite(id, siteData, tenantId, userId = null) {
    // 既存サイト確認
    const { data: existingSite, error: getError } = await supabaseAdmin
      .from('sites')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (getError) {
      throw getError;
    }
    
    if (!existingSite) {
      const error = new Error('サイトが見つかりません');
      error.statusCode = 404;
      throw error;
    }
    
    // 更新データ準備
    const updateData = {
      updated_by: userId || existingSite.updated_by,
      updated_at: new Date()
    };
    
    if (siteData.name !== undefined) updateData.name = siteData.name;
    if (siteData.url !== undefined) updateData.url = siteData.url;
    if (siteData.status !== undefined) updateData.status = siteData.status;
    if (siteData.allowed_ips !== undefined) updateData.allowed_ips = siteData.allowed_ips;
    
    // 設定の更新（一部のみ更新可能にする）
    if (siteData.settings) {
      // 既存の設定とマージ
      updateData.settings = {
        ...existingSite.settings,
        ...siteData.settings
      };
    }
    
    // サイト更新
    const { data: site, error } = await supabaseAdmin
      .from('sites')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return site;
  }
  
  // サイト削除
  async deleteSite(id, tenantId) {
    // 既存サイト確認
    const { data: existingSite, error: getError } = await supabaseAdmin
      .from('sites')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (getError || !existingSite) {
      const error = new Error('サイトが見つかりません');
      error.statusCode = 404;
      throw error;
    }
    
    // サイト削除
    const { error } = await supabaseAdmin
      .from('sites')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    
    if (error) {
      throw error;
    }
    
    return true;
  }
  
  // APIキー再生成
  async regenerateApiKey(id, tenantId) {
    // 既存サイト確認
    const { data: existingSite, error: getError } = await supabaseAdmin
      .from('sites')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (getError || !existingSite) {
      const error = new Error('サイトが見つかりません');
      error.statusCode = 404;
      throw error;
    }
    
    // 新しいAPIキー生成
    const apiKey = this.generateApiKey();
    
    // APIキー更新
    const { data: site, error } = await supabaseAdmin
      .from('sites')
      .update({
        api_key: apiKey,
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return site;
  }
  
  // 同期ログ取得
  async getSyncLogs(tenantId, siteId, options = {}) {
    const { page = 1, limit = 10, action } = options;
    const offset = (page - 1) * limit;
    
    let query = supabaseAdmin
      .from('sync_logs')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    
    // サイトIDフィルター
    if (siteId) {
      query = query.eq('site_id', siteId);
    }
    
    // アクションフィルター
    if (action) {
      query = query.eq('action', action);
    }
    
    // ページネーション
    const { data: logs, error, count } = await query
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw error;
    }
    
    return {
      logs,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / limit)
    };
  }
  
  // 同期ログ作成（内部用）
  async createSyncLog(tenantId, siteId, action, success, message, details = {}) {
    const { data: log, error } = await supabaseAdmin
      .from('sync_logs')
      .insert({
        tenant_id: tenantId,
        site_id: siteId,
        action,
        success,
        message,
        details
      })
      .select()
      .single();
    
    if (error) {
      console.error('同期ログの作成に失敗しました:', error);
      return null;
    }
    
    return log;
  }
  
  // ランダムAPIキー生成
  generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = new SiteService(); 