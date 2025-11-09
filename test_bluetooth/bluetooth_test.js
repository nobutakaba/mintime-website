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
        const device = await navigator.bluetooth.requestDevice({
             acceptAllDevices: true,
             optionalServices: [
                 'generic_access',      // 0x1800
                 'device_information',  // 0x180A
                 'battery_service',     // 0x180F
                 // 修正点: 標準名ではなく、完全なUUID文字列でHIDサービスを指定
                 '00001812-0000-1000-8000-00805f9b34fb' 
             ]
        });

        bluetoothDevice = device;

        // ... (省略: 接続とサービス取得のコードは前回と同じ) ...
        
        resultElement.innerHTML = `
            <h2>[デバイス情報]</h2>
            <p><strong>デバイス名:</strong> ${device.name || '名前なし'}</p>
            <p><strong>デバイスID:</strong> ${device.id}</p>
            <p><strong>接続状態:</strong> 接続を試行中...</p>
        `;

        const gattServer = await device.gatt.connect();

        resultElement.innerHTML += '<p style="color: green;"><strong>接続成功! サービスの取得中...</strong></p>';

        // --- 3. ターゲットサービス(HID: 0x1812)を取得 ---
        // 完全なUUIDを使用してサービスオブジェクトを取得
        const hidService = await gattServer.getPrimaryService('00001812-0000-1000-8000-00805f9b34fb');

        resultElement.innerHTML += `
            <h3>ターゲットサービス: HIDサービス (0x1812)</h3>
            <p style="font-weight: bold;">その中のキャラクタリスティック一覧:</p>
            <ul></ul>
        `;
        const ulElement = resultElement.querySelector('ul');

        // --- 4. サービス内のすべてのキャラクタリスティックを取得 ---
        const characteristics = await hidService.getCharacteristics();

        // ... (省略: キャラクタリスティックの表示ロジックは前回と同じ) ...

        if (characteristics.length === 0) {
            ulElement.innerHTML = '<li>キャラクタリスティックが見つかりませんでした。</li>';
        }

        for (const characteristic of characteristics) {
            const uuid = characteristic.uuid;
            let charName = uuid;

            if (uuid.startsWith('00002a4b')) {
                charName = 'レポートマップ (0x2A4B)'; 
            } else if (uuid.startsWith('00002a4a')) {
                charName = 'HID情報 (0x2A4A)';
            } else if (uuid.startsWith('00002a4d')) {
                charName = 'レポート (0x2A4D)'; 
            } else if (uuid.startsWith('00002a4e')) {
                charName = 'プロトコルモード (0x2A4E)';
            }
            
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
        } else if (error.message.includes('not allowed to access')) {
            resultElement.innerHTML = `<p style="color: red;"><strong>エラーが発生しました:</strong> HIDサービスはセキュリティ制限のためアクセスが拒否されました。完全なUUIDでもアクセスできませんでした。</p>`;
        } else {
            resultElement.innerHTML = `<p style="color: red;"><strong>エラーが発生しました:</strong> ${error.message}</p>`;
        }
    }
});
