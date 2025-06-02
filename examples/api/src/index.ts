import express, { Express, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { config } from './lib/configLoader';
import collectionRoutes from './routes/collectionRoutes';
import chatRoutes from './routes/chatRoutes';

const app: Express = express();
const port = config.apiPort || 8000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Basic Route for Health Check
app.get('/', (req: Request, res: Response) => {
  res.send('RAG SDK API Server is running!');
});

// Mount API Routes
app.use('/api/collection', collectionRoutes);
app.use('/api/chat', chatRoutes);

// Global Error Handler (Optional - basic example)
app.use((err: Error, req: Request, res: Response, next: express.NextFunction) => {
  console.error("Global error handler caught:", err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`RAG SDK API server listening on port ${port}`);
  console.log('Available routes:');
  console.log(`  GET  /`);
  console.log(`  POST /api/collection/reset`);
  console.log(`  POST /api/collection/seed`);
  console.log(`  POST /api/collection/update`);
  console.log(`  POST /api/chat`);
  console.log('\nEnsure your .env file is configured correctly.');
});
