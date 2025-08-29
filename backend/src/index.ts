/**
 * NanoConnect Backend Server
 * メインエントリーポイント
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { config } from '@/config/app';
import { SQLiteConnection } from '@/infrastructure/database/SQLiteConnection';
import { slideRoutes } from '@/presentation/routes/slideRoutes';

// プレゼンテーション関連のインポート
import { SQLitePresentationRepository } from '@/infrastructure/database/repositories/SQLitePresentationRepository';
import { SQLiteUserRepository } from '@/infrastructure/database/repositories/SQLiteUserRepository';
import { CreatePresentationUseCase } from '@/application/useCases/presentation/CreatePresentationUseCase';
import { GetPresentationUseCase } from '@/application/useCases/presentation/GetPresentationUseCase';
import { ListPresentationsUseCase } from '@/application/useCases/presentation/ListPresentationsUseCase';
import { UpdatePresentationUseCase } from '@/application/useCases/presentation/UpdatePresentationUseCase';
import { DeletePresentationUseCase } from '@/application/useCases/presentation/DeletePresentationUseCase';
import { PresentationController } from '@/presentation/controllers/PresentationController';
import { createPresentationRoutes } from '@/presentation/routes/presentationRoutes';

class NanoConnectServer {
  private app: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  private io: SocketIOServer;
  private database: SQLiteConnection;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.database = SQLiteConnection.getInstance();

    // Socket.IOの初期化
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: config.cors.origin,
        credentials: config.cors.credentials,
      },
    });
  }

  /**
   * サーバーの初期化
   */
  public async initialize(): Promise<void> {
    try {
      // データベースの初期化
      await this.database.initialize();

      // ミドルウェアの設定
      this.setupMiddleware();

      // ルートの設定（Phase1では基本的なヘルスチェックのみ）
      this.setupRoutes();

      // Socket.IOの設定（Phase1では基本設定のみ）
      this.setupSocketIO();

      console.log('✅ サーバーの初期化が完了しました');
    } catch (error) {
      console.error('❌ サーバーの初期化に失敗しました:', error);
      throw error;
    }
  }

  /**
   * ミドルウェアの設定
   */
  private setupMiddleware(): void {
    // CORS設定
    this.app.use(
      cors({
        origin: config.cors.origin,
        credentials: config.cors.credentials,
      })
    );

    // JSON解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // リクエストログ（開発環境のみ）
    if (config.nodeEnv === 'development') {
      this.app.use((req, _res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
      });
    }
  }

  /**
   * ルートの設定
   */
  private setupRoutes(): void {
    // プレゼンテーションAPIルートの設定
    this.setupPresentationRoutes();

    // スライドAPI（メインAPI）
    this.app.use('/api', slideRoutes);

    // ヘルスチェックエンドポイント
    this.app.get('/health', (_req, res) => {
      const dbHealth = this.database.healthCheck();

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config.nodeEnv,
        database: dbHealth,
      });
    });

    // API情報エンドポイント
    this.app.get('/api', (_req, res) => {
      res.json({
        name: 'NanoConnect API',
        version: '1.0.0',
        description: 'リアルタイムインタラクティブプレゼンテーションAPI',
        documentation: '/api/docs',
        endpoints: {
          health: '/health',
          auth: '/api/auth',
          presentations: '/api/presentations',
          slides: '/api/slides',
        },
      });
    });

    // 404ハンドラー
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `エンドポイント ${req.originalUrl} は存在しません`,
        timestamp: new Date().toISOString(),
      });
    });

    // エラーハンドラー
    this.app.use(
      (error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        console.error('サーバーエラー:', error);

        res.status(500).json({
          error: 'Internal Server Error',
          message:
            config.nodeEnv === 'development' ? error.message : 'サーバー内部エラーが発生しました',
          timestamp: new Date().toISOString(),
        });
      }
    );
  }

  /**
   * プレゼンテーションAPIルートの設定
   */
  private setupPresentationRoutes(): void {
    // データベース接続
    const dbConnection = SQLiteConnection.getInstance();

    // リポジトリの初期化
    const presentationRepository = new SQLitePresentationRepository(dbConnection);
    const userRepository = new SQLiteUserRepository();

    // ユースケースの初期化
    const createPresentationUseCase = new CreatePresentationUseCase(
      presentationRepository,
      userRepository
    );
    const getPresentationUseCase = new GetPresentationUseCase(presentationRepository);
    const listPresentationsUseCase = new ListPresentationsUseCase(presentationRepository);
    const updatePresentationUseCase = new UpdatePresentationUseCase(presentationRepository);
    const deletePresentationUseCase = new DeletePresentationUseCase(presentationRepository);

    // コントローラーの初期化
    const presentationController = new PresentationController(
      createPresentationUseCase,
      getPresentationUseCase,
      updatePresentationUseCase,
      deletePresentationUseCase,
      listPresentationsUseCase
    );

    // ルートの設定
    this.app.use('/api/presentations', createPresentationRoutes(presentationController));
  }

  /**
   * Socket.IOの設定
   */
  private setupSocketIO(): void {
    this.io.on('connection', socket => {
      console.log(`🔗 クライアントが接続しました: ${socket.id}`);

      // 基本的な接続処理（Phase4で詳細実装）
      socket.on('disconnect', reason => {
        console.log(`🔌 クライアントが切断しました: ${socket.id}, 理由: ${reason}`);
      });

      // テスト用のエコーイベント
      socket.on('echo', (data, callback) => {
        callback?.({
          message: 'Echo received',
          data,
          timestamp: new Date().toISOString(),
        });
      });
    });
  }

  /**
   * サーバーの開始
   */
  public async start(): Promise<void> {
    await this.initialize();

    this.httpServer.listen(config.port, () => {
      console.log(`🚀 NanoConnect Server が起動しました`);
      console.log(`📍 ポート: ${config.port}`);
      console.log(`🌍 環境: ${config.nodeEnv}`);
      console.log(`📡 CORS: ${config.cors.origin.join(', ')}`);
      console.log(`💾 データベース: ${this.database.getDatabase().name}`);
    });
  }

  /**
   * サーバーの停止
   */
  public async stop(): Promise<void> {
    console.log('🛑 サーバーを停止しています...');

    this.httpServer.close(() => {
      console.log('📡 HTTPサーバーを停止しました');
    });

    this.io.close(() => {
      console.log('🔌 Socket.IOサーバーを停止しました');
    });

    this.database.close();

    console.log('✅ サーバーの停止が完了しました');
  }
}

// グレースフルシャットダウン
const server = new NanoConnectServer();

process.on('SIGTERM', async () => {
  console.log('SIGTERM を受信しました');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT を受信しました');
  await server.stop();
  process.exit(0);
});

// サーバー開始
server.start().catch(error => {
  console.error('サーバーの開始に失敗しました:', error);
  process.exit(1);
});
