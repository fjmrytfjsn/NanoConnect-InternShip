#!/usr/bin/env tsx

/**
 * データベース初期化スクリプト
 * 開発環境用のデータベースセットアップ
 */

import { SQLiteConnection } from '../src/infrastructure/database/SQLiteConnection';

async function initializeDatabase(): Promise<void> {
  console.log('🚀 データベース初期化を開始します...');

  try {
    const db = SQLiteConnection.getInstance();
    
    // マイグレーションの実行
    await db.initialize();
    
    // ヘルスチェック
    const health = db.healthCheck();
    if (health.status === 'healthy') {
      console.log('✅ データベースは正常に動作しています');
    } else {
      console.error('❌ データベースに問題があります:', health.message);
      process.exit(1);
    }
    
    console.log('🎉 データベース初期化が完了しました！');
    
  } catch (error) {
    console.error('❌ データベース初期化に失敗しました:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  initializeDatabase().catch(error => {
    console.error('初期化処理でエラーが発生しました:', error);
    process.exit(1);
  });
}