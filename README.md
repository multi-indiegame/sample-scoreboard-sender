# sample-scoreboard-sender

[@multi-indiegame/akashic-scoreboard](https://github.com/multi-indiegame/akashic-scoreboard) の動作確認用ゲームです。ボタンを押すと、押した参加者の `ev.player.id` を相手にして記録を送ります。

| 送り先                             | 集約用のキー（型は固定）                                 | デバッグ用のキー（型を混ぜる）                      |
| ---------------------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| プレイヤーごと (`setPlayerRecord`) | `score` (number) / `cleared` (boolean) / `rank` (string) | `debug_mixed` に number / boolean / string のどれか |
| プレイ自体 (`setPlayRecord`)       | 同上                                                     | 同上                                                |

- 値は押すたびに決まります（number は 0〜999、boolean はランダム、string は `S` `A` `B` `C` のどれか）
- 送信要求は押した参加者のパッシブインスタンスから `g.MessageEvent` で出し、アクティブインスタンスが `onMessage` の中で登録します。`setPlayerRecord` に渡すのはそのイベントの `ev.player.id` です
- 複数の参加者から送るには、`npm run start:multi` で開いたゲームの URL を新しいタブに貼って、複数開いてください。タブごとに別の player.id になります（画面上部に出ます）。タブの「複製」では player.id が引き継がれるので使わないでください
- 送った内容は画面右の送信ログに出ます。string と boolean を見分けられるよう、値は JSON 表記です（`"S"` / `true`）
- 記録された内容は akashic serve の「スコアボード」タブで確認できます

### 名前の掲載への同意

本番の実行基盤では、名前の掲載に同意した参加者の記録だけが統計に載ります。これを確かめられるよう、画面右上に「名前の掲載に同意する」ボタンがあります。

- 押すと `resolvePlayerInfo({ raises: true })` を呼び、名前の利用許諾ダイアログが出ます。結果は `g.PlayerInfoEvent` で全インスタンスに届きます
- 結果は送信ログに `[同意] player.id: 同意` / `拒否` として出ます。ボタンにも自分の結果が出ます
- プレイヤーごとの記録の送信ログには、送った時点の状態が `掲載: 未確認` / `同意` / `拒否` として添えられます（未確認はボタンをまだ押していない状態）
- ゲームは同意の有無にかかわらず `setPlayerRecord` を呼びます。載せるかどうかを決めるのは実行基盤です
- akashic-scoreboard-serve は同意による絞り込みを代行しないので、akashic serve の「スコアボード」タブには全員分が出ます。どれが本番で載るはずかは送信ログの `掲載:` で見分けてください

## 利用方法

`@multi-indiegame/sample-scoreboard-sender` を利用するには Node.js が必要です。

初回のみ、以下のコマンドを実行して、ビルドに必要なパッケージをインストールしてください。
この作業は `@multi-indiegame/sample-scoreboard-sender` を新しく生成するごとに必要です。

```sh
npm install
```

### ビルド方法

`@multi-indiegame/sample-scoreboard-sender` は TypeScript で書かれているため、以下のコマンドで JavaScript ファイルに変換する必要があります。

```sh
npm run build
```

`src` ディレクトリ以下の TypeScript ファイルがコンパイルされ、 `script` ディレクトリ以下に JavaScript ファイルが生成されます。

`npm run build` は自動的に `akashic scan asset script` を実行するので、`game.json` の更新が行われます。

### 動作確認方法

以下のどちらかを実行後、ブラウザでゲームを実行できます。

- `npm start`
  - `http://localhost:3000` からアクセス
  - 一人用ゲーム (ニコ生ゲームであればランキングゲーム) として起動
- `npm run start:multi`
  - `http://localhost:3300` からアクセス
  - マルチプレイとして起動

### テンプレートの使い方

- ゲーム部分を作成する場合は `src/main.ts` を編集してください。
  - 基本的に `src/_bootstrap.ts` を編集する必要はありません。
- このテンプレートでは `src/main.ts` の `main` 関数の引数 `param` に以下の値が新たに付与されています。
  - `broadcasterId`
    - 放送者のプレイヤー ID
- マルチプレイに対応したニコニコ新市場コンテンツの作り方の詳細については [こちら](https://akashic-games.github.io/shin-ichiba/index.html) を参照してください。

### アセットの更新方法

各種アセットを追加したい場合は `assets` ディレクトリに格納します。

これらのアセットを追加・変更したあとに `npm run update` をすると、アセットの変更内容をもとに `game.json` を書き換えることができます。

### npm モジュールの追加・削除

`@multi-indiegame/sample-scoreboard-sender` で npm モジュールを利用する場合、このディレクトリで `akashic install <package_name>` することで npm モジュールを追加することができます。

また `akashic uninstall <package_name>` すると npm モジュールを削除することができます。

## エクスポート方法

`@multi-indiegame/sample-scoreboard-sender` をエクスポートするときは以下のコマンドを利用します。

### zipファイルのエクスポート

`npm run export-zip` のコマンドを利用することで `game.zip` という名前のzipファイルを出力できます。

## テスト方法

1. [ESLint](https://eslint.org/ "ESLint") を使ったLint
2. [Jest](https://jestjs.io/ "Jest") を使ったテスト

がそれぞれ実行されます。

```sh
npm test
```

テストコードのサンプルとして `spec/testSpec.ts` を用意していますので参考にしてテストコードを記述して下さい。
