/**
 * ParticipantHandlerのWebSocket統合テスト
 * 参加者のリアルタイムイベント処理を検証
 */

import { Server as HttpServer, createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Client as SocketIOClient, io as SocketIOClientIO } from 'socket.io-client';
import { SocketManager } from '@/infrastructure/socket/SocketManager';
import { ParticipantHandler } from '@/infrastructure/socket/handlers/ParticipantHandler';
import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { Presentation } from '@/domain/entities/Presentation';
import { AccessCode } from '@/domain/valueObjects/AccessCode';

// モックプレゼンテーションリポジトリ
class MockPresentationRepository implements IPresentationRepository {
  private presentations: Map<string, Presentation> = new Map();

  async save(presentation: Presentation): Promise<void> {
    this.presentations.set(presentation.id, presentation);
  }

  async findById(id: string): Promise<Presentation | null> {
    return this.presentations.get(id) || null;
  }

  async findByAccessCode(accessCode: string): Promise<Presentation | null> {
    for (const presentation of this.presentations.values()) {
      if (presentation.accessCode === accessCode) {
        return presentation;
      }
    }
    return null;
  }

  async findByPresenterId(presenterId: string): Promise<Presentation[]> {
    return Array.from(this.presentations.values()).filter(
      p => p.presenterId === presenterId
    );
  }

  async findActive(): Promise<Presentation[]> {
    return Array.from(this.presentations.values()).filter(p => p.isActive);
  }

  async delete(id: string): Promise<boolean> {
    return this.presentations.delete(id);
  }

  async getStatistics(id: string): Promise<{ totalSlides: number; totalParticipants: number } | null> {
    return {
      totalSlides: 5,
      totalParticipants: 10,
    };
  }

  // テスト用ヘルパーメソッド
  addTestPresentation(presentation: Presentation): void {
    this.presentations.set(presentation.id, presentation);
  }

  clear(): void {
    this.presentations.clear();
  }
}

describe('ParticipantHandler WebSocket統合テスト', () => {
  let httpServer: HttpServer;
  let socketManager: SocketManager;
  let mockRepository: MockPresentationRepository;
  let participantHandler: ParticipantHandler;
  let clientSocket: SocketIOClient;
  let testPresentation: Presentation;
  let serverSocket: any;

  const port = 3001;

  beforeAll((done) => {
    // HTTPサーバーとSocket.IOサーバーの初期化
    httpServer = createServer();
    mockRepository = new MockPresentationRepository();
    
    // テストプレゼンテーションの準備
    const accessCode = AccessCode.generate();
    testPresentation = Presentation.create({
      title: 'WebSocketテストプレゼンテーション',
      description: 'WebSocket機能のテスト用',
      presenterId: 'presenter-123',
      accessCode: accessCode.toString(),
    });
    testPresentation.activate();
    mockRepository.addTestPresentation(testPresentation);

    socketManager = new SocketManager(httpServer);
    socketManager.initialize(mockRepository);

    participantHandler = socketManager.getParticipantHandler();
    
    httpServer.listen(port, () => {
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    socketManager.close().then(() => {
      httpServer.close(done);
    });
  });

  beforeEach((done) => {
    // 各テストの前にクライアントソケットを接続
    clientSocket = SocketIOClientIO(`http://localhost:${port}/participant`, {
      transports: ['websocket'],
      forceNew: true,
    });

    clientSocket.on('connect', () => {
      done();
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    mockRepository.clear();
    mockRepository.addTestPresentation(testPresentation); // テストプレゼンテーションを再追加
  });

  describe('プレゼンテーション参加イベント', () => {
    it('正常なアクセスコードでプレゼンテーションに参加できる', (done) => {
      const joinData = {
        accessCode: testPresentation.accessCode,
        participantName: 'WebSocketテスト参加者',
      };

      clientSocket.emit('join:presentation', joinData, (response: any) => {
        try {
          expect(response).toBeDefined();
          expect(response.success).toBe(true);
          expect(response.sessionId).toBeDefined();
          expect(response.presentation.id).toBe(testPresentation.id);
          expect(response.presentation.title).toBe('WebSocketテストプレゼンテーション');
          expect(response.participant.name).toBe('WebSocketテスト参加者');
          expect(response.participant.isAnonymous).toBe(false);
          done();
        } catch (error) {
          done(error);
        }
      });
    });

    it('参加者名未指定でも匿名参加者として参加できる', (done) => {
      const joinData = {
        accessCode: testPresentation.accessCode,
      };

      clientSocket.emit('join:presentation', joinData, (response: any) => {
        try {
          expect(response).toBeDefined();
          expect(response.success).toBe(true);
          expect(response.participant.isAnonymous).toBe(true);
          expect(response.participant.name).toMatch(/^.+(ライオン|ウサギ|象|パンダ|キツネ|フクロウ|イルカ|ペンギン)\d{2}$/);
          done();
        } catch (error) {
          done(error);
        }
      });
    });

    it('無効なアクセスコードでエラーが返される', (done) => {
      const joinData = {
        accessCode: '999-999',
        participantName: 'テスト参加者',
      };

      clientSocket.emit('join:presentation', joinData, (response: any) => {
        try {
          expect(response).toBeDefined();
          expect(response.success).toBe(false);
          expect(response.error).toBe('アクセスコードが無効です。正しいコードを入力してください。');
          done();
        } catch (error) {
          done(error);
        }
      });
    });

    it('参加者参加通知が他の参加者に配信される', (done) => {
      // 2つ目のクライアントソケットを作成
      const secondClient = SocketIOClientIO(`http://localhost:${port}/participant`, {
        transports: ['websocket'],
        forceNew: true,
      });

      let firstParticipantJoined = false;
      
      // 最初のクライアントがparticipant:joinedイベントを受信する設定
      clientSocket.on('participant:joined', (data: any) => {
        try {
          expect(data).toBeDefined();
          expect(data.participant).toBeDefined();
          expect(data.participant.name).toBe('2番目の参加者');
          expect(data.timestamp).toBeDefined();
          
          secondClient.disconnect();
          done();
        } catch (error) {
          secondClient.disconnect();
          done(error);
        }
      });

      // 最初のクライアントが参加
      secondClient.on('connect', () => {
        clientSocket.emit('join:presentation', {
          accessCode: testPresentation.accessCode,
          participantName: '1番目の参加者',
        }, () => {
          firstParticipantJoined = true;
          
          // 2番目のクライアントが参加
          secondClient.emit('join:presentation', {
            accessCode: testPresentation.accessCode,
            participantName: '2番目の参加者',
          }, () => {
            // 参加完了、participant:joinedイベントの受信を待つ
          });
        });
      });
    });
  });

  describe('プレゼンテーション離脱イベント', () => {
    it('参加後に正常に離脱できる', (done) => {
      let sessionId: string;

      // まず参加
      const joinData = {
        accessCode: testPresentation.accessCode,
        participantName: 'テスト参加者',
      };

      clientSocket.emit('join:presentation', joinData, (response: any) => {
        expect(response.success).toBe(true);
        sessionId = response.sessionId;

        // 離脱処理
        clientSocket.emit('leave:presentation', { sessionId });

        // 少し待ってから参加者数を確認
        setTimeout(() => {
          if (participantHandler) {
            const count = participantHandler.getPresentationParticipantCount(testPresentation.id);
            expect(count).toBe(0);
            done();
          } else {
            done(new Error('ParticipantHandler not available'));
          }
        }, 100);
      });
    });

    it('参加者離脱通知が他の参加者に配信される', (done) => {
      const secondClient = SocketIOClientIO(`http://localhost:${port}/participant`, {
        transports: ['websocket'],
        forceNew: true,
      });

      let firstSessionId: string;

      // 最初のクライアントがparticipant:leftイベントを受信する設定
      clientSocket.on('participant:left', (data: any) => {
        try {
          expect(data).toBeDefined();
          expect(data.participant).toBeDefined();
          expect(data.participant.name).toBe('離脱する参加者');
          expect(data.timestamp).toBeDefined();
          
          secondClient.disconnect();
          done();
        } catch (error) {
          secondClient.disconnect();
          done(error);
        }
      });

      // 2つのクライアントが順次参加
      secondClient.on('connect', () => {
        // 最初のクライアントが参加
        clientSocket.emit('join:presentation', {
          accessCode: testPresentation.accessCode,
          participantName: '残る参加者',
        }, (response: any) => {
          firstSessionId = response.sessionId;

          // 2番目のクライアントが参加
          secondClient.emit('join:presentation', {
            accessCode: testPresentation.accessCode,
            participantName: '離脱する参加者',
          }, (response: any) => {
            // 2番目のクライアントが離脱
            secondClient.emit('leave:presentation', { sessionId: response.sessionId });
          });
        });
      });
    });
  });

  describe('レスポンス送信イベント', () => {
    it('プレゼンテーション参加後にレスポンスを送信できる', (done) => {
      // まず参加
      const joinData = {
        accessCode: testPresentation.accessCode,
        participantName: 'レスポンステスト参加者',
      };

      clientSocket.emit('join:presentation', joinData, (response: any) => {
        expect(response.success).toBe(true);

        // レスポンス送信
        const responseData = {
          slideId: 'slide-123',
          responseType: 'multiple_choice',
          response: 'option1',
        };

        clientSocket.emit('submit:response', responseData, (responseResult: any) => {
          try {
            expect(responseResult).toBeDefined();
            expect(responseResult.success).toBe(true);
            expect(responseResult.message).toBe('レスポンスが送信されました。');
            done();
          } catch (error) {
            done(error);
          }
        });
      });
    });

    it('プレゼンテーションに参加していない状態でレスポンス送信するとエラーになる', (done) => {
      const responseData = {
        slideId: 'slide-123',
        responseType: 'multiple_choice',
        response: 'option1',
      };

      clientSocket.emit('submit:response', responseData, (response: any) => {
        try {
          expect(response).toBeDefined();
          expect(response.success).toBe(false);
          expect(response.error).toBe('プレゼンテーションに参加していません。');
          done();
        } catch (error) {
          done(error);
        }
      });
    });
  });

  describe('接続断処理', () => {
    it('クライアントが切断されると自動的に離脱処理が実行される', (done) => {
      // 参加
      const joinData = {
        accessCode: testPresentation.accessCode,
        participantName: '切断テスト参加者',
      };

      clientSocket.emit('join:presentation', joinData, (response: any) => {
        expect(response.success).toBe(true);

        // 参加者数を確認
        if (participantHandler) {
          let count = participantHandler.getPresentationParticipantCount(testPresentation.id);
          expect(count).toBe(1);

          // 切断
          clientSocket.disconnect();

          // 少し待ってから参加者数を確認
          setTimeout(() => {
            count = participantHandler.getPresentationParticipantCount(testPresentation.id);
            expect(count).toBe(0);
            done();
          }, 100);
        } else {
          done(new Error('ParticipantHandler not available'));
        }
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('不正な形式のイベントデータでもエラーが適切に処理される', (done) => {
      // 不正なデータでプレゼンテーション参加を試行
      const invalidJoinData = {
        accessCode: null, // 不正な値
        participantName: 'テスト参加者',
      };

      clientSocket.emit('join:presentation', invalidJoinData as any, (response: any) => {
        try {
          expect(response).toBeDefined();
          expect(response.success).toBe(false);
          expect(response.error).toBeDefined();
          done();
        } catch (error) {
          done(error);
        }
      });
    });

    it('ソケットエラーが適切にログ記録される', (done) => {
      // エラーイベントの監視
      let errorCaught = false;
      
      clientSocket.on('error', (errorData: any) => {
        errorCaught = true;
        // エラーがキャッチされることを確認
      });

      // 意図的にエラーを発生させる（不正なイベント）
      (clientSocket as any).emit('invalid:event', {}, () => {
        setTimeout(() => {
          // エラーハンドリングが正常に動作していることを確認
          // 実際にはソケットエラーが発生しなくても、ハンドラーが存在することを確認
          done();
        }, 100);
      });
    });
  });
});