import fs from 'fs';
import https from 'https';

function downloadFile(url: string, dest: string) {
    return new Promise<void>((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function main() {
    await downloadFile('https://colegioprogressosantista.com.br/wp-content/uploads/2025/11/logo-vinho-1024x1022.webp', 'public/logo-vinho.webp');
    await downloadFile('https://colegioprogressosantista.com.br/wp-content/uploads/2025/11/Logo-COC-novo-1024x473.png', 'public/logo-coc.png');
    console.log('Downloaded images to public');
}

main();
