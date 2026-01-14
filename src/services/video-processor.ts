import { JobStore, VideoJob } from './job-store';
import { LumaService } from './luma';
import { ImageService } from './image-gen';
import { NanoBanana } from './nano-banana';

export class VideoProcessor {
  private jobStore: JobStore;
  private luma: LumaService;
  private imageGen: ImageService;
  private nanoBanana: NanoBanana;

  constructor() {
    this.jobStore = new JobStore();
    this.luma = new LumaService();
    this.imageGen = new ImageService();
    this.nanoBanana = new NanoBanana();
  }

  async processJob(jobId: string): Promise<void> {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🎬 PROCESSING JOB: ${jobId}`);
    console.log(`${'═'.repeat(60)}`);

    try {
      await this.jobStore.updateJob(jobId, { status: 'processing' });
      const job = await this.jobStore.getJob(jobId);
      
      if (!job) throw new Error('Job not found');

      // Step 1: Generate initial frame
      console.log('\n📸 STEP 1: Generating initial frame...');
      let currentFrameUrl = await this.imageGen.generateFrame(job.prompt, job.style);
      console.log('✅ Initial frame generated');

      // Process each segment
      for (let i = 0; i < job.segmentCount; i++) {
        // Check if job was cancelled
        const currentJob = await this.jobStore.getJob(jobId);
        if (currentJob?.status === 'cancelled') {
          console.log('⚠️ Job cancelled, stopping');
          return;
        }

        console.log(`\n${'─'.repeat(50)}`);
        console.log(`🎬 SEGMENT ${i + 1}/${job.segmentCount}`);
        console.log(`${'─'.repeat(50)}`);

        await this.jobStore.updateSegment(jobId, i, { status: 'processing' });

        try {
          // Step 2: Analyze frame with Nano Banana
          console.log('🍌 Analyzing frame with Nano Banana...');
          const analysis = await this.nanoBanana.analyzeFrame(
            currentFrameUrl,
            job.prompt,
            i,
            job.segmentCount
          );
          console.log(`✅ Motion: "${analysis.motion.substring(0, 50)}..."`);
          console.log(`🎥 Camera: ${analysis.camera}`);

          // Step 3: Generate video with Luma
          console.log('🎬 Generating video with Luma Ray-2...');
          const videoResult = await this.luma.generateVideo({
            prompt: job.prompt,
            motion: analysis.motion,
            camera: analysis.camera,
            style: job.style,
            startFrameUrl: currentFrameUrl,
          });

          console.log(`✅ Video generated: ${videoResult.videoUrl}`);

          // Update segment with result
          await this.jobStore.updateSegment(jobId, i, {
            status: 'completed',
            videoUrl: videoResult.videoUrl,
            thumbnailUrl: videoResult.thumbnailUrl,
            generationId: videoResult.generationId,
          });

          // Use last frame for next segment (or regenerate)
          if (i < job.segmentCount - 1) {
            console.log('🎞️ Preparing next frame...');
            currentFrameUrl = await this.imageGen.generateContinuationFrame(
              currentFrameUrl,
              analysis.motion,
              job.style
            );
          }

        } catch (segmentError) {
          console.error(`❌ Segment ${i + 1} failed:`, segmentError);
          await this.jobStore.updateSegment(jobId, i, {
            status: 'failed',
            error: segmentError instanceof Error ? segmentError.message : 'Unknown error',
          });
        }
      }

      // Mark job as completed
      const finalJob = await this.jobStore.getJob(jobId);
      const completedCount = finalJob?.segments.filter(s => s.status === 'completed').length || 0;
      
      await this.jobStore.updateJob(jobId, {
        status: completedCount > 0 ? 'completed' : 'failed',
        error: completedCount === 0 ? 'All segments failed' : undefined,
      });

      console.log(`\n${'═'.repeat(60)}`);
      console.log(`✅ JOB COMPLETE: ${completedCount}/${job.segmentCount} segments`);
      console.log(`${'═'.repeat(60)}\n`);

    } catch (error) {
      console.error('❌ Job failed:', error);
      await this.jobStore.updateJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
