/**
 * SQLiteプレゼンテーションリポジトリ実装
 * SQLiteを使用したプレゼンテーションエンティティの永続化
 */

import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { Presentation } from '@/domain/entities/Presentation';
import { PresentationId, UserId, AccessCode } from '@/types/common';
import { SQLiteConnection } from '../SQLiteConnection';
import Database from 'better-sqlite3';

export class SQLitePresentationRepository implements IPresentationRepository {
  constructor(private readonly _db: SQLiteConnection) {}

  private getDatabase(): Database.Database {
    return this._db.getDatabase();
  }

  async findById(id: PresentationId): Promise<Presentation | null> {
    const stmt = this.getDatabase().prepare('SELECT * FROM presentations WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return this.mapRowToPresentation(row);
  }

  async findAll(): Promise<Presentation[]> {
    const stmt = this.getDatabase().prepare('SELECT * FROM presentations ORDER BY created_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => this.mapRowToPresentation(row));
  }

  async save(presentation: Presentation): Promise<Presentation> {
    const existingStmt = this.getDatabase().prepare('SELECT id FROM presentations WHERE id = ?');
    const existing = existingStmt.get(presentation.id);

    if (existing) {
      return this.update(presentation);
    } else {
      return this.insert(presentation);
    }
  }

  async delete(id: PresentationId): Promise<boolean> {
    const stmt = this.getDatabase().prepare('DELETE FROM presentations WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async exists(id: PresentationId): Promise<boolean> {
    const stmt = this.getDatabase().prepare('SELECT id FROM presentations WHERE id = ? LIMIT 1');
    const row = stmt.get(id);
    return !!row;
  }

  async findByPresenterId(presenterId: UserId): Promise<Presentation[]> {
    const stmt = this.getDatabase().prepare(
      'SELECT * FROM presentations WHERE presenter_id = ? ORDER BY created_at DESC'
    );
    const rows = stmt.all(presenterId) as any[];

    return rows.map(row => this.mapRowToPresentation(row));
  }

  async findByAccessCode(accessCode: AccessCode): Promise<Presentation | null> {
    const stmt = this.getDatabase().prepare('SELECT * FROM presentations WHERE access_code = ?');
    const row = stmt.get(accessCode) as any;

    if (!row) return null;

    return this.mapRowToPresentation(row);
  }

  async findActive(): Promise<Presentation[]> {
    const stmt = this.getDatabase().prepare(
      'SELECT * FROM presentations WHERE is_active = 1 ORDER BY created_at DESC'
    );
    const rows = stmt.all() as any[];

    return rows.map(row => this.mapRowToPresentation(row));
  }

  async findActiveByPresenterId(presenterId: UserId): Promise<Presentation[]> {
    const stmt = this.getDatabase().prepare(
      'SELECT * FROM presentations WHERE presenter_id = ? AND is_active = 1 ORDER BY created_at DESC'
    );
    const rows = stmt.all(presenterId) as any[];

    return rows.map(row => this.mapRowToPresentation(row));
  }

  async existsByAccessCode(accessCode: AccessCode): Promise<boolean> {
    const stmt = this.getDatabase().prepare(
      'SELECT id FROM presentations WHERE access_code = ? LIMIT 1'
    );
    const row = stmt.get(accessCode);
    return !!row;
  }

  async getStatistics(presentationId: PresentationId): Promise<{
    totalSlides: number;
    totalResponses: number;
    totalParticipants: number;
    activeParticipants: number;
  } | null> {
    // プレゼンテーションの存在確認
    const presentationExists = await this.exists(presentationId);
    if (!presentationExists) return null;

    // 統計情報を並列で取得
    const [
      totalSlidesResult,
      totalResponsesResult,
      totalParticipantsResult,
      activeParticipantsResult,
    ] = await Promise.all([
      this.getTotalSlides(presentationId),
      this.getTotalResponses(presentationId),
      this.getTotalParticipants(presentationId),
      this.getActiveParticipants(presentationId),
    ]);

    return {
      totalSlides: totalSlidesResult,
      totalResponses: totalResponsesResult,
      totalParticipants: totalParticipantsResult,
      activeParticipants: activeParticipantsResult,
    };
  }

  private async insert(presentation: Presentation): Promise<Presentation> {
    const primitives = presentation.toPrimitives();
    const stmt = this.getDatabase().prepare(`
      INSERT INTO presentations (
        id, title, description, presenter_id, access_code, 
        is_active, current_slide_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      presentation.id,
      primitives.title,
      primitives.description || null,
      primitives.presenterId,
      primitives.accessCode,
      primitives.isActive ? 1 : 0,
      primitives.currentSlideIndex,
      primitives.createdAt,
      primitives.updatedAt
    );

    return presentation;
  }

  private async update(presentation: Presentation): Promise<Presentation> {
    const primitives = presentation.toPrimitives();
    const stmt = this.getDatabase().prepare(`
      UPDATE presentations 
      SET title = ?, description = ?, is_active = ?, 
          current_slide_index = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      primitives.title,
      primitives.description || null,
      primitives.isActive ? 1 : 0,
      primitives.currentSlideIndex,
      primitives.updatedAt,
      presentation.id
    );

    return presentation;
  }

  private mapRowToPresentation(row: any): Presentation {
    return Presentation.restore(row.id, {
      title: row.title,
      description: row.description,
      presenterId: row.presenter_id,
      accessCode: row.access_code,
      isActive: !!row.is_active,
      currentSlideIndex: row.current_slide_index,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  private async getTotalSlides(presentationId: PresentationId): Promise<number> {
    const stmt = this.getDatabase().prepare(
      'SELECT COUNT(*) as count FROM slides WHERE presentation_id = ?'
    );
    const result = stmt.get(presentationId) as any;
    return result?.count || 0;
  }

  private async getTotalResponses(presentationId: PresentationId): Promise<number> {
    const stmt = this.getDatabase().prepare(`
      SELECT COUNT(*) as count 
      FROM responses r
      JOIN slides s ON r.slide_id = s.id
      WHERE s.presentation_id = ?
    `);
    const result = stmt.get(presentationId) as any;
    return result?.count || 0;
  }

  private async getTotalParticipants(presentationId: PresentationId): Promise<number> {
    const stmt = this.getDatabase().prepare(`
      SELECT COUNT(DISTINCT r.session_id) as count 
      FROM responses r
      JOIN slides s ON r.slide_id = s.id
      WHERE s.presentation_id = ?
    `);
    const result = stmt.get(presentationId) as any;
    return result?.count || 0;
  }

  private async getActiveParticipants(presentationId: PresentationId): Promise<number> {
    // 最近5分以内にアクティビティがあった参加者をアクティブとみなす
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const stmt = this.getDatabase().prepare(`
      SELECT COUNT(DISTINCT s.session_id) as count 
      FROM sessions s
      WHERE s.presentation_id = ? AND s.last_activity > ?
    `);
    const result = stmt.get(presentationId, fiveMinutesAgo) as any;
    return result?.count || 0;
  }
}
