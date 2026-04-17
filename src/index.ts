import app from './app.js';
import { env } from './config/env.js';

const PORT = Number(process.env.PORT || env.port || 3001);

app.listen(PORT, () => {
	console.log(`🚀 Influence Factory backend listening on port ${PORT}`);
	console.log(`🌐 Frontend origin allowed: ${env.frontendUrl}`);
});

export default app;
