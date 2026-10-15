# 公開・更新・受け渡し

このリポジトリの公開先は `ryogot85/crystal-viewer`、GitHub Pages の公開元は `main` ブランチの `/docs` です。編集元は `dist/` です。`publish.ps1` がテストを実行し、`dist/` の全ファイルを `release/crystal-visualizer.zip` に詰め直し、その ZIP をローカルの `docs/` に展開して一致を確認します。`-Push` を付けた場合だけコミットと送信を行います。

## 初回公開

1. GitHub の [新規リポジトリ画面](https://github.com/new) を開きます。**Owner を個人アカウント `ryogot85`、Repository name を `crystal-viewer`、Visibility を Public** にして作成します。README、`.gitignore`、ライセンスの自動作成は選びません。ローカルに同名の準備済みファイルがあるためです。
2. GitHub の [Fine-grained personal access token の設定](https://github.com/settings/personal-access-tokens) で、Resource owner を `ryogot85`、Repository access を **Only select repositories → `crystal-viewer`** にし、Repository permissions の **Contents を Read and write** にしたトークンを用意します。既存の `photo-shiritori` 用トークンは広げる必要がありません。classic token、GitHub CLI のブラウザ認証、Git Credential Manager のブラウザ認証は使いません。トークンをこのリポジトリやチャットに貼らないでください。
3. プロジェクトフォルダーの `PUBLISH.cmd` をダブルクリックします。現在の PowerShell の場所に関係なく実行でき、トークンを画面で入力できます。GitHub に `main` と ZIP と `docs/` が送信されます。
4. リポジトリの **Settings → Pages → Build and deployment** で、**Source: Deploy from a branch、Branch: main、Folder: /docs** を選んで Save します。公開後の URL は `https://ryogot85.github.io/crystal-viewer/` です。初回は GitHub の Pages 画面で公開状態を確認してください。

## 安全な一時認証

`PUBLISH.cmd` は `publish.ps1 -Push` を起動します。送信先 URL と `main` ブランチを確認してから、トークンを非表示の入力欄で受け取り、送信後にプロセス内の環境変数を削除します。トークンはコマンド履歴やプロジェクトのファイルには残しません。`git` の GitHub 用認証ヘルパーは、既存の `gh auth git-credential` 設定を利用します。認証で失敗しても、広域トークンを作らず、上記の対象リポジトリと権限を確認してください。

## 以降の更新

1. `dist/` の元ファイルを変更します。`docs/` は直接編集しません。
2. ローカルで確認するときは `START.cmd` を開き、`http://127.0.0.1:4173/` と `/atoms.html` を確認します。
3. `powershell -NoProfile -ExecutionPolicy Bypass -File .\publish.ps1` だけで、テスト → ZIP を再作成 → `docs/` へローカル展開 → ファイル内容の照合までできます。
4. 公開も行うときは `PUBLISH.cmd` をダブルクリックします。更新した ZIP と `docs/` が同じコミットに保存され、Pages が新しい `docs/` を公開します。

ZIP を展開すると `index.html`、`atoms.html`、CSS、JavaScript、`README.txt` が入っています。配布先ではファイルをすべて展開し、`index.html` を開くだけで動きます。Node.js やインストールは不要です。コードを渡すならリポジトリの URL、動くものを見せるなら Pages の URL、オフラインで渡すなら `release/crystal-visualizer.zip` を共有します。ライセンスは付けません。第三者による改変・再配布を許可するときは、相手と利用範囲を個別に決めてください。
