# RaceLab iPhone PWA (試用版)

競馬・競輪のPDF等を端末内で読み込む、オフライン対応を目指す参考展開シミュレーターです。計算結果の出現率は未校正モデル内部の頻度であり、実際の的中確率ではありません。

iPhone: GitHub Pages のURLをSafariで開き、「共有」→「ホーム画面に追加」。初回はオンラインで約5MBの取得が必要です。オフライン動作にはService Workerのインストール成功が必要です。

実際のレースPDF、入力履歴、認証情報、非公開ソースは収録していません。復元するアプリのSHA-256: 95937429ea7fe32251a1264171b252e7c3d9cdd8fe9578ddf01c8ea6b1ef78ca。配信上38分割していますが起動時にSHA-256を照合して復元します。

GitHub Pages: Settings → Pages → Build and deployment → Deploy from a branch → main / (root)。

## 競輪出走情報の受信

出走情報の `11.23-core-auto-only-master-pattern-no-odds-line-reference-footer-boundary-fix` と `11.24-dom-verified-no-odds-strict` を受け付けます。V11.24は選手コメントと参考ラインを表示し、並び予想DOM未確認、競り・ジカ、構成やコメントとの不一致、検証情報の欠落時は情報を残して分析・試算をHOLDします。出力の申告は提供元や正式ラインの認証ではありません。オッズの取得・オッズ版の取込には対応していません。

## 開発時の検証

Node.jsで `node --test tests/*.test.cjs` を実行し、38分割・SHA-256および架空データの受信・停止条件を検証します。`node tests/browser.cjs` はChromiumとPlaywrightがある環境で、貼付・表示・停止・旧キャッシュからの更新・オフライン再起動を検証します。ブラウザ試験は旧版の基準コミット `e74309ecfa73bc598f09b23bac6756abf8303781` を参照するため、Git履歴が必要です。Playwrightは通常のNode解決パスかテスト環境の `/opt/codex/runtimes/cua/lib/node_modules/playwright` から読み込みます。iPhone実機Safariの操作は別途確認してください。

分割ファイルを変更した場合、`cat app/v1/part-*.txt | sha256sum` の結果を `index.html` の `EXPECTED` とこのREADMEのSHA-256に反映してください。Service Workerの更新時は、既存キャッシュと新しい本体が混ざらないことを検証します。
