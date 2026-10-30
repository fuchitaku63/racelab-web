# RaceLab iPhone PWA (試用版)

競馬・競輪のPDF等を端末内で読み込む、オフライン対応を目指す参考展開シミュレーターです。計算結果の出現率は未校正モデル内部の頻度であり、実際の的中確率ではありません。

iPhone: GitHub Pages のURLをSafariで開き、「共有」→「ホーム画面に追加」。初回はオンラインで約5MBの取得が必要です。オフライン動作にはService Workerのインストール成功が必要です。

実際のレースPDF、入力履歴、認証情報、非公開ソースは収録していません。元アプリのSHA-256: ca5550c6e6fddeb8fccbfdc32a1dea755d0cca17a65d678820468330e0b10f9f。配信上38分割していますが起動時にSHA-256を照合して復元します。

GitHub Pages: Settings → Pages → Build and deployment → Deploy from a branch → main / (root)。
