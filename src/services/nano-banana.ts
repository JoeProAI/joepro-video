import { GoogleGenerativeAI } from '@google/generative-ai';

interface AnalysisResult {
  motion: string;
  camera: string;
  narrative: string;
}

const CAMERA_CONCEPTS = [
  'push_in', 'pull_out', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down',
  'dolly_in', 'dolly_out', 'crane_up', 'crane_down', 'handheld', 'static',
  'tracking', 'arc_left', 'arc_right', 'zoom_in', 'zoom_out'
];

export class NanoBanana {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeFrame(
    frameUrl: string,
    prompt: string,
    segmentIndex: number,
    totalSegments: number
  ): Promise<AnalysisResult> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const systemPrompt = `You are Nano Banana V5, an expert at describing MOTION for AI video generation.

Given an image and context, describe what MOTION should happen next. Focus on:
1. Physical movements (what moves, how it moves)
2. Camera movement (from this list: ${CAMERA_CONCEPTS.join(', ')})
3. Environmental changes (lighting, particles, atmosphere)

This is segment ${segmentIndex + 1} of ${totalSegments}. ${
      segmentIndex === 0 ? 'This is the opening shot - establish the scene.' :
      segmentIndex === totalSegments - 1 ? 'This is the final shot - bring closure.' :
      'Continue the narrative naturally.'
    }

IMPORTANT: Describe MOTION, not static descriptions. Use action verbs.
Output format:
MOTION: [2-3 sentences describing what moves and how]
CAMERA: [primary_concept + secondary_concept] (e.g., "push_in + handheld")
NARRATIVE: [1 sentence about story progression]`;

    const response = await model.generateContent([
      systemPrompt,
      `Original prompt: ${prompt}`,
      `Analyze this frame and describe the motion:`,
      {
        inlineData: {
          mimeType: 'image/png',
          data: await this.urlToBase64(frameUrl),
        },
      },
    ]);

    const text = response.response.text();
    return this.parseResponse(text);
  }

  private parseResponse(text: string): AnalysisResult {
    const motionMatch = text.match(/MOTION:\s*(.+?)(?=CAMERA:|$)/s);
    const cameraMatch = text.match(/CAMERA:\s*(.+?)(?=NARRATIVE:|$)/s);
    const narrativeMatch = text.match(/NARRATIVE:\s*(.+?)$/s);

    return {
      motion: motionMatch?.[1]?.trim() || 'Gentle movement forward with natural motion.',
      camera: this.validateCamera(cameraMatch?.[1]?.trim() || 'push_in + handheld'),
      narrative: narrativeMatch?.[1]?.trim() || 'The scene continues.',
    };
  }

  private validateCamera(camera: string): string {
    const parts = camera.toLowerCase().split(/\s*\+\s*/);
    const validParts = parts.filter(p => 
      CAMERA_CONCEPTS.some(c => p.includes(c.replace('_', ' ')) || p.includes(c))
    );
    
    if (validParts.length === 0) return 'push_in + handheld';
    if (validParts.length === 1) return `${validParts[0]} + handheld`;
    return validParts.slice(0, 2).join(' + ');
  }

  private async urlToBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }
}
