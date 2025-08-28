# 方式設計書：リアルタイムインタラクティブWebアプリ

## **1. 概要**

本文書は、製品仕様書および要求仕様書に基づいて、リアルタイムインタラクティブプレゼンテーションWebアプリケーションの方式設計を定義します。本システムは、プレゼンターと参加者間のリアルタイムな双方向コミュニケーションを実現し、匿名性を保持した投票・回答システムを提供します。

### **1.1 設計方針**

* **スケーラビリティ**: 最大1000人の同時接続に対応
* **リアルタイム性**: 1秒以内の応答時間を実現
* **可用性**: 高可用性アーキテクチャの採用
* **セキュリティ**: 匿名性の保護と不正アクセス防止
* **保守性**: モジュラー設計による拡張性の確保

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
    ┌─────┴──────────────────────┴─────┐
    │         Load Balancer            │
    └─────┬──────────────────────┬─────┘
          │                      │
    ┌─────▼─────┐          ┌─────▼─────┐
    │Web Server │          │Web Server │
    │(Node.js)  │          │(Node.js)  │
    └─────┬─────┘          └─────┬─────┘
          │                      │
          └──────┬─────────────────┘
                 │
          ┌─────▼─────┐
          │   Redis   │
          │  (Cache)  │
          └─────┬─────┘
                │
        ┌───────▼───────┐
        │   MongoDB     │
        │  (Database)   │
        └───────────────┘
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
- **メインDB**: MongoDB 6.x
- **キャッシュ**: Redis 7.x
- **セッション管理**: Redis

#### **インフラ**
- **Load Balancer**: Nginx
- **Container**: Docker
- **Orchestration**: Docker Compose
- **Monitoring**: PM2, New Relic

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
// MongoDB ObjectId type
import { ObjectId } from 'mongodb';

// Common types
type SlideType = 'multiple_choice' | 'word_cloud';
type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

// Utility types
interface BaseEntity {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface TimestampedEntity {
  createdAt: Date;
  updatedAt: Date;
}
```

### **3.2 MongoDB スキーマ設計**

#### **Users Collection**
```typescript
interface User extends BaseEntity {
  username: string; // unique
  email: string; // unique
  passwordHash: string;
}
```

#### **Presentations Collection**
```typescript
interface Slide {
  _id: ObjectId;
  type: SlideType;
  title: string;
  question: string;
  options?: string[]; // for multiple choice only
  order: number;
}

interface Presentation extends BaseEntity {
  title: string;
  description: string;
  presenterId: ObjectId; // reference to Users
  accessCode: string; // 6-digit unique code
  slides: Slide[];
  isActive: boolean;
  currentSlideIndex: number;
}
```

#### **Responses Collection**
```typescript
interface ResponseData {
  // For multiple choice
  selectedOption?: string;
  // For word cloud
  text?: string;
}

interface Response extends BaseEntity {
  presentationId: ObjectId;
  slideId: ObjectId;
  sessionId: string; // to prevent duplicate responses
  ipAddress: string; // for duplicate prevention
  responseData: ResponseData;
  timestamp: Date;
}
```

#### **Sessions Collection**
```typescript
interface Session extends BaseEntity {
  sessionId: string; // unique
  presentationId: ObjectId;
  participantCount: number;
  joinedAt: Date;
  lastActivity: Date;
}
```

### **3.3 Redis スキーマ設計**

#### **セッション管理**
```typescript
interface RedisSession {
  presentationId: string;
  joinedAt: number; // timestamp
  lastActivity: number; // timestamp
}
// Key: session:{sessionId}
```

#### **アクティブプレゼンテーション**
```typescript
interface RedisActivePresentation {
  presentationId: string;
  presenterId: string;
  currentSlide: number;
  participantCount: number;
}
// Key: active_presentation:{accessCode}
```

#### **リアルタイムデータ**
```typescript
interface RedisRealtimeData {
  responses: any; // JSON data
  updatedAt: number; // timestamp
}
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

### **7.1 負荷分散**

#### **水平スケーリング**
- Node.jsアプリケーションの複数インスタンス
- Nginx による負荷分散
- Socket.IO の Sticky Session 対応

#### **Redis Cluster**
```javascript
// Redis設定
const redis = new Redis.Cluster([
  { host: 'redis-node-1', port: 6379 },
  { host: 'redis-node-2', port: 6379 },
  { host: 'redis-node-3', port: 6379 }
]);
```

### **7.2 キャッシュ戦略**

#### **多層キャッシュ**
1. **ブラウザキャッシュ**: 静的リソース (24時間)
2. **CDN**: 地理的分散キャッシュ
3. **Redisキャッシュ**: セッション・リアルタイムデータ
4. **アプリケーションキャッシュ**: 頻繁アクセスデータ

### **7.3 データベース最適化**

#### **MongoDB インデックス**
```javascript
// Presentations Collection
db.presentations.createIndex({ "accessCode": 1 }, { unique: true })
db.presentations.createIndex({ "presenterId": 1 })
db.presentations.createIndex({ "isActive": 1 })

// Responses Collection  
db.responses.createIndex({ "presentationId": 1, "slideId": 1 })
db.responses.createIndex({ "sessionId": 1, "slideId": 1 }, { unique: true })
db.responses.createIndex({ "timestamp": 1 })
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

### **8.2 監視・アラート**

#### **メトリクス**
- **システムメトリクス**: CPU, Memory, Disk
- **アプリケーションメトリクス**: レスポンス時間, スループット
- **ビジネスメトリクス**: 同時接続数, プレゼンテーション作成数

#### **アラート条件**
- CPU使用率 > 80%
- メモリ使用率 > 85%  
- 応答時間 > 2秒
- エラー率 > 5%
- 同時接続数 > 900

## **9. デプロイメント設計**

### **9.1 Docker化**

#### **Dockerfile (Node.js App with TypeScript)**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

#### **docker-compose.yml**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - mongodb
      - redis
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/nanoconnect
      - REDIS_URI=redis://redis:6379

  mongodb:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
```

### **9.2 環境分離**

#### **開発環境**
- Local Docker Compose
- Hot Reload 対応
- 詳細ログ出力

#### **ステージング環境**  
- 本番同等構成
- 自動テスト実行
- パフォーマンステスト

#### **本番環境**
- 冗長化構成
- 自動スケーリング
- 監視・アラート完備

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
- 最大同時接続: 1000人/プレゼンテーション
- 応答時間: 1秒以内
- データ保持: 1年間

### **12.2 拡張性**
- 新しいスライドタイプの追加容易性
- 多言語対応への拡張性
- 外部サービス連携の拡張性
- スケールアウト対応

### **12.3 保守性**
- モジュラー設計による変更影響の局所化
- 包括的なテストカバレッジ
- ドキュメントの自動生成
- CI/CD パイプラインの構築

## **12. TypeScript 開発ワークフロー**

### **12.1 開発環境セットアップ**

#### **必要なパッケージ (Backend)**
```json
{
  "devDependencies": {
    "@types/node": "^18.0.0",
    "@types/express": "^4.17.17",
    "@types/jsonwebtoken": "^9.0.2",
    "@types/bcrypt": "^5.0.0",
    "@types/cors": "^2.8.13",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "nodemon": "^2.0.22",
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

#### **Backend 開発コマンド**
```bash
# TypeScript コンパイル
npm run build        # tsc

# 開発モード (ホットリロード)
npm run dev          # nodemon --exec ts-node src/index.ts

# 型チェック
npm run type-check   # tsc --noEmit

# Lint
npm run lint         # eslint src/**/*.ts

# テスト
npm run test         # jest --preset ts-jest
```

#### **Frontend 開発コマンド**
```bash
# 開発モード
npm run dev          # vite

# ビルド
npm run build        # tsc && vite build

# 型チェック
npm run type-check   # tsc --noEmit

# Lint
npm run lint         # eslint src/**/*.{ts,tsx}
```

### **12.3 型安全性の確保**

#### **Strict TypeScript 設定**
- `strict: true` - 全ての厳密チェックを有効
- `noImplicitAny: true` - 暗黙的なany型を禁止
- `strictNullChecks: true` - null/undefined チェック
- `noImplicitReturns: true` - 明示的なreturn必須

#### **型チェックのCI/CD統合**
```yaml
# GitHub Actions example
- name: TypeScript Type Check
  run: |
    npm run type-check
    npm run lint
```

### **12.4 コード生成とスキーマ同期**

#### **API型の自動生成**
```bash
# OpenAPI スキーマから TypeScript 型を生成
npm run generate-types  # openapi-generator generate
```

#### **データベーススキーマ同期**
```bash
# MongoDB スキーマから TypeScript 型を生成
npm run generate-db-types  # custom script
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
| RNF-2 | 最大1000人同時接続 | スケーラビリティ設計 (Section 7.1) | 負荷分散、水平スケーリング |
| RNF-3 | スケーラビリティ | アーキテクチャ設計 (Section 2) | Nginx Load Balancer、Redis Cluster |
| RNF-4 | 匿名性保護 | セキュリティ設計 (Section 6) | sessionId、個人情報非保持 |
| RNF-5 | 不適切投稿対策 | セキュリティ設計 (Section 6.3) | 入力バリデーション、フィルタリング |
| RNF-6 | 直感的UI | 技術スタック (Section 2.2) | React.js + Material-UI |
| RNF-7 | レスポンシブデザイン | 技術スタック (Section 2.2) | Material-UI、モバイル対応 |
| RNF-8 | ブラウザアクセス | 技術スタック (Section 2.2) | Web技術のみ、インストール不要 |

---

**文書バージョン**: 1.0  
**作成日**: 2024年1月15日  
**最終更新**: 2024年1月15日