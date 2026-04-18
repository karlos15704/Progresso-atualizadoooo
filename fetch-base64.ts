import fetch from 'node-fetch';
import fs from 'fs';

async function fetchImageAsBase64(url: string): Promise<string> {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mime = res.headers.get('content-type') || 'image/png';
    return `data:${mime};base64,${base64}`;
}

async function run() {
    const vinho = await fetchImageAsBase64('https://colegioprogressosantista.com.br/wp-content/uploads/2025/11/logo-vinho-1024x1022.webp');
    const coc = await fetchImageAsBase64('https://colegioprogressosantista.com.br/wp-content/uploads/2025/11/Logo-COC-novo-1024x473.png');

    const content = `// Auto-generated file
export const LOGO_VINHO = "${vinho}";
export const LOGO_COC = "${coc}";
`;
    fs.writeFileSync('src/assets.ts', content);
    console.log('Saved src/assets.ts');
}

run();
