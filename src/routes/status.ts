import { Router } from 'express';
import { JobStore } from '../services/job-store';

const router = Router();
const jobStore = new JobStore();

// Get job status
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await jobStore.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      id: job.id,
      status: job.status,
      progress: {
        completed: job.completedSegments,
        total: job.segmentCount,
        percentage: Math.round((job.completedSegments / job.segmentCount) * 100),
      },
      segments: job.segments,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      error: job.error,
    });
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Get all segments for a completed job
router.get('/:jobId/result', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await jobStore.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Job not completed',
        status: job.status,
        progress: `${job.completedSegments}/${job.segmentCount}`,
      });
    }

    res.json({
      id: job.id,
      prompt: job.prompt,
      duration: job.duration,
      segments: job.segments.filter(s => s.status === 'completed'),
      totalDuration: job.segments.filter(s => s.status === 'completed').length * 9,
      createdAt: job.createdAt,
      completedAt: job.updatedAt,
    });
  } catch (error) {
    console.error('Error getting job result:', error);
    res.status(500).json({ error: 'Failed to get job result' });
  }
});

export const statusRoutes = router;
