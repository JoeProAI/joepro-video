import OpenAI from 'openai';
import axios from 'axios';

export class ImageService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateFrame(prompt: string, style: string): Promise<string> {
    const fullPrompt = `${prompt}\n\nStyle: ${style}\n\nPhotorealistic, high detail, cinematic composition, professional photography.`;

    const response = await this.openai.images.generate({
      model: 'gpt-image-1',
      prompt: fullPrompt,
      n: 1,
      size: '1536x1024',
      quality: 'high',
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) throw new Error('Failed to generate image');

    // Upload to freeimage.host for Luma compatibility
    const hostedUrl = await this.uploadToImageHost(imageUrl);
    return hostedUrl;
  }

  async generateContinuationFrame(
    previousFrameUrl: string,
    motion: string,
    style: string
  ): Promise<string> {
    const prompt = `Continue this scene. The previous action was: ${motion}\n\nStyle: ${style}\n\nMaintain visual consistency with the previous frame. Photorealistic, high detail.`;

    const response = await this.openai.images.generate({
      model: 'gpt-image-1',
      prompt: prompt,
      n: 1,
      size: '1536x1024',
      quality: 'high',
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) throw new Error('Failed to generate continuation frame');

    const hostedUrl = await this.uploadToImageHost(imageUrl);
    return hostedUrl;
  }

  private async uploadToImageHost(imageUrl: string): Promise<string> {
    // Download the image
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(imageResponse.data).toString('base64');

    // Upload to freeimage.host
    const formData = new URLSearchParams();
    formData.append('key', '6d207e02198a847aa98d0a2a901485a5'); // Free API key
    formData.append('source', base64);
    formData.append('format', 'json');

    const uploadResponse = await axios.post(
      'https://freeimage.host/api/1/upload',
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (uploadResponse.data?.image?.url) {
      return uploadResponse.data.image.url;
    }

    throw new Error('Failed to upload image to host');
  }
}
