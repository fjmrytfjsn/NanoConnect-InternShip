/**
 * プレゼンターハンドラーのテスト
 * プレゼンテーション制御機能のリアルタイム通信をテスト
 */

import { Server as SocketIOServer } from 'socket.io';
import { createServer, Server as HttpServer } from 'http';
import Client from 'socket.io-client';
import jwt from 'jsonwebtoken';

import { SocketManager, NamespaceType } from '../src/infrastructure/socket/SocketManager';
import { PresenterHandler } from '../src/infrastructure/socket/handlers/PresenterHandler';
import { ControlPresentationRealtimeUseCase } from '../src/application/useCases/presentation/ControlPresentationRealtimeUseCase';
import { SQLiteConnection } from '../src/infrastructure/database/SQLiteConnection';
import { SQLitePresentationRepository } from '../src/infrastructure/database/repositories/SQLitePresentationRepository';
import { SQLiteSlideRepository } from '../src/infrastructure/database/repositories/SQLiteSlideRepository';
import { Presentation } from '../src/domain/entities/Presentation';
import { Slide } from '../src/domain/entities/Slide';
import { SlideType } from '../src/domain/valueObjects/SlideType';
import { config } from '../src/config/app';

describe('プレゼンターハンドラーテスト', () => {
  let httpServer: HttpServer;
  let socketManager: SocketManager;
  let presenterHandler: PresenterHandler;
  let presentationRepository: SQLitePresentationRepository;
  let slideRepository: SQLiteSlideRepository;
  let controlUseCase: ControlPresentationRealtimeUseCase;
  let database: SQLiteConnection;

  const testPresentationId = 'test-presentation-id';
  const testPresenterId = 'test-presenter-id';
  const testPresenterUsername = 'test-presenter';

  beforeEach(async () => {
    // HTTPサーバーとSocket.IOの初期化
    httpServer = createServer();
    socketManager = new SocketManager(httpServer);
    await socketManager.initialize();

    // データベースの初期化（インメモリ）
    database = SQLiteConnection.getInstance();
    await database.initialize();

    // リポジトリの初期化
    presentationRepository = new SQLitePresentationRepository(database);
    slideRepository = new SQLiteSlideRepository(database);

    // ユースケースの初期化
    controlUseCase = new ControlPresentationRealtimeUseCase(
      presentationRepository,
      slideRepository
    );

    // プレゼンターハンドラーの初期化
    const presenterNamespace = socketManager.getNamespace(NamespaceType.PRESENTER);
    presenterHandler = new PresenterHandler(presenterNamespace, controlUseCase, socketManager);
    socketManager.registerHandler('presenter', presenterHandler);

    // テスト用プレゼンテーションとスライドのセットアップ
    await setupTestData();

    // HTTPサーバー開始
    await new Promise<void>((resolve) => {
      httpServer.listen(0, resolve);
    });
  });

  afterEach(async () => {
    await socketManager.close();
    await database.close();
    httpServer.close();
  });

  /**
   * テスト用データのセットアップ
   */
  async function setupTestData(): Promise<void> {
    // テスト用プレゼンテーション作成
    const presentation = Presentation.create(
      testPresentationId,
      'テストプレゼンテーション',
      testPresenterId,
      'ABC123'
    );
    await presentationRepository.save(presentation);

    // テスト用スライド作成
    const slide1 = Slide.create(
      'slide-1',
      testPresentationId,
      SlideType.MULTIPLE_CHOICE,
      'スライド1',
      '質問1',
      0,
      ['選択肢1', '選択肢2']
    );
    const slide2 = Slide.create(
      'slide-2',
      testPresentationId,
      SlideType.WORD_CLOUD,
      'スライド2',
      '質問2',
      1
    );

    await slideRepository.save(slide1);
    await slideRepository.save(slide2);
  }

  /**
   * プレゼンター用JWTトークンの生成
   */
  function generatePresenterToken(): string {
    return jwt.sign(
      {
        userId: testPresenterId,
        username: testPresenterUsername,
        role: 'presenter',
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );
  }

  /**
   * プレゼンター用Socket.IOクライアントの作成
   */
  function createPresenterClient(): any {
    const token = generatePresenterToken();
    const port = (httpServer.address() as any)?.port;

    return Client(`http://localhost:${port}/presenter`, {
      auth: {
        token,
      },
      transports: ['websocket'],
      forceNew: true,
    });
  }

  describe('プレゼンター認証', () => {
    test('有効なプレゼンタートークンで接続できる', (done) => {
      const client = createPresenterClient();

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });

      client.on('connect_error', (error: Error) => {
        done(new Error(`接続エラー: ${error.message}`));
      });
    });

    test('無効なトークンで接続が拒否される', (done) => {
      const port = (httpServer.address() as any)?.port;
      const client = Client(`http://localhost:${port}/presenter`, {
        auth: {
          token: 'invalid-token',
        },
        transports: ['websocket'],
        forceNew: true,
      });

      client.on('connect', () => {
        done(new Error('無効なトークンで接続できてしまいました'));
      });

      client.on('connect_error', (error: Error) => {
        expect(error.message).toContain('認証');
        client.disconnect();
        done();
      });
    });
  });

  describe('プレゼンテーション制御', () => {
    test('プレゼンテーションを開始できる', (done) => {
      const client = createPresenterClient();

      client.on('connect', () => {
        client.emit(
          'control:start',
          { presentationId: testPresentationId },
          (response: any) => {
            expect(response.success).toBe(true);
            expect(response.presentationId).toBe(testPresentationId);
            expect(response.currentSlideIndex).toBe(0);
            expect(response.totalSlides).toBe(2);
            expect(response.isActive).toBe(true);
            client.disconnect();
            done();
          }
        );
      });

      client.on('connect_error', done);
    });

    test('プレゼンテーションを停止できる', (done) => {
      const client = createPresenterClient();

      client.on('connect', () => {
        // まず開始してから停止
        client.emit(
          'control:start',
          { presentationId: testPresentationId },
          (response: any) => {
            expect(response.success).toBe(true);

            // 停止
            client.emit(
              'control:stop',
              { presentationId: testPresentationId },
              (response: any) => {
                expect(response.success).toBe(true);
                expect(response.presentationId).toBe(testPresentationId);
                expect(response.isActive).toBe(false);
                client.disconnect();
                done();
              }
            );
          }
        );
      });

      client.on('connect_error', done);
    });

    test('次のスライドに移動できる', (done) => {
      const client = createPresenterClient();

      client.on('connect', () => {
        // プレゼンテーションを開始
        client.emit(
          'control:start',
          { presentationId: testPresentationId },
          (response: any) => {
            expect(response.success).toBe(true);
            expect(response.currentSlideIndex).toBe(0);

            // 次のスライドに移動
            client.emit(
              'control:next-slide',
              { presentationId: testPresentationId },
              (response: any) => {
                expect(response.success).toBe(true);
                expect(response.currentSlideIndex).toBe(1);
                expect(response.totalSlides).toBe(2);
                client.disconnect();
                done();
              }
            );
          }
        );
      });

      client.on('connect_error', done);
    });

    test('前のスライドに移動できる', (done) => {
      const client = createPresenterClient();

      client.on('connect', () => {
        // プレゼンテーションを開始して2番目のスライドに移動
        client.emit(
          'control:start',
          { presentationId: testPresentationId },
          () => {
            client.emit(
              'control:next-slide',
              { presentationId: testPresentationId },
              () => {
                // 前のスライドに戻る
                client.emit(
                  'control:prev-slide',
                  { presentationId: testPresentationId },
                  (response: any) => {
                    expect(response.success).toBe(true);
                    expect(response.currentSlideIndex).toBe(0);
                    client.disconnect();
                    done();
                  }
                );
              }
            );
          }
        );
      });

      client.on('connect_error', done);
    });

    test('指定スライドに移動できる', (done) => {
      const client = createPresenterClient();

      client.on('connect', () => {
        client.emit(
          'control:start',
          { presentationId: testPresentationId },
          () => {
            client.emit(
              'control:goto-slide',
              { presentationId: testPresentationId, slideIndex: 1 },
              (response: any) => {
                expect(response.success).toBe(true);
                expect(response.currentSlideIndex).toBe(1);
                client.disconnect();
                done();
              }
            );
          }
        );
      });

      client.on('connect_error', done);
    });

    test('存在しないプレゼンテーションでエラーが発生する', (done) => {
      const client = createPresenterClient();

      client.on('connect', () => {
        client.emit(
          'control:start',
          { presentationId: 'non-existent-presentation' },
          (response: any) => {
            expect(response.success).toBe(false);
            expect(response.message).toContain('見つかりません');
            client.disconnect();
            done();
          }
        );
      });

      client.on('connect_error', done);
    });

    test('無効なスライドインデックスでエラーが発生する', (done) => {
      const client = createPresenterClient();

      client.on('connect', () => {
        client.emit(
          'control:start',
          { presentationId: testPresentationId },
          () => {
            client.emit(
              'control:goto-slide',
              { presentationId: testPresentationId, slideIndex: 99 },
              (response: any) => {
                expect(response.success).toBe(false);
                expect(response.message).toContain('無効なスライド番号');
                client.disconnect();
                done();
              }
            );
          }
        );
      });

      client.on('connect_error', done);
    });
  });

  describe('参加者数管理', () => {
    test('プレゼンテーション参加者数を取得できる', (done) => {
      const client = createPresenterClient();

      client.on('connect', () => {
        client.emit(
          'get:participant-count',
          { presentationId: testPresentationId },
          (response: any) => {
            expect(response.success).toBe(true);
            expect(response.presentationId).toBe(testPresentationId);
            expect(typeof response.count).toBe('number');
            expect(response.count).toBeGreaterThanOrEqual(0);
            client.disconnect();
            done();
          }
        );
      });

      client.on('connect_error', done);
    });
  });

  describe('リアルタイム通信', () => {
    test('プレゼンテーション開始時にブロードキャストが送信される', (done) => {
      const client = createPresenterClient();
      let broadcastReceived = false;

      // ブロードキャストイベントのリスナーを設定
      client.on('presentation:started', (data: any) => {
        expect(data.presentationId).toBe(testPresentationId);
        expect(data.timestamp).toBeDefined();
        broadcastReceived = true;
      });

      client.on('connect', () => {
        client.emit(
          'control:start',
          { presentationId: testPresentationId },
          (response: any) => {
            expect(response.success).toBe(true);
            
            // ブロードキャストが送信されるまで少し待つ
            setTimeout(() => {
              expect(broadcastReceived).toBe(true);
              client.disconnect();
              done();
            }, 100);
          }
        );
      });

      client.on('connect_error', done);
    });

    test('スライド変更時にブロードキャストが送信される', (done) => {
      const client = createPresenterClient();
      let broadcastReceived = false;

      client.on('slide:changed', (data: any) => {
        expect(data.presentationId).toBe(testPresentationId);
        expect(data.slideIndex).toBe(1);
        expect(data.timestamp).toBeDefined();
        broadcastReceived = true;
      });

      client.on('connect', () => {
        client.emit(
          'control:start',
          { presentationId: testPresentationId },
          () => {
            client.emit(
              'control:next-slide',
              { presentationId: testPresentationId },
              (response: any) => {
                expect(response.success).toBe(true);
                
                setTimeout(() => {
                  expect(broadcastReceived).toBe(true);
                  client.disconnect();
                  done();
                }, 100);
              }
            );
          }
        );
      });

      client.on('connect_error', done);
    });
  });
});