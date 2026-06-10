import { GoogleGenerativeAI } from '@google/generative-ai';

// Khởi tạo Gemini (Nên dùng model 2.5-flash cho các tác vụ cần tốc độ phản hồi nhanh như API)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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