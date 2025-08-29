/**
 * SQLiteスライドリポジトリ実装
 * SQLiteを使用したスライドエンティティの永続化
 */

import { ISlideRepository } from '@/domain/repositories/ISlideRepository';
import { Slide } from '@/domain/entities/Slide';
import { SlideId, PresentationId } from '@/types/common';
import { SlideType } from '@/domain/valueObjects/SlideType';
import { SQLiteConnection } from '../SQLiteConnection';
import Database from 'better-sqlite3';

export class SQLiteSlideRepository implements ISlideRepository {
  constructor(private readonly _db: SQLiteConnection) {}

  private getDatabase(): Database.Database {
    return this._db.getDatabase();
  }

  async findById(id: SlideId): Promise<Slide | null> {
    const stmt = this.getDatabase().prepare('SELECT * FROM slides WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.mapRowToSlide(row);
  }

  async findAll(): Promise<Slide[]> {
    const stmt = this.getDatabase().prepare(
      'SELECT * FROM slides ORDER BY presentation_id, slide_order'
    );
    const rows = stmt.all() as any[];

    return rows.map(row => this.mapRowToSlide(row));
  }

  async save(slide: Slide): Promise<Slide> {
    const existingStmt = this.getDatabase().prepare('SELECT id FROM slides WHERE id = ?');
    const existing = existingStmt.get(slide.id);

    if (existing) {
      return this.update(slide);
    } else {
      return this.insert(slide);
    }
  }

  async delete(id: SlideId): Promise<boolean> {
    const stmt = this.getDatabase().prepare('DELETE FROM slides WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async exists(id: SlideId): Promise<boolean> {
    const stmt = this.getDatabase().prepare('SELECT id FROM slides WHERE id = ? LIMIT 1');
    const row = stmt.get(id);
    return !!row;
  }

  async findByPresentationId(presentationId: PresentationId): Promise<Slide[]> {
    const stmt = this.getDatabase().prepare(
      'SELECT * FROM slides WHERE presentation_id = ? ORDER BY slide_order'
    );
    const rows = stmt.all(presentationId) as any[];

    return rows.map(row => this.mapRowToSlide(row));
  }

  async countByPresentationId(presentationId: PresentationId): Promise<number> {
    const stmt = this.getDatabase().prepare(
      'SELECT COUNT(*) as count FROM slides WHERE presentation_id = ?'
    );
    const result = stmt.get(presentationId) as any;
    return result?.count || 0;
  }

  async findByPresentationIdAndOrder(
    presentationId: PresentationId,
    order: number
  ): Promise<Slide | null> {
    const stmt = this.getDatabase().prepare(
      'SELECT * FROM slides WHERE presentation_id = ? AND slide_order = ?'
    );
    const row = stmt.get(presentationId, order) as any;

    if (!row) return null;

    return this.mapRowToSlide(row);
  }

  async getMaxOrderByPresentationId(presentationId: PresentationId): Promise<number> {
    const stmt = this.getDatabase().prepare(
      'SELECT COALESCE(MAX(slide_order), -1) as maxOrder FROM slides WHERE presentation_id = ?'
    );
    const result = stmt.get(presentationId) as any;
    return result?.maxOrder || -1;
  }

  async updateSlideOrder(slideId: SlideId, newOrder: number): Promise<void> {
    // トランザクション内で順序変更を実行
    const transaction = this.getDatabase().transaction(() => {
      // 現在のスライド情報を取得
      const currentSlideStmt = this.getDatabase().prepare(
        'SELECT presentation_id, slide_order FROM slides WHERE id = ?'
      );
      const currentSlide = currentSlideStmt.get(slideId) as any;

      if (!currentSlide) {
        throw new Error(`スライドが見つかりません: ${slideId}`);
      }

      const { presentation_id: presentationId, slide_order: currentOrder } = currentSlide;

      // 順序変更の処理
      if (newOrder > currentOrder) {
        // 後ろに移動: 間にあるスライドを前に詰める
        const shiftStmt = this.getDatabase().prepare(`
          UPDATE slides 
          SET slide_order = slide_order - 1
          WHERE presentation_id = ? 
            AND slide_order > ? 
            AND slide_order <= ?
        `);
        shiftStmt.run(presentationId, currentOrder, newOrder);
      } else if (newOrder < currentOrder) {
        // 前に移動: 間にあるスライドを後ろにずらす
        const shiftStmt = this.getDatabase().prepare(`
          UPDATE slides 
          SET slide_order = slide_order + 1
          WHERE presentation_id = ? 
            AND slide_order >= ? 
            AND slide_order < ?
        `);
        shiftStmt.run(presentationId, newOrder, currentOrder);
      }

      // 対象スライドの順序を更新
      const updateTargetStmt = this.getDatabase().prepare(
        'UPDATE slides SET slide_order = ?, updated_at = ? WHERE id = ?'
      );
      updateTargetStmt.run(newOrder, new Date().toISOString(), slideId);
    });

    transaction();
  }

  async updateSlidesOrder(slideOrders: Array<{ slideId: SlideId; order: number }>): Promise<void> {
    const transaction = this.getDatabase().transaction(() => {
      const updateStmt = this.getDatabase().prepare(
        'UPDATE slides SET slide_order = ?, updated_at = ? WHERE id = ?'
      );

      const now = new Date().toISOString();
      for (const { slideId, order } of slideOrders) {
        updateStmt.run(order, now, slideId);
      }
    });

    transaction();
  }

  async deleteByPresentationId(presentationId: PresentationId): Promise<number> {
    const stmt = this.getDatabase().prepare('DELETE FROM slides WHERE presentation_id = ?');
    const result = stmt.run(presentationId);
    return result.changes;
  }

  private async insert(slide: Slide): Promise<Slide> {
    const primitives = slide.toPrimitives();

    // コンテンツをJSON化（questionとoptionsを含む）
    const content = JSON.stringify({
      question: primitives.question,
      options: primitives.options,
    });

    const stmt = this.getDatabase().prepare(`
      INSERT INTO slides (
        id, presentation_id, title, type, content, 
        slide_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      slide.id,
      primitives.presentationId,
      primitives.title,
      primitives.type.toString(),
      content,
      primitives.slideOrder,
      primitives.createdAt,
      primitives.updatedAt
    );

    return slide;
  }

  private async update(slide: Slide): Promise<Slide> {
    const primitives = slide.toPrimitives();

    // コンテンツをJSON化
    const content = JSON.stringify({
      question: primitives.question,
      options: primitives.options,
    });

    const stmt = this.getDatabase().prepare(`
      UPDATE slides 
      SET title = ?, type = ?, content = ?, 
          slide_order = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      primitives.title,
      primitives.type.toString(),
      content,
      primitives.slideOrder,
      primitives.updatedAt,
      slide.id
    );

    return slide;
  }

  private mapRowToSlide(row: any): Slide {
    // contentからquestionとoptionsを復元
    const content = JSON.parse(row.content);

    return Slide.restore(row.id, {
      presentationId: row.presentation_id,
      type: SlideType.fromString(row.type),
      title: row.title,
      question: content.question,
      options: content.options,
      slideOrder: row.slide_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
