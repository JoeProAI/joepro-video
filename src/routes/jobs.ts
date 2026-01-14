import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JobStore } from '../services/job-store';
import { VideoProcessor } from '../services/video-processor';

const router = Router();
const jobStore = new JobStore();
const videoProcessor = new VideoProcessor();

// Create a new video generation job
router.post('/create', async (req, res) => {
  try {
    const { prompt, duration = 30, style, userId, sessionId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const jobId = uuidv4();
    const segmentCount = Math.ceil(duration / 9);

    const job = {
      id: jobId,
      status: 'queued' as const,
      prompt,
      duration,
      style: style || 'hyper realistic, photorealistic, cinematic lighting',
      userId,
      sessionId,
      segmentCount,
      completedSegments: 0,
      segments: [] as Array<{
        index: number;
        status: string;
        videoUrl?: string;
        thumbnailUrl?: string;
        error?: string;
      }>,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await jobStore.createJob(job);

    // Start processing in background (non-blocking)
    videoProcessor.processJob(jobId).catch(err => {
      console.error(`Job ${jobId} failed:`, err);
    });

    res.json({
      jobId,
      status: 'queued',
      message: 'Video generation started',
      estimatedTime: `${segmentCount * 3} minutes`,
      pollUrl: `/api/status/${jobId}`,
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// List jobs for a user
router.get('/list/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const jobs = await jobStore.getJobsByUser(userId);
    res.json({ jobs });
  } catch (error) {
    console.error('Error listing jobs:', error);
    res.status(500).json({ error: 'Failed to list jobs' });
  }
});

// Cancel a job
router.post('/:jobId/cancel', async (req, res) => {
  try {
    const { jobId } = req.params;
    await jobStore.updateJob(jobId, { status: 'cancelled' });
    res.json({ success: true, message: 'Job cancelled' });
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

export const jobRoutes = router;
