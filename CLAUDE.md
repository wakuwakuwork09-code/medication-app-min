# 服薬チェックアプリ

介護施設・グループホーム・障がい者支援施設の介護スタッフが、利用者の処方薬を登録し、毎食（朝/昼/夕/就寝前）の配薬・服薬確認を記録するための Web アプリ。

## 技術スタック

- **フレームワーク**: Next.js（App Router, TypeScript）
- **UI**: React + Tailwind CSS + shadcn/ui（Radix ベースのコンポーネント）
- **DB / 認証 / バックエンド**: Supabase（PostgreSQL + Supabase Auth + Row Level Security）
- **データアクセス**: `@supabase/supabase-js`(クライアント) / `@supabase/ssr`(サーバーコンポーネント・Route Handler)

## 開発コマンド

```bash
npm install          # 依存インストール
npm run dev          # 開発サーバー起動 (http://localhost:3000)
npm run build        # 本番ビルド
npm run lint         # Lint
```

Supabase 接続情報は `.env.local` に置く（コミット禁止）:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

SQL マイグレーションは `supabase/migrations/` に置く。

## 画面構成

左サイドバー固定レイアウトで、以下 5 画面に遷移できる。サイドバーは全画面共通コンポーネント（`app/(dashboard)/layout.tsx`）。

| # | 画面 | ルート | 概要 |
|---|------|--------|------|
| 1 | 利用者別服薬スケジュール一覧 | `/schedule` | 利用者ごとに、その日の服用タイミング別の服薬予定を一覧表示 |
| 2 | 処方登録フォーム | `/prescriptions/new` | 薬名 + 用量 + 服用タイミングを登録 |
| 3 | 服薬チェック | `/check` | 朝/昼/夕/就寝前ごとに、利用者の服薬を確認・記録 |
| 4 | 飲み忘れ・未確認アラート | `/alerts` | 予定時刻を過ぎても未記録／飲み忘れの服薬を一覧表示 |
| 5 | 服薬率・利用者別レポート | `/reports` | 期間・利用者別に服薬率を集計表示 |

サイドバーのデフォルト遷移先（トップ）は `/schedule`。

## 機能仕様

### 1. 利用者別服薬スケジュール一覧 (`/schedule`)
- 日付を選択（デフォルト=当日）。
- 利用者ごとに、当日有効な処方から朝/昼/夕/就寝前の服薬予定を展開して表示。
- 各予定の状態（未確認 / 服薬済 / 拒否 / 飲み忘れ）をバッジで表示。

### 2. 処方登録フォーム (`/prescriptions/new`)
- 入力項目: 利用者、薬名、用量（例: `5mg 1錠`）、服用タイミング（朝/昼/夕/就寝前の複数選択）、開始日、終了日（任意・空なら継続中）、備考。
- 1 つの処方で複数タイミングを指定可能（タイミングごとに `prescription_schedules` 行を作る）。

### 3. 服薬チェック (`/check`)
- 日付 + タイミング（朝/昼/夕/就寝前）を選択。
- 該当する服薬予定を利用者ごとに並べ、ワンタップで「服薬済 / 拒否」を記録。
- 記録時にスタッフ・記録時刻を保存。再タップで状態変更可能。

### 4. 飲み忘れ・未確認アラート (`/alerts`)
- 当日の予定のうち、予定タイミングの目安時刻を過ぎても `medication_records` が無いものを「未確認」、`status=missed` のものを「飲み忘れ」として一覧表示。
- 利用者・タイミングでフィルタ可能。`/check` への導線を置く。

### 5. 服薬率・利用者別レポート (`/reports`)
- 期間（開始日〜終了日）と利用者を選択。
- 服薬率 = 服薬済件数 ÷ 予定件数。利用者別・タイミング別に集計。
- 飲み忘れ・拒否の件数も併記。

## データモデル（Supabase / PostgreSQL）

服用タイミングは enum `med_timing`: `morning` / `noon` / `evening` / `bedtime`。
記録状態は enum `record_status`: `taken`（服薬済）/ `refused`（拒否）/ `missed`（飲み忘れ）。

```
users (利用者)
  id            uuid pk
  name          text not null
  room          text            -- 居室番号など
  birth_date    date
  note          text
  created_at    timestamptz default now()

staff (介護スタッフ)
  id            uuid pk         -- auth.users.id と対応
  name          text not null
  role          text            -- 'staff' | 'admin'
  created_at    timestamptz default now()

prescriptions (処方)
  id            uuid pk
  user_id       uuid fk -> users.id
  drug_name     text not null
  dosage        text not null   -- 用量（例: '5mg 1錠'）
  start_date    date not null
  end_date      date            -- null = 継続中
  note          text
  created_by    uuid fk -> staff.id
  created_at    timestamptz default now()

prescription_schedules (処方の服用タイミング)
  id              uuid pk
  prescription_id uuid fk -> prescriptions.id on delete cascade
  timing          med_timing not null
  unique (prescription_id, timing)

medication_records (服薬記録)
  id              uuid pk
  user_id         uuid fk -> users.id
  prescription_id uuid fk -> prescriptions.id
  schedule_date   date not null          -- 服薬予定日
  timing          med_timing not null
  status          record_status not null
  recorded_by     uuid fk -> staff.id
  recorded_at     timestamptz default now()
  note            text
  unique (prescription_id, schedule_date, timing)
```

**「服薬予定」は動的に算出する**: 予定はテーブルに持たず、`schedule_date` に対して
`prescriptions`(start_date <= 日付 <= end_date or end_date is null) × `prescription_schedules` を展開して求める。
その予定に対応する `medication_records` の有無・status で状態を判定する。

## 認証・認可

- Supabase Auth でスタッフがメール＋パスワードでログイン。未ログインは `/login` へリダイレクト。
- 全テーブルで RLS を有効化し、認証済みスタッフのみ読み書き可能とする。
- `medication_records.recorded_by` / `prescriptions.created_by` は操作したスタッフの `auth.uid()` を入れる。

## ディレクトリ構成（想定）

```
app/
  (auth)/login/page.tsx
  (dashboard)/
    layout.tsx          # サイドバー共通レイアウト
    schedule/page.tsx
    prescriptions/new/page.tsx
    check/page.tsx
    alerts/page.tsx
    reports/page.tsx
components/
  sidebar.tsx
lib/
  supabase/
    client.ts           # ブラウザ用クライアント
    server.ts           # サーバー用クライアント
supabase/
  migrations/
```

## 規約

- TypeScript strict。`any` を避ける。
- Supabase へのアクセスは `lib/supabase/` のクライアント経由に統一する。
- 日付は `YYYY-MM-DD` 文字列で扱い、タイムゾーンは施設ローカル（JST 前提）。
- UI 文言は日本語。介護スタッフが片手・短時間で操作できるよう、服薬チェックはタップ数を最小化する。
