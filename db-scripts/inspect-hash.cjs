// Manually decode and inspect the hash structure
const hash = 'AQAAAAEAACcQAAAAELIMrfMcvIr1nnDmLUCHwqLBIGBYant+Qo2sWWvwCN38eL0+0+3z0vFqGPJwT4TI/w==';
const buffer = Buffer.from(hash, 'base64');

for (let i = 0; i < Math.min(30, buffer.length); i++) {
  process.stdout.write(`${buffer[i].toString(16).padStart(2, '0')} `);
  if ((i + 1) % 16 === 0) }
