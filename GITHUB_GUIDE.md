# GitHubを使って家族とカレンダーを共有する方法

このガイドでは、作成したカレンダーを GitHub にアップロードし、スマホから簡単にアクセスできるようにする手順を説明します。

## 構成のイメージ
1. **GitHub Pages**: あなた専用の短いURL（例: `https://[ユーザー名].github.io/FamilyCalendar`）を提供します。
2. **Google Apps Script**: 家族全員で共有されるカレンダーの本体（バックエンド）として動作します。

---

## ステップ 1: ファイルの準備

1. `github_pages_index.html` を開き、以下の部分を探します。
   ```html
   <a href="YOUR_GAS_WEB_APP_URL_HERE" id="calendarLink" class="btn">
   ```
2. `YOUR_GAS_WEB_APP_URL_HERE` を、Google Apps Script で発行した **「ウェブアプリのURL」** に書き換えて保存します。
3. このファイルを `index.html` にリネームします（現在の `index.html` は `local_demo.html` などにリネームして保存しておくことをお勧めします）。

---

## ステップ 2: GitHub リポジトリの作成

1. [GitHub](https://github.com/) にログインし、**New repository** をクリックします。
2. リポジトリ名を `FamilyCalendar` にします（任意）。
3. **Public** を選択（GitHub Pagesを使うために必要です）。
4. 「Create repository」をクリックします。

---

## ステップ 3: コードをアップロードする

PCのターミナル（PowerShellなど）で `FamilyCalendar` フォルダに移動し、以下のコマンドを実行します。

```bash
# gitを初期化
git init

# 全ファイルをステージ
git add .

# コミット
git commit -m "Initial commit - Family Calendar Portal"

# GitHubと接続（URLは自分のものに差し替えてください）
git branch -M main
git remote add origin https://github.com/[あなたのユーザー名]/FamilyCalendar.git

# アップロード
git push -u origin main
```

---

## ステップ 4: GitHub Pages を有効にする

1. GitHubのリポジトリページで **Settings** タブをクリック。
2. 左メニューの **Pages** を選択。
3. **Build and deployment** > **Branch** で `main` を選択し、**Save** をクリック。
4. 数分待つと、上部に `Your site is live at ...` というURLが表示されます！

---

## ステップ 5: スマホでアクセス！

1. 発行されたURLを家族にLINEなどで送ります。
2. スマホで開き、**「カレンダーを開く」** をタップ。
3. iPhoneなら「ホーム画面に追加」をすると、アプリのように使えます。

### メリット
- 長いGASのURLを覚えなくて済みます。
- GitHub Pagesを「入り口」にすることで、デザインが崩れにくく、スムーズな導入が可能です。
