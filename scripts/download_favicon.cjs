const fs = require('fs');

async function download() {
  const url = 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://colegioprogressosantista.com.br&size=128';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync('public/favicon.png', Buffer.from(buffer));
    console.log("Downloaded public/favicon.png", buffer.byteLength);
  } catch (err) {
    console.error("Error:", err);
  }
}

download();
