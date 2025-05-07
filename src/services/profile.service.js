const { supabase, supabaseAdmin } = require('../config/supabase');

class ProfileService {
  // プロフィール一覧取得
  async getProfiles(tenantId, options = {}) {
    const { page = 1, limit = 10, status, search } = options;
    const offset = (page - 1) * limit;
    
    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false });
    
    // ステータスフィルター
    if (status) {
      query = query.eq('status', status);
    }
    
    // 検索フィルター
    if (search) {
      query = query.or(`name.ilike.%${search}%,title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // ページネーション
    const { data: profiles, error, count } = await query
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw error;
    }
    
    return {
      profiles,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / limit)
    };
  }
  
  // プロフィール取得
  async getProfile(id, tenantId) {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (error) {
      throw error;
    }
    
    return profile;
  }
  
  // プロフィール作成
  async createProfile(profileData, tenantId, userId = null) {
    // プロフィール数の上限チェック
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('profiles_limit')
      .eq('id', tenantId)
      .single();
    
    if (tenantError) {
      throw tenantError;
    }
    
    // 現在のプロフィール数を取得
    const { count, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    if (countError) {
      throw countError;
    }
    
    // 上限チェック
    if (count >= tenant.profiles_limit) {
      const error = new Error(`プロフィール数が上限（${tenant.profiles_limit}）に達しています。プランをアップグレードしてください。`);
      error.statusCode = 403;
      throw error;
    }
    
    // プロフィール作成
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        ...profileData,
        tenant_id: tenantId,
        created_by: userId,
        updated_by: userId
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return profile;
  }
  
  // プロフィール更新
  async updateProfile(id, profileData, tenantId, userId = null) {
    // 既存プロフィール確認
    const { data: existingProfile, error: getError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (getError) {
      throw getError;
    }
    
    if (!existingProfile) {
      const error = new Error('プロフィールが見つかりません');
      error.statusCode = 404;
      throw error;
    }
    
    // プロフィール更新
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update({
        ...profileData,
        updated_by: userId || existingProfile.updated_by,
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return profile;
  }
  
  // プロフィール削除
  async deleteProfile(id, tenantId) {
    // 既存プロフィール確認
    const { data: existingProfile, error: getError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (getError || !existingProfile) {
      const error = new Error('プロフィールが見つかりません');
      error.statusCode = 404;
      throw error;
    }
    
    // プロフィール削除
    const { error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    
    if (error) {
      throw error;
    }
    
    return true;
  }
  
  // プロフィール一括同期
  async syncProfiles(profiles, tenantId, siteId) {
    // テナント情報取得（上限チェック）
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('profiles_limit')
      .eq('id', tenantId)
      .single();
    
    if (tenantError) {
      throw tenantError;
    }
    
    // 現在のプロフィール数を取得
    const { count: currentCount, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    
    if (countError) {
      throw countError;
    }
    
    // 新規プロフィール数
    const newProfilesCount = profiles.filter(p => !p.id || p.id.startsWith('local_')).length;
    
    // 上限チェック
    if (currentCount + newProfilesCount > tenant.profiles_limit) {
      const error = new Error(`プロフィール数が上限（${tenant.profiles_limit}）を超過します。プランをアップグレードしてください。`);
      error.statusCode = 403;
      throw error;
    }
    
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
    if (!site.settings.syncProfiles) {
      const error = new Error('プロフィール同期が無効になっています');
      error.statusCode = 403;
      throw error;
    }
    
    const syncDirection = site.settings.syncDirection;
    const isPull = syncDirection === 'pull' || syncDirection === 'both';
    const isPush = syncDirection === 'push' || syncDirection === 'both';
    
    if (isPush) {
      // 各プロフィールを処理
      for (const profileData of profiles) {
        try {
          // クラウドIDの確認
          if (profileData.id && !profileData.id.startsWith('local_')) {
            // 既存プロフィールの更新
            const { data: existingProfile, error: checkError } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('id', profileData.id)
              .eq('tenant_id', tenantId)
              .single();
            
            if (!checkError && existingProfile) {
              // プロフィールを更新
              const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({
                  name: profileData.name,
                  title: profileData.title,
                  description: profileData.description || '',
                  image_url: profileData.image_url || '',
                  categories: profileData.categories || [],
                  social_links: profileData.social_links || {},
                  status: profileData.status === 'draft' ? 'draft' : 'published',
                  updated_at: new Date()
                })
                .eq('id', profileData.id)
                .eq('tenant_id', tenantId);
              
              if (!updateError) {
                result.updated++;
              } else {
                result.errors.push(`プロフィール ${profileData.name} の更新中にエラー: ${updateError.message}`);
              }
            } else {
              result.errors.push(`プロフィールID ${profileData.id} が見つかりません`);
            }
          } else {
            // 新規プロフィールの作成
            const { data: newProfile, error: createError } = await supabaseAdmin
              .from('profiles')
              .insert({
                tenant_id: tenantId,
                name: profileData.name,
                title: profileData.title,
                description: profileData.description || '',
                image_url: profileData.image_url || '',
                categories: profileData.categories || [],
                social_links: profileData.social_links || {},
                status: profileData.status === 'draft' ? 'draft' : 'published'
              })
              .select()
              .single();
            
            if (!createError && newProfile) {
              result.added++;
            } else {
              result.errors.push(`プロフィール ${profileData.name} の作成中にエラー: ${createError?.message || '不明なエラー'}`);
            }
          }
        } catch (err) {
          result.errors.push(`プロフィール ${profileData.name} の処理中にエラー: ${err.message}`);
        }
      }
    }
    
    // 同期ログを作成
    const { error: logError } = await supabaseAdmin
      .from('sync_logs')
      .insert({
        tenant_id: tenantId,
        site_id: siteId,
        action: 'profiles_sync',
        success: true,
        message: `${result.added} 件のプロフィールを追加し、${result.updated} 件を更新しました`,
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
    
    // クラウドからのプロフィールリストが要求された場合は取得
    let cloudProfiles = [];
    if (isPull) {
      const { data, error: pullError } = await supabaseAdmin
        .from('profiles')
        .select('id, name, title, description, image_url, categories, social_links, status, created_at, updated_at')
        .eq('tenant_id', tenantId);
      
      if (!pullError) {
        cloudProfiles = data;
      }
    }
    
    return {
      message: `同期が完了しました。${result.added} 件追加、${result.updated} 件更新`,
      profiles: cloudProfiles,
      result
    };
  }
}

module.exports = new ProfileService(); 