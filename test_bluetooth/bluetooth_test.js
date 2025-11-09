// HTMLの要素を取得
const scanButton = document.getElementById('scanButton');
const resultElement = document.getElementById('result');
let bluetoothDevice;

// スキャンボタンがクリックされたときの処理
scanButton.addEventListener('click', async () => {
    
    // スキャン開始を通知し、以前の結果をクリア
    resultElement.innerHTML = '<p>スキャン中...</p>';

    if (!navigator.bluetooth) {
        resultElement.innerHTML = '<p>エラー: Web Bluetooth APIをサポートしていません。</p>';
        return;
    }

    try {
        // --- 1. デバイスの選択 ---
        // 接続後にアクセスしたいサービスをoptionalServicesで宣言（必須）
        const device = await navigator.bluetooth.requestDevice({
             acceptAllDevices: true,
             optionalServices: [
                 'generic_access',       // 0x1800: 今回ターゲットとするサービス
                 'device_information',   // 0x180A
                 'battery_service'       // 0x180F
             ]
        });

        bluetoothDevice = device;

        // --- 2. 接続と情報表示 ---
        resultElement.innerHTML = `
            <h2>[デバイス情報]</h2>
            <p><strong>デバイス名:</strong> ${device.name || '名前なし'}</p>
            <p><strong>デバイスID:</strong> ${device.id}</p>
            <p><strong>接続状態:</strong> 接続を試行中...</p>
        `;

        const gattServer = await device.gatt.connect();

        resultElement.innerHTML += '<p style="color: green;"><strong>接続成功! サービスの取得中...</strong></p>';

        // --- 3. 特定のサービス(0x1800)を取得 ---
        // 'generic_access'サービスオブジェクトを取得します
        const genericAccessService = await gattServer.getPrimaryService('generic_access');

        resultElement.innerHTML += `
            <h3>ターゲットサービス: ジェネリックアクセス (0x1800)</h3>
            <p style="font-weight: bold;">その中のキャラクタリスティック一覧:</p>
            <ul></ul>
        `;
        const ulElement = resultElement.querySelector('ul');

        // --- 4. サービス内のすべてのキャラクタリスティックを取得 ---
        const characteristics = await genericAccessService.getCharacteristics();

        if (characteristics.length === 0) {
            ulElement.innerHTML = '<li>キャラクタリスティックが見つかりませんでした。</li>';
        }

        for (const characteristic of characteristics) {
            const uuid = characteristic.uuid;
            let charName = uuid;

            // 一般的なキャラクタリスティックUUIDの場合、わかりやすい名前に変換
            if (uuid === 'gap_device_name') {
                charName = 'デバイス名 (0x2A00)';
            } else if (uuid === 'gap_appearance') {
                charName = '外観 (0x2A01)';
            }
            
            // キャラクタリスティックのUUIDとプロパティを表示
            // プロパティ: read/write/notifyが可能か
            const props = characteristic.properties;
            const propertyList = Object.keys(props).filter(prop => props[prop]).join(', ');

            ulElement.innerHTML += `
                <li>
                    <strong>${charName}</strong> (${uuid})<br>
                    - プロパティ: ${propertyList || 'なし'}
                </li>
            `;
        }

    } catch(error) {
        // エラー処理
        console.error('エラーが発生しました:', error);
        if (error.name === 'NotFoundError') {
            resultElement.innerHTML = '<p>スキャンがキャンセルされました。</p>';
        } else {
            resultElement.innerHTML = `<p style="color: red;"><strong>エラーが発生しました:</strong> ${error.message}</p>`;
            resultElement.innerHTML += '<p>コンソールを確認してください。デバイスのBluetooth設定を確認してください。</p>';
        }
    }
});
