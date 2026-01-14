import axios from 'axios';

const LUMA_API_URL = 'https://api.lumalabs.ai/dream-machine/v1';

interface GenerateVideoParams {
  prompt: string;
  motion: string;
  camera: string;
  style: string;
  startFrameUrl: string;
}

interface VideoResult {
  generationId: string;
  videoUrl: string;
  thumbnailUrl: string;
}

export class LumaService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.LUMA_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('LUMA_API_KEY not configured');
    }
  }

  async generateVideo(params: GenerateVideoParams): Promise<VideoResult> {
    const { prompt, motion, camera, style, startFrameUrl } = params;

    // Build the full prompt
    const fullPrompt = `${prompt}\n\nACTION: ${motion}\n\nStyle: ${style}\nNatural, fluid motion with realistic physics. Smooth continuous movement.`;

    // Parse camera concepts
    const concepts = camera.split(' + ').map(c => ({ key: c.trim() }));

    // Start generation
    const response = await axios.post(
      `${LUMA_API_URL}/generations`,
      {
        prompt: fullPrompt,
        aspect_ratio: '16:9',
        loop: false,
        keyframes: {
          frame0: {
            type: 'image',
            url: startFrameUrl,
          },
        },
        model: 'ray-2',
        resolution: '720p',
        duration: '9s',
        concepts,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const generationId = response.data.id;
    console.log(`Generation started: ${generationId}`);

    // Poll for completion (no timeout - this is the key difference from Vercel)
    const result = await this.pollForCompletion(generationId);
    return result;
  }

  private async pollForCompletion(generationId: string): Promise<VideoResult> {
    const maxPolls = 120; // 10 minutes max (5s intervals)
    
    for (let i = 0; i < maxPolls; i++) {
      await this.sleep(5000);

      const response = await axios.get(
        `${LUMA_API_URL}/generations/${generationId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const { state, assets, failure_reason } = response.data;
      console.log(`Status: ${state} (${i + 1}/${maxPolls})`);

      if (state === 'completed' && assets?.video) {
        return {
          generationId,
          videoUrl: assets.video,
          thumbnailUrl: assets.image || '',
        };
      }

      if (state === 'failed') {
        throw new Error(`Luma generation failed: ${failure_reason || 'Unknown error'}`);
      }
    }

    throw new Error('Luma generation timed out after 10 minutes');
  }

  async getGeneration(generationId: string): Promise<any> {
    const response = await axios.get(
      `${LUMA_API_URL}/generations/${generationId}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );
    return response.data;
  }

  async listGenerations(limit: number = 20): Promise<any[]> {
    const response = await axios.get(
      `${LUMA_API_URL}/generations?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );
    return response.data.generations || [];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
