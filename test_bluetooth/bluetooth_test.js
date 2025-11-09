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
        // マウスのHIDサービス(0x1812)と、以前のテストで使ったサービスをoptionalServicesで宣言
        const device = await navigator.bluetooth.requestDevice({
             acceptAllDevices: true,
             optionalServices: [
                 'generic_access',       // 0x1800
                 'device_information',   // 0x180A
                 'human_interface_device', // 0x1812: マウス操作情報が格納されるサービス
                 'battery_service'       // 0x180F (マウスのバッテリーレベル取得に必要かもしれません)
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

        // --- 3. ターゲットサービス(HID: 0x1812)を取得 ---
        // 'human_interface_device'サービスオブジェクトを取得します
        const hidService = await gattServer.getPrimaryService('human_interface_device');

        resultElement.innerHTML += `
            <h3>ターゲットサービス: HIDサービス (0x1812)</h3>
            <p style="font-weight: bold;">その中のキャラクタリスティック一覧:</p>
            <ul></ul>
        `;
        const ulElement = resultElement.querySelector('ul');

        // --- 4. サービス内のすべてのキャラクタリスティックを取得 ---
        const characteristics = await hidService.getCharacteristics();

        if (characteristics.length === 0) {
            ulElement.innerHTML = '<li>キャラクタリスティックが見つかりませんでした。</li>';
        }

        for (const characteristic of characteristics) {
            const uuid = characteristic.uuid;
            let charName = uuid;

            // HIDサービスで一般的なキャラクタリスティックUUIDの場合、わかりやすい名前に変換
            if (uuid === 'report_map') {
                charName = 'レポートマップ (0x2A4B)'; // デバイスの機能定義
            } else if (uuid === 'hid_information') {
                charName = 'HID情報 (0x2A4A)';
            } else if (uuid === 'report') {
                charName = 'レポート (0x2A4D)'; // 操作データが流れてくるキャラクタリスティック
            } else if (uuid === 'protocol_mode') {
                charName = 'プロトコルモード (0x2A4E)';
            }
            
            // キャラクタリスティックのUUIDとプロパティを表示
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
        } else if (error.message.includes('No Services matching UUID')) {
            resultElement.innerHTML = `<p style="color: red;"><strong>エラーが発生しました:</strong> マウスがHIDサービス (0x1812) を公開していません。または、セキュリティ制限のためアクセスが拒否されました。</p>`;
        } else {
            resultElement.innerHTML = `<p style="color: red;"><strong>エラーが発生しました:</strong> ${error.message}</p>`;
        }
    }
});
