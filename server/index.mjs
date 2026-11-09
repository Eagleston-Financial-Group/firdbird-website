import 'dotenv/config';
import { createApp } from './app.mjs';

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';
const server = createApp().listen(port, host, () => console.log(`Firebird API and production site: http://${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
