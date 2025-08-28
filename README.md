# NanoConnect-InternShip

**リアルタイムインタラクティブWebアプリ**

[![CI/CD Pipeline](https://github.com/fjmrytfjsn/NanoConnect-InternShip/actions/workflows/ci.yml/badge.svg)](https://github.com/fjmrytfjsn/NanoConnect-InternShip/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

ナノコネクトのインターンシップにおける開発プロジェクトです。
MentMeterと同等の機能を持つリアルタイムインタラクティブWebアプリケーションを開発します。

## 📋 概要

プレゼンテーションに参加者がリアルタイムで投票やコメントを行える、双方向コミュニケーションツールです。

### 主な機能
- 🎯 **多肢選択式投票**: リアルタイムでの投票機能
- ☁️ **ワードクラウド**: 自由入力によるワードクラウド生成
- 📱 **レスポンシブデザイン**: PC・タブレット・スマートフォン対応
- 🔒 **匿名参加**: アカウント不要での参加
- 📊 **リアルタイム可視化**: 回答結果の即座な表示

## 🏗️ アーキテクチャ

### 技術スタック

#### バックエンド
- **Language**: TypeScript 5.1
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **WebSocket**: Socket.IO
- **Database**: SQLite3 + better-sqlite3
- **Architecture**: DDD (Domain Driven Design)

#### フロントエンド（Phase 2で実装予定）
- **Language**: TypeScript 5.1
- **Framework**: React 18+ + Vite
- **State Management**: Redux Toolkit
- **UI Library**: Material-UI (MUI)

### プロジェクト構成

```
NanoConnect-InternShip/
├── docs/                     # プロジェクト文書
├── shared/                   # 共通型定義
│   └── types/
├── backend/                  # Node.js + Express (DDD)
│   ├── src/
│   │   ├── domain/          # ドメイン層
│   │   ├── application/     # アプリケーション層
│   │   ├── infrastructure/  # インフラ層
│   │   └── presentation/    # プレゼンテーション層
│   ├── scripts/            # スクリプト
│   └── tests/             # テスト
└── frontend/              # React + TypeScript (Phase 2)
```

## 🚀 セットアップ

### 必要環境
- Node.js 18.0.0 以上
- npm 9.0.0 以上

### インストール

1. **リポジトリのクローン**
   ```bash
   git clone https://github.com/fjmrytfjsn/NanoConnect-InternShip.git
   cd NanoConnect-InternShip
   ```

2. **依存関係のインストール**
   ```bash
   npm run install:all
   ```

3. **Huskyのセットアップ**
   ```bash
   npm run prepare
   ```

4. **データベースの初期化**
   ```bash
   npm run init-db
   ```

### 開発環境での実行

1. **バックエンド開発サーバーの起動**
   ```bash
   npm run dev:backend
   ```

2. **両方を同時起動（フロントエンド実装後）**
   ```bash
   npm run dev
   ```

### ビルド

```bash
# バックエンドのビルド
npm run build:backend

# すべてのビルド
npm run build
```

## 🔧 開発コマンド

### バックエンド

| コマンド | 説明 |
|---------|------|
| `npm run dev:backend` | 開発サーバー起動（ホットリロード） |
| `npm run build:backend` | TypeScriptビルド |
| `npm run start:backend` | 本番サーバー起動 |
| `npm run type-check:backend` | TypeScript型チェック |
| `npm run lint:backend` | ESLintチェック |
| `npm run format:backend` | Prettierフォーマット |
| `npm run test:backend` | Jestテスト実行 |

### データベース

| コマンド | 説明 |
|---------|------|
| `npm run init-db` | データベース初期化 |
| `npm run migrate` | マイグレーション実行 |
| `npm run seed` | シードデータ投入 |

## 📚 API ドキュメント

### エンドポイント

- **ヘルスチェック**: `GET /health`
- **API情報**: `GET /api`

### WebSocket イベント

- **接続**: `connection`
- **切断**: `disconnect`
- **エコーテスト**: `echo`

詳細なAPI仕様は `docs/api-specification.md`（Phase 2で作成予定）を参照してください。

## 🧪 テスト

```bash
# バックエンドテストの実行
npm run test:backend

# カバレッジ付きテスト
npm run test:coverage:backend

# ウォッチモード
cd backend && npm run test:watch
```

## 📖 ドキュメント

- [要求仕様書](docs/required-specification.md)
- [システム設計書](docs/system-design.md)  
- [詳細設計書](docs/detailed-design.md)
- [開発ガイドライン](docs/guideline.md)

## 🚢 デプロイ

### WebContainer環境（StackBlitz/CodeSandbox）

WebContainer環境では特別なデプロイ手順は不要です。

### 本番環境

```bash
# 本番ビルド
npm run build

# 本番起動
npm run start:prod
```

## 🤝 開発フロー

1. **ブランチ作成**: `feature/機能名` または `bugfix/修正内容`
2. **開発**: TDD（テスト駆動開発）に従って実装
3. **品質チェック**: コミット前にHuskyが自動実行
4. **プルリクエスト**: GitHub Actionsによる自動CI/CD
5. **レビュー**: コードレビュー後にマージ

## 📊 実装フェーズ

### Phase 1: 基盤構築 ✅
- [x] プロジェクト構造セットアップ
- [x] TypeScript設定とビルド環境
- [x] SQLiteデータベーススキーマ実装
- [x] DDDアーキテクチャ基盤クラス実装
- [x] 基本的なエンティティ（User, Presentation）実装
- [x] ESLint, Prettier, Husky設定
- [x] CI/CD初期設定（GitHub Actions）

### Phase 2: 認証機能（予定）
- [ ] JWT認証システム実装
- [ ] ユーザー登録・ログイン API
- [ ] フロントエンド基盤構築

### Phase 3: プレゼンテーション基本機能（予定）
- [ ] プレゼンテーションCRUD API
- [ ] スライド管理機能

### Phase 4: リアルタイム機能（予定）
- [ ] Socket.IO実装
- [ ] リアルタイム投票機能

## 🐛 トラブルシューティング

### データベース関連
```bash
# データベースの再初期化
rm -rf backend/data/
npm run init-db
```

### 依存関係の問題
```bash
# node_modulesのクリーンアップ
rm -rf node_modules backend/node_modules
npm run install:all
```

## 📞 サポート

問題や質問がある場合は、GitHubのIssuesを使用してください。

## 📄 ライセンス

MIT License
