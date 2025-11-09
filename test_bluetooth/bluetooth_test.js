// HTMLの要素を取得
const scanButton = document.getElementById('scanButton');
const resultElement = document.getElementById('result');
let bluetoothDevice;

/**
 * サービス情報をHTMLに表示するためのヘルパー関数
 * @param {string} serviceName - サービス名またはUUID
 */
function displayService(serviceName) {
    resultElement.innerHTML += `<li>${serviceName}</li>`;
}

// スキャンボタンがクリックされたときの処理
scanButton.addEventListener('click', async () => {
    
    // スキャン開始を通知し、以前の結果をクリア
    resultElement.innerHTML = '<p>スキャン中...</p>';

    if (!navigator.bluetooth) {
        resultElement.innerHTML = '<p>エラー: お使いのブラウザはWeb Bluetooth APIをサポートしていません。ChromeまたはEdgeをご利用ください。</p>';
        return;
    }

    try {
        // --- 1. デバイスの選択（修正箇所） ---
        const device = await navigator.bluetooth.requestDevice({
             acceptAllDevices: true,
             // 接続後にサービスアクセスを可能にするため、最低限必要なサービスや一般的なサービスを宣言します
             optionalServices: [
                 'generic_access',       // 0x1800: 最も基本的なデバイス情報
                 'device_information',   // 0x180A: デバイスのハードウェア情報
                 'battery_service'       // 0x180F: バッテリー情報
                 // その他のサービスも必要に応じてここに追加します
             ]
        });

        bluetoothDevice = device;

        // --- 2. 選択されたデバイス情報を表示 ---
        resultElement.innerHTML = `
            <h2>[デバイス情報]</h2>
            <p><strong>デバイス名:</strong> ${device.name || '名前なし'}</p>
            <p><strong>デバイスID:</strong> ${device.id}</p>
            <p><strong>接続状態:</strong> 接続を試行中...</p>
        `;

        // --- 3. GATT接続を試行 ---
        const gattServer = await device.gatt.connect();

        resultElement.innerHTML += '<p style="color: green;"><strong>接続成功! サービスの取得中...</strong></p>';

        // --- 4. すべてのサービスを取得 ---
        // optionalServicesで宣言したことにより、この処理がセキュリティチェックを通過します
        const services = await gattServer.getPrimaryServices();

        // サービス一覧を表示するためのリストの準備
        resultElement.innerHTML += '<h3>公開されているサービス一覧:</h3><ul></ul>';
        const ulElement = resultElement.querySelector('ul');

        if (services.length === 0) {
            ulElement.innerHTML = '<li>このデバイスは、Web Bluetooth API経由でアクセス可能なサービスを公開していません。</li>';
        }

        for (const service of services) {
            const uuid = service.uuid;
            let serviceName = uuid;

            // 一般的なサービスUUIDの場合、わかりやすい名前に変換 (前回と同じ)
            if (uuid === 'battery_service') {
                serviceName = 'バッテリーサービス (0x180F)';
            } else if (uuid === 'device_information') {
                serviceName = 'デバイス情報サービス (0x180A)';
            } else if (uuid === 'generic_access') {
                serviceName = 'ジェネリックアクセス (0x1800)';
            }
            
            ulElement.innerHTML += `<li>${serviceName} (${uuid})</li>`;
        }

    } catch(error) {
        // エラー処理
        console.error('エラーが発生しました:', error);
        if (error.name === 'NotFoundError') {
            resultElement.innerHTML = '<p>スキャンがキャンセルされました。</p>';
        } else {
            resultElement.innerHTML = `<p style="color: red;"><strong>エラーが発生しました:</strong> ${error.message}</p>`;
            resultElement.innerHTML += '<p>ブラウザコンソールを確認してください。デバイスのBluetooth設定を確認するか、BLE非対応の可能性があります。</p>';
        }
    }
});
