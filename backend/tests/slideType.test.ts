/**
 * SlideType値オブジェクトのテスト
 */

import { SlideType } from '../src/domain/valueObjects/SlideType';

describe('SlideType値オブジェクト', () => {
  describe('正常系テスト', () => {
    test('fromStringで正しいタイプが作成できる', () => {
      const multipleChoice = SlideType.fromString('multiple_choice');
      const wordCloud = SlideType.fromString('word_cloud');
      const openText = SlideType.fromString('open_text');

      expect(multipleChoice.isMultipleChoice()).toBe(true);
      expect(wordCloud.isWordCloud()).toBe(true);
      expect(openText.isOpenText()).toBe(true);
    });

    test('静的インスタンスが正しく作成されている', () => {
      expect(SlideType.MULTIPLE_CHOICE.isMultipleChoice()).toBe(true);
      expect(SlideType.WORD_CLOUD.isWordCloud()).toBe(true);
      expect(SlideType.OPEN_TEXT.isOpenText()).toBe(true);
    });

    test('requiresOptionsが正しく判定される', () => {
      expect(SlideType.MULTIPLE_CHOICE.requiresOptions()).toBe(true);
      expect(SlideType.WORD_CLOUD.requiresOptions()).toBe(false);
      expect(SlideType.OPEN_TEXT.requiresOptions()).toBe(false);
    });

    test('toStringで正しい文字列が返される', () => {
      expect(SlideType.MULTIPLE_CHOICE.toString()).toBe('multiple_choice');
      expect(SlideType.WORD_CLOUD.toString()).toBe('word_cloud');
      expect(SlideType.OPEN_TEXT.toString()).toBe('open_text');
    });

    test('valueプロパティで正しい値が取得できる', () => {
      expect(SlideType.MULTIPLE_CHOICE.value).toBe('multiple_choice');
      expect(SlideType.WORD_CLOUD.value).toBe('word_cloud');
      expect(SlideType.OPEN_TEXT.value).toBe('open_text');
    });

    test('equalsで正しく比較される', () => {
      const type1 = SlideType.fromString('multiple_choice');
      const type2 = SlideType.fromString('multiple_choice');
      const type3 = SlideType.fromString('word_cloud');

      expect(type1.equals(type2)).toBe(true);
      expect(type1.equals(type3)).toBe(false);
      expect(type1.equals(SlideType.MULTIPLE_CHOICE)).toBe(true);
    });
  });

  describe('異常系テスト', () => {
    test('無効なタイプでfromStringを呼ぶとエラーが発生する', () => {
      expect(() => SlideType.fromString('invalid_type')).toThrow('無効なスライドタイプ: invalid_type');
    });

    test('空文字でfromStringを呼ぶとエラーが発生する', () => {
      expect(() => SlideType.fromString('')).toThrow('無効なスライドタイプ: ');
    });

    test('nullでfromStringを呼ぶとエラーが発生する', () => {
      expect(() => SlideType.fromString(null as any)).toThrow('無効なスライドタイプ: null');
    });

    test('undefinedでfromStringを呼ぶとエラーが発生する', () => {
      expect(() => SlideType.fromString(undefined as any)).toThrow('無効なスライドタイプ: undefined');
    });
  });

  describe('タイプ判定テスト', () => {
    test('各タイプが正しく判定される', () => {
      const multipleChoice = SlideType.MULTIPLE_CHOICE;
      expect(multipleChoice.isMultipleChoice()).toBe(true);
      expect(multipleChoice.isWordCloud()).toBe(false);
      expect(multipleChoice.isOpenText()).toBe(false);

      const wordCloud = SlideType.WORD_CLOUD;
      expect(wordCloud.isMultipleChoice()).toBe(false);
      expect(wordCloud.isWordCloud()).toBe(true);
      expect(wordCloud.isOpenText()).toBe(false);

      const openText = SlideType.OPEN_TEXT;
      expect(openText.isMultipleChoice()).toBe(false);
      expect(openText.isWordCloud()).toBe(false);
      expect(openText.isOpenText()).toBe(true);
    });
  });
});