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
import { SocketManager } from '@/infrastructure/socket/SocketManager';

// プレゼンテーション関連のインポート
import { SQLitePresentationRepository } from '@/infrastructure/database/repositories/SQLitePresentationRepository';
import { SQLiteUserRepository } from '@/infrastructure/database/repositories/SQLiteUserRepository';
import { SQLiteSlideRepository } from '@/infrastructure/database/repositories/SQLiteSlideRepository';
import { CreatePresentationUseCase } from '@/application/useCases/presentation/CreatePresentationUseCase';
import { GetPresentationUseCase } from '@/application/useCases/presentation/GetPresentationUseCase';
import { ListPresentationsUseCase } from '@/application/useCases/presentation/ListPresentationsUseCase';
import { UpdatePresentationUseCase } from '@/application/useCases/presentation/UpdatePresentationUseCase';
import { DeletePresentationUseCase } from '@/application/useCases/presentation/DeletePresentationUseCase';
import { ControlPresentationRealtimeUseCase } from '@/application/useCases/presentation/ControlPresentationRealtimeUseCase';
import { PresentationController } from '@/presentation/controllers/PresentationController';
import { createPresentationRoutes } from '@/presentation/routes/presentationRoutes';

// Socket.IOハンドラーのインポート
import { PresenterHandler } from '@/infrastructure/socket/handlers/PresenterHandler';
import { NamespaceType } from '@/infrastructure/socket/SocketManager';

// 参加者関連のインポート
import { JoinPresentationUseCase } from '@/application/useCases/participant/JoinPresentationUseCase';
import { GetPresentationByAccessCodeUseCase } from '@/application/useCases/participant/GetPresentationByAccessCodeUseCase';
import { ParticipantController } from '@/presentation/controllers/ParticipantController';
import { createParticipantRoutes } from '@/presentation/routes/participantRoutes';

class NanoConnectServer {
  private app: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  private socketManager: SocketManager;
  private database: SQLiteConnection;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.database = SQLiteConnection.getInstance();

    // Socket.IOマネージャーの初期化
    this.socketManager = new SocketManager(this.httpServer, {
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

      // Socket.IOの設定（Phase4で詳細実装）
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

    // 参加者APIルートの設定
    this.setupParticipantRoutes();

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
   * 参加者APIルートの設定
   */
  private setupParticipantRoutes(): void {
    // データベース接続
    const dbConnection = SQLiteConnection.getInstance();

    // リポジトリの初期化
    const presentationRepository = new SQLitePresentationRepository(dbConnection);

    // ユースケースの初期化
    const joinPresentationUseCase = new JoinPresentationUseCase(presentationRepository);
    const getPresentationByAccessCodeUseCase = new GetPresentationByAccessCodeUseCase(
      presentationRepository
    );

    // コントローラーの初期化
    const participantController = new ParticipantController(
      joinPresentationUseCase,
      getPresentationByAccessCodeUseCase
    );

    // ルートの設定
    this.app.use('/api', createParticipantRoutes(participantController));
  }

  /**
   * Socket.IOの設定
   */
  private setupSocketIO(): void {
    // Socket.IOマネージャーを初期化
    this.socketManager.initialize();

    // プレゼンターハンドラーの設定
    this.setupPresenterHandler();

    console.log('🔗 Socket.IOが新しいマネージャーで初期化されました');
  }

  /**
   * プレゼンターハンドラーの設定
   */
  private setupPresenterHandler(): void {
    // データベース接続
    const dbConnection = SQLiteConnection.getInstance();

    // リポジトリの初期化
    const presentationRepository = new SQLitePresentationRepository(dbConnection);
    const slideRepository = new SQLiteSlideRepository(dbConnection);

    // プレゼンテーション制御ユースケースの初期化
    const controlPresentationRealtimeUseCase = new ControlPresentationRealtimeUseCase(
      presentationRepository,
      slideRepository
    );

    // プレゼンター名前空間の取得
    const presenterNamespace = this.socketManager.getNamespace(NamespaceType.PRESENTER);

    // プレゼンターハンドラーの初期化と登録
    const presenterHandler = new PresenterHandler(
      presenterNamespace,
      controlPresentationRealtimeUseCase,
      this.socketManager
    );

    // ハンドラーを登録
    this.socketManager.registerHandler('presenter', presenterHandler);

    console.log('🎯 プレゼンターハンドラーが設定されました');
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

    this.socketManager.close().then(() => {
      console.log('🔌 Socket.IOサーバーを停止しました');
    });

    this.database.close();

    console.log('✅ サーバーの停止が完了しました');
  }

  /**
   * Socket.IOマネージャーの取得
   */
  public getSocketManager(): SocketManager {
    return this.socketManager;
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
