import express, { Request, Response, Router } from 'express';
import { processChatLogic, ChatRequestBody } from '../lib/chatProcessor';

const router: Router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const body: ChatRequestBody = req.body;

    if (!body.query || typeof body.query !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid input: \'query\' is required and must be a string.',
      });
    }
    if (body.collectionName !== undefined && typeof body.collectionName !== 'string') {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid input: \'collectionName\' must be a string if provided.',
        });
    }
    if (body.chatHistory !== undefined && 
        (!Array.isArray(body.chatHistory) || 
         !body.chatHistory.every(msg => 
            typeof msg === 'object' && 
            msg !== null && 
            typeof msg.role === 'string' && 
            (msg.role === 'user' || msg.role === 'assistant') && 
            typeof msg.content === 'string'
         )
        )
    ) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid input: \'chatHistory\' must be an array of {role: \'user\'|\'assistant\', content: string} objects if provided.',
        });
    }

    const result = await processChatLogic(body);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: error.message || 'An unexpected error occurred during chat processing.' 
    });
  }
});

export default router;
