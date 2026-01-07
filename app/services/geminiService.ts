import { GoogleGenAI, Type } from "@google/genai";
import { TextLayer, AppSettings } from "../types";
import { DEFAULT_TEXT_STYLE } from "../constants";

// CAUTION: In a real production app, you should NEVER expose API keys in the frontend code.
// This should be proxied through a backend.
// For this demo, we assume process.env.API_KEY is available.

const apiKey = process.env.API_KEY || "AIzaSyBi4kDM1hHDS2wW-M5RwkjNBuXlT4jOeh0";

const ai = new GoogleGenAI({ apiKey });

// Helper to convert File to Base64 string (without header)
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:video/mp4;base64,")
      const data = base64String.split(",")[1];
      resolve(data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateViralTitle = async (context: string): Promise<string> => {
  try {
    if (!apiKey) {
      console.warn("Gemini API Key is missing. Using fallback.");
      return "Viral Edit 🔥";
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a single, short, viral, catchy TikTok/Instagram caption (max 4 words) based on this context: "${context}". Do not use quotes. Include one emoji.`,
    });

    return response.text?.trim() || "Viral Edit 🔥";
  } catch (error) {
    console.error("Error generating title:", error);
    return "My Epic Edit";
  }
};

export const analyzeReferenceVideo = async (
  file: File
): Promise<{
  durations: number[];
  textLayers: Partial<TextLayer>[];
  settings: Partial<AppSettings>;
}> => {
  try {
    if (!apiKey) {
      // Fallback mock data if no key
      return {
        durations: [1.5, 0.5, 0.5, 1.0, 2.0, 0.5],
        textLayers: [
          {
            content: "Wait for it... 😲",
            start: 0,
            duration: 2,
            verticalPos: 50,
            fontSize: 60,
          },
        ],
        settings: {
          videoMode: "cover",
          videoScale: 1.0,
        },
      };
    }

    const base64Data = await fileToGenerativePart(file);

    // Prepare payload
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type || "video/mp4",
              data: base64Data,
            },
          },
          {
            text: `Analyze this video with absolute frame precision.

                  You MUST NOT guess or estimate anything. 
                  Only respond with information that is directly observable in the provided video frames.

                  ---------------------------------------------------------
                  TASK 1 — FRAME-PERFECT SHOT DETECTION
                  ---------------------------------------------------------
                  Identify every shot/cut using FRAME DIFFERENCE analysis.

                  Rules:
                  - A "cut" = an instantaneous visible change between two frames.
                  - If a shot contains motion or transitions, you must still detect the exact moment the new shot begins.
                  - NO approximations.
                  - Use the video's true FPS to calculate durations.
                  - Duration of each shot must be EXACT: total_frames_in_shot / FPS.

                  Return an array of numbers, each representing duration in seconds with 2 decimal places.
                  Example: [1.23, 0.96, 2.00]

                  Format:
                  "durations": [ ... ]

                  ---------------------------------------------------------
                  TASK 2 — LAYOUT & SCALE ANALYSIS
                  ---------------------------------------------------------
                  Analyze ONLY the visible video content (ignore letterboxing/cropping done by the preview UI).

                  Return:

                  - "mode":
                      - "cover" = 9:16 full-screen portrait content.
                      - "fit"   = 16:9 landscape content.
                      - "square" = 1:1 content.
                  - If content is smaller than the frame (letterboxed or pillarboxed), detect which sides have black bars.
                  - "scale": EXACT zoom level relative to original frame.  
                    - 1.0 = no zoom  
                    - >1.0 = zoomed-in  
                    - <1.0 = zoomed-out (content pillarboxed/letterboxed)

                  Format:
                  "layout": {
                    "mode": "...",
                    "scale": NUMBER
                  }

                  ---------------------------------------------------------
                  TASK 3 — TEXT OVERLAY DETECTION (FRAME PERFECT)
                  ---------------------------------------------------------
                  Identify EVERY distinct text overlay.

                  Apply this specific Coordinate System (Web/CSS Standard):

                  Aspect Ratio: 9:16 (Vertical)

                  Origin Point: Top-Left corner is X=0, Y=0.

                  Y-Axis Scale: 
                  - The absolute top edge of the video is Y = 0. 
                  - The absolute bottom edge of the video is Y = 1980.

                  X-Axis Scale: 
                  - The absolute left edge is X = 0.
                  - Calculate the max X width proportionally based on 9:16 ratio relative to Y (Max X ≈ 1114).

                  For each text element:
                  - Extract exact text (character-perfect).
                  - "start_time" = exact timestamp (seconds with 2 decimals).
                  - "end_time"   = exact timestamp (seconds with 2 decimals).
                  - "duration"   = end_time - start_time.
                  - "y_axis_scale" = pixel distance from the TOP edge of the video (0 to 1980).
                  - "x_axis_scale" = pixel distance from the LEFT edge of the video.
                  - "font_size" = font size in pixels.

                  You must detect text even if:
                  - There are multiple text layers at once
                  - Text is partially cropped

                  Format:
                  "textLayers": [
                    {
                      "content": "string",
                      "start_time": NUMBER,
                      "end_time": NUMBER,
                      "duration": NUMBER,
                      "y_axis_scale": NUMBER,
                      "x_axis_scale": NUMBER,
                      "font_size": NUMBER
                    }
                ]`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            durations: { type: Type.ARRAY, items: { type: Type.STRING } },
            layout: {
              type: Type.OBJECT,
              properties: {
                mode: { type: Type.STRING, enum: ["cover", "fit", "square"] },
                scale: { type: Type.NUMBER },
              },
            },
            text_overlays: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  start_time: { type: Type.NUMBER },
                  duration: { type: Type.NUMBER },
                  y_axis_scale: { type: Type.NUMBER },
                  font_size: { type: Type.NUMBER },
                },
              },
            },
          },
        },
      },
    });

    const jsonText = response.text?.trim() || "{}";
    const json = JSON.parse(jsonText);

    console.log(json);

    const layoutMode =
      (json.layout?.mode as AppSettings["videoMode"]) || "cover";
    const validModes = ["cover", "fit", "square"];
    const finalMode = validModes.includes(layoutMode) ? layoutMode : "cover";

    // Coordinate Transformation Logic
    // We map the coordinates from Source Aspect Ratio -> Destination 9:16 Canvas
    // Canvas is 9:16 (approx 0.5625 aspect ratio)

    // Scale Factors relative to height of 9:16 canvas
    let heightScaleFactor = 1.0;
    let verticalOffsetPercent = 0;

    if (finalMode === "square") {
      // Source is 1:1.
      // When fitted in 9:16, width matches, but height is only ~56.25% of canvas.
      // Top padding is approx 21.875%
      heightScaleFactor = 0.5625; // 540 / 960
      verticalOffsetPercent = 21.875;
    } else if (finalMode === "fit") {
      // Source is 16:9.
      // When fitted in 9:16, width matches, height is ~31.6% of canvas.
      // Top padding is approx 34.2%
      heightScaleFactor = 0.3164; // (540 * 9/16) / 960
      verticalOffsetPercent = 34.18;
    }

    const rawLayers = json.text_overlays || [];

    const mappedLayers: Partial<TextLayer>[] = rawLayers.map((l: any) => {
      // Raw values from AI (relative to source image)
      const rawVertPos =
        typeof l.y_axis_scale === "number" ? l.y_axis_scale : 0;
  
      return {
        content: l.text || "Text",
        start: typeof l.start_time === "number" ? l.start_time : 0,
        duration: typeof l.duration === "number" ? l.duration : 2,
        verticalPos: rawVertPos,
        fontSize: l.font_size,
      } as Partial<TextLayer>;
    });

    return {
      durations: json.durations.map((d: number) => Number(d)) || [2, 2, 2],
      textLayers: mappedLayers,
      settings: {
        videoMode: finalMode,
        videoScale:
          typeof json.layout?.scale === "number" ? json.layout.scale : 1.0,
      },
    };
  } catch (error) {
    console.error("Error analyzing video:", error);
    return {
      durations: [2.0, 1.0, 1.0, 0.5, 0.5, 2.0],
      textLayers: [],
      settings: { videoMode: "cover", videoScale: 1.0 },
    };
  }
};
