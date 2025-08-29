/**
 * SocketService基本テスト
 */

import { SocketService, ConnectionState } from '@/services/socket/SocketService';

// Socket.IOクライアントをモック
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    removeAllListeners: jest.fn(),
    connected: false,
    id: 'mock-socket-id',
  })),
}));

describe('SocketService', () => {
  let socketService: SocketService;

  beforeEach(() => {
    // シングルトンインスタンスをリセット
    (SocketService as any).instance = null;
    socketService = SocketService.getInstance();
    
    // Windowオブジェクトをモック
    Object.defineProperty(window, 'dispatchEvent', {
      value: jest.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    socketService.destroy();
    jest.clearAllMocks();
  });

  describe('インスタンス管理', () => {
    it('シングルトンパターンで動作する', () => {
      const instance1 = SocketService.getInstance();
      const instance2 = SocketService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('設定オプションを受け付ける', () => {
      const config = {
        autoConnect: true,
        reconnectionAttempts: 10,
        timeout: 15000,
      };
      
      (SocketService as any).instance = null;
      const service = SocketService.getInstance(config);
      
      expect(service).toBeInstanceOf(SocketService);
    });
  });

  describe('接続管理', () => {
    it('初期化が正常に動作する', () => {
      expect(() => {
        socketService.initialize();
      }).not.toThrow();
    });

    it('接続処理が正常に動作する', () => {
      socketService.initialize();
      
      expect(() => {
        socketService.connect();
      }).not.toThrow();
    });

    it('切断処理が正常に動作する', () => {
      socketService.initialize();
      
      expect(() => {
        socketService.disconnect();
      }).not.toThrow();
    });
  });

  describe('状態管理', () => {
    it('初期接続状態は"disconnected"', () => {
      expect(socketService.getConnectionState()).toBe('disconnected');
    });

    it('初期接続フラグはfalse', () => {
      expect(socketService.isConnected()).toBe(false);
    });
  });

  describe('イベント管理', () => {
    beforeEach(() => {
      socketService.initialize();
    });

    it('イベントリスナーの登録が正常に動作する', () => {
      const mockListener = jest.fn();
      
      expect(() => {
        socketService.on('notification', mockListener);
      }).not.toThrow();
    });

    it('イベントリスナーの削除が正常に動作する', () => {
      const mockListener = jest.fn();
      
      socketService.on('notification', mockListener);
      
      expect(() => {
        socketService.off('notification', mockListener);
      }).not.toThrow();
    });

    it('イベント送信が正常に動作する', () => {
      expect(() => {
        socketService.emit('join:presentation', { accessCode: 'TEST123' }, () => {});
      }).not.toThrow();
    });
  });

  describe('リソース管理', () => {
    it('リソースの破棄が正常に動作する', () => {
      socketService.initialize();
      
      expect(() => {
        socketService.destroy();
      }).not.toThrow();
      
      expect(socketService.getConnectionState()).toBe('disconnected');
      expect(socketService.isConnected()).toBe(false);
    });
  });
});