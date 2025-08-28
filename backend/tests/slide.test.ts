/**
 * Slideエンティティのテスト
 */

import { Slide } from '../src/domain/entities/Slide';
import { SlideType } from '../src/domain/valueObjects/SlideType';

describe('Slideエンティティ', () => {
  describe('正常系テスト', () => {
    describe('create ファクトリメソッド', () => {
      test('多肢選択式スライドが正しく作成できる', () => {
        const slide = Slide.create(
          'slide-1',
          'presentation-1',
          SlideType.MULTIPLE_CHOICE,
          'テストスライド',
          'どちらが好きですか？',
          0,
          ['選択肢1', '選択肢2', '選択肢3']
        );

        expect(slide.id).toBe('slide-1');
        expect(slide.presentationId).toBe('presentation-1');
        expect(slide.type).toBe(SlideType.MULTIPLE_CHOICE);
        expect(slide.title).toBe('テストスライド');
        expect(slide.question).toBe('どちらが好きですか？');
        expect(slide.options).toEqual(['選択肢1', '選択肢2', '選択肢3']);
        expect(slide.slideOrder).toBe(0);
        expect(slide.isMultipleChoice()).toBe(true);
        expect(slide.isWordCloud()).toBe(false);
        expect(slide.isOpenText()).toBe(false);
      });

      test('ワードクラウドスライドが正しく作成できる', () => {
        const slide = Slide.create(
          'slide-2',
          'presentation-1',
          SlideType.WORD_CLOUD,
          'ワードクラウドスライド',
          '一言で表すとしたら何ですか？',
          1
        );

        expect(slide.type).toBe(SlideType.WORD_CLOUD);
        expect(slide.options).toBeUndefined();
        expect(slide.isWordCloud()).toBe(true);
      });

      test('自由記述スライドが正しく作成できる', () => {
        const slide = Slide.create(
          'slide-3',
          'presentation-1',
          SlideType.OPEN_TEXT,
          '自由記述スライド',
          'ご意見をお聞かせください',
          2
        );

        expect(slide.type).toBe(SlideType.OPEN_TEXT);
        expect(slide.options).toBeUndefined();
        expect(slide.isOpenText()).toBe(true);
      });
    });

    describe('fromDatabase ファクトリメソッド', () => {
      test('データベースデータからスライドを復元できる', () => {
        const dbData = {
          id: 'slide-1',
          presentation_id: 'presentation-1',
          type: 'multiple_choice',
          title: 'テストスライド',
          question: 'どちらが好きですか？',
          options: '["選択肢1","選択肢2","選択肢3"]',
          slide_order: 0,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        };

        const slide = Slide.fromDatabase(dbData);

        expect(slide.id).toBe('slide-1');
        expect(slide.presentationId).toBe('presentation-1');
        expect(slide.type.toString()).toBe('multiple_choice');
        expect(slide.options).toEqual(['選択肢1', '選択肢2', '選択肢3']);
      });

      test('optionsがnullの場合はundefinedになる', () => {
        const dbData = {
          id: 'slide-2',
          presentation_id: 'presentation-1',
          type: 'word_cloud',
          title: 'ワードクラウド',
          question: '一言で表すと？',
          options: null,
          slide_order: 1,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        };

        const slide = Slide.fromDatabase(dbData);
        expect(slide.options).toBeUndefined();
      });
    });

    describe('updateメソッド', () => {
      test('タイトルが正しく更新される', () => {
        const slide = Slide.create(
          'slide-1',
          'presentation-1',
          SlideType.MULTIPLE_CHOICE,
          '古いタイトル',
          'どちらが好きですか？',
          0,
          ['選択肢1', '選択肢2']
        );

        const oldUpdatedAt = slide.updatedAt;
        
        // 少し時間を待つ（updatedAtの変化を確認するため）
        setTimeout(() => {
          slide.update('新しいタイトル');
          
          expect(slide.title).toBe('新しいタイトル');
          expect(slide.updatedAt).not.toBe(oldUpdatedAt);
        }, 1);
      });

      test('質問が正しく更新される', () => {
        const slide = Slide.create(
          'slide-1',
          'presentation-1',
          SlideType.WORD_CLOUD,
          'テストスライド',
          '古い質問',
          0
        );

        slide.update(undefined, '新しい質問');
        expect(slide.question).toBe('新しい質問');
      });

      test('選択肢が正しく更新される', () => {
        const slide = Slide.create(
          'slide-1',
          'presentation-1',
          SlideType.MULTIPLE_CHOICE,
          'テストスライド',
          'どちらが好きですか？',
          0,
          ['選択肢1', '選択肢2']
        );

        const newOptions = ['新選択肢1', '新選択肢2', '新選択肢3'];
        slide.update(undefined, undefined, newOptions);
        expect(slide.options).toEqual(newOptions);
      });
    });

    describe('changeOrderメソッド', () => {
      test('スライド順序が正しく変更される', () => {
        const slide = Slide.create(
          'slide-1',
          'presentation-1',
          SlideType.WORD_CLOUD,
          'テストスライド',
          'どう思いますか？',
          0
        );

        slide.changeOrder(5);
        expect(slide.slideOrder).toBe(5);
      });
    });

    describe('toPrimitivesメソッド', () => {
      test('プリミティブ型への変換が正しく行われる', () => {
        const slide = Slide.create(
          'slide-1',
          'presentation-1',
          SlideType.MULTIPLE_CHOICE,
          'テストスライド',
          'どちらが好きですか？',
          0,
          ['選択肢1', '選択肢2']
        );

        const primitives = slide.toPrimitives();

        expect(primitives.id).toBe('slide-1');
        expect(primitives.presentationId).toBe('presentation-1');
        expect(primitives.type).toBe(SlideType.MULTIPLE_CHOICE);
        expect(primitives.title).toBe('テストスライド');
        expect(primitives.question).toBe('どちらが好きですか？');
        expect(primitives.options).toEqual(['選択肢1', '選択肢2']);
        expect(primitives.slideOrder).toBe(0);
        expect(primitives.createdAt).toBeTruthy();
        expect(primitives.updatedAt).toBeTruthy();
      });
    });
  });

  describe('異常系テスト', () => {
    describe('バリデーションエラー', () => {
      test('空のタイトルでエラーが発生する', () => {
        expect(() => {
          Slide.create(
            'slide-1',
            'presentation-1',
            SlideType.WORD_CLOUD,
            '',
            'どう思いますか？',
            0
          );
        }).toThrow('スライドタイトルは必須です');
      });

      test('長すぎるタイトルでエラーが発生する', () => {
        const longTitle = 'あ'.repeat(101);
        expect(() => {
          Slide.create(
            'slide-1',
            'presentation-1',
            SlideType.WORD_CLOUD,
            longTitle,
            'どう思いますか？',
            0
          );
        }).toThrow('スライドタイトルは100文字以内で入力してください');
      });

      test('空の質問でエラーが発生する', () => {
        expect(() => {
          Slide.create(
            'slide-1',
            'presentation-1',
            SlideType.WORD_CLOUD,
            'テストスライド',
            '',
            0
          );
        }).toThrow('質問は必須です');
      });

      test('長すぎる質問でエラーが発生する', () => {
        const longQuestion = 'あ'.repeat(501);
        expect(() => {
          Slide.create(
            'slide-1',
            'presentation-1',
            SlideType.WORD_CLOUD,
            'テストスライド',
            longQuestion,
            0
          );
        }).toThrow('質問は500文字以内で入力してください');
      });

      test('多肢選択式で選択肢が足りない場合エラーが発生する', () => {
        expect(() => {
          Slide.create(
            'slide-1',
            'presentation-1',
            SlideType.MULTIPLE_CHOICE,
            'テストスライド',
            'どちらが好きですか？',
            0,
            ['選択肢1'] // 1つだけ
          );
        }).toThrow('多肢選択式スライドには2つ以上の選択肢が必要です');
      });

      test('多肢選択式で選択肢が多すぎる場合エラーが発生する', () => {
        const tooManyOptions = Array.from({ length: 11 }, (_, i) => `選択肢${i + 1}`);
        expect(() => {
          Slide.create(
            'slide-1',
            'presentation-1',
            SlideType.MULTIPLE_CHOICE,
            'テストスライド',
            'どちらが好きですか？',
            0,
            tooManyOptions
          );
        }).toThrow('選択肢は10個以下である必要があります');
      });

      test('多肢選択式で空の選択肢がある場合エラーが発生する', () => {
        expect(() => {
          Slide.create(
            'slide-1',
            'presentation-1',
            SlideType.MULTIPLE_CHOICE,
            'テストスライド',
            'どちらが好きですか？',
            0,
            ['選択肢1', '', '選択肢3']
          );
        }).toThrow('選択肢に空の項目は含められません');
      });

      test('負のスライド順序でエラーが発生する', () => {
        expect(() => {
          Slide.create(
            'slide-1',
            'presentation-1',
            SlideType.WORD_CLOUD,
            'テストスライド',
            'どう思いますか？',
            -1
          );
        }).toThrow('スライド順序は0以上である必要があります');
      });
    });

    describe('更新時のバリデーションエラー', () => {
      test('updateで無効なタイトルを設定するとエラーが発生する', () => {
        const slide = Slide.create(
          'slide-1',
          'presentation-1',
          SlideType.WORD_CLOUD,
          'テストスライド',
          'どう思いますか？',
          0
        );

        expect(() => {
          slide.update('');
        }).toThrow('スライドタイトルは必須です');
      });

      test('changeOrderで負の値を設定するとエラーが発生する', () => {
        const slide = Slide.create(
          'slide-1',
          'presentation-1',
          SlideType.WORD_CLOUD,
          'テストスライド',
          'どう思いますか？',
          0
        );

        expect(() => {
          slide.changeOrder(-1);
        }).toThrow('スライド順序は0以上である必要があります');
      });
    });
  });
});