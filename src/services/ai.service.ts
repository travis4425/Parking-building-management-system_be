import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from '../middlewares/error.middleware';

// Khởi tạo Gemini (Nên dùng model 2.5-flash cho các tác vụ cần tốc độ phản hồi nhanh như API)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const parseImageInput = (input: string) => {
  if (!input || typeof input !== 'string') {
    throw new AppError('Vui lòng cung cấp ảnh để nhận diện biển số', 400);
  }

  const trimmed = input.trim();

  if (/^data:image\//i.test(trimmed)) {
    const match = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i);
    if (!match) {
      throw new AppError('Định dạng ảnh data URL không hợp lệ', 400);
    }

    return {
      kind: 'base64' as const,
      buffer: Buffer.from(match[2], 'base64'),
      mimeType: match[1] || 'image/jpeg',
    };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { kind: 'url' as const, url: trimmed };
  }

  const maybeBase64 = trimmed.replace(/\s+/g, '');
  if (/^[A-Za-z0-9+/=]+$/.test(maybeBase64)) {
    return {
      kind: 'base64' as const,
      buffer: Buffer.from(maybeBase64, 'base64'),
      mimeType: 'image/jpeg',
    };
  }

  throw new AppError('Định dạng ảnh không được hỗ trợ. Vui lòng gửi base64 hoặc URL ảnh.', 400);
};

const normalizePlate = (value?: string) => {
  if (!value) return '';
  return value.trim().replace(/\s+/g, '').toUpperCase();
};

export const suggestOptimalSlot = async (vehicleType: string, entryGate: string, availableSlots: any[]) => {
  try {
    if (availableSlots.length === 0) return null;

    const prompt = `
      Bạn là hệ thống điều phối bãi đỗ xe thông minh.
      Loại xe đang vào: ${vehicleType}.
      Cổng vào: ${entryGate}.
      Danh sách các vị trí đỗ (slots) đang trống: ${JSON.stringify(availableSlots)}.
      
      Yêu cầu:
      1. Chọn ra 1 slot ID phù hợp nhất (ưu tiên khoảng cách logic, dễ lùi xe, hoặc theo cách sắp xếp thông thường).
      2. Giải thích ngắn gọn bằng tiếng Việt lý do chọn.
      3. Bắt buộc trả về đúng định dạng JSON tĩnh, không chứa markdown (như \`\`\`json):
      {
        "slotId": "id_cua_slot",
        "reason": "Lý do..."
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Xóa bỏ các ký tự markdown thừa nếu Gemini tự động thêm vào
    const cleanJson = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error('⚠️ [AI Fallback] Gemini API Lỗi/Timeout:', error);
    
    // FALLBACK LOGIC: Thuật toán truyền thống thay thế AI
    // Trả về slot trống đầu tiên tìm thấy
    return {
      slotId: availableSlots[0].id,
      reason: '[Hệ thống tự động] Chỉ định vị trí trống gần nhất (Chế độ dự phòng).'
    };
  }
};

export const predictPeakHours = async (historyData: any[]) => {
  try {
    const prompt = `
      Dưới đây là dữ liệu lịch sử các phiên đỗ xe (ParkingSession) của bãi xe:
      ${JSON.stringify(historyData)}
      
      Hãy phân tích và trả về thông tin dự báo giờ cao điểm theo định dạng JSON (không markdown):
      {
        "peakHour": "Ví dụ: 08:00 - 10:00",
        "expectedTraffic": "Cao/Trung bình/Thấp",
        "analysis": "Giải thích ngắn gọn lý do tại sao..."
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json\n?|```/g, '').trim();
    
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error('⚠️ [AI Fallback] Gemini API Lỗi/Timeout:', error);
    
    // FALLBACK LOGIC: Phân tích thống kê cơ bản thay vì dùng AI
    return {
      peakHour: "Không xác định",
      expectedTraffic: "Trung bình",
      analysis: "[Hệ thống tự động] AI đang bận. Vui lòng dựa vào thống kê biểu đồ thủ công."
    };
  }
};

export const recognizePlateWithPlateRecognizer = async (imageInput: string) => {
  const apiKey = process.env.PLATE_RECOGNIZER_API_KEY;
  if (!apiKey) {
    return {
      plate: 'UNKNOWN',
      plateNumber: 'UNKNOWN',
      licensePlate: 'UNKNOWN',
      confidence: 0,
      confidenceScore: 0,
      rawText: 'UNKNOWN',
      source: 'fallback',
      meta: {
        provider: 'platerecognizer.com',
        regions: process.env.PLATE_RECOGNIZER_REGIONS || 'vn',
        note: 'PLATE_RECOGNIZER_API_KEY chưa được cấu hình',
      },
    };
  }

  const parsed = parseImageInput(imageInput);
  const url = process.env.PLATE_RECOGNIZER_API_URL || 'https://api.platerecognizer.com/v1/plate-reader/';

  const headers: Record<string, string> = {
    Authorization: `Token ${apiKey}`,
  };

  let body: any;
  let requestHeaders: Record<string, string> = headers;

  if (parsed.kind === 'url') {
    body = JSON.stringify({ upload_url: parsed.url, regions: process.env.PLATE_RECOGNIZER_REGIONS || 'vn' });
    requestHeaders = { ...headers, 'Content-Type': 'application/json' };
  } else {
    const form = new FormData();
    form.append('upload', new Blob([parsed.buffer], { type: parsed.mimeType }), 'capture.jpg');
    form.append('regions', process.env.PLATE_RECOGNIZER_REGIONS || 'vn');
    form.append('mmc', 'true');
    body = form as unknown as any;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: requestHeaders,
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new AppError(`Plate Recognizer trả về lỗi ${response.status}: ${errorText}`, 502);
  }

  const data = await response.json() as any;
  const firstResult = data.results?.[0];
  const plate = normalizePlate(firstResult?.plate || firstResult?.candidates?.[0]?.plate || data?.plate || data?.results?.[0]?.raw_text);
  const confidence = Number(firstResult?.score ?? firstResult?.confidence ?? firstResult?.candidates?.[0]?.score ?? 0);

  return {
    plate,
    plateNumber: plate,
    licensePlate: plate,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    confidenceScore: Number.isFinite(confidence) ? confidence : 0,
    rawText: plate,
    source: 'plate-recognizer',
    meta: {
      provider: 'platerecognizer.com',
      regions: process.env.PLATE_RECOGNIZER_REGIONS || 'vn',
      rawResponse: data,
    },
  };
};