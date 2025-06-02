import express, { Request, Response, Router } from 'express';
import { processCollectionLogic, ProcessCollectionParams } from '../lib/collectionProcessor';

const router: Router = express.Router();

async function handleCollectionRequest(req: Request, res: Response, operation: ProcessCollectionParams['operation']) {
  try {
    const { urls, collectionName } = req.body;

    // Basic validation for urls if provided
    if (urls !== undefined && (!Array.isArray(urls) || !urls.every(u => typeof u === 'string'))) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid input: \'urls\' must be an array of strings if provided.',
      });
    }
    // Basic validation for collectionName if provided
    if (collectionName !== undefined && typeof collectionName !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid input: \'collectionName\' must be a string if provided.',
      });
    }

    const result = await processCollectionLogic({
      urlsToProcessInput: urls,
      collectionNameInput: collectionName,
      operation,
    });
    return res.status(200).json(result);
  } catch (error: any) {
    console.error(`Error in /api/collection/${operation}:`, error);
    return res.status(500).json({ 
      status: 'error', 
      message: error.message || `An unexpected error occurred during the ${operation} operation.` 
    });
  }
}

router.post('/reset', (req, res) => handleCollectionRequest(req, res, 'reset'));
router.post('/seed', (req, res) => handleCollectionRequest(req, res, 'seed'));
router.post('/update', (req, res) => handleCollectionRequest(req, res, 'update'));

export default router;
