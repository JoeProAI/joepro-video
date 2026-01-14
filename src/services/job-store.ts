import admin from 'firebase-admin';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const COLLECTION = 'video_jobs';

export interface VideoJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  prompt: string;
  duration: number;
  style: string;
  userId?: string;
  sessionId?: string;
  segmentCount: number;
  completedSegments: number;
  segments: Array<{
    index: number;
    status: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    generationId?: string;
    error?: string;
  }>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export class JobStore {
  async createJob(job: VideoJob): Promise<void> {
    await db.collection(COLLECTION).doc(job.id).set(job);
  }

  async getJob(jobId: string): Promise<VideoJob | null> {
    const doc = await db.collection(COLLECTION).doc(jobId).get();
    if (!doc.exists) return null;
    return doc.data() as VideoJob;
  }

  async updateJob(jobId: string, updates: Partial<VideoJob>): Promise<void> {
    await db.collection(COLLECTION).doc(jobId).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async updateSegment(
    jobId: string,
    segmentIndex: number,
    segmentData: Partial<VideoJob['segments'][0]>
  ): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error('Job not found');

    const segments = [...job.segments];
    const existingIndex = segments.findIndex(s => s.index === segmentIndex);
    
    if (existingIndex >= 0) {
      segments[existingIndex] = { ...segments[existingIndex], ...segmentData };
    } else {
      segments.push({ index: segmentIndex, status: 'pending', ...segmentData });
    }

    const completedSegments = segments.filter(s => s.status === 'completed').length;

    await this.updateJob(jobId, { 
      segments, 
      completedSegments,
      status: completedSegments === job.segmentCount ? 'completed' : job.status,
    });
  }

  async getJobsByUser(userId: string): Promise<VideoJob[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map(doc => doc.data() as VideoJob);
  }

  async cleanupOldJobs(daysOld: number = 7): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const snapshot = await db
      .collection(COLLECTION)
      .where('createdAt', '<', cutoff.toISOString())
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return snapshot.size;
  }
}
