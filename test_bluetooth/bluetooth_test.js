const scanButton = document.getElementById('scanButton');
const resultElement = document.getElementById('result');

// スキャンボタンがクリックされたときの処理
scanButton.addEventListener('click', async () => {
    
    // スキャン開始を通知
    resultElement.textContent = 'スキャン中...';

    // navigator.bluetooth が存在しない場合 (ブラウザ非対応) のチェック
    if (!navigator.bluetooth) {
        resultElement.textContent = 'エラー: お使いのブラウザはWeb Bluetooth APIをサポートしていません。ChromeまたはEdgeをご利用ください。';
        return;
    }

    try {
        // デバイス選択ダイアログを表示
        console.log('デバイススキャンをリクエストします...');
        const device = await navigator.bluetooth.requestDevice({
             // 全てのデバイスをスキャン対象にします
             acceptAllDevices: true 
        });

        // ユーザーがデバイスを選択した場合
        console.log('デバイスが選択されました:', device);
        
        // 取得したデバイス情報をHTMLに表示
        resultElement.textContent = `
[デバイス情報]
デバイス名: ${device.name || '名前なし'}
デバイスID: ${device.id}
接続状態: ${device.gatt.connected ? '接続済み' : '未接続'}
        `;

    } catch(error) {
        // エラー処理
        console.error('エラーが発生しました:', error);

        if (error.name === 'NotFoundError') {
            resultElement.textContent = 'スキャンがキャンセルされました。';
        } else {
            resultElement.textContent = `エラー: ${error.message}`;
        }
    }
});
