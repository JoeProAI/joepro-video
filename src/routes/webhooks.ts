import { Router } from 'express';
import { JobStore } from '../services/job-store';

const router = Router();
const jobStore = new JobStore();

// Luma webhook callback (if using callback_url)
router.post('/luma', async (req, res) => {
  try {
    const { generation_id, state, assets } = req.body;
    
    console.log(`Luma webhook received: ${generation_id} - ${state}`);

    // Find job by generation ID and update
    // This would require storing generation_id -> jobId mapping
    
    res.json({ received: true });
  } catch (error) {
    console.error('Luma webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export const webhookRoutes = router;
