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
                 'generic_access',       // 0x1800
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

        resultElement.innerHTML += '<p style="color: green;"><strong>接続成功! データ取得中...</strong></p>';

        // --- 3. 特定のサービス(0x1800)を取得 ---
        const genericAccessService = await gattServer.getPrimaryService('generic_access');
        
        // --- 4. デバイス名 (0x2A00) のキャラクタリスティックを取得 ---
        const deviceNameCharacteristic = await genericAccessService.getCharacteristic('device_name');

        // --- 5. データの読み出し！ ---
        const value = await deviceNameCharacteristic.readValue();
        
        // 取得したデータ(DataView)を文字列に変換 (Bluetooth名はUTF-8で格納されている)
        const deviceName = new TextDecoder('utf-8').decode(value);

        // --- 6. 結果の表示 ---
        resultElement.innerHTML += `
            <h3>✅ データの読み出し結果:</h3>
            <p style="font-size: 1.1em; color: blue;">
                <strong>デバイス名 (0x2A00) の中身:</strong> ${deviceName}
            </p>
            <p>※ デバイス名以外は、通常、生のデータ(数値など)を解析するコードが必要です。</p>
        `;

    } catch(error) {
        // エラー処理
        console.error('エラーが発生しました:', error);
        if (error.name === 'NotFoundError') {
            resultElement.innerHTML = '<p>スキャンがキャンセルされました。</p>';
        } else {
            resultElement.innerHTML = `<p style="color: red;"><strong>エラーが発生しました:</strong> ${error.message}</p>`;
            resultElement.innerHTML += '<p>データ読み出しが拒否されたか、デバイスが切断されました。</p>';
        }
    }
});
