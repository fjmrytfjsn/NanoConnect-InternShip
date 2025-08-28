# 詳細設計書：リアルタイムインタラクティブWebアプリ

## **1. 概要**

本文書は、製品仕様書、要求仕様書、および方式設計書に基づいて、リアルタイムインタラクティブプレゼンテーションWebアプリケーションの詳細設計を定義します。実装者が直接コーディングできるレベルまで、モジュール構成、クラス設計、メソッド仕様、画面設計、データフロー、エラーハンドリング、テスト設計を具体化します。

### **1.1 設計原則**

* **DDD（ドメイン駆動設計）**: バックエンドはドメイン層、アプリケーション層、インフラ層、プレゼンテーション層の4層構造
* **TypeScript厳密型定義**: 全ての変数・関数・APIで厳密な型定義を実装
* **レスポンシブデザイン**: PC・タブレット・スマートフォン対応
* **WebContainer最適化**: StackBlitz/CodeSandbox環境での実行を前提
* **TDD（テスト駆動開発）**: Red-Green-Refactorサイクルの実装

### **1.2 参照文書**

* 製品仕様書：`docs/product-specification.md`
* 要求仕様書：`docs/required-specification.md`
* 方式設計書：`docs/system-design.md`
* 開発ガイドライン：`docs/guideline.md`

## **2. プロジェクト構造詳細**

### **2.1 ディレクトリ構造**

```
NanoConnect-InternShip/
├── docs/                           # プロジェクト文書
├── shared/                         # 共通型定義
│   └── types/
│       ├── api.ts                  # API型定義
│       ├── socket.ts               # WebSocket型定義
│       ├── database.ts             # データベース型定義
│       └── common.ts               # 共通型定義
├── backend/                        # Node.js + Express + TypeScript (DDD)
│   ├── src/
│   │   ├── domain/                 # ドメイン層
│   │   │   ├── entities/           # エンティティ
│   │   │   │   ├── User.ts
│   │   │   │   ├── Presentation.ts
│   │   │   │   ├── Slide.ts
│   │   │   │   ├── Response.ts
│   │   │   │   └── Session.ts
│   │   │   ├── valueObjects/       # 値オブジェクト
│   │   │   │   ├── AccessCode.ts
│   │   │   │   ├── SessionId.ts
│   │   │   │   ├── SlideType.ts
│   │   │   │   └── ResponseData.ts
│   │   │   ├── services/           # ドメインサービス
│   │   │   │   ├── PresentationService.ts
│   │   │   │   ├── ResponseAggregationService.ts
│   │   │   │   └── DuplicatePreventionService.ts
│   │   │   └── repositories/       # リポジトリインターフェース
│   │   │       ├── IUserRepository.ts
│   │   │       ├── IPresentationRepository.ts
│   │   │       ├── ISlideRepository.ts
│   │   │       ├── IResponseRepository.ts
│   │   │       └── ISessionRepository.ts
│   │   ├── application/            # アプリケーション層
│   │   │   ├── useCases/           # ユースケース
│   │   │   │   ├── auth/
│   │   │   │   │   ├── RegisterUserUseCase.ts
│   │   │   │   │   ├── LoginUserUseCase.ts
│   │   │   │   │   └── LogoutUserUseCase.ts
│   │   │   │   ├── presentation/
│   │   │   │   │   ├── CreatePresentationUseCase.ts
│   │   │   │   │   ├── UpdatePresentationUseCase.ts
│   │   │   │   │   ├── DeletePresentationUseCase.ts
│   │   │   │   │   ├── StartPresentationUseCase.ts
│   │   │   │   │   └── StopPresentationUseCase.ts
│   │   │   │   ├── slide/
│   │   │   │   │   ├── CreateSlideUseCase.ts
│   │   │   │   │   ├── UpdateSlideUseCase.ts
│   │   │   │   │   └── DeleteSlideUseCase.ts
│   │   │   │   ├── participant/
│   │   │   │   │   ├── JoinPresentationUseCase.ts
│   │   │   │   │   └── SubmitResponseUseCase.ts
│   │   │   │   └── analytics/
│   │   │   │       ├── GetAnalyticsUseCase.ts
│   │   │   │       └── ExportDataUseCase.ts
│   │   │   ├── dtos/               # データ転送オブジェクト
│   │   │   │   ├── auth/
│   │   │   │   ├── presentation/
│   │   │   │   ├── slide/
│   │   │   │   ├── participant/
│   │   │   │   └── analytics/
│   │   │   └── services/           # アプリケーションサービス
│   │   │       ├── AuthService.ts
│   │   │       ├── PresentationManagementService.ts
│   │   │       ├── RealtimeNotificationService.ts
│   │   │       └── AnalyticsService.ts
│   │   ├── infrastructure/         # インフラ層
│   │   │   ├── database/           # データベース実装
│   │   │   │   ├── SQLiteConnection.ts
│   │   │   │   ├── repositories/   # リポジトリ実装
│   │   │   │   │   ├── SQLiteUserRepository.ts
│   │   │   │   │   ├── SQLitePresentationRepository.ts
│   │   │   │   │   ├── SQLiteSlideRepository.ts
│   │   │   │   │   ├── SQLiteResponseRepository.ts
│   │   │   │   │   └── SQLiteSessionRepository.ts
│   │   │   │   └── migrations/     # マイグレーション
│   │   │   │       ├── 001_create_users.sql
│   │   │   │       ├── 002_create_presentations.sql
│   │   │   │       ├── 003_create_slides.sql
│   │   │   │       ├── 004_create_responses.sql
│   │   │   │       └── 005_create_sessions.sql
│   │   │   ├── cache/              # キャッシュ実装
│   │   │   │   ├── InMemoryCache.ts
│   │   │   │   ├── SessionCache.ts
│   │   │   │   └── RealtimeDataCache.ts
│   │   │   ├── external/           # 外部サービス
│   │   │   │   ├── EmailService.ts
│   │   │   │   └── LoggingService.ts
│   │   │   └── config/             # 設定
│   │   │       ├── DatabaseConfig.ts
│   │   │       ├── CacheConfig.ts
│   │   │       └── WebContainerConfig.ts
│   │   ├── presentation/           # プレゼンテーション層
│   │   │   ├── controllers/        # REST APIコントローラ
│   │   │   │   ├── AuthController.ts
│   │   │   │   ├── PresentationController.ts
│   │   │   │   ├── SlideController.ts
│   │   │   │   ├── ParticipantController.ts
│   │   │   │   └── AnalyticsController.ts
│   │   │   ├── websocket/          # WebSocketハンドラ
│   │   │   │   ├── PresenterSocketHandler.ts
│   │   │   │   ├── ParticipantSocketHandler.ts
│   │   │   │   └── RealtimeEventHandler.ts
│   │   │   ├── middleware/         # ミドルウェア
│   │   │   │   ├── AuthMiddleware.ts
│   │   │   │   ├── ValidationMiddleware.ts
│   │   │   │   ├── ErrorHandlingMiddleware.ts
│   │   │   │   └── RateLimitingMiddleware.ts
│   │   │   └── routes/             # ルート定義
│   │   │       ├── authRoutes.ts
│   │   │       ├── presentationRoutes.ts
│   │   │       ├── slideRoutes.ts
│   │   │       ├── participantRoutes.ts
│   │   │       └── analyticsRoutes.ts
│   │   ├── shared/                 # 共通ユーティリティ
│   │   │   ├── utils/
│   │   │   │   ├── DateUtils.ts
│   │   │   │   ├── ValidationUtils.ts
│   │   │   │   ├── CryptoUtils.ts
│   │   │   │   └── StringUtils.ts
│   │   │   ├── constants/
│   │   │   │   ├── ErrorMessages.ts
│   │   │   │   ├── ConfigConstants.ts
│   │   │   │   └── DatabaseConstants.ts
│   │   │   └── types/
│   │   │       ├── CommonTypes.ts
│   │   │       ├── ErrorTypes.ts
│   │   │       └── ConfigTypes.ts
│   │   ├── tests/                  # テスト
│   │   │   ├── unit/               # 単体テスト
│   │   │   ├── integration/        # 結合テスト
│   │   │   └── e2e/                # E2Eテスト
│   │   └── index.ts                # アプリケーションエントリーポイント
│   ├── data/
│   │   └── nanoconnect.db          # SQLite データベースファイル
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js              # テスト設定
├── frontend/                       # React + TypeScript + Vite
│   ├── public/
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/             # React コンポーネント
│   │   │   ├── common/             # 共通コンポーネント
│   │   │   │   ├── Header/
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   ├── Header.test.tsx
│   │   │   │   │   └── Header.module.css
│   │   │   │   ├── Footer/
│   │   │   │   ├── LoadingSpinner/
│   │   │   │   ├── ErrorBoundary/
│   │   │   │   ├── Modal/
│   │   │   │   └── ResponsiveContainer/
│   │   │   ├── auth/               # 認証関連コンポーネント
│   │   │   │   ├── LoginForm/
│   │   │   │   ├── RegisterForm/
│   │   │   │   └── ProtectedRoute/
│   │   │   ├── presenter/          # プレゼンター向けコンポーネント
│   │   │   │   ├── Dashboard/
│   │   │   │   ├── PresentationList/
│   │   │   │   ├── PresentationEditor/
│   │   │   │   ├── SlideEditor/
│   │   │   │   ├── PresentationView/
│   │   │   │   ├── RealtimeResults/
│   │   │   │   └── Analytics/
│   │   │   └── participant/        # 参加者向けコンポーネント
│   │   │       ├── JoinPresentation/
│   │   │       ├── PresentationViewer/
│   │   │       ├── SlideView/
│   │   │       ├── MultipleChoiceView/
│   │   │       ├── WordCloudView/
│   │   │       └── RealtimeUpdates/
│   │   ├── pages/                  # ページコンポーネント
│   │   │   ├── HomePage/
│   │   │   ├── LoginPage/
│   │   │   ├── RegisterPage/
│   │   │   ├── DashboardPage/
│   │   │   ├── PresentationPage/
│   │   │   └── ParticipantPage/
│   │   ├── hooks/                  # カスタムフック
│   │   │   ├── useAuth.ts
│   │   │   ├── useSocket.ts
│   │   │   ├── usePresentation.ts
│   │   │   ├── useRealtimeData.ts
│   │   │   └── useResponsive.ts
│   │   ├── store/                  # Redux Toolkit
│   │   │   ├── index.ts
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.ts
│   │   │   │   ├── presentationSlice.ts
│   │   │   │   ├── slideSlice.ts
│   │   │   │   ├── participantSlice.ts
│   │   │   │   └── uiSlice.ts
│   │   │   └── middleware/
│   │   │       └── socketMiddleware.ts
│   │   ├── services/               # API & Socket.IO
│   │   │   ├── api/
│   │   │   │   ├── authApi.ts
│   │   │   │   ├── presentationApi.ts
│   │   │   │   ├── slideApi.ts
│   │   │   │   ├── participantApi.ts
│   │   │   │   └── analyticsApi.ts
│   │   │   ├── socket/
│   │   │   │   ├── socketClient.ts
│   │   │   │   ├── presenterSocket.ts
│   │   │   │   └── participantSocket.ts
│   │   │   └── cache/
│   │   │       └── clientCache.ts
│   │   ├── utils/                  # ユーティリティ
│   │   │   ├── dateUtils.ts
│   │   │   ├── validationUtils.ts
│   │   │   ├── formatUtils.ts
│   │   │   ├── responsiveUtils.ts
│   │   │   └── chartUtils.ts
│   │   ├── styles/                 # スタイル
│   │   │   ├── globals.css
│   │   │   ├── variables.css
│   │   │   ├── responsive.css
│   │   │   └── components/
│   │   ├── types/                  # フロントエンド固有の型定義
│   │   │   ├── componentTypes.ts
│   │   │   ├── hookTypes.ts
│   │   │   └── storeTypes.ts
│   │   ├── constants/              # 定数
│   │   │   ├── apiConstants.ts
│   │   │   ├── uiConstants.ts
│   │   │   └── routeConstants.ts
│   │   ├── tests/                  # テスト
│   │   │   ├── __mocks__/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   ├── App.tsx                 # メインアプリケーション
│   │   ├── main.tsx                # Viteエントリーポイント
│   │   └── setupTests.ts           # テストセットアップ
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── jest.config.js
│   └── eslint.config.js
├── package.json                    # ルートプロジェクト設定
├── stackblitz.json                 # StackBlitz設定
├── codesandbox.json               # CodeSandbox設定
└── README.md
```

### **2.2 ファイル命名規則**

* **TypeScriptファイル**: PascalCase (`UserRepository.ts`, `PresentationService.ts`)
* **Reactコンポーネント**: PascalCase (`Header.tsx`, `LoginForm.tsx`)
* **フック**: camelCase with use prefix (`useAuth.ts`, `useSocket.ts`)
* **APIファイル**: camelCase with Api suffix (`authApi.ts`, `presentationApi.ts`)
* **テストファイル**: 対象ファイル名 + `.test.ts` (`User.test.ts`, `Header.test.tsx`)
* **型定義ファイル**: camelCase with Types suffix (`componentTypes.ts`, `apiTypes.ts`)

## **3. バックエンド詳細設計（DDD）**

### **3.1 ドメイン層詳細設計**

#### **3.1.1 エンティティ設計**

**User エンティティ**
```typescript
// src/domain/entities/User.ts
import { BaseEntity } from '@/shared/types/CommonTypes';

export class User implements BaseEntity {
  private constructor(
    public readonly id: number,
    public readonly username: string,
    public readonly email: string,
    private passwordHash: string,
    public readonly createdAt: string,
    public readonly updatedAt: string
  ) {
    this.validateUser();
  }

  static create(
    username: string,
    email: string,
    passwordHash: string
  ): User {
    return new User(
      0, // IDは保存時にDBが生成
      username,
      email,
      passwordHash,
      new Date().toISOString(),
      new Date().toISOString()
    );
  }

  static fromDatabase(data: {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    created_at: string;
    updated_at: string;
  }): User {
    return new User(
      data.id,
      data.username,
      data.email,
      data.password_hash,
      data.created_at,
      data.updated_at
    );
  }

  verifyPassword(password: string): boolean {
    // パスワード検証ロジック（bcryptを使用）
    const bcrypt = require('bcrypt');
    return bcrypt.compareSync(password, this.passwordHash);
  }

  changePassword(newPasswordHash: string): User {
    return new User(
      this.id,
      this.username,
      this.email,
      newPasswordHash,
      this.createdAt,
      new Date().toISOString()
    );
  }

  private validateUser(): void {
    if (!this.username || this.username.length < 3) {
      throw new Error('ユーザー名は3文字以上である必要があります');
    }
    if (!this.email || !this.isValidEmail(this.email)) {
      throw new Error('有効なメールアドレスを入力してください');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
```

**Presentation エンティティ**
```typescript
// src/domain/entities/Presentation.ts
import { BaseEntity } from '@/shared/types/CommonTypes';
import { AccessCode } from '@/domain/valueObjects/AccessCode';
import { Slide } from './Slide';

export class Presentation implements BaseEntity {
  private constructor(
    public readonly id: number,
    public readonly title: string,
    public readonly description: string,
    public readonly presenterId: number,
    public readonly accessCode: AccessCode,
    public readonly isActive: boolean,
    public readonly currentSlideIndex: number,
    private slides: Slide[],
    public readonly createdAt: string,
    public readonly updatedAt: string
  ) {
    this.validatePresentation();
  }

  static create(
    title: string,
    description: string,
    presenterId: number
  ): Presentation {
    return new Presentation(
      0,
      title,
      description,
      presenterId,
      AccessCode.generate(),
      false,
      0,
      [],
      new Date().toISOString(),
      new Date().toISOString()
    );
  }

  static fromDatabase(data: {
    id: number;
    title: string;
    description: string;
    presenter_id: number;
    access_code: string;
    is_active: boolean;
    current_slide_index: number;
    created_at: string;
    updated_at: string;
  }, slides: Slide[] = []): Presentation {
    return new Presentation(
      data.id,
      data.title,
      data.description,
      data.presenter_id,
      AccessCode.fromString(data.access_code),
      data.is_active,
      data.current_slide_index,
      slides,
      data.created_at,
      data.updated_at
    );
  }

  addSlide(slide: Slide): Presentation {
    const newSlides = [...this.slides, slide];
    return new Presentation(
      this.id,
      this.title,
      this.description,
      this.presenterId,
      this.accessCode,
      this.isActive,
      this.currentSlideIndex,
      newSlides,
      this.createdAt,
      new Date().toISOString()
    );
  }

  removeSlide(slideId: number): Presentation {
    const newSlides = this.slides.filter(slide => slide.id !== slideId);
    return new Presentation(
      this.id,
      this.title,
      this.description,
      this.presenterId,
      this.accessCode,
      this.isActive,
      this.currentSlideIndex,
      newSlides,
      this.createdAt,
      new Date().toISOString()
    );
  }

  start(): Presentation {
    if (this.slides.length === 0) {
      throw new Error('スライドが存在しないため、プレゼンテーションを開始できません');
    }
    return new Presentation(
      this.id,
      this.title,
      this.description,
      this.presenterId,
      this.accessCode,
      true,
      0,
      this.slides,
      this.createdAt,
      new Date().toISOString()
    );
  }

  stop(): Presentation {
    return new Presentation(
      this.id,
      this.title,
      this.description,
      this.presenterId,
      this.accessCode,
      false,
      this.currentSlideIndex,
      this.slides,
      this.createdAt,
      new Date().toISOString()
    );
  }

  changeSlide(slideIndex: number): Presentation {
    if (slideIndex < 0 || slideIndex >= this.slides.length) {
      throw new Error('無効なスライドインデックスです');
    }
    return new Presentation(
      this.id,
      this.title,
      this.description,
      this.presenterId,
      this.accessCode,
      this.isActive,
      slideIndex,
      this.slides,
      this.createdAt,
      new Date().toISOString()
    );
  }

  getCurrentSlide(): Slide | undefined {
    return this.slides[this.currentSlideIndex];
  }

  getSlides(): readonly Slide[] {
    return this.slides;
  }

  canBeJoinedBy(accessCode: string): boolean {
    return this.isActive && this.accessCode.equals(accessCode);
  }

  private validatePresentation(): void {
    if (!this.title || this.title.trim().length === 0) {
      throw new Error('プレゼンテーションのタイトルは必須です');
    }
    if (this.title.length > 200) {
      throw new Error('プレゼンテーションのタイトルは200文字以下である必要があります');
    }
    if (this.description.length > 1000) {
      throw new Error('プレゼンテーションの説明は1000文字以下である必要があります');
    }
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      presenterId: this.presenterId,
      accessCode: this.accessCode.value,
      isActive: this.isActive,
      currentSlideIndex: this.currentSlideIndex,
      slides: this.slides.map(slide => slide.toJSON()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
```

**Slide エンティティ**
```typescript
// src/domain/entities/Slide.ts
import { BaseEntity } from '@/shared/types/CommonTypes';
import { SlideType } from '@/domain/valueObjects/SlideType';

export class Slide implements BaseEntity {
  private constructor(
    public readonly id: number,
    public readonly presentationId: number,
    public readonly type: SlideType,
    public readonly title: string,
    public readonly question: string,
    public readonly options: string[] | undefined,
    public readonly slideOrder: number,
    public readonly createdAt: string,
    public readonly updatedAt: string
  ) {
    this.validateSlide();
  }

  static create(
    presentationId: number,
    type: SlideType,
    title: string,
    question: string,
    slideOrder: number,
    options?: string[]
  ): Slide {
    return new Slide(
      0,
      presentationId,
      type,
      title,
      question,
      options,
      slideOrder,
      new Date().toISOString(),
      new Date().toISOString()
    );
  }

  static fromDatabase(data: {
    id: number;
    presentation_id: number;
    type: string;
    title: string;
    question: string;
    options: string | null;
    slide_order: number;
    created_at: string;
    updated_at: string;
  }): Slide {
    const options = data.options ? JSON.parse(data.options) : undefined;
    return new Slide(
      data.id,
      data.presentation_id,
      SlideType.fromString(data.type),
      data.title,
      data.question,
      options,
      data.slide_order,
      data.created_at,
      data.updated_at
    );
  }

  update(
    title: string,
    question: string,
    options?: string[]
  ): Slide {
    return new Slide(
      this.id,
      this.presentationId,
      this.type,
      title,
      question,
      options,
      this.slideOrder,
      this.createdAt,
      new Date().toISOString()
    );
  }

  changeOrder(newOrder: number): Slide {
    return new Slide(
      this.id,
      this.presentationId,
      this.type,
      this.title,
      this.question,
      this.options,
      newOrder,
      this.createdAt,
      new Date().toISOString()
    );
  }

  isMultipleChoice(): boolean {
    return this.type.isMultipleChoice();
  }

  isWordCloud(): boolean {
    return this.type.isWordCloud();
  }

  private validateSlide(): void {
    if (!this.title || this.title.trim().length === 0) {
      throw new Error('スライドタイトルは必須です');
    }
    if (!this.question || this.question.trim().length === 0) {
      throw new Error('質問は必須です');
    }
    if (this.type.isMultipleChoice()) {
      if (!this.options || this.options.length < 2) {
        throw new Error('多肢選択式スライドには2つ以上の選択肢が必要です');
      }
      if (this.options.length > 10) {
        throw new Error('選択肢は10個以下である必要があります');
      }
    }
    if (this.slideOrder < 0) {
      throw new Error('スライド順序は0以上である必要があります');
    }
  }

  toJSON() {
    return {
      id: this.id,
      presentationId: this.presentationId,
      type: this.type.value,
      title: this.title,
      question: this.question,
      options: this.options,
      slideOrder: this.slideOrder,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
```

#### **3.1.2 値オブジェクト設計**

**AccessCode 値オブジェクト**
```typescript
// src/domain/valueObjects/AccessCode.ts
export class AccessCode {
  private constructor(private readonly _value: string) {
    this.validate();
  }

  static generate(): AccessCode {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return new AccessCode(code);
  }

  static fromString(value: string): AccessCode {
    return new AccessCode(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: string | AccessCode): boolean {
    if (typeof other === 'string') {
      return this._value === other;
    }
    return this._value === other._value;
  }

  private validate(): void {
    if (!/^\d{6}$/.test(this._value)) {
      throw new Error('アクセスコードは6桁の数字である必要があります');
    }
  }
}
```

**SlideType 値オブジェクト**
```typescript
// src/domain/valueObjects/SlideType.ts
export class SlideType {
  public static readonly MULTIPLE_CHOICE = new SlideType('multiple_choice');
  public static readonly WORD_CLOUD = new SlideType('word_cloud');

  private constructor(private readonly _value: string) {}

  static fromString(value: string): SlideType {
    switch (value) {
      case 'multiple_choice':
        return SlideType.MULTIPLE_CHOICE;
      case 'word_cloud':
        return SlideType.WORD_CLOUD;
      default:
        throw new Error(`無効なスライドタイプ: ${value}`);
    }
  }

  get value(): string {
    return this._value;
  }

  isMultipleChoice(): boolean {
    return this._value === 'multiple_choice';
  }

  isWordCloud(): boolean {
    return this._value === 'word_cloud';
  }

  equals(other: SlideType): boolean {
    return this._value === other._value;
  }
}
```

**SessionId 値オブジェクト**
```typescript
// src/domain/valueObjects/SessionId.ts
import { v4 as uuidv4 } from 'uuid';

export class SessionId {
  private constructor(private readonly _value: string) {
    this.validate();
  }

  static generate(): SessionId {
    return new SessionId(uuidv4());
  }

  static fromString(value: string): SessionId {
    return new SessionId(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: SessionId | string): boolean {
    if (typeof other === 'string') {
      return this._value === other;
    }
    return this._value === other._value;
  }

  private validate(): void {
    // UUID v4の形式チェック
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(this._value)) {
      throw new Error('無効なセッションID形式です');
    }
  }
}
```

#### **3.1.3 ドメインサービス設計**

**PresentationService**
```typescript
// src/domain/services/PresentationService.ts
import { Presentation } from '@/domain/entities/Presentation';
import { AccessCode } from '@/domain/valueObjects/AccessCode';

export class PresentationService {
  /**
   * アクセスコードの重複チェック
   */
  static async isAccessCodeUnique(
    accessCode: AccessCode,
    presentationRepository: IPresentationRepository
  ): Promise<boolean> {
    const existingPresentation = await presentationRepository
      .findByAccessCode(accessCode.value);
    return existingPresentation === null;
  }

  /**
   * アクティブなプレゼンテーションの数をチェック
   */
  static async canStartPresentation(
    presenterId: number,
    presentationRepository: IPresentationRepository
  ): Promise<boolean> {
    const activePresentations = await presentationRepository
      .findActiveByPresenterId(presenterId);
    // 1人のプレゼンターが同時に実行できるプレゼンテーションは1つまで
    return activePresentations.length === 0;
  }

  /**
   * プレゼンテーション参加の可否判定
   */
  static canJoinPresentation(
    presentation: Presentation,
    accessCode: string
  ): boolean {
    return presentation.canBeJoinedBy(accessCode);
  }
}
```

**ResponseAggregationService**
```typescript
// src/domain/services/ResponseAggregationService.ts
import { Response } from '@/domain/entities/Response';
import { Slide } from '@/domain/entities/Slide';

interface MultipleChoiceAggregation {
  type: 'multiple_choice';
  totalResponses: number;
  options: Array<{
    option: string;
    count: number;
    percentage: number;
  }>;
}

interface WordCloudAggregation {
  type: 'word_cloud';
  totalResponses: number;
  words: Array<{
    text: string;
    count: number;
    weight: number;
  }>;
}

export type ResponseAggregation = MultipleChoiceAggregation | WordCloudAggregation;

export class ResponseAggregationService {
  /**
   * スライドの回答を集計
   */
  static aggregateResponses(
    slide: Slide,
    responses: Response[]
  ): ResponseAggregation {
    if (slide.isMultipleChoice()) {
      return this.aggregateMultipleChoiceResponses(slide, responses);
    } else if (slide.isWordCloud()) {
      return this.aggregateWordCloudResponses(responses);
    }
    throw new Error(`サポートされていないスライドタイプ: ${slide.type.value}`);
  }

  private static aggregateMultipleChoiceResponses(
    slide: Slide,
    responses: Response[]
  ): MultipleChoiceAggregation {
    const totalResponses = responses.length;
    const optionCounts = new Map<string, number>();

    // 選択肢の初期化
    slide.options?.forEach(option => {
      optionCounts.set(option, 0);
    });

    // 回答の集計
    responses.forEach(response => {
      const selectedOption = response.getSelectedOption();
      if (selectedOption && optionCounts.has(selectedOption)) {
        optionCounts.set(selectedOption, optionCounts.get(selectedOption)! + 1);
      }
    });

    const options = Array.from(optionCounts.entries()).map(([option, count]) => ({
      option,
      count,
      percentage: totalResponses > 0 ? (count / totalResponses) * 100 : 0
    }));

    return {
      type: 'multiple_choice',
      totalResponses,
      options
    };
  }

  private static aggregateWordCloudResponses(
    responses: Response[]
  ): WordCloudAggregation {
    const totalResponses = responses.length;
    const wordCounts = new Map<string, number>();

    // 単語の抽出と集計
    responses.forEach(response => {
      const text = response.getText();
      if (text) {
        const words = this.extractWords(text);
        words.forEach(word => {
          const normalizedWord = word.toLowerCase().trim();
          if (normalizedWord.length > 0) {
            wordCounts.set(normalizedWord, (wordCounts.get(normalizedWord) || 0) + 1);
          }
        });
      }
    });

    // 重みの計算（最大値を100として正規化）
    const maxCount = Math.max(...Array.from(wordCounts.values()), 1);
    const words = Array.from(wordCounts.entries())
      .map(([text, count]) => ({
        text,
        count,
        weight: (count / maxCount) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100); // 最大100語まで

    return {
      type: 'word_cloud',
      totalResponses,
      words
    };
  }

  private static extractWords(text: string): string[] {
    // 日本語・英語対応の単語抽出
    return text
      .replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }
}
```

### **3.2 アプリケーション層詳細設計**

#### **3.2.1 ユースケース設計**

**CreatePresentationUseCase**
```typescript
// src/application/useCases/presentation/CreatePresentationUseCase.ts
import { Presentation } from '@/domain/entities/Presentation';
import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { IUserRepository } from '@/domain/repositories/IUserRepository';

export interface CreatePresentationRequest {
  title: string;
  description: string;
  presenterId: number;
}

export interface CreatePresentationResponse {
  presentation: Presentation;
}

export class CreatePresentationUseCase {
  constructor(
    private readonly presentationRepository: IPresentationRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(request: CreatePresentationRequest): Promise<CreatePresentationResponse> {
    // プレゼンターの存在確認
    const presenter = await this.userRepository.findById(request.presenterId);
    if (!presenter) {
      throw new Error('プレゼンターが見つかりません');
    }

    // プレゼンテーション作成
    const presentation = Presentation.create(
      request.title,
      request.description,
      request.presenterId
    );

    // 保存
    const savedPresentation = await this.presentationRepository.save(presentation);

    return {
      presentation: savedPresentation
    };
  }
}
```

**JoinPresentationUseCase**
```typescript
// src/application/useCases/participant/JoinPresentationUseCase.ts
import { IPresentationRepository } from '@/domain/repositories/IPresentationRepository';
import { ISessionRepository } from '@/domain/repositories/ISessionRepository';
import { Session } from '@/domain/entities/Session';
import { SessionId } from '@/domain/valueObjects/SessionId';
import { PresentationService } from '@/domain/services/PresentationService';

export interface JoinPresentationRequest {
  accessCode: string;
  ipAddress: string;
}

export interface JoinPresentationResponse {
  sessionId: string;
  presentation: {
    id: number;
    title: string;
    currentSlide: any;
  };
}

export class JoinPresentationUseCase {
  constructor(
    private readonly presentationRepository: IPresentationRepository,
    private readonly sessionRepository: ISessionRepository
  ) {}

  async execute(request: JoinPresentationRequest): Promise<JoinPresentationResponse> {
    // プレゼンテーション検索
    const presentation = await this.presentationRepository
      .findByAccessCode(request.accessCode);
    
    if (!presentation) {
      throw new Error('プレゼンテーションが見つかりません');
    }

    // 参加可能チェック
    if (!PresentationService.canJoinPresentation(presentation, request.accessCode)) {
      throw new Error('このプレゼンテーションには参加できません');
    }

    // セッション作成
    const sessionId = SessionId.generate();
    const session = Session.create(
      sessionId,
      presentation.id,
      request.ipAddress
    );

    await this.sessionRepository.save(session);

    return {
      sessionId: sessionId.value,
      presentation: {
        id: presentation.id,
        title: presentation.title,
        currentSlide: presentation.getCurrentSlide()?.toJSON()
      }
    };
  }
}
```
