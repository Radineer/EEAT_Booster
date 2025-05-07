const { supabase, supabaseAdmin } = require('../config/supabase');

class TemplateService {
  // テンプレート一覧取得
  async getTemplates(tenantId, options = {}) {
    const { page = 1, limit = 10, status } = options;
    const offset = (page - 1) * limit;
    
    let query = supabaseAdmin
      .from('templates')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });
    
    // ステータスフィルター
    if (status) {
      query = query.eq('status', status);
    }
    
    // ページネーション
    const { data: templates, error, count } = await query
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw error;
    }
    
    return {
      templates,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / limit)
    };
  }
  
  // テンプレート取得
  async getTemplate(id, tenantId) {
    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error) {
      throw error;
    }
    
    return template;
  }
  
  // デフォルトテンプレート取得
  async getDefaultTemplate(tenantId) {
    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_default', true)
      .single();
    
    if (error) {
      // デフォルトが見つからない場合は最初のテンプレートを返す
      const { data: firstTemplate, error: secondError } = await supabaseAdmin
        .from('templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      if (secondError) {
        throw secondError;
      }
      
      return firstTemplate || null;
    }
    
    return template;
  }
  
  // テンプレート作成
  async createTemplate(templateData, tenantId, userId = null) {
    // デフォルトテンプレートの処理
    if (templateData.is_default) {
      await this.clearDefaultTemplate(tenantId);
    }
    
    // テンプレート作成
    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .insert({
        ...templateData,
        tenant_id: tenantId,
        created_by: userId,
        updated_by: userId
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return template;
  }
  
  // テンプレート更新
  async updateTemplate(id, templateData, tenantId, userId = null) {
    // 既存テンプレート確認
    const { data: existingTemplate, error: getError } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (getError) {
      throw getError;
    }
    
    if (!existingTemplate) {
      const error = new Error('テンプレートが見つかりません');
      error.statusCode = 404;
      throw error;
    }
    
    // デフォルトテンプレートの処理
    if (templateData.is_default) {
      await this.clearDefaultTemplate(tenantId, id);
    }
    
    // テンプレート更新
    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .update({
        ...templateData,
        updated_by: userId || existingTemplate.updated_by,
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return template;
  }
  
  // テンプレート削除
  async deleteTemplate(id, tenantId) {
    // 既存テンプレート確認
    const { data: existingTemplate, error: getError } = await supabaseAdmin
      .from('templates')
      .select('is_default')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (getError || !existingTemplate) {
      const error = new Error('テンプレートが見つかりません');
      error.statusCode = 404;
      throw error;
    }
    
    // デフォルトテンプレートは削除不可
    if (existingTemplate.is_default) {
      const error = new Error('デフォルトテンプレートは削除できません');
      error.statusCode = 400;
      throw error;
    }
    
    // テンプレート削除
    const { error } = await supabaseAdmin
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    
    if (error) {
      throw error;
    }
    
    return true;
  }
  
  // デフォルトテンプレートをクリア
  async clearDefaultTemplate(tenantId, exceptId = null) {
    let query = supabaseAdmin
      .from('templates')
      .update({ is_default: false })
      .eq('tenant_id', tenantId)
      .eq('is_default', true);
    
    // 特定のIDを除外
    if (exceptId) {
      query = query.neq('id', exceptId);
    }
    
    const { error } = await query;
    
    if (error) {
      throw error;
    }
    
    return true;
  }
  
  // テンプレート同期
  async syncTemplates(templates, tenantId, siteId) {
    // 同期実行
    const result = {
      added: 0,
      updated: 0,
      deleted: 0,
      errors: []
    };
    
    // サイト情報を取得して同期設定を確認
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('settings')
      .eq('id', siteId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (siteError) {
      throw siteError;
    }
    
    // 同期設定を確認
    if (!site.settings.syncTemplates) {
      const error = new Error('テンプレート同期が無効になっています');
      error.statusCode = 403;
      throw error;
    }
    
    const syncDirection = site.settings.syncDirection;
    const isPull = syncDirection === 'pull' || syncDirection === 'both';
    const isPush = syncDirection === 'push' || syncDirection === 'both';
    
    if (isPush) {
      // 各テンプレートを処理
      for (const templateData of templates) {
        try {
          // クラウドIDの確認
          if (templateData.id && !templateData.id.startsWith('local_')) {
            // 既存テンプレートの更新
            const { data: existingTemplate, error: checkError } = await supabaseAdmin
              .from('templates')
              .select('id')
              .eq('id', templateData.id)
              .eq('tenant_id', tenantId)
              .single();
            
            if (!checkError && existingTemplate) {
              // テンプレートを更新
              const { error: updateError } = await supabaseAdmin
                .from('templates')
                .update({
                  name: templateData.name,
                  description: templateData.description || '',
                  html: templateData.html,
                  css: templateData.css || '',
                  is_default: templateData.is_default || false,
                  status: templateData.status || 'active',
                  updated_at: new Date()
                })
                .eq('id', templateData.id)
                .eq('tenant_id', tenantId);
              
              if (!updateError) {
                result.updated++;
              } else {
                result.errors.push(`テンプレート ${templateData.name} の更新中にエラー: ${updateError.message}`);
              }
            } else {
              result.errors.push(`テンプレートID ${templateData.id} が見つかりません`);
            }
          } else {
            // 新規テンプレートの作成
            const { data: newTemplate, error: createError } = await supabaseAdmin
              .from('templates')
              .insert({
                tenant_id: tenantId,
                name: templateData.name,
                description: templateData.description || '',
                html: templateData.html,
                css: templateData.css || '',
                is_default: templateData.is_default || false,
                status: templateData.status || 'active'
              })
              .select()
              .single();
            
            if (!createError && newTemplate) {
              result.added++;
            } else {
              result.errors.push(`テンプレート ${templateData.name} の作成中にエラー: ${createError?.message || '不明なエラー'}`);
            }
          }
        } catch (err) {
          result.errors.push(`テンプレート ${templateData.name} の処理中にエラー: ${err.message}`);
        }
      }
    }
    
    // 同期ログを作成
    const { error: logError } = await supabaseAdmin
      .from('sync_logs')
      .insert({
        tenant_id: tenantId,
        site_id: siteId,
        action: 'templates_sync',
        success: true,
        message: `${result.added} 件のテンプレートを追加し、${result.updated} 件を更新しました`,
        details: {
          pushed: result.added + result.updated,
          pulled: 0,
          total: result.added + result.updated,
          errors: result.errors
        }
      });
    
    if (logError) {
      console.error('同期ログの作成に失敗しました:', logError);
    }
    
    // 最終同期日時を更新
    await supabaseAdmin
      .from('sites')
      .update({ last_sync: new Date() })
      .eq('id', siteId)
      .eq('tenant_id', tenantId);
    
    // クラウドからのテンプレートリストが要求された場合は取得
    let cloudTemplates = [];
    if (isPull) {
      const { data, error: pullError } = await supabaseAdmin
        .from('templates')
        .select('id, name, description, html, css, is_default, status, created_at, updated_at')
        .eq('tenant_id', tenantId);
      
      if (!pullError) {
        cloudTemplates = data;
      }
    }
    
    return {
      message: `同期が完了しました。${result.added} 件追加、${result.updated} 件更新`,
      templates: cloudTemplates,
      result
    };
  }
}

module.exports = new TemplateService(); 