// HTMLの要素を取得
const scanButton = document.getElementById('scanButton');
const resultElement = document.getElementById('result');
let bluetoothDevice; // 接続したデバイスを保持するためのグローバル変数

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
        // --- 1. デバイスの選択 ---
        // Web Bluetooth APIは、セキュリティのため、特定のサービスを持つデバイスのみをフィルタリングすることを推奨しますが、
        // 今回はすべてのサービスを受け入れることで、テレビの持つサービスを広範囲に検出します。
        const device = await navigator.bluetooth.requestDevice({
             acceptAllDevices: true,
             optionalServices: [] // すべてのサービスを検出するために空の配列を渡します
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
        const services = await gattServer.getPrimaryServices();

        // サービス一覧を表示するためのリストの準備
        resultElement.innerHTML += '<h3>公開されているサービス一覧:</h3><ul></ul>';
        const ulElement = resultElement.querySelector('ul');

        if (services.length === 0) {
            ulElement.innerHTML = '<li>このデバイスは、Web Bluetooth API経由でアクセス可能なサービスを公開していません。</li>';
        }

        for (const service of services) {
            // サービス名（UUID）を取得して表示
            const uuid = service.uuid;
            let serviceName = uuid;

            // 一般的なサービスUUIDの場合、わかりやすい名前に変換
            if (uuid === 'battery_service') {
                serviceName = 'バッテリーサービス (0x180F)';
            } else if (uuid === 'device_information') {
                serviceName = 'デバイス情報サービス (0x180A)';
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
            resultElement.innerHTML += '<p>デバイスのBluetooth設定を確認するか、BLE非対応の可能性があります。</p>';
        }
    }
});
