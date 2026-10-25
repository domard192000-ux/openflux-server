const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const { execSync } = require('child_process');

const URL = 'https://github.com/p1neappleXpress/OpenFlux/releases/download/v0.13.0/openflux-linux-amd64';
const BIN = './openflux-linux-amd64';
const TEMP_BIN = './openflux-linux-amd64.tmp';

console.log('>>> Запускаю OpenFlux сервер...');

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                file.close();
                if (fs.existsSync(dest)) fs.unlinkSync(dest);
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                file.close();
                if (fs.existsSync(dest)) fs.unlinkSync(dest);
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            reject(err);
        });
    });
}

(async () => {
    try {
        if (!fs.existsSync(BIN)) {
            console.log('>>> Скачиваю OpenFlux...');
            await downloadFile(URL, TEMP_BIN);
            fs.renameSync(TEMP_BIN, BIN);
            fs.chmodSync(BIN, 0o755);
            console.log('>>> OpenFlux готов!');
        }

        if (!fs.existsSync('secret.txt')) {
            fs.writeFileSync('secret.txt', crypto.randomBytes(32).toString('hex'));
            console.log('>>> Создан secret.txt');
        }

        const DOC_URL = 'https://disk.yandex.ru/i/T8Uwv0vIc5j_YQ';

        console.log('>>> Запускаю ноду (Cups.online)...');
        
        execSync(`${BIN} --role=exit --mode=l4 --negotiate --transports=cupsonline:100 --url="${DOC_URL}" --encryption-key-file=./secret.txt --share`, {
            stdio: 'inherit'
        });
    } catch (err) {
        console.error('❌ Ошибка:', err.message);
    }
})();
