# 方式設計書：リアルタイムインタラクティブWebアプリ

## **1. 概要**

本文書は、製品仕様書および要求仕様書に基づいて、リアルタイムインタラクティブプレゼンテーションWebアプリケーションの方式設計を定義します。本システムは、プレゼンターと参加者間のリアルタイムな双方向コミュニケーションを実現し、匿名性を保持した投票・回答システムを提供します。

### **1.1 設計方針**

* **シンプルな実装**: 迅速な開発を優先し、必要最小限の構成から開始
* **スケーラビリティ**: 必要に応じて拡張可能な設計
* **リアルタイム性**: 1秒以内の応答時間を実現
* **セキュリティ**: 匿名性の保護と基本的なセキュリティ対策
* **保守性**: TypeScriptによる型安全性とモジュラー設計

## **2. システムアーキテクチャ**

### **2.1 全体アーキテクチャ**

```
┌─────────────────┐    ┌─────────────────┐
│   プレゼンター   │    │     参加者      │
│   (Web Client)  │    │   (Web Client)  │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          │      HTTPS/WSS       │
          │                      │
          └──────┬─────────────────┘
                 │
        ┌────────▼────────┐
        │  WebContainer   │
        │   (Browser)     │
        │  ┌───────────┐  │
        │  │Web Server │  │
        │  │(Node.js)  │  │
        │  │TypeScript │  │
        │  └─────┬─────┘  │
        │        │        │
        │  ┌─────▼─────┐  │
        │  │In-Memory  │  │
        │  │  Cache    │  │
        │  └─────┬─────┘  │
        │        │        │
        │  ┌─────▼─────┐  │
        │  │  SQLite   │  │
        │  │(Database) │  │
        │  └───────────┘  │
        └─────────────────┘
```

### **2.2 技術スタック**

#### **フロントエンド**
- **Language**: TypeScript 5.x
- **Framework**: React.js 18.x with TypeScript
- **State Management**: Redux Toolkit with TypeScript
- **UI Library**: Material-UI (MUI) with TypeScript
- **リアルタイム通信**: Socket.IO Client with TypeScript
- **Chart Library**: Chart.js / Recharts with TypeScript
- **Word Cloud**: react-wordcloud with TypeScript
- **Type Checking**: TypeScript strict mode
- **Build Tool**: Vite with TypeScript

#### **バックエンド**
- **Language**: TypeScript 5.x
- **Runtime**: Node.js 18.x with TypeScript
- **Framework**: Express.js with TypeScript
- **リアルタイム通信**: Socket.IO with TypeScript
- **認証**: JWT (JSON Web Tokens) with TypeScript types
- **バリデーション**: Joi with TypeScript schemas
- **ロギング**: Winston with TypeScript
- **Build Tool**: tsc (TypeScript Compiler)

#### **データベース**
- **メインDB**: SQLite 3.x
- **キャッシュ**: In-Memory Storage (Map/WeakMap)
- **セッション管理**: Browser SessionStorage + In-Memory

#### **実行環境**
- **Runtime**: WebContainer (Browser-based Node.js)
- **Development**: StackBlitz/CodeSandbox compatible
- **Deployment**: Browser-based execution

#### **TypeScript 設定**
- **TypeScript Version**: 5.x
- **Target**: ES2020
- **Module**: ES2020
- **Strict Mode**: Enabled
- **Path Mapping**: Enabled
- **Declaration Files**: Generated for libraries

### **2.3 TypeScript 設定詳細**

#### **tsconfig.json (Backend)**
```typescript
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "paths": {
      "@/*": ["./src/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### **tsconfig.json (Frontend)**
```typescript
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

### **2.4 設計パターン**

- **MVC アーキテクチャ**: Express.jsによる階層化
- **Repository パターン**: データアクセス層の抽象化
- **Factory パターン**: スライドタイプの生成管理
- **Observer パターン**: リアルタイム通知システム

## **3. データベース設計**

### **3.1 共通型定義**

```typescript
// SQLite row ID type
type SQLiteRowId = number;

// Common types
type SlideType = 'multiple_choice' | 'word_cloud';
type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

// Utility types
interface BaseEntity {
  id: SQLiteRowId;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

interface TimestampedEntity {
  created_at: string;
  updated_at: string;
}
```

### **3.2 SQLite スキーマ設計**

#### **Users Table**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

```typescript
interface User extends BaseEntity {
  username: string; // unique
  email: string; // unique
  password_hash: string;
}
```

#### **Presentations Table**
```sql
CREATE TABLE presentations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  presenter_id INTEGER NOT NULL,
  access_code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  current_slide_index INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (presenter_id) REFERENCES users (id)
);
```

```typescript
interface Presentation extends BaseEntity {
  title: string;
  description: string;
  presenter_id: SQLiteRowId; // reference to Users
  access_code: string; // 6-digit unique code
  is_active: boolean;
  current_slide_index: number;
}
```

#### **Slides Table**
```sql
CREATE TABLE slides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  presentation_id INTEGER NOT NULL,
  type TEXT CHECK(type IN ('multiple_choice', 'word_cloud')) NOT NULL,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT, -- JSON array for multiple choice options
  slide_order INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (presentation_id) REFERENCES presentations (id),
  UNIQUE(presentation_id, slide_order)
);
```

```typescript
interface Slide extends BaseEntity {
  presentation_id: SQLiteRowId;
  type: SlideType;
  title: string;
  question: string;
  options?: string[]; // for multiple choice only (stored as JSON)
  slide_order: number;
}
```

#### **Responses Table**
```sql
CREATE TABLE responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  presentation_id INTEGER NOT NULL,
  slide_id INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  response_data TEXT NOT NULL, -- JSON data
  timestamp TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (presentation_id) REFERENCES presentations (id),
  FOREIGN KEY (slide_id) REFERENCES slides (id),
  UNIQUE(session_id, slide_id) -- prevent duplicate responses
);
```

```typescript
interface ResponseData {
  // For multiple choice
  selectedOption?: string;
  // For word cloud
  text?: string;
}

interface Response extends BaseEntity {
  presentation_id: SQLiteRowId;
  slide_id: SQLiteRowId;
  session_id: string; // to prevent duplicate responses
  ip_address: string; // for duplicate prevention
  response_data: ResponseData; // stored as JSON
  timestamp: string; // ISO 8601 timestamp
}
```

#### **Sessions Table**
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  presentation_id INTEGER NOT NULL,
  participant_count INTEGER DEFAULT 1,
  joined_at TEXT DEFAULT (datetime('now')),
  last_activity TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (presentation_id) REFERENCES presentations (id)
);
```

```typescript
interface Session extends BaseEntity {
  session_id: string; // unique
  presentation_id: SQLiteRowId;
  participant_count: number;
  joined_at: string; // ISO 8601 timestamp
  last_activity: string; // ISO 8601 timestamp
}
```

### **3.3 In-Memory キャッシュ設計**

#### **セッション管理**
```typescript
interface InMemorySession {
  presentationId: string;
  joinedAt: number; // timestamp
  lastActivity: number; // timestamp
}

// In-Memory Storage
const sessionCache = new Map<string, InMemorySession>();
// Key: session:{sessionId}
```

#### **アクティブプレゼンテーション**
```typescript
interface InMemoryActivePresentation {
  presentationId: string;
  presenterId: string;
  currentSlide: number;
  participantCount: number;
  lastUpdated: number; // timestamp
}

const activePresentationCache = new Map<string, InMemoryActivePresentation>();
// Key: active_presentation:{accessCode}
```

#### **リアルタイムデータ**
```typescript
interface InMemoryRealtimeData {
  responses: any; // JSON data
  updatedAt: number; // timestamp
}

const realtimeCache = new Map<string, InMemoryRealtimeData>();
// Key: realtime:{presentationId}:{slideId}
```

## **4. API設計**

### **4.1 RESTful API エンドポイント**

#### **認証 API**
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

#### **プレゼンテーション API**
```
GET    /api/presentations          # プレゼンター用一覧
POST   /api/presentations          # 新規作成
GET    /api/presentations/:id      # 詳細取得
PUT    /api/presentations/:id      # 更新
DELETE /api/presentations/:id      # 削除
POST   /api/presentations/:id/start # 開始
POST   /api/presentations/:id/stop  # 停止
```

#### **スライド API**
```
POST   /api/presentations/:id/slides     # スライド追加
PUT    /api/presentations/:id/slides/:slideId # スライド更新
DELETE /api/presentations/:id/slides/:slideId # スライド削除
```

#### **参加者 API**
```
POST /api/join              # プレゼンテーション参加
GET  /api/presentations/:accessCode/current # 現在のスライド取得
POST /api/responses         # 回答送信
```

#### **分析 API**
```
GET /api/presentations/:id/analytics      # 集計データ取得
GET /api/presentations/:id/export        # データエクスポート
```

### **4.2 API リクエスト・レスポンス型定義**

#### **認証 API 型**
```typescript
// Registration
interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  message: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

// Login
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}
```

#### **プレゼンテーション API 型**
```typescript
// Create Presentation
interface CreatePresentationRequest {
  title: string;
  description?: string;
}

interface CreatePresentationResponse {
  message: string;
  presentation: Presentation;
}

// Join Presentation
interface JoinPresentationRequest {
  accessCode: string;
}

interface JoinPresentationResponse {
  message: string;
  sessionId: string;
  presentation: {
    id: string;
    title: string;
    currentSlide: Slide;
  };
}

// Submit Response
interface SubmitResponseRequest {
  slideId: string;
  sessionId: string;
  responseData: ResponseData;
}

interface SubmitResponseResponse {
  message: string;
  success: boolean;
}
```

#### **分析 API 型**
```typescript
interface AnalyticsResponse {
  presentationId: string;
  totalResponses: number;
  slideAnalytics: Array<{
    slideId: string;
    slideTitle: string;
    responseCount: number;
    data: any; // Specific to slide type
  }>;
}
```

### **4.3 WebSocket イベント設計**

#### **プレゼンター向けイベント**
```typescript
// 送信イベント
interface SlideChangeEvent {
  slideIndex: number;
}

interface PresentationStartEvent {
  presentationId: string;
}

interface PresentationStopEvent {
  presentationId: string;
}

// 受信イベント
interface ParticipantJoinedEvent {
  count: number;
}

interface ParticipantLeftEvent {
  count: number;
}

interface NewResponseEvent {
  slideId: string;
  response: ResponseData;
}

interface RealtimeUpdateEvent {
  slideId: string;
  data: any;
}
```

#### **参加者向けイベント**
```typescript
// 送信イベント
interface JoinPresentationEvent {
  accessCode: string;
  sessionId: string;
}

interface SubmitResponseEvent {
  slideId: string;
  response: ResponseData;
}

// 受信イベント
interface PresentationJoinedEvent {
  presentationId: string;
  currentSlide: Slide;
}

interface SlideChangedEvent {
  slide: Slide;
}

interface PresentationEndedEvent {}

interface ParticipantRealtimeUpdateEvent {
  data: any;
}
```

## **5. リアルタイム通信設計**

### **5.1 Socket.IO 実装**

#### **名前空間設計**
```typescript
// プレゼンター用
// Namespace: /presenter

// 参加者用  
// Namespace: /participant

// 管理用
// Namespace: /admin
```

#### **Room設計**
```typescript
// プレゼンテーションごとのRoom
type PresentationRoom = `presentation-${string}`;

// スライドごとのRoom
type SlideRoom = `slide-${string}`;

// プレゼンター専用Room
type PresenterRoom = `presenter-${string}`;
```

### **5.2 リアルタイムデータフロー**

1. **参加者の回答送信**:
   ```
   参加者 -> WebSocket -> サーバー -> データベース -> Redis -> 全参加者 + プレゼンター
   ```

2. **スライド切り替え**:
   ```
   プレゼンター -> WebSocket -> サーバー -> Redis -> 全参加者
   ```

3. **リアルタイム集計**:
   ```
   回答データ -> 集計処理 -> Redis -> プレゼンター + 参加者
   ```

## **6. セキュリティ設計**

### **6.1 認証・認可**

#### **JWT実装**
```javascript
{
  "iss": "nanoconnect-app",
  "sub": "user-id",
  "iat": timestamp,
  "exp": timestamp,
  "role": "presenter" | "participant"
}
```

#### **アクセス制御**
- プレゼンター: 自身のプレゼンテーションのみ操作可能
- 参加者: 参加中のプレゼンテーションのみ閲覧・回答可能

### **6.2 重複回答防止**

#### **戦略**
1. **Session ID + IP Address**: 組み合わせによる一意性確保
2. **Redis Cache**: 回答済みセッションの高速チェック
3. **Time Window**: 同一IPからの短期間内重複アクセス制限

```javascript
// 重複チェックキー
const duplicateKey = `response:${sessionId}:${slideId}`;
const ipKey = `ip_limit:${ipAddress}:${slideId}`;
```

### **6.3 入力検証・サニタイゼーション**

#### **バリデーション**
```javascript
// ワードクラウド入力
const wordCloudSchema = Joi.object({
  text: Joi.string()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s]+$/)
    .required()
});

// 多肢選択
const multipleChoiceSchema = Joi.object({
  selectedOption: Joi.string()
    .valid(...validOptions)
    .required()
});
```

## **7. パフォーマンス・スケーラビリティ設計**

### **7.1 パフォーマンス最適化**

#### **単一WebContainer設計**
- Node.jsアプリケーションのブラウザ内最適化
- Socket.IOの効率的な利用
- In-Memory キャッシュによる高速アクセス

#### **シンプルなIn-Memory設定**
```typescript
// In-Memory Cache設定
class InMemoryCache {
  private cache = new Map<string, any>();
  private ttl = new Map<string, number>();

  set(key: string, value: any, ttlMs: number = 3600000): void {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlMs);
  }

  get(key: string): any | null {
    const expiry = this.ttl.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }
}

const cache = new InMemoryCache();
```

### **7.2 キャッシュ戦略**

#### **シンプルなキャッシュ設計**
1. **ブラウザキャッシュ**: 静的リソース (24時間)
2. **In-Memoryキャッシュ**: セッション・リアルタイムデータ
3. **SessionStorage**: ユーザーセッション情報

### **7.3 データベース最適化**

#### **SQLite インデックス**
```sql
-- Presentations Table
CREATE INDEX idx_presentations_access_code ON presentations(access_code);
CREATE INDEX idx_presentations_presenter_id ON presentations(presenter_id);
CREATE INDEX idx_presentations_is_active ON presentations(is_active);

-- Slides Table
CREATE INDEX idx_slides_presentation_id ON slides(presentation_id);
CREATE INDEX idx_slides_order ON slides(presentation_id, slide_order);

-- Responses Table  
CREATE INDEX idx_responses_presentation_slide ON responses(presentation_id, slide_id);
CREATE INDEX idx_responses_session_slide ON responses(session_id, slide_id);
CREATE INDEX idx_responses_timestamp ON responses(timestamp);

-- Sessions Table
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_presentation_id ON sessions(presentation_id);
```

## **8. 運用・監視設計**

### **8.1 ログ設計**

#### **ログレベル**
- **ERROR**: システムエラー、例外
- **WARN**: 異常な状況、パフォーマンス警告  
- **INFO**: ビジネスロジック、ユーザーアクション
- **DEBUG**: 開発・デバッグ情報

#### **構造化ログ**
```typescript
interface LogEntry {
  timestamp: string; // ISO 8601 format
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  service: string;
  userId?: string;
  presentationId?: string;
  action: string;
  metadata?: Record<string, any>;
}

// Example log entry
const logExample: LogEntry = {
  timestamp: "2024-01-15T10:30:00.000Z",
  level: "INFO",
  service: "nanoconnect-api",
  userId: "user-123",
  presentationId: "pres-456",
  action: "slide_change",
  metadata: {
    from: 0,
    to: 1,
    participantCount: 45
  }
};
```

### **8.2 監視・メトリクス**

#### **基本メトリクス**
- **システムメトリクス**: CPU, Memory, Disk
- **アプリケーションメトリクス**: レスポンス時間, スループット
- **ビジネスメトリクス**: 同時接続数, プレゼンテーション作成数

#### **基本アラート条件**
- CPU使用率 > 80%
- メモリ使用率 > 85%  
- 応答時間 > 2秒
- エラー率 > 5%

## **9. WebContainer デプロイメント設計**

### **9.1 WebContainer セットアップ**

#### **package.json (Backend - WebContainer対応)**
```json
{
  "name": "nanoconnect-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "nodemon --exec tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "type-check": "tsc --noEmit",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "sqlite3": "^5.1.6",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.0",
    "cors": "^2.8.5",
    "joi": "^17.9.2",
    "winston": "^3.10.0"
  },
  "devDependencies": {
    "@types/node": "^18.16.19",
    "@types/express": "^4.17.17",
    "@types/sqlite3": "^3.1.8",
    "@types/jsonwebtoken": "^9.0.2",
    "@types/bcrypt": "^5.0.0",
    "@types/cors": "^2.8.13",
    "typescript": "^5.1.6",
    "tsx": "^3.12.7",
    "nodemon": "^3.0.1",
    "@typescript-eslint/eslint-plugin": "^6.2.1",
    "@typescript-eslint/parser": "^6.2.1"
  }
}
```

#### **package.json (Frontend - Vite + React + TypeScript)**
```json
{
  "name": "nanoconnect-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint src/**/*.{ts,tsx}",
    "lint:fix": "eslint src/**/*.{ts,tsx} --fix"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@reduxjs/toolkit": "^1.9.5",
    "react-redux": "^8.1.2",
    "@mui/material": "^5.14.5",
    "@mui/icons-material": "^5.14.3",
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "socket.io-client": "^4.7.2",
    "chart.js": "^4.3.3",
    "react-chartjs-2": "^5.2.0",
    "recharts": "^2.8.0",
    "react-wordcloud": "^1.2.7",
    "axios": "^1.4.0",
    "react-router-dom": "^6.15.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.20",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.4",
    "vite": "^4.4.9",
    "typescript": "^5.1.6",
    "eslint": "^8.47.0",
    "@typescript-eslint/eslint-plugin": "^6.2.1",
    "@typescript-eslint/parser": "^6.2.1",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3"
  }
}
```

#### **vite.config.ts (Vite設定)**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/store': path.resolve(__dirname, './src/store'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@mui/material', '@mui/icons-material'],
          charts: ['chart.js', 'react-chartjs-2', 'recharts'],
        },
      },
    },
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
})
```

#### **WebContainer 初期化スクリプト**
```typescript
// webcontainer-setup.ts
import Database from 'better-sqlite3';
import path from 'path';

export async function initializeWebContainer(): Promise<void> {
  console.log('Initializing WebContainer environment...');
  
  // SQLite データベース初期化
  const dbPath = path.join(process.cwd(), 'data', 'nanoconnect.db');
  const db = new Database(dbPath);
  
  // テーブル作成
  await createTables(db);
  
  // インデックス作成
  await createIndexes(db);
  
  console.log('WebContainer initialization completed!');
}

async function createTables(db: Database.Database): Promise<void> {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS presentations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      presenter_id INTEGER NOT NULL,
      access_code TEXT UNIQUE NOT NULL,
      is_active BOOLEAN DEFAULT FALSE,
      current_slide_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (presenter_id) REFERENCES users (id)
    )`,
    // ... 他のテーブル定義
  ];
  
  for (const tableSQL of tables) {
    db.exec(tableSQL);
  }
}
```

### **9.2 StackBlitz/CodeSandbox 設定**

#### **stackblitz.json (フロントエンド - Vite)**
```json
{
  "installDependencies": true,
  "startCommand": "npm run dev",
  "env": {
    "NODE_ENV": "development"
  },
  "tasks": {
    "dev": {
      "name": "Vite Development Server",
      "command": "npm run dev",
      "runAtStart": true
    },
    "build": {
      "name": "Vite Build",
      "command": "npm run build"
    },
    "preview": {
      "name": "Vite Preview",
      "command": "npm run preview"
    }
  }
}
```

#### **codesandbox.json (WebContainerサポート)**
```json
{
  "template": "node",
  "container": {
    "port": 3000,
    "startScript": "dev",
    "node": "18"
  },
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev"
  }
}
```

### **9.3 Vite WebContainer最適化**

#### **Vite HMR (Hot Module Replacement) 設定**
```typescript
// vite.config.ts - WebContainer最適化
export default defineConfig({
  plugins: [
    react({
      // Fast Refresh for better development experience
      fastRefresh: true,
    }),
  ],
  server: {
    // WebContainer環境での最適化
    hmr: {
      port: 3001, // HMR専用ポート
    },
    // ファイル監視の最適化
    watch: {
      usePolling: true,
      interval: 100,
    },
    // WebContainer環境でのCORS設定
    cors: true,
    // プロキシ設定でバックエンドAPI接続
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  // WebContainer環境での依存関係最適化
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material', 'socket.io-client'],
    exclude: ['@vite/client', '@vite/env'],
  },
  // チャンクサイズ最適化 (WebContainer環境向け)
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // メインベンダーチャンク
          vendor: ['react', 'react-dom'],
          // UI ライブラリチャンク  
          ui: ['@mui/material', '@mui/icons-material', '@emotion/react'],
          // チャート関連チャンク
          charts: ['chart.js', 'react-chartjs-2', 'recharts'],
          // Socket通信チャンク
          realtime: ['socket.io-client'],
        },
      },
    },
    // WebContainer環境でのサイズ制限緩和
    chunkSizeWarningLimit: 1000,
  },
})
```

### **9.4 WebContainer プロジェクト構造**

```
nanoconnect-webcontainer/
├── frontend/                    # Vite + React + TypeScript
│   ├── public/
│   │   ├── vite.svg
│   │   └── index.html
│   ├── src/
│   │   ├── components/          # React コンポーネント
│   │   │   ├── common/
│   │   │   ├── presenter/
│   │   │   └── participant/
│   │   ├── pages/              # ページコンポーネント
│   │   ├── hooks/              # カスタムフック
│   │   ├── store/              # Redux Store
│   │   ├── types/              # TypeScript型定義
│   │   ├── utils/              # ユーティリティ
│   │   ├── services/           # API & Socket.IO
│   │   ├── styles/             # スタイル
│   │   ├── App.tsx
│   │   └── main.tsx            # Viteエントリーポイント
│   ├── package.json            # Vite依存関係
│   ├── vite.config.ts          # Vite設定
│   ├── tsconfig.json           # TypeScript設定
│   ├── tsconfig.node.json      # Vite用TypeScript設定
│   └── eslint.config.js        # ESLint設定
├── backend/                     # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   └── index.ts
│   ├── data/
│   │   └── nanoconnect.db      # SQLite データベース
│   ├── package.json            # Backend依存関係
│   └── tsconfig.json           # Backend TypeScript設定
├── shared/                      # 共通型定義
│   └── types/
│       ├── api.ts
│       ├── socket.ts
│       └── database.ts
├── package.json                # ルートプロジェクト設定
├── stackblitz.json             # StackBlitz設定
├── codesandbox.json            # CodeSandbox設定
└── README.md
```

#### **ルートプロジェクトのpackage.json (WebContainer統合)**
```json
{
  "name": "nanoconnect-webcontainer",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev", 
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "cd backend && npm run build",
    "type-check": "npm run type-check:frontend && npm run type-check:backend",
    "type-check:frontend": "cd frontend && npm run type-check",
    "type-check:backend": "cd backend && npm run type-check",
    "install:all": "npm install && cd frontend && npm install && cd ../backend && npm install"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

#### **WebContainer用の環境設定**
```typescript
// src/config/webcontainer.ts
export const webContainerConfig = {
  database: {
    path: './data/nanoconnect.db',
    options: {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
    }
  },
  server: {
    port: process.env.PORT || 3000,
    cors: {
      origin: ['https://stackblitz.com', 'https://codesandbox.io'],
      credentials: true
    }
  },
  cache: {
    ttl: 3600000, // 1 hour
    maxSize: 1000
  }
};
```

### **9.3 開発環境**

#### **WebContainer 開発フロー**
1. **StackBlitz/CodeSandbox でプロジェクト作成**
2. **依存関係の自動インストール**
3. **SQLite データベースの初期化**
4. **開発サーバーの起動 (ホットリロード)**
5. **TypeScript コンパイル & 型チェック**

#### **実行コマンド**
```bash
# 開発モード (WebContainer内)
npm run dev          # nodemon --exec tsx src/index.ts

# ビルド
npm run build        # tsc

# 型チェック
npm run type-check   # tsc --noEmit

# 本番実行
npm start           # node dist/index.js
```

## **10. データフロー図**

### **10.1 プレゼンテーション作成フロー**
```
プレゼンター → ログイン → プレゼンテーション作成 → スライド追加 → 6桁コード生成 → 開始待機
```

### **10.2 参加者参加フロー**  
```
参加者 → 6桁コード入力 → セッション作成 → プレゼンテーション参加 → リアルタイム同期開始
```

### **10.3 回答送信フロー**
```
参加者回答 → バリデーション → 重複チェック → DB保存 → Redis更新 → リアルタイム配信 → UI更新
```

## **11. 実装優先順位**

### **Phase 1: 基本機能 (MVP)**
1. ユーザー認証システム
2. プレゼンテーション CRUD
3. 6桁コード生成・参加システム
4. 多肢選択式投票
5. 基本的なリアルタイム通信

### **Phase 2: 高度な機能**
1. ワードクラウド機能
2. リアルタイムデータ可視化
3. 重複回答防止システム
4. セッション管理

### **Phase 3: 運用・最適化**
1. パフォーマンス最適化
2. 監視・ログシステム
3. セキュリティ強化
4. スケーラビリティ改善

## **12. 技術的考慮事項**

### **12.1 制約・前提**
- ブラウザ対応: Chrome, Firefox, Safari, Edge (最新2バージョン)
- WebContainer環境: StackBlitz/CodeSandbox互換性
- 初期設計: 最大100-200人/プレゼンテーション（WebContainer制限内）
- 応答時間: 1秒以内
- データ保持: SQLiteファイル（ブラウザ環境制限内）
- 実行環境: ブラウザベースNode.js runtime

### **12.2 拡張性**
- 新しいスライドタイプの追加容易性
- 多言語対応への拡張性
- 外部サービス連携の拡張性
- WebContainer環境での制限内での拡張性

### **12.3 保守性**
- モジュラー設計による変更影響の局所化
- 基本的なテストカバレッジ
- 必要に応じたドキュメント更新
- WebContainer環境での開発効率性

## **12. TypeScript 開発ワークフロー**

### **12.1 開発環境セットアップ**

#### **必要なパッケージ (Backend - WebContainer対応)**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "better-sqlite3": "^8.14.2",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.0",
    "cors": "^2.8.5",
    "joi": "^17.9.2",
    "winston": "^3.10.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "@types/express": "^4.17.17",
    "@types/better-sqlite3": "^7.6.4",
    "@types/jsonwebtoken": "^9.0.2",
    "@types/bcrypt": "^5.0.0",
    "@types/cors": "^2.8.13",
    "typescript": "^5.0.0",
    "tsx": "^3.12.7",
    "nodemon": "^3.0.1",
    "@typescript-eslint/eslint-plugin": "^5.59.0",
    "@typescript-eslint/parser": "^5.59.0"
  }
}
```

#### **必要なパッケージ (Frontend)**
```json
{
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^5.59.0",
    "@typescript-eslint/parser": "^5.59.0",
    "typescript": "^5.0.0"
  }
}
```

### **12.2 開発コマンド**

#### **Backend 開発コマンド (WebContainer)**
```bash
# TypeScript コンパイル
npm run build        # tsc

# 開発モード (ホットリロード)
npm run dev          # nodemon --exec tsx src/index.ts

# 型チェック
npm run type-check   # tsc --noEmit

# Lint
npm run lint         # eslint src/**/*.ts

# SQLite データベース初期化
npm run init-db      # tsx scripts/init-database.ts

# WebContainer環境の起動
npm start           # tsx src/index.ts
```

#### **Frontend 開発コマンド (Vite + React + TypeScript)**
```bash
# Vite開発サーバー起動 (Hot Reload付き)
npm run dev          # vite

# 本番ビルド (TypeScript型チェック + Vite Build)
npm run build        # tsc && vite build

# ビルド結果のプレビュー
npm run preview      # vite preview

# TypeScript型チェック (ビルドなし)
npm run type-check   # tsc --noEmit

# ESLint (React + TypeScript対応)
npm run lint         # eslint src/**/*.{ts,tsx}
npm run lint:fix     # eslint src/**/*.{ts,tsx} --fix
```

#### **WebContainer 統合開発コマンド**
```bash
# 同時に両方のサーバーを起動 (フロントエンド:3000, バックエンド:8000)
npm run dev:all      # concurrently "npm run dev:backend" "npm run dev:frontend"

# フロントエンドのみ (Vite)
npm run dev:frontend # cd frontend && npm run dev

# バックエンドのみ (Node.js + TypeScript)
npm run dev:backend  # cd backend && npm run dev
```

### **12.3 型安全性の確保**

#### **Strict TypeScript 設定**
- `strict: true` - 全ての厳密チェックを有効
- `noImplicitAny: true` - 暗黙的なany型を禁止
- `strictNullChecks: true` - null/undefined チェック
- `noImplicitReturns: true` - 明示的なreturn必須

#### **型チェックのWebContainer統合**
```bash
# WebContainer での型チェック
npm run type-check && npm run lint

# 自動フォーマット
npm run format  # prettier --write src/**/*.ts

# 開発時の継続的チェック
npm run watch   # tsc --watch
```

### **12.4 コード生成とスキーマ同期**

#### **API型の自動生成**
```bash
# OpenAPI スキーマから TypeScript 型を生成
npm run generate-types  # openapi-generator generate
```

#### **SQLiteスキーマ同期**
```bash
# SQLite スキーマから TypeScript 型を生成
npm run generate-db-types  # tsx scripts/generate-sqlite-types.ts

# データベースマイグレーション
npm run migrate           # tsx scripts/migrate-database.ts
```

## **13. 要件トレーサビリティマトリックス**

### **13.1 機能要件の対応**

| 要件ID | 要件内容 | 設計での対応箇所 | 実装方法 |
|--------|----------|-------------------|-----------|
| RF-1 | プレゼンテーションの作成・編集・削除 | API設計 (Section 4.1) | REST API `/api/presentations` |
| RF-2 | 多肢選択式投票・ワードクラウドスライド | データベース設計 (Section 3.1) | Presentations.slides.type フィールド |
| RF-3 | 6桁コード生成 | データベース設計・API設計 | accessCode フィールド、コード生成ロジック |
| RF-4 | リアルタイム可視化 | リアルタイム通信設計 (Section 5) | WebSocket + Chart.js/react-wordcloud |
| RF-5 | プレゼンテーション制御 | WebSocket設計・API設計 | slide_change イベント、制御API |
| RF-6 | 履歴・データ閲覧 | データベース設計・API設計 | 分析API `/api/presentations/:id/analytics` |
| RF-7 | 6桁コード参加（ゲスト） | API設計・認証設計 | `/api/join` API、セッション管理 |
| RF-8 | 匿名回答・投稿 | データベース設計・セキュリティ設計 | sessionId による匿名化 |
| RF-9 | リアルタイム同期 | リアルタイム通信設計 | WebSocket Room による同期 |
| RF-10 | 重複回答防止 | セキュリティ設計 (Section 6.2) | sessionId + slideId ユニーク制約 |

### **13.2 非機能要件の対応**

| 要件ID | 要件内容 | 設計での対応箇所 | 実装方法 |
|--------|----------|-------------------|-----------|
| RNF-1 | 1秒以内の応答時間 | パフォーマンス設計 (Section 7) | Redis キャッシュ、WebSocket |
| RNF-2 | 初期設計で最大100-200人同時接続 | パフォーマンス設計 (Section 7) | WebContainer最適化、In-Memory キャッシュ |
| RNF-3 | スケーラビリティ | アーキテクチャ設計 (Section 2) | WebContainer環境対応、TypeScript設計 |
| RNF-4 | 匿名性保護 | セキュリティ設計 (Section 6) | sessionId、個人情報非保持 |
| RNF-5 | 不適切投稿対策 | セキュリティ設計 (Section 6.3) | 入力バリデーション、フィルタリング |
| RNF-6 | 直感的UI | 技術スタック (Section 2.2) | React.js + Material-UI |
| RNF-7 | レスポンシブデザイン | 技術スタック (Section 2.2) | Material-UI、モバイル対応 |
| RNF-8 | ブラウザアクセス | 技術スタック (Section 2.2) | Web技術のみ、インストール不要 |

---

**文書バージョン**: 1.0  
**作成日**: 2024年1月15日  
**最終更新**: 2024年1月15日