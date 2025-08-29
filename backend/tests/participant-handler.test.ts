/**
 * 参加者WebSocketハンドラーテスト
 */

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { ParticipantHandler } from '../src/infrastructure/socket/handlers/ParticipantHandler';
import { JoinPresentationRealtime } from '../src/application/useCases/participant/JoinPresentationRealtime';
import { SQLitePresentationRepository } from '../src/infrastructure/database/repositories/SQLitePresentationRepository';
import { SQLiteConnection } from '../src/infrastructure/database/SQLiteConnection';
import { Presentation } from '../src/domain/entities/Presentation';
import { AccessCode } from '../src/domain/valueObjects/AccessCode';

describe('参加者WebSocketハンドラーテスト', () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: SocketIOServer;
  let participantHandler: ParticipantHandler;
  let joinPresentationUseCase: JoinPresentationRealtime;
  let presentationRepository: SQLitePresentationRepository;
  let dbConnection: SQLiteConnection;
  let serverPort: number;
  let serverUrl: string;
  let clientSocket: ClientSocket;

  // テスト用データ
  let testPresentation: Presentation;
  let testAccessCode: AccessCode;

  beforeAll(async () => {
    // データベース接続セットアップ
    dbConnection = new SQLiteConnection(':memory:');
    await dbConnection.initialize();
    
    presentationRepository = new SQLitePresentationRepository(dbConnection);
    joinPresentationUseCase = new JoinPresentationRealtime(presentationRepository);

    // HTTPサーバー作成
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // 参加者名前空間作成
    const participantNamespace = io.of('/participant');
    participantHandler = new ParticipantHandler(participantNamespace, joinPresentationUseCase);
    participantHandler.initialize();

    // 接続処理を設定
    participantNamespace.on('connection', (socket) => {
      participantHandler.handleConnection(socket);
    });

    // ランダムポートでサーバー開始
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        if (address && typeof address === 'object') {
          serverPort = address.port;
          serverUrl = `http://localhost:${serverPort}`;
        }
        resolve();
      });
    });

    // テスト用プレゼンテーション作成
    testAccessCode = AccessCode.generate();
    testPresentation = Presentation.create({
      title: 'テスト用プレゼンテーション',
      description: 'WebSocketハンドラーテスト用',
      presenterId: 'test-presenter-id',
      accessCode: testAccessCode.toString(),
    });
    testPresentation.activate();
    
    await presentationRepository.save(testPresentation);
  });

  afterAll(async () => {
    // クリーンアップ
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    
    await new Promise<void>((resolve) => {
      io.close(() => {
        httpServer.close(() => {
          resolve();
        });
      });
    });
    
    await dbConnection.close();
  });

  afterEach(() => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
  });

  describe('プレゼンテーション参加', () => {
    test('有効なアクセスコードでプレゼンテーションに参加できる', (done) => {
      clientSocket = ioClient(`${serverUrl}/participant`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      clientSocket.on('connect', () => {
        const joinRequest = {
          accessCode: testAccessCode.toString(),
        };

        clientSocket.emit('join:presentation', joinRequest, (response: any) => {
          try {
            expect(response.success).toBe(true);
            expect(response.sessionId).toBeDefined();
            expect(response.presentationId).toBe(testPresentation.id);
            expect(response.presentation).toMatchObject({
              id: testPresentation.id,
              title: testPresentation.title,
              isActive: true,
            });
            done();
          } catch (error) {
            done(error);
          }
        });
      });

      clientSocket.on('connect_error', done);
    });

    test('無効なアクセスコードで参加が拒否される', (done) => {
      clientSocket = ioClient(`${serverUrl}/participant`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      clientSocket.on('connect', () => {
        const joinRequest = {
          accessCode: 'INVALID123',
        };

        clientSocket.emit('join:presentation', joinRequest, (response: any) => {
          try {
            expect(response.success).toBe(false);
            expect(response.sessionId).toBe('');
            expect(response.message).toContain('無効');
            done();
          } catch (error) {
            done(error);
          }
        });
      });

      clientSocket.on('connect_error', done);
    });

    test('重複参加が防止される', (done) => {
      clientSocket = ioClient(`${serverUrl}/participant`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      clientSocket.on('connect', () => {
        const joinRequest = {
          accessCode: testAccessCode.toString(),
        };

        // 1回目の参加
        clientSocket.emit('join:presentation', joinRequest, (response1: any) => {
          expect(response1.success).toBe(true);

          // 2回目の参加（重複）
          clientSocket.emit('join:presentation', joinRequest, (response2: any) => {
            try {
              expect(response2.success).toBe(false);
              expect(response2.message).toContain('既に参加');
              done();
            } catch (error) {
              done(error);
            }
          });
        });
      });

      clientSocket.on('connect_error', done);
    });
  });

  describe('プレゼンテーション離脱', () => {
    test('正常に離脱できる', (done) => {
      clientSocket = ioClient(`${serverUrl}/participant`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      clientSocket.on('connect', () => {
        const joinRequest = {
          accessCode: testAccessCode.toString(),
        };

        // まず参加
        clientSocket.emit('join:presentation', joinRequest, (joinResponse: any) => {
          expect(joinResponse.success).toBe(true);

          // 離脱
          const leaveRequest = {
            presentationId: joinResponse.presentationId,
            sessionId: joinResponse.sessionId,
          };

          clientSocket.emit('leave:presentation', leaveRequest);
          
          // 離脱後、再度参加できることを確認
          setTimeout(() => {
            clientSocket.emit('join:presentation', joinRequest, (rejoinResponse: any) => {
              try {
                expect(rejoinResponse.success).toBe(true);
                done();
              } catch (error) {
                done(error);
              }
            });
          }, 100);
        });
      });

      clientSocket.on('connect_error', done);
    });
  });

  describe('リアルタイム通知', () => {
    test('参加者参加通知が配信される', (done) => {
      const client1 = ioClient(`${serverUrl}/participant`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      const client2 = ioClient(`${serverUrl}/participant`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      const joinRequest = {
        accessCode: testAccessCode.toString(),
      };

      // クライアント1が参加
      client1.on('connect', () => {
        client1.emit('join:presentation', joinRequest, (response: any) => {
          expect(response.success).toBe(true);

          // クライアント1で参加通知を待機
          client1.on('participant:joined', (notification: any) => {
            try {
              expect(notification.presentationId).toBe(testPresentation.id);
              expect(notification.participantCount).toBeGreaterThan(0);
              expect(notification.timestamp).toBeDefined();
              
              client1.disconnect();
              client2.disconnect();
              done();
            } catch (error) {
              client1.disconnect();
              client2.disconnect();
              done(error);
            }
          });

          // クライアント2が参加（通知が発生）
          client2.on('connect', () => {
            client2.emit('join:presentation', joinRequest, () => {
              // 参加完了、通知待機中
            });
          });
        });
      });

      client1.on('connect_error', done);
      client2.on('connect_error', done);
    });

    test('参加者離脱通知が配信される', (done) => {
      const client1 = ioClient(`${serverUrl}/participant`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      const client2 = ioClient(`${serverUrl}/participant`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      const joinRequest = {
        accessCode: testAccessCode.toString(),
      };

      let client1SessionInfo: any;
      let client2SessionInfo: any;

      // 両クライアントが参加
      client1.on('connect', () => {
        client1.emit('join:presentation', joinRequest, (response: any) => {
          expect(response.success).toBe(true);
          client1SessionInfo = response;

          client2.on('connect', () => {
            client2.emit('join:presentation', joinRequest, (response: any) => {
              expect(response.success).toBe(true);
              client2SessionInfo = response;

              // クライアント1で離脱通知を待機
              client1.on('participant:left', (notification: any) => {
                try {
                  expect(notification.presentationId).toBe(testPresentation.id);
                  expect(notification.participantCount).toBeGreaterThanOrEqual(0);
                  expect(notification.timestamp).toBeDefined();
                  
                  client1.disconnect();
                  done();
                } catch (error) {
                  client1.disconnect();
                  done(error);
                }
              });

              // クライアント2が離脱（通知が発生）
              const leaveRequest = {
                presentationId: client2SessionInfo.presentationId,
                sessionId: client2SessionInfo.sessionId,
              };

              client2.emit('leave:presentation', leaveRequest);
              client2.disconnect();
            });
          });
        });
      });

      client1.on('connect_error', done);
      client2.on('connect_error', done);
    });
  });

  describe('セッション管理', () => {
    test('参加者セッション情報が正しく管理される', (done) => {
      clientSocket = ioClient(`${serverUrl}/participant`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      clientSocket.on('connect', () => {
        const joinRequest = {
          accessCode: testAccessCode.toString(),
        };

        clientSocket.emit('join:presentation', joinRequest, (response: any) => {
          try {
            expect(response.success).toBe(true);
            
            // ハンドラーのセッション情報を確認
            const sessions = participantHandler.getParticipantSessions();
            expect(sessions.size).toBeGreaterThan(0);
            
            const sessionCount = participantHandler.getPresentationParticipantSessionCount(
              testPresentation.id as any
            );
            expect(sessionCount).toBeGreaterThan(0);
            
            done();
          } catch (error) {
            done(error);
          }
        });
      });

      clientSocket.on('connect_error', done);
    });

    test('切断時にセッションが正しくクリーンアップされる', (done) => {
      clientSocket = ioClient(`${serverUrl}/participant`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      clientSocket.on('connect', () => {
        const joinRequest = {
          accessCode: testAccessCode.toString(),
        };

        clientSocket.emit('join:presentation', joinRequest, (response: any) => {
          expect(response.success).toBe(true);
          
          // セッション存在確認
          const sessionsBefore = participantHandler.getParticipantSessions();
          expect(sessionsBefore.size).toBeGreaterThan(0);
          
          // 切断
          clientSocket.disconnect();
          
          // 少し待ってからセッション確認
          setTimeout(() => {
            try {
              const sessionsAfter = participantHandler.getParticipantSessions();
              const sessionCountAfter = participantHandler.getPresentationParticipantSessionCount(
                testPresentation.id as any
              );
              expect(sessionCountAfter).toBe(0);
              done();
            } catch (error) {
              done(error);
            }
          }, 100);
        });
      });

      clientSocket.on('connect_error', done);
    });
  });

  describe('通知機能', () => {
    test('スライド変更通知が参加者に配信される', (done) => {
      clientSocket = ioClient(`${serverUrl}/participant`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      clientSocket.on('connect', () => {
        const joinRequest = {
          accessCode: testAccessCode.toString(),
        };

        clientSocket.emit('join:presentation', joinRequest, (response: any) => {
          expect(response.success).toBe(true);

          // スライド変更通知を待機
          clientSocket.on('slide:changed', (notification: any) => {
            try {
              expect(notification.presentationId).toBe(testPresentation.id);
              expect(notification.slideIndex).toBe(1);
              expect(notification.timestamp).toBeDefined();
              done();
            } catch (error) {
              done(error);
            }
          });

          // ハンドラー経由でスライド変更通知を送信
          participantHandler.notifySlideChanged(testPresentation.id as any, {
            slideIndex: 1,
            slideTitle: 'テストスライド',
          });
        });
      });

      clientSocket.on('connect_error', done);
    });

    test('プレゼンテーション開始通知が参加者に配信される', (done) => {
      clientSocket = ioClient(`${serverUrl}/participant`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      clientSocket.on('connect', () => {
        const joinRequest = {
          accessCode: testAccessCode.toString(),
        };

        clientSocket.emit('join:presentation', joinRequest, (response: any) => {
          expect(response.success).toBe(true);

          // プレゼンテーション開始通知を待機
          clientSocket.on('presentation:started', (notification: any) => {
            try {
              expect(notification.presentationId).toBe(testPresentation.id);
              expect(notification.timestamp).toBeDefined();
              done();
            } catch (error) {
              done(error);
            }
          });

          // ハンドラー経由で開始通知を送信
          participantHandler.notifyPresentationStarted(testPresentation.id as any, {
            message: 'プレゼンテーション開始',
          });
        });
      });

      clientSocket.on('connect_error', done);
    });

    test('プレゼンテーション終了通知が参加者に配信される', (done) => {
      clientSocket = ioClient(`${serverUrl}/participant`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      clientSocket.on('connect', () => {
        const joinRequest = {
          accessCode: testAccessCode.toString(),
        };

        clientSocket.emit('join:presentation', joinRequest, (response: any) => {
          expect(response.success).toBe(true);

          // プレゼンテーション終了通知を待機
          clientSocket.on('presentation:stopped', (notification: any) => {
            try {
              expect(notification.presentationId).toBe(testPresentation.id);
              expect(notification.timestamp).toBeDefined();
              done();
            } catch (error) {
              done(error);
            }
          });

          // ハンドラー経由で終了通知を送信
          participantHandler.notifyPresentationStopped(testPresentation.id as any, {
            message: 'プレゼンテーション終了',
          });
        });
      });

      clientSocket.on('connect_error', done);
    });
  });
});