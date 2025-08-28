# NanoConnect-InternShip

リアルタイムインタラクティブプレゼンテーションWebアプリケーション - MentiMeterのような機能を持つWebアプリの開発

## 概要

NanoConnectは、プレゼンター（発表者）とオーディエンス（聴衆）がリアルタイムで相互に交流できるインタラクティブプレゼンテーションプラットフォームです。

### 主要機能

- **インタラクティブプレゼンテーション**: 多肢選択式投票、ワードクラウド、開放式回答
- **リアルタイム機能**: WebSocketを使用したリアルタイム投票とデータ可視化
- **アクセスコード参加システム**: 簡単な参加方法
- **データ可視化**: Chart.js、Recharts、React-Wordcloudによるリアルタイム結果表示

## 技術スタック

### フロントエンド
- **React 18** + **TypeScript**
- **Vite** (ビルドツール)
- **Material-UI (MUI)** v5 (UIライブラリ)
- **Redux Toolkit** (状態管理)
- **React Router** v6 (ルーティング)
- **Socket.IO Client** (リアルタイム通信)
- **Chart.js** + **Recharts** + **React-Wordcloud** (データ可視化)

### 開発ツール
- **ESLint** + **Prettier** (コード品質)
- **Jest** + **React Testing Library** (テスト)
- **Husky** (Git hooks)
- **GitHub Actions** (CI/CD)

## セットアップ手順

### 前提条件

- Node.js 18.0.0 以上
- npm 9.0.0 以上

### インストール

1. リポジトリをクローン
```bash
git clone https://github.com/fjmrytfjsn/NanoConnect-InternShip.git
cd NanoConnect-InternShip
```

2. 全ての依存関係をインストール
```bash
npm run install:all
```

### 開発環境の起動

#### フロントエンドのみを起動
```bash
npm run dev:frontend
```

#### 将来的にバックエンドと同時起動（現在はフロントエンドのみ実装済み）
```bash
npm run dev
```

### ビルド

#### フロントエンドをビルド
```bash
npm run build:frontend
```

#### 将来的な全体ビルド
```bash
npm run build
```

### テスト

#### フロントエンドテストの実行
```bash
cd frontend
npm test
```

#### 型チェック
```bash
npm run type-check:frontend
```

#### リンティング
```bash
npm run lint:frontend
```

## プロジェクト構造

```
NanoConnect-InternShip/
├── docs/                       # プロジェクト文書
├── frontend/                   # React + TypeScript + Vite
│   ├── public/                 # 静的ファイル
│   ├── src/
│   │   ├── components/         # Reactコンポーネント
│   │   │   ├── common/         # 共通コンポーネント
│   │   │   ├── auth/           # 認証関連
│   │   │   ├── presentation/   # プレゼン関連
│   │   │   └── participants/   # 参加者関連
│   │   ├── pages/              # ページコンポーネント
│   │   ├── store/              # Redux store
│   │   ├── types/              # TypeScript型定義
│   │   ├── styles/             # スタイル・テーマ
│   │   ├── constants/          # 定数
│   │   └── utils/              # ユーティリティ
│   └── package.json
├── backend/                    # Node.js + Express + TypeScript (予定)
├── shared/                     # 共通型定義 (予定)
└── package.json                # ルートプロジェクト設定
```

## 実装フェーズ

### Phase 1: 基盤構築 ✅ **完了**

#### フロントエンド基盤
- ✅ Vite + React + TypeScriptセットアップ
- ✅ Material-UI テーマ設定
- ✅ Redux Toolkit設定
- ✅ ルーティング設定
- ✅ 基本的なレイアウトコンポーネント実装

### Phase 2: 認証機能（予定）
- JWT認証システム実装
- ユーザー登録・ログイン機能
- 認証状態管理

### Phase 3: プレゼンテーション基本機能（予定）
- プレゼンテーションCRUD機能
- スライド管理機能
- アクセスコード生成システム

### Phase 4: リアルタイム機能（予定）
- WebSocket実装
- リアルタイム投票機能
- データ可視化

## 開発ガイドライン

詳細な開発ガイドラインは以下のドキュメントを参照してください：
- [開発ガイドライン](docs/guideline.md)
- [詳細設計書](docs/detailed-design.md)
- [方式設計書](docs/system-design.md)

## コントリビュート

1. フィーチャーブランチを作成 (`git checkout -b feature/機能名`)
2. 変更をコミット (`git commit -m 'feat: 新機能を追加'`)
3. ブランチをプッシュ (`git push origin feature/機能名`)
4. プルリクエストを作成

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
