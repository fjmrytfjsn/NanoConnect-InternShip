/**
 * Socket.IOインフラ統合テスト
 */

import { createServer } from 'http';
import { SocketManager, NamespaceType } from '../src/infrastructure/socket/SocketManager';
import { WebSocketAuthMiddleware } from '../src/infrastructure/socket/middleware/AuthMiddleware';
import { WebSocketLoggingMiddleware, LogLevel } from '../src/infrastructure/socket/middleware/LoggingMiddleware';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/app';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';

describe('Socket.IOインフラ統合テスト', () => {
  let httpServer: ReturnType<typeof createServer>;
  let socketManager: SocketManager;
  let serverPort: number;
  let serverUrl: string;

  beforeAll(async () => {
    // HTTPサーバーの作成
    httpServer = createServer();
    
    // Socket.IOマネージャーの初期化
    socketManager = new SocketManager(httpServer);
    socketManager.initialize();
    
    // ランダムポートでサーバーを開始
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        if (address && typeof address === 'object') {
          serverPort = address.port;
          serverUrl = `http://localhost:${serverPort}`;
          console.log(`テスト用Socket.IOサーバー開始: ${serverUrl}`);
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    // サーバーとマネージャーの停止
    await socketManager.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  describe('SocketManager', () => {
    test('Socket.IOサーバーが正常に初期化される', () => {
      expect(socketManager).toBeDefined();
      expect(socketManager.getIO()).toBeDefined();
    });

    test('名前空間が正しく設定される', () => {
      const presenterNS = socketManager.getNamespace(NamespaceType.PRESENTER);
      const participantNS = socketManager.getNamespace(NamespaceType.PARTICIPANT);
      const adminNS = socketManager.getNamespace(NamespaceType.ADMIN);

      expect(presenterNS.name).toBe('/presenter');
      expect(participantNS.name).toBe('/participant');
      expect(adminNS.name).toBe('/admin');
    });

    test('接続統計情報を取得できる', () => {
      const stats = socketManager.getConnectionStats();
      
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('namespaceStats');
      expect(stats).toHaveProperty('roomCount');
      expect(typeof stats.totalConnections).toBe('number');
    });

    test('Room統計情報を取得できる', async () => {
      const roomStats = await socketManager.getRoomStats();
      
      expect(Array.isArray(roomStats)).toBe(true);
    });
  });

  describe('WebSocket認証ミドルウェア', () => {
    test('有効なJWTトークンで認証成功', () => {
      const payload = {
        userId: 'test-user-123',
        username: 'testuser',
        role: 'presenter' as const,
      };
      
      const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' });
      expect(token).toBeDefined();
      
      // トークン検証
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.username).toBe(payload.username);
      expect(decoded.role).toBe(payload.role);
    });

    test('無効なJWTトークンで認証失敗', () => {
      const invalidToken = 'invalid.jwt.token';
      
      expect(() => {
        jwt.verify(invalidToken, config.jwt.secret);
      }).toThrow();
    });

    test('期限切れトークンで認証失敗', () => {
      const payload = {
        userId: 'test-user-123',
        username: 'testuser',
        role: 'presenter' as const,
      };
      
      const expiredToken = jwt.sign(payload, config.jwt.secret, { expiresIn: '-1h' }); // 過去の時刻
      
      expect(() => {
        jwt.verify(expiredToken, config.jwt.secret);
      }).toThrow('jwt expired');
    });

    test('認証データのヘルパー関数', () => {
      const mockSocket = {
        data: {
          userId: 'test-user-123',
          username: 'testuser',
          role: 'presenter' as const,
          sessionId: 'session-123',
        },
      } as any;

      expect(WebSocketAuthMiddleware.isAuthenticated(mockSocket)).toBe(true);
      expect(WebSocketAuthMiddleware.isPresenter(mockSocket)).toBe(true);
      expect(WebSocketAuthMiddleware.isParticipant(mockSocket)).toBe(false);
      
      const authData = WebSocketAuthMiddleware.getAuthData(mockSocket);
      expect(authData).toEqual(mockSocket.data);
    });
  });

  describe('WebSocketロギングミドルウェア', () => {
    beforeEach(() => {
      // テスト前にログをクリア
      WebSocketLoggingMiddleware.clearLogs();
    });

    test('カスタムログが記録される', () => {
      const mockSocket = {
        id: 'test-socket-123',
        nsp: { name: '/test' },
        data: {
          userId: 'test-user-123',
          username: 'testuser',
          role: 'presenter' as const,
        },
      } as any;

      WebSocketLoggingMiddleware.logCustomEvent(
        mockSocket,
        LogLevel.INFO,
        'test_event',
        { testData: 'example' }
      );

      const logs = WebSocketLoggingMiddleware.getLogs({ limit: 1 });
      expect(logs).toHaveLength(1);
      expect(logs[0].event).toBe('test_event');
      expect(logs[0].socketId).toBe('test-socket-123');
    });

    test('ログ統計情報を取得できる', () => {
      const mockSocket = {
        id: 'test-socket-123',
        nsp: { name: '/test' },
        data: null,
      } as any;

      // 複数のログを記録
      WebSocketLoggingMiddleware.logCustomEvent(
        mockSocket,
        LogLevel.INFO,
        'info_event'
      );
      WebSocketLoggingMiddleware.logCustomEvent(
        mockSocket,
        LogLevel.ERROR,
        'error_event'
      );

      const stats = WebSocketLoggingMiddleware.getLogStats();
      expect(stats.totalLogs).toBeGreaterThanOrEqual(2);
      expect(stats.logsByLevel.INFO).toBeGreaterThanOrEqual(1);
      expect(stats.logsByLevel.ERROR).toBeGreaterThanOrEqual(1);
    });

    test('ログフィルタリングが正常に動作する', () => {
      const mockSocket = {
        id: 'test-socket-123',
        nsp: { name: '/test' },
        data: null,
      } as any;

      WebSocketLoggingMiddleware.logCustomEvent(
        mockSocket,
        LogLevel.INFO,
        'info_event'
      );
      WebSocketLoggingMiddleware.logCustomEvent(
        mockSocket,
        LogLevel.ERROR,
        'error_event'
      );

      // エラーログのみをフィルタリング
      const errorLogs = WebSocketLoggingMiddleware.getLogs({
        level: LogLevel.ERROR,
      });
      
      expect(errorLogs.length).toBeGreaterThan(0);
      errorLogs.forEach(log => {
        expect(log.level).toBe(LogLevel.ERROR);
      });
    });
  });

  describe('エコーイベント機能', () => {
    let clientSocket: ClientSocket;

    afterEach(() => {
      if (clientSocket?.connected) {
        clientSocket.disconnect();
      }
    });

    test('参加者名前空間でエコーイベントが動作する', (done) => {
      clientSocket = ioClient(`${serverUrl}/participant`, {
        query: { sessionId: 'test-session-123' },
        transports: ['websocket'],
        timeout: 5000,
      });

      clientSocket.on('connect', () => {
        const testData = { message: 'Hello, World!' };
        
        clientSocket.emit('echo', testData, (response: any) => {
          try {
            expect(response).toHaveProperty('message', 'Echo received');
            expect(response).toHaveProperty('data', testData);
            expect(response).toHaveProperty('timestamp');
            expect(response).toHaveProperty('namespace', '/participant');
            done();
          } catch (error) {
            done(error);
          }
        });
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    test('ピンポンイベントが動作する', (done) => {
      clientSocket = ioClient(`${serverUrl}/participant`, {
        query: { sessionId: 'test-session-123' },
        transports: ['websocket'],
        timeout: 5000,
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('ping', (response: any) => {
          try {
            expect(response).toHaveProperty('pong', true);
            expect(response).toHaveProperty('timestamp');
            expect(response).toHaveProperty('namespace', '/participant');
            done();
          } catch (error) {
            done(error);
          }
        });
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });
  });

  describe('プレゼンテーション参加者数管理', () => {
    test('プレゼンテーション参加者数を取得できる', async () => {
      const presentationId = 'test-presentation-123';
      const count = await socketManager.getPresentationParticipantCount(presentationId);
      
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ブロードキャスト機能', () => {
    test('プレゼンテーション参加者へのブロードキャストができる', () => {
      const presentationId = 'test-presentation-123';
      const eventData = {
        presentationId,
        timestamp: new Date().toISOString(),
      };

      expect(() => {
        socketManager.broadcastToPresentationParticipants(
          presentationId,
          'presentation:started',
          eventData
        );
      }).not.toThrow();
    });

    test('プレゼンターへのブロードキャストができる', () => {
      const presentationId = 'test-presentation-123';
      const eventData = {
        presentationId,
        timestamp: new Date().toISOString(),
      };

      expect(() => {
        socketManager.broadcastToPresentationPresenters(
          presentationId,
          'participant:joined',
          eventData
        );
      }).not.toThrow();
    });
  });
});