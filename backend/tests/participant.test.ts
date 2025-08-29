/**
 * 参加者機能統合テスト
 * アクセスコード検証・プレゼンテーション参加機能の動作確認
 */

import { AccessCode } from '@/domain/valueObjects/AccessCode';

describe('参加者機能統合テスト', () => {
  describe('アクセスコード生成', () => {
    test('生成されるアクセスコードが正しい形式になっている', () => {
      const accessCode = AccessCode.generate();
      
      expect(accessCode.toString()).toHaveLength(6);
      expect(accessCode.toString()).toMatch(/^[A-Z0-9]+$/);
      
      // 紛らわしい文字が含まれていないことを確認
      const confusingChars = ['0', 'O', '1', 'I'];
      confusingChars.forEach(char => {
        expect(accessCode.toString()).not.toContain(char);
      });
    });

    test('複数回生成してもユニークなコードが生成される', () => {
      const codes = new Set<string>();
      
      // 100回生成してすべて異なることを確認
      for (let i = 0; i < 100; i++) {
        const code = AccessCode.generate().toString();
        expect(codes.has(code)).toBe(false);
        codes.add(code);
      }
    });

    test('表示形式（3桁-3桁）が正しく生成される', () => {
      const accessCode = AccessCode.generate();
      const displayFormat = accessCode.toDisplayFormat();
      
      expect(displayFormat).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
      expect(displayFormat.length).toBe(7); // XXX-XXX
    });

    test('アクセスコードが紛らわしい文字を除外している', () => {
      const excludedChars = ['0', 'O', '1', 'I']; // 0とO、1とIの混同を防ぐ
      
      // 1000回生成してすべての文字が除外文字を含まないことを確認
      for (let i = 0; i < 1000; i++) {
        const code = AccessCode.generate().toString();
        excludedChars.forEach(char => {
          expect(code).not.toContain(char);
        });
      }
    });

    test('無効な形式でAccessCodeが作成された場合にエラーが発生する', () => {
      expect(() => AccessCode.from('12345')).toThrow('アクセスコードは6桁である必要があります');
      expect(() => AccessCode.from('1234567')).toThrow('アクセスコードは6桁である必要があります');
      expect(() => AccessCode.from('abc@#$')).toThrow('アクセスコードは英数字（大文字）のみ使用可能です');
      expect(() => AccessCode.from('')).toThrow('アクセスコードは必須です');
    });

    test('有効な形式でAccessCodeが正常に作成される', () => {
      const validCodes = ['ABC123', 'XYZ789', 'PQR456'];
      
      validCodes.forEach(code => {
        expect(() => AccessCode.from(code)).not.toThrow();
        const accessCode = AccessCode.from(code);
        expect(accessCode.toString()).toBe(code);
        expect(accessCode.toDisplayFormat()).toBe(`${code.slice(0, 3)}-${code.slice(3)}`);
      });
    });
  });
});