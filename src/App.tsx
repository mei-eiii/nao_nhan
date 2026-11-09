// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  Dices,
  Mic,
  Brain,
  Flame,
  Zap,
  Crown,
  Clock,
  Play,
  Square,
  Settings,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  FastForward,
  RotateCcw,
  Library,
  User,
  BarChart3,
  Plus,
  Star,
  Trash2,
  CheckSquare,
  Square as SquareOutline,
  MessageCircle,
  PenTool,
  GraduationCap,
  Briefcase,
  Users,
  Coffee,
  ArrowLeft,
  Trophy,
  BookHeadphones,
  History,
  PieChart,
  Headphones,
  Volume2,
  Medal,
  Music,
  PlayCircle,
} from "lucide-react";
import {
  ensureUser,
  sharePost,
  removePost,
  reportPost,
  listenPosts,
} from "./firebase";

// --- Âm thanh tạo bằng Web Audio (không cần file mp3) ---
let audioCtx: any = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
  if (typeof window !== "undefined") {
    const unlock = () => {
      getCtx();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }
};

const tone = (freq: number, start: number, dur: number, opts: any = {}) => {
  const ctx = getCtx();
  if (!ctx) return;
  const { type = "sine", vol = 0.2, endFreq = null } = opts;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const t0 = ctx.currentTime + start;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
};

// Tiếng "tách" của bánh xe quay. progress từ 0 đến 1: càng về cuối càng trầm
const playTick = (progress = 0) => {
  const base = 1500 - progress * 600;
  tone(base, 0, 0.05, { type: "square", vol: 0.12, endFreq: base * 0.5 });
  tone(base * 2, 0, 0.02, { type: "triangle", vol: 0.06 });
};

// Tiếng "ting ting ting ting!" khi chọn được
const playWin = () => {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    tone(f, i * 0.09, 0.45, { type: "triangle", vol: 0.22 });
    tone(f * 2, i * 0.09, 0.3, { type: "sine", vol: 0.08 });
  });
  [1568, 2093, 2637].forEach((f, i) =>
    tone(f, 0.4 + i * 0.07, 0.35, { type: "sine", vol: 0.07 })
  );
};

// Chuông báo hết giờ
const playAlarm = () => {
  for (let g = 0; g < 3; g++) {
    for (let i = 0; i < 3; i++) {
      tone(988, g * 1.0 + i * 0.2, 0.15, { type: "square", vol: 0.45 });
      tone(1976, g * 1.0 + i * 0.2, 0.15, { type: "triangle", vol: 0.2 });
    }
  }
};

// Tiếng "ding" nhẹ (dùng khi hết giờ chuẩn bị, để không lẫn vào bản ghi âm)
const playDing = () => {
  tone(880, 0, 0.18, { type: "triangle", vol: 0.15 });
  tone(1318, 0.12, 0.25, { type: "triangle", vol: 0.15 });
};
const playClick = () => {
  tone(700, 0, 0.05, { type: "triangle", vol: 0.15, endFreq: 500 });
};

// --- Thông báo hết giờ ---
const requestNotifyPermission = () => {
  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "default"
  ) {
    Notification.requestPermission();
  }
};

const notifyTimeUp = (title: string, body: string, quiet = false) => {
  if (quiet) playDing();
  else playAlarm();
  if (typeof document === "undefined") return;
  if (document.hidden) {
    // Đang ở tab khác: đổi tiêu đề tab và hiện thông báo của trình duyệt
    const original = document.title;
    document.title = title;
    const restore = () => {
      document.title = original;
      window.removeEventListener("focus", restore);
    };
    window.addEventListener("focus", restore);
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification(title, { body });
      } catch (e) {}
    }
  }
};

// --- Data Constants ---
const CATEGORY_DATA = {
  "Mối quan hệ": [
    "Điều khó khăn nhất khi yêu xa",
    "Bạn có tin rằng yêu xa vẫn có thể dẫn đến một cái kết hạnh phúc không?",
    "Cách duy trì mối quan hệ yêu xa",
    "Mạng xã hội đã thay đổi cách con người yêu nhau như thế nào?",
    "Khoảng cách địa lý hay khoảng cách trong suy nghĩ đáng sợ hơn?",
    "Có nên bắt đầu một mối quan hệ khi biết trước sẽ phải yêu xa?",
    "Bạn sẽ đưa ra lời khuyên gì cho một cặp đôi vừa bắt đầu yêu xa?",
    "Bạn nghĩ các cặp đôi nên gặp nhau với tần suất như thế nào để giữ gìn tình cảm?",
    "Bạn nghĩ mình thuộc kiểu ngôn ngữ tình yêu nào?",
    "Mọi người có cần hiểu ngôn ngữ tình yêu của nhau để yêu lâu dài không?",
    "Nếu người yêu luôn thể hiện tình cảm theo cách bạn không mong muốn, bạn sẽ làm gì?",
    "Ngôn ngữ tình yêu có thể thay đổi theo thời gian không?",
    "Trong năm ngôn ngữ tình yêu, điều nào bạn đánh giá cao nhất?",
    "Nếu phải giải thích khái niệm 'ngôn ngữ tình yêu' cho một đứa trẻ, bạn sẽ nói thế nào?",
    "Có ngôn ngữ tình yêu nào thường bị đánh giá thấp nhưng lại rất quan trọng không?",
    "Bạn nghĩ điều gì khiến một người cảm thấy được yêu thương nhất?",
    "Người yêu và bạn thân, ai nên được ưu tiên hơn?",
    "Có nên yêu người hoàn toàn trái tính cách với mình?",
    "Yêu lâu có đồng nghĩa với yêu bền không?",
    "Xa mặt có thật sự cách lòng?",
    "Có nên quay lại với người yêu cũ?",
    "Có tồn tại 'định mệnh' trong tình yêu không?",
    "Có nên kiểm tra điện thoại của người yêu?",
    "Tiền bạc ảnh hưởng đến tình yêu nhiều đến mức nào?",
    "Hai người yêu nhau có cần chung sở thích không?",
    "Có nên sống thử trước hôn nhân?",
    "Có nên tha thứ cho sự phản bội?",
    "Điều gì quan trọng hơn: yêu đúng người hay đúng thời điểm?",
    "Theo bạn, 'red flag' nào là không thể chấp nhận?",
    "Điều gì khiến một người trở nên hấp dẫn ngay từ lần đầu gặp?",
    "Yêu bản thân và yêu người khác, điều nào khó hơn?",
    "Dấu hiệu của một mối quan hệ độc hại",
    "Vì sao nhiều người vẫn tiếp tục ở lại trong một mối quan hệ không hạnh phúc?",
    "Làm sao để biết một người có hợp với mình?",
    "Vì sao nhiều người trẻ ngày càng ít trò chuyện với gia đình?",
    "Bạn thường gọi điện cho ba mẹ với tần suất như thế nào?",
    "Một cuộc gọi ngắn có thể mang lại ý nghĩa gì cho ba mẹ?",
    "Món quà nào khiến bạn nhớ nhất?",
    "Nếu chỉ được tặng một món quà cho người mình yêu, bạn sẽ chọn gì?",
    "Hãy kể về một lần gặp gỡ mà bạn nhớ mãi",
    "iều gì khiến một buổi gặp đầu tiên trở nên đáng nhớ?",
    "Mọi lỗi lầm có xứng đáng được tha thứ?",
    "Điều gì làm nên một nhóm bạn tốt ở đại học?",
    "Bạn nghĩ tình bạn thời sinh viên có dễ kéo dài sau khi ra trường không?",
    "Ba phẩm chất quan trọng nhất của người bạn đời lý tưởng",
    "Bạn nghĩ nên chọn người mình yêu hay người phù hợp với mình?",
    "Điều gì giúp một tình bạn kéo dài nhiều năm?",
    "Vì sao nhiều tình bạn dần phai nhạt theo thời gian?",
    "Điều thú vị nhất trong một buổi họp lớp",
    "Sau chia tay, điều gì giúp một người vượt qua nhanh hơn?",
    "Bạn nghĩ chia tay luôn là điều tiêu cực không?",
    "Bài học lớn nhất mà một mối quan hệ có thể mang lại là gì?",
    "Kỷ niệm tuổi thơ nào khiến bạn nhớ nhất?",
    "Có bài học nào từ tuổi thơ vẫn ảnh hưởng đến bạn hôm nay không?",
    "Nếu được quay về một ngày thời thơ ấu, bạn sẽ chọn ngày nào?",
    "Điều bạn trân trọng nhất ở anh chị em của mình là gì?",
    "Anh chị em ảnh hưởng đến tính cách của chúng ta như thế nào?",
    "Nếu được chọn một loài vật để nuôi, bạn sẽ chọn gì?",
    "Cách xây dựng những mối quan hệ chất lượng",
    "Chuyến đi nào cùng gia đình khiến bạn nhớ nhất?",
    "Bạn có từng chủ động liên lạc lại với một người bạn cũ không?",
    "Có nên quá thân với đồng nghiệp không?",
    "Phẩm chất quan trọng nhất mà cha mẹ nên dạy con",
    "Nếu sau này có con, bạn muốn dạy con điều gì đầu tiên?",
    "Kỷ luật hay sự thấu hiểu quan trọng hơn trong việc nuôi dạy con?",
    "Vì sao người trẻ nên tham gia các hoạt động cộng đồng?",
    "Người thầy hoặc cô giáo nào đã ảnh hưởng đến bạn nhiều nhất?",
    "Quan hệ hàng xóm ngày nay có khác trước đây không?",
    "Điều gì tạo nên một đám cưới đáng nhớ?",
    "Bạn thích một đám cưới đơn giản hay hoành tráng?",
    "Bạn đã từng được một người lạ giúp đỡ chưa?",
    "Nguyên nhân phổ biến nhất dẫn đến mâu thuẫn giữa bạn bè",
    "Ý nghĩa của bữa tối gia đình",
    "Lợi ích của cộng đồng online",
    "Một truyền thống gia đình bạn muốn giữ",
  ],
  "Sở thích": [
    "Sở thích bạn từng bỏ giữa chừng",
    "Khi còn nhỏ, bạn thích làm gì nhất sau giờ học?",
    "Có sở thích nào thời thơ ấu mà bạn vẫn còn nhớ đến bây giờ không?",
    "Sở thích thời nhỏ đã ảnh hưởng đến con người hiện tại của bạn như thế nào?",
    "Sở thích bạn vô tình tìm lại sau nhiều năm",
    "Có sở thích nào bạn luôn muốn thử nhưng vẫn chưa bắt đầu?",
    "Nếu không sợ thất bại, bạn sẽ thử điều gì đầu tiên?",
    "Hoạt động nào khiến bạn có thể làm hàng giờ mà không thấy chán?",
    "Sở thích bạn học được từ gia đình",
    "Gia đình có ảnh hưởng đến sở thích của một người nhiều không?",
    "Có sở thích nào bạn muốn truyền lại cho thế hệ sau không?",
    "Sở thích từ nhỏ đến giờ vẫn giữ",
    "Điều gì giúp một sở thích tồn tại lâu dài?",
    "Bạn đã từng quen một người bạn nhờ có cùng sở thích chưa?",
    "Nếu muốn mở rộng mối quan hệ, bạn sẽ tham gia hoạt động nào?",
    "Bạn tự hào nhất về sở thích nào của mình?",
    "Bạn muốn người khác nhớ đến mình qua sở thích nào?",
    "Nếu được học một bộ môn nghệ thuật, bạn sẽ chọn gì?",
    "Nghệ thuật có vai trò gì trong cuộc sống?",
    "Bạn thường làm gì để tận hưởng cuối tuần?",
    "Bạn thích dành cuối tuần để nghỉ ngơi hay khám phá điều mới?",
    "Bạn từng tự học kỹ năng nào mà không ai bắt buộc?",
    "Kỹ năng nào đáng để ai cũng nên tự học?",
    "Làm nghề từ đam mê có luôn là điều tốt?",
    "Bạn nghĩ điều gì quan trọng hơn: đam mê hay thu nhập?",
    "Đam mê của bạn hiện nay khác gì so với vài năm trước?",
    "Vì sao đam mê của con người lại thay đổi?",
    "Bạn nghĩ sau 10 năm nữa mình sẽ theo đuổi điều gì?",
    "Có đam mê nào bạn ít khi chia sẻ với người khác không?",
    "Điều gì khiến bạn hào hứng nhất trong thời gian gần đây?",
    "Sở thích nào khiến bạn chi tiêu nhiều nhất?",
    "Có đáng để đầu tư tiền cho đam mê không?",
    "Nếu ngân sách không giới hạn, bạn sẽ đầu tư học thêm điều gì?",
    "Thể loại nhạc bạn nghe nhiều nhất",
    "Một bài hát nào luôn khiến bạn có tâm trạng tốt hơn?",
    "Gu âm nhạc của bạn đã thay đổi như thế nào theo thời gian?",
    "Trò chơi nào gợi bạn nhớ nhất về tuổi thơ?",
    "Bạn học được điều gì từ những trò chơi ngày nhỏ?",
    "Chơi game mang lại nhiều lợi ích hay tác hại hơn?",
    "Kênh YouTube, TikTok hoặc podcast nào đã thay đổi cách bạn suy nghĩ?",
    "Nghệ sĩ hoặc người sáng tạo bạn ngưỡng mộ",
    "Bộ phim nào bạn có thể xem nhiều lần mà không chán?",
    "Cuốn sách đã thay đổi góc nhìn của bạn",
    "Môn thể thao bạn yêu thích",
    "Thể thao đã mang lại điều gì cho cuộc sống của bạn?",
    "Nơi bạn muốn đi du lịch nhất",
    "Món ăn bạn có thể ăn mãi không chán",
    "Có món ăn nào gắn với 1 kỷ niệm của bạn không?",
    "Nếu phải giới thiệu một món ăn Việt Nam cho bạn bè quốc tế, bạn sẽ chọn gì?",
    "Khi căng thẳng, bạn thường làm gì để cân bằng lại?",
    "Hoạt động nào giúp bạn lấy lại năng lượng nhanh nhất?",
    "Bạn thích hoạt động ngoài trời nào nhất?",
    "Lợi ích cảu việc dành thời gian ngoài thiên nhiên",
    "Điều gì khiến nhiều người dễ từ bỏ sở thích của mình?",
    "Bạn làm gì để duy trì một sở thích trong thời gian dài?",
    "Nên dành bao nhiêu thời gian mỗi tuần cho sở thích cá nhân?",
    "Liệu kiếm tiền từ sở thích có làm mất đi niềm vui ban đầu?",
    "Những sở thích nào có thể trở thành nguồn thu nhập?",
    "Vì sao ai cũng nên có ít nhất một sở thích hoặc đam mê?",
    "Một người chỉ biết làm việc mà không có sở thích riêng sẽ gặp những khó khăn gì?",
    "Nếu phải thuyết phục một người quá bận rộn tìm một sở thích mới, bạn sẽ nói gì?",
  ],
  "Sức khỏe": [
    "Điều gì ảnh hưởng nhiều nhất đến sức khỏe tinh thần của người trẻ hiện nay?",
    "Bạn thường làm gì để chăm sóc sức khỏe tinh thần của mình?",
    "Làm thế nào để nhận ra một người đang cần được hỗ trợ về tinh thần?",
    "Bạn thường có thói quen gì trước khi đi ngủ?",
    "Điều gì giúp cơ thể thư giãn và ngủ ngon hơn?",
    "Bạn có thường dùng điện thoại trước khi ngủ không? Điều đó ảnh hưởng thế nào đến bạn?",
    "Skincare là nhu cầu cần thiết hay chỉ là sở thích?",
    "Nếu chỉ được giữ lại một sản phẩm skincare, bạn sẽ chọn gì?",
    "Khi cảm thấy kiệt sức, bạn thường dành một ngày nghỉ như thế nào?",
    "Bạn có một nơi nào giúp mình cảm thấy bình yên không?",
    "Khi căng thẳng, bạn thích ở một mình hay ở cạnh người khác?",
    "Vì sao đôi khi con người chỉ cần một không gian yên tĩnh?",
    "Chỉ số nhịp tim khi nghỉ (RHR)",
    "Bạn đã từng viết nhật ký biết ơn chưa?",
    "Việc ghi lại những điều tích cực mỗi ngày mang lại lợi ích gì?",
    "Nếu viết nhật ký biết ơn hôm nay, bạn sẽ ghi điều gì đầu tiên?",
    "Bạn thường nghĩ về điều gì khi đi bộ một mình?",
    "Bạn có sẵn sàng đi dạo mà không mang theo điện thoại không?",
    "Bạn đã từng tập luyện đến mức kiệt sức chưa?",
    "Làm sao để biết mình đang tập quá sức?",
    "Môi trường làm việc ảnh hưởng đến năng suất như thế nào?",
    "Bạn thích một góc làm việc tối giản hay nhiều đồ trang trí?",
    "Điều khó khăn nhất khi cai đường là gì?",
    "Nếu phải giảm một loại đồ ăn hoặc đồ uống để khỏe hơn, bạn sẽ chọn gì?",
    "Ngâm chân nước ấm",
    "Chạy bộ đường dài",
    "Liệu pháp lạnh",
    "Việc đi bộ mang lại lợi ích gì cho sức khỏe?",
    "Nếu quá bận, bạn sẽ làm gì để tăng lượng vận động trong ngày?",
    "Yoga",
    "Điều gì quyết định một giấc ngủ chất lượng?",
    "Vì sao hít thở sâu có thể giúp con người bình tĩnh hơn?",
    "Bạn thường làm gì để lấy lại bình tĩnh trong những tình huống áp lực?",
    "Nhịn ăn gián đoạn",
    "Đọc sách trước khi ngủ",
    "Tắm nắng buổi sáng",
    "Bổ sung vitamin D",
    "Thiền định",
    "Bài tập thở 4-7-8",
  ],
  "Tài chính": [
    "Thẻ tín dụng và bẫy nợ",
    "Ngân sách 50/30/20",
    "Lạm phát ảnh hưởng đến cuộc sống hằng ngày như thế nào?",
    "Nếu chỉ gửi tiết kiệm trong nhiều năm liệu có đủ để bảo vệ giá trị đồng tiền không?",
    "Bạn sẽ làm gì để tiền của mình không mất giá theo thời gian?",
    "Dòng tiền",
    "Điều gì giúp bạn quản lý dòng tiền hiệu quả hơn?",
    "Thuế thu nhập cá nhân",
    "Đóng thuế mang lại ý nghĩa gì cho xã hội?",
    "Chứng khoán",
    "Danh mục đầu tư đa dạng",
    "Bạn sẽ phân bổ tài sản như thế nào nếu bắt đầu đầu tư?",
    "Tài sản nào có thể tạo thu nhập thụ động?",
    "Chi tiêu có ý thức",
    "Điều gì khiến bạn dễ chi tiêu bốc đồng?",
    "Thế nào là chi tiêu thông minh?",
    "Bất động sản",
    "Khi đầu tư bất động sản, yếu tố nào quan trọng nhất?",
    "Tự do tài chính (FIRE)",
    "Để đạt được tự do tài chính cần đánh đổi điều gì?",
    "Vì sao nhiều người chọn mua vàng khi kinh tế bất ổn?",
    "Vàng hay gửi tiết kiệm",
    "Vàng là một khoản đầu tư hay chỉ để tích trữ?",
    "Thói quen nào giúp quản lý tiền bạc tốt hơn?",
    "Runway tài chính",
    "Bạn ưu tiên xây dựng runway tài chính hay đầu tư trước?",
    "Giá trị tài sản ròng",
    "Làm thế nào để tăng giá trị tài sản ròng theo thời gian?",
    "Bảo hiểm nhân thọ",
    "Bảo hiểm là chi phí hay một khoản đầu tư cho tương lai?",
    "Cần cân nhắc điều gì trước khi mua bảo hiểm nhân thọ?",
    "Bạn có sẵn sàng từ chối những niềm vui ngắn hạn để đạt mục tiêu lớn hơn không?",
    "Hãy kể một lần bạn trì hoãn hưởng thụ và kết quả nhận được",
    "Trì hoãn hưởng thụ có phải là kỹ năng quan trọng?",
    "Quỹ hưu trí",
    "Bạn hình dung cuộc sống sau khi nghỉ hưu sẽ như thế nào?",
    "Bẫy đăng ký dịch vụ",
    "Vì sao nhiều người chi tiền cho những dịch vụ ít sử dụng?",
    "Lối sống phình to",
    "Làm thế nào để tránh rơi vào 'lối sống phình to'?",
    "Vì sao thu nhập tăng thì chi tiêu cũng thường tăng theo?",
    "Kế hoạch tài chính theo độ tuổi",
    "Nợ lãi suất cao",
    "Quỹ dự phòng",
    "Điểm tín dụng",
    "Làm thế nào để xây dựng một lịch sử tín dụng tốt?",
    "Tốc độ đốt tiền",
    "Điều gì khiến nhiều người tiêu tiền nhanh hơn họ nghĩ?",
    "Tiền điện tử rủi ro cao",
    "Khẩu vị rủi ro",
    "Quỹ khẩn cấp 6 tháng",
    "Lãi kép",
    "Nếu có thể quay lại 10 năm trước, bạn sẽ thay đổi điều gì trong cách tiết kiệm hoặc đầu tư?",
    "Bạn nghĩ yếu tố nào quan trọng hơn để tận dụng lãi kép: số tiền hay thời gian?",
    "Vì sao lãi kép được gọi là 'kỳ quan thứ tám của thế giới'?",
    "Đầu tư định kỳ (DCA)",
    "Thách thức tài chính lớn nhất của Gen Z là gì?",
    "Gen Z nên ưu tiên tiết kiệm, đầu tư hay phát triển bản thân trước?",
    "Nếu chỉ được đưa ra một lời khuyên về tiền bạc cho người trẻ, bạn sẽ nói gì?",
    "Tư duy đầu tư dài hạn",
    "Sự khác biệt giữa tài sản và tiêu sản",
    "Nếu có 100 triệu đồng, bạn sẽ ưu tiên mua tài sản hay tiêu sản? Vì sao?",
    "Bạn có từng mua một món đồ tưởng là tài sản nhưng thực chất là tiêu sản không?",
  ],
  "Khởi nghiệp": [
    "Thời điểm thích hợp nhất để bắt đầu khởi nghiệp",
    "Một co-founder tốt cần có những phẩm chất gì?",
    "Bài học từ những startup thất bại",
    "Văn hóa phản hồi nhanh",
    "Làm thế nào để góp ý thẳng thắn mà vẫn giữ được tinh thần đội nhóm?",
    "Xoay trục (Pivot)",
    "Khi nào startup nên thay đổi hướng đi?",
    "Startup nên ưu tiên tăng trưởng hay tiết kiệm chi phí?",
    "Vòng đời sản phẩm",
    "Cùng gánh rủi ro (Skin in the game)",
    "Con hào kinh tế (Economic moat)",
    "Điều gì tạo nên lợi thế cạnh tranh bền vững?",
    "Một startup nhỏ có thể xây dựng 'con hào kinh tế' như thế nào?",
    "Làm việc chăm chỉ hay biết tận dụng đòn bẩy quan trọng hơn?",
    "Vì sao người ta nói 'tiền mặt là oxy của startup'?",
    "Đối tác đồng sáng lập (Co-founder)",
    "Điều gì dễ gây mâu thuẫn giữa các co-founder?",
    "Nghệ thuật nói không",
    "Làm sao biết sản phẩm đã thật sự phù hợp với thị trường?",
    "Thương hiệu cá nhân của founder",
    "Một thương hiệu cá nhân mạnh mang lại lợi ích gì cho startup?",
    "Thất bại nhanh (Fail Fast)",
    "Tự lực vốn (Bootstrapping) có ưu điểm và hạn chế gì?",
    "Vốn mồ hôi (Sweat Equity)",
    "Văn hóa công ty giai đoạn đầu",
    "Tư duy nhà sáng lập (Founder Mode)",
    "Thuê ngoài giai đoạn đầu (Outsourcing)",
    "Chiến lược định giá",
    "Điều gì quyết định mức giá của một sản phẩm?",
    "Kênh phân phối",
    "Bán trực tiếp hay qua trung gian?",
    "Xây dựng đội nhóm nhỏ có lợi thế gì so với nhóm lớn?",
    "Gọi vốn cộng đồng (Crowdfunding)",
    "Gọi vốn cộng đồng (Crowdfunding) phù hợp với những loại sản phẩm nào?",
    "Xây dựng công khai (Build in Public)",
    "Bạn có sợ bị sao chép ý tưởng nếu xây dựng công khai (Build in Public) không?",
    "chia sẻ quá trình xây dựng sản phẩm (Build in Public) có lợi ích gì?",
    "Quan hệ với nhà đầu tư",
    "Một nhà đầu tư tốt mang lại giá trị gì ngoài tiền?",
    "Quản trị rủi ro pháp lý",
    "Startup thường bỏ qua những rủi ro pháp lý nào?",
    "Vì sao doanh nghiệp nên thử nghiệm A/B trước khi quyết định?",
    "Bạn đã từng gặp ví dụ nào về A/B testing trong thực tế chưa?",
    "Tăng trưởng quá nhanh có thể gây ra những vấn đề gì?",
    "Chỉ số sao Bắc Đẩu (North Star Metric)",
    "Bạn sẽ làm gì nếu không ai muốn mua sản phẩm của mình?",
    "Chân dung khách hàng lý tưởng (ICP)",
    "Series B trở lên",
    "Startup cần thay đổi điều gì khi bước sang các vòng gọi vốn lớn?",
    "Điều gì giúp một startup phát triển sau Series A?",
    "Chiến lược thoái vốn",
    "Bạn sẽ chọn tiếp tục điều hành hay thoái vốn nếu có cơ hội?",
    "Hợp đồng đầu tư SAFE",
    "Hợp đồng đầu tư SAFE có lợi gì cho founder và nhà đầu tư?",
    "Làm sao để hạn chế xung đột giữa các founder?",
    "Bảng cổ phần (Cap Table)",
    "Việc chia cổ phần ban đầu cần lưu ý điều gì?",
    "Ban cố vấn",
    "Bảng cân đối kế toán startup",
    "Accelerator và Incubator",
    "Thẩm định doanh nghiệp",
    "Nhà đầu tư thường đánh giá startup dựa trên những yếu tố nào?",
    "Mua lại công ty (M&A)",
    "Một thương vụ M&A thành công cần những điều kiện gì?",
    "Vì sao nhiều startup chọn bán mình thay vì IPO?",
    "Quyền chọn cổ phiếu (ESOP)",
    "Bạn có sẵn sàng nhận ESOP thay cho một phần lương không?",
    "Định giá công ty",
    "Điều gì quyết định giá trị của một startup?",
    "Cơ chế trao quyền dần (Vesting)",
    "Nhà đầu tư dẫn dắt",
    "Sản phẩm khả dụng tối thiểu (MVP)",
    "Vì sao nên ra mắt MVP thay vì chờ sản phẩm hoàn hảo?",
    "Nếu xây dựng ứng dụng mới, tính năng đầu tiên bạn sẽ ưu tiên là gì?",
    "Thoái vốn từng phần",
    "Bạn sẽ giữ hay bán bớt cổ phần khi công ty tăng trưởng mạnh?",
    "Bộ slide gọi vốn (Pitch Deck)",
    "Điều gì làm nên một pitch deck thuyết phục?",
    "IPO",
    "Bạn nghĩ doanh nghiệp cần chuẩn bị gì trước khi IPO?",
    "Cổ phần pha loãng (Dilution)",
    "Khi nào pha loãng cổ phần là điều chấp nhận được?",
    "Bản điều khoản đầu tư (Term Sheet)",
    "Founder cần chú ý điều gì khi đọc term sheet?",
    "Series A",
    "Startup cần đạt được những gì trước khi gọi vốn Series A?",
    "Điều gì khiến startup thất bại ở vòng Series A?",
    "Cổ đông thiểu số",
    "Quyền lợi của cổ đông thiểu số nên được bảo vệ như thế nào?",
    "Kỳ lân (Unicorn)",
    "Runway 18 tháng",
    "Nếu runway chỉ còn 3 tháng, bạn sẽ ưu tiên giải quyết điều gì?",
    "Pre-money và Post-money",
    "Ngày trình diễn gọi vốn (Demo Day)",
    "Vòng gọi vốn hạt giống (Seed Round)",
    "Vòng gọi vốn định giá thấp hơn (Down Round)",
    "Founder nên làm gì để vượt qua một down round?",
    "Trái phiếu chuyển đổi",
    "Vì sao startup sử dụng trái phiếu chuyển đổi thay vì bán cổ phần ngay?",
    "Trái phiếu chuyển đổi mang lại lợi ích gì cho founder và nhà đầu tư?",
  ],
  "Tech/AI": [
    "Tương lai của lập trình viên khi có AI",
    "AI sẽ thay đổi ngành giáo dục như thế nào?",
    "Quyền riêng tư trong kỷ nguyên AI",
  ],
  "Thể hình": [
    "Chế độ ăn hay tập luyện quan trọng hơn?",
    "Làm sao để vượt qua sự lười biếng khi tập gym",
    "Sự thật về thực phẩm bổ sung",
  ],
  "Dinh dưỡng": [
    "Ăn sạch (Eat Clean)",
    "Điều khó nhất khi duy trì Eat Clean là gì?",
    "Chất béo bão hòa",
    "Chất béo bão hòa có phải lúc nào cũng có hại không?",
    "Ăn đêm ảnh hưởng như thế nào đến sức khỏe?",
    "Thực phẩm chức năng",
    "Đường tinh luyện",
    "Vi chất dinh dưỡng",
    "Vì sao vi chất dinh dưỡng quan trọng đối với cơ thể?",
    "Hệ vi sinh đường ruột",
    "Nhịn ăn gián đoạn",
    "Chế độ ăn Địa Trung Hải",
    "Carb tốt hay xấu",
    "Carbohydrate có phải là nguyên nhân khiến nhiều người tăng cân không?",
    "Ăn quá nhiều muối ảnh hưởng đến sức khỏe như thế nào?",
    "Ăn uống theo đồng hồ sinh học",
    "Giờ ăn có ảnh hưởng đến sức khỏe không?",
    "Protein hoàn chỉnh",
    "Người ăn chay có thể bổ sung đủ protein không?",
    "Ăn theo khẩu phần",
    "Điều gì khiến nhiều người ăn nhiều hơn mức cần thiết?",
    "Làm sao để kiểm soát khẩu phần mà không cảm thấy bị ép buộc?",
    "Đường huyết ổn định",
    "Bạn thường làm gì để tránh cảm giác đói hoặc mệt sau khi ăn?",
    "Những thói quen nào có thể giúp kiểm soát đường huyết tốt hơn?",
    "Thực phẩm lên men",
    "Cân bằng dinh dưỡng đa lượng",
    "Bổ sung vitamin",
    "Bữa sáng có phải là bữa ăn quan trọng nhất trong ngày?",
    "Chế độ ăn Keto",
    "Ăn chay trường",
    "Người ăn chay cần lưu ý điều gì để đảm bảo dinh dưỡng?",
    "Calo rỗng",
    "Bạn thường tiêu thụ calo rỗng từ những thực phẩm nào?",
    "Chỉ số đường huyết (GI)",
    "Ăn thuần chay",
    "Chất tạo ngọt ăn kiêng",
    "Nước và hydrat hóa",
    "Omega-3",
    "Thực phẩm hữu cơ",
    "Chất xơ hòa tan",
    "Chất bảo quản thực phẩm",
  ],
  "Năng suất": [
    "Phương pháp Pomodoro trong công việc",
    "Deep Work - Kỹ năng làm việc sâu",
    "Cách vượt qua sự trì hoãn hiệu quả",
  ],
  Marketing: [
    "Sức mạnh của Storytelling trong bán hàng",
    "Marketing truyền miệng (Word of mouth)",
    "Xây dựng thương hiệu cá nhân qua mạng xã hội",
  ],
  "Tâm lý học": [
    "Hiệu ứng Dunning-Kruger là gì?",
    "Tại sao chúng ta lại sợ thất bại?",
    "Ngôn ngữ cơ thể ảnh hưởng thế nào trong giao tiếp?",
  ],
  "Mô hình tư duy": [
    "Tư duy hệ thống (Systems Thinking)",
    "First Principles Thinking - Tư duy từ nguyên lý đầu tiên",
    "Framework giải quyết vấn đề hiệu quả",
  ],
  Luật: [
    "Tầm quan trọng của hợp đồng trong kinh doanh",
    "Bản quyền trong thời đại số",
    "Hiểu đúng về quyền lợi của người lao động",
  ],
  "Triết học": [
    "Chủ nghĩa khắc kỷ (Stoicism) trong kỷ nguyên số",
    "Thuyết hiện sinh trong đời sống hằng ngày",
    "Định nghĩa về hạnh phúc thực sự",
  ],
  "Lịch sử & Thế giới": [
    "Cuộc Đại suy thoái kinh tế",
    "Dịch nhảy múa năm 1518",
    "Hành trình của Marco Polo",
    "Thư viện Alexandria",
    "Sự ra đời chữ Quốc ngữ",
    "Bộ luật Hammurabi",
    "Người đặt chân lên Mặt Trăng",
    "Chiến thắng Bạch Đằng",
    "Lời nguyền Tutankhamun",
    "Nền văn minh Maya",
    "Vạn Lý Trường Thành",
    "Thành Pompeii",
    "Thương cảng Hội An",
    "Bà Triệu cưỡi voi ra trận",
    "Kinh thành Huế",
    "Samurai và tinh thần Bushido",
    "Đấu sĩ La Mã",
    "Người Viking",
    "Đại suy thoái 1929",
    "Marie Curie",
    "Đế chế La Mã",
    "Galileo Galilei và kính thiên văn",
    "Khởi nghĩa Hai Bà Trưng",
    "Con đường Tơ lụa",
    "Hoàng thành Thăng Long",
    "Thảm họa tàu Titanic",
    "Cuộc chiến dòng điện",
    "Văn Miếu - Quốc Tử Giám",
    "Thời kỳ Phục Hưng",
    "Alexander Đại đế",
    "Leonardo da Vinci",
    "Thành Cát Tư Hãn",
    "Chiếu Dời Đô",
    "Cách mạng công nghiệp",
    "Đội quân đất nung",
    "Thánh địa Mỹ Sơn",
    "Nhà nước Văn Lang",
    "Chiến binh Sparta",
    "Hịch Tướng Sĩ",
    "Máy in Gutenberg",
    "Nam Quốc Sơn Hà",
    "Hội nghị Diên Hồng",
    "Thế vận hội Olympic cổ đại",
    "Cơn sốt hoa tulip",
    "Kim tự tháp Giza",
    "Đại dịch Cái Chết Đen",
    "Anh em nhà Wright",
    "Trống đồng Đông Sơn",
    "Thời đại Khám phá",
    "Nữ hoàng Cleopatra",
    "Hiệp sĩ Dòng Đền",
    "Những biểu tượng may mắn của Singapore",
    "Hội kín Illuminati",
    "Tên gọi các quận ở TP.HCM",
    "Lịch sử kính râm",
    "Hiện tượng mù tuyết",
    "Truyền thuyết Dracula",
    "Thành phố của những con mắt (Sibiu)",
    "Đường cao tốc Autobahn",
    "Dãy núi Dolomites",
    "Nguồn cảm hứng cho các tòa lâu đài Disney",
  ],
  Sách: [
    "Quy luật bất biến về bản chất con người và tâm lý làm giàu - Morgan Housel",
    "Tâm lý học về tiền - Morgan Housel",
    "Ác ý - Higashino Keigo",
    "Thẩm phán và đao phủ - Friedrich Durrenmatt",
    "Nhà giả kim - Paulo Coelho",
    "Đàn ông sao hỏa, đàn bà sao kim - John Gray",
    "Lớp học của cừu - Sơn Trà Miêu",
    "Sống khai vấn - Sống tỉnh thức - Brianna Wiest",
    "Những quy luật của bản chất con người - Robert Greene",
    "Phải trái đúng sai - Michael Sandel",
    "Tiền không mua được gì? - Michael Sandel",
    "Người giàu có nhất thành Babylon - George S.Clason",
    "Kế hoạch Marketing trên một trang giấy - Allan Dib",
    "Siêu kinh tế học hài hước - Steven D. Levitt",
    "Từ tốt đến vĩ đại - Jim Collins",
    "Phi lý trí - Dan Ariely",
    "Áo giáp của Iron Man giá bao nhiêu? - Park BYung Ryul",
    "Plato và con thú mỏ vịt bước vào quán bar - Thomas Cathcart",
    "Hai số phận - Jeffrey Archer",
    "Chủ nghĩa khắc kỷ - William B. Irvine",
    "Cư xư như đàn bà, suy nghĩ như đàn ông - Steve Harvey",
    "Ngài Cóc đi gặp bác sĩ tâm lý - Robert de Board",
    "Phút dừng lại của người thông minh - Atul Gawande",
    "Cứ làm đi - Austin Kleon",
    "Nghệ thuật đánh cắp ý tưởng - Austin Kleon",
    "12 quy luật cuộc đời - Jordan B. Peterson",
    "Nghệ thuật tinh tế của việc đếch quan tâm - Mark Manson",
    "Ba người thầy vĩ đại - Robin Sharma",
    "Nhà lãnh đạo không chức danh - Robin Sharma",
    "Khác biệt hay là chết - Jack Trout, Steve Rivkin",
    "Thiện, ác và smartphone - Đặng Hoàng Giang",
    "Tư duy nhanh và chậm - Daniel Kahneman",
    "Dám hạnh phúc - Kishimi Ichro",
    "Thói quen nguyên tử Atomic Habits - James Clear",
    "Tôi tài giỏi, bạn cũng thế - Adam Khoo",
    "Search Ínide Yourself - Chade Meng Tan",
    "Trên đường băng - Tony Buối Sáng",
    "Dám nghĩ lại - Adam Grant",
    "Súng, vi trùng và thép - Jared Diamond",
    "Tuổi trẻ đáng giá bao nhiêu? - Rosie Nguyễn",
    "Chó sủa nhầm cây - Eric Barker",
    "Tôi tự học - Nguyễn Duy Cần",
    "Đi tìm lẽ sống - Viltor E. Frankl",
    "Óc sáng suốt - Nguyễn Duy Cần",
    "Bắt đầu với câu hỏi tại sao- Simon Sinek",
    "Thức tỉnh mục đích sống - Eckhart Tolle",
    "Mindset:Tâm lý học thành công - Carol S. Dweck",
    "Đừng bao giờ đi ăn một mình - Keith Ferrazzi",
    "Bốn thỏa ước - Don Miguel Ruiz",
    "7 thói quen của bạn trẻ thành đạt - Sean Covey",
    "Nghệ thuật theo đuổi sự tối giản - Greg McKeown",
    "Người bán hàng vĩ đại nhất thế giới -  Og Mandino",
    "Người thợ mộc lạ lùng - Jon Gordon",
    "Lời hứa về một cây bút chì - Adam Braun",
    "Hiểu về trái tim - Minh Niệm",
    "50 việc cần làm ở tuổi 20 - Akihiro Ankatani",
    "Sức mạnh của thói quen - Charles Duhigg",
    "Những kẻ xuất chúng - Malcolm Gladwell",
    "Cách sống từ bình thường trở nên phi thường - Inamori Kazuo",
  ],
};

const ALL_CATEGORIES = Object.keys(CATEGORY_DATA);

// --- HỆ THỐNG LEVEL VÀ XP ---
const LEVEL_THRESHOLDS = [
  { level: 1, name: "Não Phẳng", minXp: 0 },
  { level: 2, name: "Não Gợn Sóng", minXp: 300 },
  { level: 3, name: "Não Có Nếp", minXp: 700 },
  { level: 4, name: "Não Nhăn", minXp: 1200 },
  { level: 5, name: "Đại Não", minXp: 2000 },
  { level: 6, name: "Siêu Não", minXp: 3000 },
  { level: 7, name: "Não Thông Thái", minXp: 5000 },
];
const STATS_KEY = "nao_nhan_stats";
const XP_SPEAK = 15;
const XP_PRON = 5;
const XP_SUMMARY = 10;
const calculateLevelInfo = (totalXp) => {
  let current = LEVEL_THRESHOLDS[0];
  let next = LEVEL_THRESHOLDS[1];
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i].minXp) {
      current = LEVEL_THRESHOLDS[i];
      next = LEVEL_THRESHOLDS[i + 1] || current;
    }
  }
  const xpInCurrent = totalXp - current.minXp;
  const xpNeeded = next.minXp - current.minXp;
  const percentage =
    xpNeeded > 0 ? Math.floor((xpInCurrent / xpNeeded) * 100) : 100;
  return { ...current, nextXp: next.minXp, percentage };
};
// --- Hàm xử lý ngày, streak, tuần ---
const toDateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const daysBetween = (a, b) => {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db - da) / 86400000);
};

// Streak hiện tại: nếu bỏ qua từ 2 ngày trở lên thì về 0
const getCurrentStreak = (stats) => {
  if (!stats.lastActiveDate) return 0;
  const gap = daysBetween(stats.lastActiveDate, toDateKey());
  return gap <= 1 ? stats.streak || 0 : 0;
};
const computeStreak = (prev, today) => {
  const streak = prev.streak || 0;
  if (!prev.lastActiveDate) return 1;
  const gap = daysBetween(prev.lastActiveDate, today);
  if (gap === 0) return Math.max(streak, 1);
  if (gap === 1) return streak + 1;
  return 1;
};

// Dữ liệu 7 ngày của tuần này (T2 -> CN)
const getWeekData = (dailySeconds) => {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // T2 = 0
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow);
  const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const todayKey = toDateKey();
  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = toDateKey(d);
    const minutes = Math.round(((dailySeconds[key] || 0) / 60) * 10) / 10;
    return { label, minutes, isToday: key === todayKey };
  });
};

const formatStudyTime = (sec) => {
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}p`;
  return `${(sec / 3600).toFixed(1)}h`;
};
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};
// --- Ghi âm + chuyển giọng nói thành chữ ---
const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    : null;

const useSpeechRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const [segments, setSegments] = useState<any[]>([]);

  const mediaRecorderRef = useRef<any>(null);
  const chunksRef = useRef<any[]>([]);
  const streamRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const wantRecognitionRef = useRef(false);
  const finalRef = useRef("");
  const segmentsRef = useRef<any[]>([]);
  const lastResultAtRef = useRef(0);
  const maxGapRef = useRef(0);

  const start = async () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setTranscript("");
    setInterim("");
    setError("");
    finalRef.current = "";
    segmentsRef.current = [];
    setSegments([]);

    if (!navigator.mediaDevices || typeof MediaRecorder === "undefined") {
      setError(
        "Trình duyệt này không hỗ trợ ghi âm. Cậu thử Chrome hoặc Edge nhé."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      lastResultAtRef.current = 0;
      maxGapRef.current = 0;
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) {
      setError(
        "Không bật được micro. Cậu bấm biểu tượng ổ khóa cạnh thanh địa chỉ, cho phép Micro rồi thử lại nhé."
      );
      return;
    }

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = "vi-VN";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        const nowMs = Date.now();
        if (lastResultAtRef.current) {
          maxGapRef.current = Math.max(
            maxGapRef.current,
            (nowMs - lastResultAtRef.current) / 1000
          );
        }
        lastResultAtRef.current = nowMs;
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalRef.current += result[0].transcript + " ";
            segmentsRef.current = [
              ...segmentsRef.current,
              {
                text: result[0].transcript.trim(),
                confidence: result[0].confidence,
              },
            ];
            setSegments(segmentsRef.current);
          } else {
            interimText += result[0].transcript;
          }
        }
        setTranscript(finalRef.current.trim());
        setInterim(interimText);
      };

      recognition.onerror = (e) => {
        if (
          e.error === "not-allowed" ||
          e.error === "service-not-allowed" ||
          e.error === "audio-capture"
        ) {
          wantRecognitionRef.current = false;
          setError("Trình duyệt không cho dùng nhận diện giọng nói.");
        } else if (e.error === "network") {
          wantRecognitionRef.current = false;
          setError(
            "Không kết nối được dịch vụ nhận diện giọng nói (cần có mạng)."
          );
        }
      };

      // Chrome tự ngắt sau một khoảng im lặng, nên tự bật lại cho đến khi cậu bấm dừng
      recognition.onend = () => {
        if (wantRecognitionRef.current) {
          setTimeout(() => {
            if (!wantRecognitionRef.current) return;
            try {
              recognition.start();
            } catch (err) {}
          }, 300);
        } else {
          setInterim("");
        }
      };

      wantRecognitionRef.current = true;
      try {
        recognition.start();
      } catch (err) {}
      recognitionRef.current = recognition;
    }
  };

  const stop = () => {
    wantRecognitionRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch (e) {}
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Khoảng im lặng dài nhất giữa hai lần nghe thấy chữ (null nếu chưa nghe được gì)
  const getStats = () => {
    if (!lastResultAtRef.current) return { maxGap: null };
    return {
      maxGap: Math.max(
        maxGapRef.current,
        (Date.now() - lastResultAtRef.current) / 1000
      ),
    };
  };
  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setTranscript("");
    setInterim("");
    setError("");
    finalRef.current = "";
    segmentsRef.current = [];
    setSegments([]);
  };

  // Rời khỏi trang thì tắt micro
  useEffect(() => {
    return () => {
      wantRecognitionRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      try {
        if (mediaRecorderRef.current?.state === "recording")
          mediaRecorderRef.current.stop();
      } catch (e) {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    isRecording,
    audioUrl,
    transcript,
    interim,
    error,
    segments,
    speechSupported: !!SpeechRecognitionAPI,
    start,
    stop,
    reset,
    getStats,
  };
};

// --- Phân tích bài nói từ chữ đã nhận diện ---
const SPEED_SLOW = 180; // dưới mức này: hơi chậm
const SPEED_FAST = 260; // trên mức này: hơi nhanh
// Hai mốc trên là mình đặt ước chừng, cậu chỉnh theo cảm giác của mình.

const FILLER_PHRASES = [
  "ờ",
  "ừm",
  "ừ",
  "ớ",
  "hừm",
  "kiểu như",
  "kiểu là",
  "thì là",
  "nói chung là",
  "đại loại là",
];

const normalizeText = (t) =>
  (t || "")
    .toLowerCase()
    .replace(/[.,!?;:"“”()\-–…]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const countPhrase = (text, phrase) => {
  const padded = ` ${text} `;
  const needle = ` ${phrase} `;
  let count = 0;
  let idx = padded.indexOf(needle);
  while (idx !== -1) {
    count++;
    idx = padded.indexOf(needle, idx + needle.length - 1);
  }
  return count;
};

const analyzeSpeech = (rawText, seconds) => {
  const text = normalizeText(rawText);
  const tokens = text ? text.split(" ") : [];
  const words = tokens.length;
  const wpm = seconds > 0 ? Math.round(words / (seconds / 60)) : 0;

  let speedLabel = "Vừa phải";
  if (wpm < SPEED_SLOW) speedLabel = "Hơi chậm";
  else if (wpm > SPEED_FAST) speedLabel = "Hơi nhanh";

  const fillers = FILLER_PHRASES.map((p) => ({
    phrase: p,
    count: countPhrase(text, p),
  }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count);
  const fillerTotal = fillers.reduce((sum, f) => sum + f.count, 0);

  // Từ lặp liền nhau, ví dụ "là là", "thì thì"
  const repeatMap = {};
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i] === tokens[i - 1]) {
      repeatMap[tokens[i]] = (repeatMap[tokens[i]] || 0) + 1;
    }
  }
  const repeats = Object.entries(repeatMap).map(([word, count]) => ({
    word,
    count,
  }));

  return { words, wpm, speedLabel, fillers, fillerTotal, repeats };
};
// --- So sánh lời nói với câu mẫu (dùng cho khóa Phát Âm) ---
const compareSpeech = (targetRaw, spokenRaw) => {
  const norm = (t) => normalizeText(t).normalize("NFC");
  const target = norm(targetRaw).split(" ").filter(Boolean);
  const spoken = norm(spokenRaw).split(" ").filter(Boolean);
  const n = target.length;
  const m = spoken.length;

  // Tìm dãy từ khớp dài nhất (LCS) để so cho công bằng dù cậu nói thừa/thiếu từ
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] =
        target[i - 1] === spoken[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const matched = Array(n).fill(false);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (target[i - 1] === spoken[j - 1]) {
      matched[i - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  const hit = matched.filter(Boolean).length;
  return {
    words: target.map((w, k) => ({ word: w, ok: matched[k] })),
    score: n > 0 ? Math.round((hit / n) * 100) : 0,
  };
};

// Tốc độ giọng đọc mẫu: 1 = tốc độ gốc của giọng, nhỏ hơn thì chậm hơn
// (0.6 khá chậm, 0.7 vừa phải, 0.85 hơi chậm)
const TTS_RATE = 0.8;
const TTS_VOICE_KEY = "nao_nhan_tts_voice";

// Chỉ lấy các giọng TIẾNG VIỆT thật sự có trên máy
const getViVoices = () => {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) =>
      (v.lang || "").toLowerCase().replace("_", "-").startsWith("vi")
    );
};

// Giọng "tự nhiên" (Microsoft Natural/Online, HoaiMy, NamMinh, Google) được ưu tiên
const voiceScore = (v) => {
  let s = 0;
  if (/natural|online/i.test(v.name)) s += 3;
  if (/hoaimy|namminh/i.test(v.name)) s += 2;
  if (/google/i.test(v.name)) s += 1;
  return s;
};

const pickViVoice = () => {
  const list = getViVoices();
  if (list.length === 0) return null;
  let saved = "";
  try {
    saved = localStorage.getItem(TTS_VOICE_KEY) || "";
  } catch (e) {}
  const chosen = list.find((v) => v.name === saved);
  if (chosen) return chosen;
  return [...list].sort((a, b) => voiceScore(b) - voiceScore(a))[0];
};

let warnedNoViVoice = false;

const speakText = (text) => {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    alert(
      "Trình duyệt này không hỗ trợ đọc mẫu. Cậu thử Chrome hoặc Edge nhé."
    );
    return;
  }
  const voice = pickViVoice();
  if (!voice) {
    if (!warnedNoViVoice) {
      warnedNoViVoice = true;
      alert(
        "Máy của cậu chưa có giọng đọc tiếng Việt nên mình không đọc mẫu (đọc bằng giọng nước ngoài sẽ nghe sai). Cậu thử mở bằng Microsoft Edge, hoặc cài thêm giọng tiếng Việt trong phần cài đặt giọng nói của máy nhé."
      );
    }
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = TTS_RATE;
  window.speechSynthesis.speak(u);
};

// Danh sách giọng tiếng Việt (tự cập nhật vì trình duyệt tải giọng chậm)
const useViVoices = () => {
  const [voices, setVoices] = useState(getViVoices());
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const update = () => setVoices(getViVoices());
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);
  return voices;
};

// Ô chọn giọng đọc mẫu
const VoicePicker = () => {
  const voices = useViVoices();
  const [chosen, setChosen] = useState(() => {
    try {
      return localStorage.getItem(TTS_VOICE_KEY) || "";
    } catch (e) {
      return "";
    }
  });

  if (voices.length === 0) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 text-yellow-700 font-bold text-sm p-4 rounded-2xl">
        🔈 Máy này chưa có giọng đọc tiếng Việt, nên nút nghe mẫu sẽ không đọc.
        Cậu thử mở bằng Microsoft Edge (thường có sẵn giọng Việt tự nhiên) hoặc
        cài thêm giọng tiếng Việt trong cài đặt giọng nói của máy.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white border-2 border-gray-200 p-3 rounded-2xl">
      <span className="text-sm font-bold text-gray-600">🔈 Giọng đọc mẫu:</span>
      <select
        value={chosen}
        onChange={(e) => {
          const name = e.target.value;
          setChosen(name);
          try {
            if (name) localStorage.setItem(TTS_VOICE_KEY, name);
            else localStorage.removeItem(TTS_VOICE_KEY);
          } catch (err) {}
          setTimeout(() => speakText("Xin chào, đây là giọng đọc mẫu."), 50);
        }}
        className="border-2 border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-700 outline-none focus:border-blue-400 max-w-full"
      >
        <option value="">Tự chọn giọng tốt nhất</option>
        {voices.map((v) => (
          <option key={v.name} value={v.name}>
            {v.name}
          </option>
        ))}
      </select>
      {!voices.some((v) => /natural|online/i.test(v.name)) &&
        !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && (
          <span className="w-full text-xs font-bold text-orange-500">
            💡 Máy này chỉ có giọng cơ bản. Mở bằng Microsoft Edge để nghe giọng
            tiếng Việt tự nhiên hơn.
          </span>
        )}
    </div>
  );
};
// --- Soạn prompt để người dùng tự dán vào ChatGPT / Gemini / Claude ---
const ROLE_PROMPT = {
  "Giảng viên":
    "giảng viên đại học nghiêm túc nhưng công bằng, luôn hỏi sâu về lập luận, bằng chứng, nguyên nhân, giả định và tính logic",
  "Khách hàng":
    "khách hàng tiềm năng, quan tâm đến giá trị thực tế, chi phí, i ích, rủi ro, tính khả thi và lý do nên tin tưởng",
  "Nhà tuyển dụng":
    "nhà tuyển dụng đang phỏng vấn, hay hỏi về kinh nghiệm thật, ví dụ cụ thể, thất bại, cách xử lý và bài học rút ra",
  "Người bạn":
    "người bạn thân, nói chuyện tự nhiên, thoải mái, thẳng thắn, thông minh, hỏi lại chỗ nào nghe chưa thuyết phục",
};

const STYLE_PROMPT = {
  "Tự nhiên": "tự nhiên, gần gũi như đang nói chuyện, câu ngắn, dễ nghe",
  "Học thuật":
    "học thuật, chặt chẽ, dùng thuật ngữ chính xác, lập luận rõ ràng",
  "Thuyết phục":
    "thuyết phục, có sức nặng, nêu rõ lợi ích và kết thúc bằng lời kêu gọi hành động",
};

const buildDiscussPrompt = ({
  role,
  topic,
  framework,
  text,
}) => `Hãy đóng vai ${ROLE_PROMPT[role]}.

Mình vừa luyện nói và muốn thảo luận sâu để hiểu rõ hơn vấn đề.

THÔNG TIN MÌNH CUNG CẤP:
Chủ đề: ${topic || "(tự do)"}
Cấu trúc mình đã dùng: ${framework || "(không rõ)"}

Nội dung mình đã nói:
"
${text || "[Dán nội dung bài nói của bạn vào đây]"}
"

CÁCH LÀM VIỆC:
Bước 1. Đánh giá nhanh
Trước tiên hãy nhận xét trong 2-3 câu:
- Điểm mạnh của bài nói
- Điểm còn yếu nhất
- Cấu trúc mình dùng đã phù hợp với chủ đề chưa
KHÔNG SỬA TOÀN BỘ BÀI NÓI

Bước 2. Thảo luận sâu
Sau đó hãy bắt đầu cuộc trao đổi

Quy tắc:
- Mỗi lượt chỉ hỏi đúng MỘT câu hỏi
- Sau khi mình trả lời mới được hỏi tiếp
- Không hỏi nhiều câu trong một tin nhắn
- Nếu câu trả lời của mình chưa đủ, hãy tiếp tục đào sâu ngay chính ý đó thay vì chuyển sang ý khác 

Ưu tiên hỏi về:
- Vì sao?
- Có bằng chứng nào?
- Có ví dụ thực tế không?
- Có số liệu hay nghiên cứu nào không?
- Có trường hợp ngoại lệ không?
- Nếu người khác phản đối thì sao?
- Chi phí, rủi ro và lợi ích là gì?
- Nếu áp dụng ngoài đời thì có khả thi không?
- Điều gì khiến mình tin điều đó là đúng?
- Có cách nào tốt hơn không?
Nếu mình trả lời chung chung, hãy yêu cầu mình nói cụ thể hơn.

Bước 3. Khi bài nói chưa rõ
Vì đây là bản chuyển từ giọng nói sang văn bản nên có thể có lỗi nhận diện.
Nếu gặp đoạn khó hiểu hoặc mâu thuẫn:
- Không được tự đoán.
- Hãy hỏi mình xác nhận trước.

Bước 4. Sau khoảng 5-10 lượt trao đổi
Hãy tổng kết ngắn gọn:
Điều mình làm tốt
Điều mình cần cải thiện
Câu hỏi mình vẫn chưa trả lời thuyết phục
Gợi ý để bài nói thuyết phục hơn
- Nên bổ sung ví dụ nào.
- Nên bổ sung số liệu nào.
- Nên thay đổi cách lập luận nào.
- Có thể dùng cấu trúc nào phù hợp hơn (PREP, STAR, PAST, Quá khứ-Hiện tại-Tương lai hoặc Chuyện gì-Vậy thì sao-Giờ sao).

Quy tắc bắt buộc
- Luôn giữ đúng vai.
- Trả lời bằng tiếng Việt.
- Ngắn gọn, tự nhiên.
- Không giảng bài dài.
- Không viết lại bài nói của mình trừ khi mình yêu cầu.
- Có thể bổ sung kiến thức liên quan để mình hiểu hơn.
- Mục tiêu là giúp mình tự suy nghĩ và diễn đạt tốt hơn, không phải trả lời thay mình.

Lưu ý: Bài nói của mình được chuyển từ giọng nói thành chữ nên có thể có chỗ nhận diện sai. Nếu gặp chỗ khó hiểu, hãy hỏi lại mình thay vì đoán.`;

const buildEditPrompt = ({ style, topic, text }) => `Vai trò
Hãy đóng vai một biên tập viên diễn thuyết và huấn luyện viên giao tiếp có nhiều năm kinh nghiệm.
Mục tiêu của bạn không phải viết thay mình, mà là giữ nguyên ý tưởng gốc, chỉ chỉnh cách diễn đạt để bài nói tự nhiên, mạch lạc và thuyết phục hơn khi nói thành lời.
Hãy sửa lại bài nói sau theo phong cách ${STYLE_PROMPT[style]}.

THÔNG TIN MÌNH CUNG CẤP:
Chủ đề: ${topic || "(tự do)"}
Bài nói gốc của mình:
"
${text || "[Dán nội dung bài nói của bạn vào đây]"}
"

YÊU CẦU CHỈNH 
1. Giữ nguyên nội dung
- Không thay đổi quan điểm của mình.
- Không bịa thêm số liệu, nghiên cứu, ví dụ hay trải nghiệm.
- Không thêm ý mới nếu mình chưa nói.
Chỉ được sắp xếp lại và diễn đạt lại cho dễ hiểu hơn.

2. Viết để nói
Hãy chỉnh thành văn nói tự nhiên:
- Câu ngắn.
- Nhịp nói mượt.
- Dễ đọc thành tiếng.
- Tránh câu quá dài hoặc quá nhiều mệnh đề.
- Không viết theo kiểu văn bản, báo cáo hay ChatGPT.

Nếu phù hợp, có thể dùng các cách nối tự nhiên như:
- Thực ra...
- Quan trọng hơn...
- Mình nghĩ...
- Ví dụ...
- Tuy nhiên...
- Cuối cùng...
Nhưng không được lạm dụng.

3. Tăng sức thuyết phục
Nếu nội dung gốc đã có, hãy:
- Làm rõ luận điểm.
- Làm rõ quan hệ nguyên nhân - kết quả.
- Nhấn mạnh lợi ích hoặc tác động.
- Làm nổi bật ý quan trọng.
- Dùng thuật ngữ chính xác hơn nếu cần.
Không thêm bằng chứng mới.

4. Loại bỏ phần thừa
Hãy bỏ:
- Từ đệm.
- Từ lặp.
- Ý lặp.
- Câu lủng củng.
- Chuyển ý gượng.
- Các đoạn lan man.

5. Kết thúc
Nếu bài nói có phần kết, hãy chỉnh để kết thúc tự nhiên hơn.
Tùy chủ đề, có thể:
- Tóm tắt thông điệp.
- Nhấn mạnh lợi ích.
- Đưa ra lời kêu gọi hành động.
- Để lại một câu khiến người nghe nhớ.
Không thêm ý mới ngoài nội dung mình đã nói.

Sau khi chỉnh sửa
Sau bài nói đã chỉnh, hãy trình bày:
Những thay đổi chính (3-5 ý)
Mỗi ý gồm:
- Đã sửa gì.
- Vì sao sửa.
- Việc sửa giúp bài nói tốt hơn ở điểm nào.
Ví dụ:
- Rút ngắn câu để người nghe dễ theo dõi.
- Gộp hai ý trùng nhau để lập luận gọn hơn.
- Đổi thuật ngữ để chính xác hơn.
- Điều chỉnh thứ tự ý để mạch logic rõ hơn.

Quy tắc bắt buộc
- Luôn ưu tiên giữ "chất" của người nói.
- Không biến bài nói thành bài văn.
- Không dùng từ quá hoa mỹ nếu không cần.
- Có thể bổ sung kiến thức liên quan để mình hiểu hơn.
- Nếu có nhiều cách diễn đạt, hãy chọn cách tự nhiên nhất khi nói thành lời.

Lưu ý: Bài nói của mình được chuyển từ giọng nói thành chữ nên có thể có chỗ nhận diện sai. Nếu có chỗ nghe không hợp lý, hãy hỏi lại mình thay vì tự đoán.`;

// --- Từ phổ biến, bỏ qua khi tìm cụm lặp / từ cần luyện ---
const STOP_WORDS = new Set([
  "và",
  "là",
  "của",
  "có",
  "không",
  "một",
  "những",
  "các",
  "được",
  "trong",
  "cho",
  "này",
  "với",
  "để",
  "khi",
  "thì",
  "mà",
  "cũng",
  "đã",
  "sẽ",
  "nhưng",
  "như",
  "nó",
  "tôi",
  "mình",
  "bạn",
  "em",
  "anh",
  "chị",
  "ở",
  "tại",
  "từ",
  "đến",
  "rồi",
  "vì",
  "nên",
  "hay",
  "hoặc",
  "nếu",
  "thế",
  "vậy",
  "gì",
  "sao",
  "đó",
  "kia",
  "ấy",
  "lại",
  "còn",
  "đang",
  "bị",
  "ra",
  "vào",
  "lên",
  "xuống",
  "cái",
  "con",
  "người",
  "việc",
  "rất",
  "quá",
  "lắm",
  "hơn",
  "nhất",
  "nữa",
  "cùng",
  "về",
  "theo",
  "do",
  "bởi",
  "tuy",
  "dù",
  "nhiều",
  "ít",
]);

// --- TỪ VỰNG: từ yếu có thể nâng cấp + cụm lặp ---
const WEAK_WORDS = [
  { phrase: "rất tốt", min: 1, better: ["xuất sắc", "hiệu quả", "đáng giá"] },
  { phrase: "rất hay", min: 1, better: ["thú vị", "cuốn hút", "đáng chú ý"] },
  {
    phrase: "rất quan trọng",
    min: 1,
    better: ["then chốt", "thiết yếu", "cốt lõi"],
  },
  { phrase: "rất nhiều", min: 1, better: ["vô số", "đáng kể", "không ít"] },
  { phrase: "rất khó", min: 1, better: ["thách thức", "nan giải", "gai góc"] },
  { phrase: "rất lớn", min: 1, better: ["to lớn", "đáng kể", "đồ sộ"] },
  { phrase: "thực sự", min: 3, better: ["quả thật", "đúng là", "quả nhiên"] },
  {
    phrase: "vấn đề",
    min: 4,
    better: ["thách thức", "bài toán", "điểm nghẽn"],
  },
  { phrase: "cái này", min: 3, better: ["điều này", "yếu tố này"] },
];

const analyzeVocab = (rawText) => {
  const text = normalizeText(rawText);
  const tokens = text ? text.split(" ") : [];

  const weak = WEAK_WORDS.map((w) => ({
    ...w,
    count: countPhrase(text, w.phrase),
  })).filter((w) => w.count >= w.min);

  // Cụm 3 từ lặp lại từ 2 lần trở lên (bỏ cụm toàn từ phổ biến)
  const grams = {};
  for (let i = 0; i + 2 < tokens.length; i++) {
    const g = tokens.slice(i, i + 3);
    if (g.every((t) => STOP_WORDS.has(t))) continue;
    const key = g.join(" ");
    grams[key] = (grams[key] || 0) + 1;
  }
  const repeatedPhrases = Object.entries(grams)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([phrase, count]) => ({ phrase, count }));

  return { weak, repeatedPhrases };
};

// --- NGỮ PHÁP: một số lỗi diễn đạt phổ biến (kiểm tra bằng quy tắc) ---
const REDUNDANT_PATTERNS = [
  { phrase: "nhằm để", note: 'Chỉ cần một trong hai từ: "nhằm" hoặc "để".' },
  { phrase: "mục đích để", note: 'Nên nói "mục đích là" hoặc "nhằm".' },
  { phrase: "để mà", note: 'Thường bỏ được "mà" cho gọn.' },
  { phrase: "ví dụ như là", note: 'Nói "ví dụ" hoặc "chẳng hạn như" là đủ.' },
  { phrase: "những các", note: 'Chọn một trong hai: "những" hoặc "các".' },
  { phrase: "các những", note: 'Chọn một trong hai: "các" hoặc "những".' },
  {
    phrase: "rất là",
    note: 'Khi nói chuyện thì ổn, nhưng bài trình bày nên bỏ "là".',
  },
];

const analyzeGrammar = (rawText) => {
  const text = normalizeText(rawText);
  return REDUNDANT_PATTERNS.map((p) => ({
    ...p,
    count: countPhrase(text, p.phrase),
  })).filter((p) => p.count > 0);
};

const buildGrammarPrompt = ({ topic, text }) => `VAI TRÒ
Hãy đóng vai một giảng viên Ngôn ngữ học và huấn luyện viên giao tiếp tiếng Việt có nhiều năm kinh nghiệm.
Nhiệm vụ của bạn là phát hiện lỗi ngữ pháp và cách diễn đạt trong bài nói, nhưng không biến văn nói thành văn viết.
Mục tiêu là giúp bài nói đúng, tự nhiên và dễ nghe hơn, chứ không phải quá trang trọng.

THÔNG TIN MÌNH CUNG CẤP
Chủ đề: ${topic || "(tự do)"}
Bài nói của mình:
"
${text || "[Dán nội dung bài nói của bạn vào đây]"}
"
CÁCH CHẤM
1. Chỉ ra các lỗi
Hãy liệt kê từng lỗi cấu trúc: Câu gốc, Câu đã sửa, Loại lỗi, Vì sao
Chỉ tính những lỗi thực sự, ví dụ:
- Sai ngữ pháp.
- Dùng sai từ.
- Dùng từ chưa đúng sắc thái.
- Thừa từ.
- Thiếu từ khiến câu khó hiểu.
- Lặp từ.
- Lặp ý.
- Câu lủng củng.
- Câu thiếu logic.
- Chuyển ý chưa mượt.
- Đại từ hoặc cách xưng hô chưa nhất quán.

Giải thích ngắn gọn, dễ hiểu.

2. Không chấm oan văn nói
Phân biệt rõ:
Đây là lỗi
- Làm người nghe khó hiểu.
- Sai ngữ pháp.
- Sai nghĩa.
- Thiếu logic.
- Diễn đạt không tự nhiên.

Đây KHÔNG phải lỗi
Nếu chỉ là đặc điểm của văn nói tự nhiên, ví dụ:
- Câu không hoàn toàn đầy đủ chủ ngữ.
- Có ngắt câu tự nhiên.
- Có đảo trật tự câu để nhấn mạnh.
- Dùng từ thông dụng trong giao tiếp.
- Có lặp nhẹ để tạo nhịp nói.
Những trường hợp này không được tính là lỗi.

Nếu có cách diễn đạt tốt hơn, hãy ghi là "Gợi ý cải thiện", không phải "Lỗi".

3. Chấm điểm
Cho điểm theo thang 10:
- Ngữ pháp:
- Cách diễn đạt:
- Độ mạch lạc:
- Độ tự nhiên khi nói:
- Điểm tổng:
Sau mỗi tiêu chí, giải thích ngắn gọn 1-2 câu.

4. Cuối cùng
Cho mình 3 điều quan trọng nhất nên luyện tiếp, ưu tiên những lỗi xuất hiện nhiều hoặc ảnh hưởng lớn đến chất lượng bài nói.
Ví dụ:
- Tránh câu quá dài.
- Giảm lặp ý.
- Dùng từ chính xác hơn.
- Chuyển ý mượt hơn.
- Kiểm soát đại từ xưng hô.
- Nhấn mạnh luận điểm rõ hơn.

Khi gặp lỗi nhận diện giọng nói
Bài nói được chuyển từ giọng nói sang văn bản nên có thể:
- thiếu dấu câu,
- sai chính tả,
- nhận diện nhầm từ,
- mất một vài từ.
Những lỗi này không được tính là lỗi của mình.
Nếu không chắc đó là lỗi nói hay lỗi nhận diện, hãy hỏi lại mình trước, không được tự suy đoán.

Quy tắc bắt buộc
- Ưu tiên đánh giá theo chuẩn văn nói tự nhiên, không phải văn viết.
- Chỉ sửa khi thực sự cần.
- Không viết lại toàn bộ bài nói nếu mình không yêu cầu.
- Không bịa thêm nội dung ngoài bài nói.
- Nếu một câu có nhiều cách sửa, hãy chọn cách tự nhiên nhất khi nói thành lời.`;

// --- PHÁT ÂM: độ tin cậy của bộ nhận diện + từ chứa âm dễ nhầm ---
const WATCH_ONSET = /^(l|n(?!g|h)|s|x|r|d|gi|ch|tr)/;

const analyzePronunciation = (segments, rawText) => {
  const known = (segments || []).filter((s) => s.confidence > 0);
  const avg = known.length
    ? Math.round(
        (known.reduce((a, s) => a + s.confidence, 0) / known.length) * 100
      )
    : null;
  const low = known
    .filter((s) => s.confidence < 0.8)
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 5);

  const text = normalizeText(rawText);
  const seen = new Set();
  const watch = [];
  text.split(" ").forEach((t) => {
    if (!t || t.length < 2 || STOP_WORDS.has(t) || seen.has(t)) return;
    if (!WATCH_ONSET.test(t)) return;
    seen.add(t);
    watch.push(t);
  });

  return { avg, low, watch: watch.slice(0, 12) };
};
// --- CHALLENGE HÀNG NGÀY: lấy chủ đề từ bộ Tổng hợp (CATEGORY_DATA) ---
// Muốn thêm chủ đề: thêm vào CATEGORY_DATA, chủ đề sẽ có ở cả Quay Tổng hợp lẫn Challenge.
const CHALLENGE_POOL: { topic: string; category: string }[] = Object.entries(
  CATEGORY_DATA
)
  .flatMap(([category, topics]) =>
    topics.map((topic) => ({ topic: topic.trim(), category }))
  )
  .filter((c) => c.topic !== "")
  .filter((c, i, arr) => arr.findIndex((x) => x.topic === c.topic) === i);

// Chọn câu cho hôm nay: chỉ lấy câu CHƯA trả lời, tránh trùng câu hôm qua nếu còn câu khác.
// Trả về null nếu không còn câu nào để chọn.
const pickChallenge = (answered: string[], lastTopic: string | null) => {
  const answeredSet = new Set(answered);
  const left = CHALLENGE_POOL.filter((c) => !answeredSet.has(c.topic));
  if (left.length === 0) return null;
  const fresh = left.filter((c) => c.topic !== lastTopic);
  const source = fresh.length > 0 ? fresh : left;
  const pick = source[Math.floor(Math.random() * source.length)];
  return {
    date: toDateKey(),
    topic: pick.topic,
    category: pick.category,
    done: false,
  };
};
const PRONUNCIATION_DATA = {
  "L / N": {
    words: [
      "Lạnh lẽo",
      "Lặng lẽ",
      "Lý luận",
      "Lăn lóc",
      "La liệt",
      "Len lỏi",
      "Lặn lội",
      "Năng nổ",
      "Náo nức",
      "Núng nính",
      "Nói năng",
      "Nõn nà",
      "Nôn nao",
      "Năng lực",
      "Nỗ lực",
      "Nặng lòng",
      "Nấu lẩu",
      "Nón lá",
      "Nổi loạn",
    ],
    sentences: [
      "Nắng lên làm lá lung linh",
      "Con lươn nó luồn qua lườn em",
      "Phụ nữ Việt Nam thường lên núi lấy lá non về làm nón",
      "Lúc nào lên núi lấy nứa về làm lán nên lưu ý nước lũ",
      "Lính lệ leo lên lầu lấy lưỡi lê, lấy lộn lại leo lên lấy lại",
      "Lùi đậu, lột đậu, luộc đậu, đậu luộc, đậu lột, đậu lùi",
      "Lúa nếp là lúa nếp làng, lúa lên lớp lớp lòng nàng lâng lâng",
      "Lúa nếp là lúa nếp non, lúa lên lớp lớp làm lợn no nê",
      "Năm nay lũ lớn liên tiếp về làm năng suất lúa nếp của bà con nông dân thấp lắm",
      "Luộc hột vịt lộn, luộc lộn hột vịt lạc, ăn lộn hột vịt lạc, luộc lại hột vịt lộn lại lộn hột vịt lạc",
      "Nếu nói lầm lẫn lần này thì lại nói lại, nói lầm lẫn lần nữa thì lại nói lại, nói cho đến lúc luôn luôn lưu loát hết lầm lẫn mới thôi",
    ],
  },
  "S / X": {
    words: [
      "Sạch sẽ",
      "Sôi sục",
      "Sâu sắc",
      "Sáng sớm",
      "Sông suối",
      "San sát",
      "Sung sướng",
      "Sáng sủa",
      "Sử sách",
      "Xốn xang",
      "Xao xuyến",
      "Xinh xắn",
      "Xôn xao",
      "Xanh xao",
      "Xôi xéo",
      "Xán lạn",
      "Sản xuất",
      "Sửa xe",
      "Xếp sách",
      "Xác suất",
      "Sâu xa",
    ],
    sentences: [
      "Xôi sắn sánh với sữa",
      "Sáu con sóc sang sông",
      "Sợi dây sắt sáng lấp lánh",
      "Chị Sáu xách sáu xô nước suối",
      "Sáo sậu sải cánh trên sông sâu",
      "Sáu sinh viên say sưa sưu tầm sách",
      "Buổi sáng sương sớm sa xuống sân",
      "Xí nghiệp xây xong xưởng sản xuất",
      "Sâu ăn xúc xích xong, Sâu ăn xôi xéo sạch sành sanh",
      "Xoài xanh xắt xéo xếp xuống xưởng, Xuân xách xô xối xả",
    ],
  },
  "CH / TR": {
    words: [
      "Chăm chỉ",
      "Chật chội",
      "Chín chắn",
      "Trong trẻo",
      "Tròn trịa",
      "Trân trọng",
      "Trang trí",
      "Trêu chọc",
      "Chân trời",
      "Chương trình",
      "Trì chú",
    ],
    sentences: [
      "Buổi trưa ăn bưởi chua",
      "Chó con chạy quanh chuồng chim",
      "Chị Trang trồng tre trước chùa",
      "Chú chuột chù chui vào chum chuối",
      "Chàng trai chọn chiếc khăn trắng",
      "Chị Trang chở trà, chú Châu chở chè",
      "Trân trộm trái trứng tròn trắng tinh",
      "Chú Trí chặt củi trong chiều chớm lạnh",
      "Chim chào mào chuyền cành kêu chíp chíp",
      "Chị Chuối chín chục chiếc chổi tre, chổi chị Chuối chẻ toàn tre tốt",
    ],
  },
  "R / D / GI": {
    words: [
      "Rực rỡ",
      "Rộn ràng",
      "Rõ ràng",
      "Rửa rau",
      "Dịu dàng",
      "Dọn dẹp",
      "Dư dả",
      "Dưỡng dục",
      "Dành dụm",
      "Giỏi giang",
      "Giàu giỏi",
      "Giặt giũ",
      "Gia giáo",
      "Giữ gìn",
      "Giao dịch",
      "Giáo dục",
    ],
    sentences: [
      "Rau răm rửa sạch rồi mới rắc",
      "Con cá rô nhảy trong rổ kêu rồ rồ",
      "Con cá rô rục rịch trong rổ réo róc rách",
      "Dũng dẫn đoàn đi dã ngoại giữa rừng già",
      "Vịt lội ruộng rồi lặn, vịt rặn một hột vịt",
      "Mưa rào rải rác dưới giàn dưa dón",
      "Sầu riêng rụng rốn rơi rớt rụng rời",
      "Rắn rồng rình rập rắn rít, rắn rít rình rập rồng rắn",
      "Rổ rau răm rửa rồi, dì Dung giữ giùm",
      "Giang giăng giàn giáo giữa gió",
    ],
  },
  "N / NG (âm cuối)": {
    words: [
      "Lang thang",
      "Bàng hoàng",
      "Sưng sỉa",
      "Lòng vòng",
      "Văng vẳng",
      "Bâng khuâng",
      "Tung tăng",
      "Sáng sủa",
      "Lăng xăng",
      "Ngồn ngộn",
      "Cuồn cuộn",
      "Tần ngần",
      "Lẩn quẩn",
      "Hân hoan",
      "Bồn chồn",
    ],
    sentences: [
      "Con công cõng con cóc qua cổng",
      "Vầng trăng vàng vằng vặc trên cánh đồng",
      "Bông bàng bên bờ sông bồng bềnh",
      "Bình mang bông bằng gỗ băng ngang cánh đồng",
      "Càng nâng càng căng, càng căng càng cong, càng cong càng khó nói",
      "Lan nâng bông lan sang cánh đồng, ông Long mang bàng sang bến sông",
      "Con ong vàng bay vòng quanh bông hướng dương bên dòng sông",
      "Làng nành, lợn nái năm nay lọt lòng, lúa non nắng lửa nản lòng, lão nông nức nở lấy nong nia về",
      "Một ông lùn bưng một bọc gừng",
      "Bên nương có anh Diêng gánh xiên, bên sông có chị Siềng gánh chiêng",
    ],
  },
  "T / C (âm cuối)": {
    words: [
      "Mát mẻ",
      "Tất bật",
      "Phát đạt",
      "Dứt khoát",
      "Thiết thực",
      "Tháo vát",
      "Bứt rứt",
      "Bắt bớ",
      "Gió lốc",
      "Thắc mắc",
      "Mộc mạc",
      "Bậc thang",
      "Tức tốc",
      "Man mác",
      "Bắt chước",
      "Bước ngoặt",
    ],
    sentences: [
      "Đặt cốc sát bát, cất bát sát cốc",
      "Nồi đồng nấu ốc, nồi đất nấu ếch",
      "Con két con kẹp con két cái, két kẹp két, cái kẹp cái, con két",
      "Mặt mập mọc một mụt mụn bọc, hai mụt mụn bọc mọc mặt mập",
      "Một ông lục mập bọc một bọc bắp",
      "Vịt lội ruộng rồi vụt, vịt luộc luôn chum trùng",
      "Bác bắt bạch tuộc bằng bát bạc",
      "Bắc Bắc bưng bát bún nước bặt từng bậc thang",
      "Một cốc nước mát đặt sát bậc cửa, các bác cất cốc cạnh cột",
      "Bậc gỗ mục mọc mốc, bác Bắc quét sạch từng góc",
    ],
  },
  "Ang / Anh / Ach": {
    words: [
      "Khanh khách",
      "Ngóc ngách",
      "Ngênh ngang",
      "Bành trướng",
      "Quáng quàng",
      "Thạch anh",
      "Oanh tạc",
      "Làng nhàng",
      "Lãng mạn",
      "Lanh lảnh",
      "Lảnh lót",
      "Khánh thành",
      "Hạch sách",
      "Hách dịch",
      "Khách quan",
    ],
    sentences: [
      "Anh Thanh ăn sắn, anh Hạnh ăn hành",
      "Anh Thanh ăn măng, anh Thăng ăn canh",
      "Giặt khăn xanh, vắt cành chanh",
      "Đầu làng Bằng băm măng bắc mắm. Cuối làng Bằng bắc mắm băm măng",
      "Anh Hạnh ăn bánh chanh chua bên cạnh rạch, xách bọc thạch anh chạy quanh ngách vách",
      "Khách xách sách sạch sát vách gạch, Thành xách tranh xanh sát cành chanh, khách trách Thành xách tranh thay sách, Thành trách khách xách sách che tranh",
    ],
  },
  "Dấu Hỏi / Ngã": {
    words: [
      "Suy nghĩ",
      "Mạnh mẽ",
      "Nghĩ ngợi",
      "Kỹ lưỡng",
      "Cởi mở",
      "Vất vả",
      "Nghỉ ngơi",
      "Sửa chữa",
      "Bãi biển",
      "Vững chãi",
      "Chững chạc",
      "Rảnh rỗi",
      "Khuyển mã",
      "Nghễnh ngãng",
      "Nhỏng nhảnh",
      "Nhõng nhẽo",
    ],
    sentences: [
      "Bà lão bĩu môi bảo rẽ bãi cỏ rẽ lối cũ",
      "Trưởng ban bão lụt bị ngã nhào giữa bãi cỏ",
      "Nghỉ một lát rồi nghĩ tiếp",
      "Mẹ sửa áo, con rót sữa",
    ],
  },
};

// --- KHO DỮ LIỆU NHẠC/VIDEO YOUTUBE ---
const STUDY_MUSIC_DATA = {
  "Abao in Tokyo": [
    { id: "5Q2Pc-e-8Qc", title: "2H Calm Piano🎹" },
    { id: "sUwD3GRPJos", title: "2.5H Calm Piano🎹" },
    { id: "grBFMP3HDZA", title: "3H Calm Lofi" },
    { id: "k_3DFCzcMC4", title: "3.5H Quiet Jazz" },
    { id: "nF1fSKEiyA0", title: "4H Calm Piano🎹" },
    { id: "YdtBEFK_HgI", title: "5H Calm Piano🎹" },
    { id: "LjRygr4xR7g", title: "6H Calm Piano🎹" },
  ],
  "Sora's Treehouse Study": [
    { id: "z_H3ZVcHsVk", title: "30M Nature Sound🍃" },
    { id: "dxjFlbw-kUY", title: "1H Nature Sound🍃" },
    { id: "DZQJrMDNwPI", title: "1.5H Rain Sounds🌧️" },
    { id: "sa61rE36264", title: "2H Rain Sounds🌧️" },
    { id: "eIoHJBA43lk", title: "3H Rain Sounds🌧️" },
    { id: "KWwMWH9FspM", title: "4H Rain Sounds🌧️" },
    { id: "akX3kxl1_9k", title: "5H River Sounds💦" },
    { id: "QWSj7nz0vac", title: "6H Rain Sounds🌧️" },
    { id: "49abVFrRd0c", title: "8H Rain Sounds🌧️" },
  ],
  "The Hanoi Chamomile": [
    { id: "m7Rjm6y1VKs", title: "2H Calm Piano🎹" },
    { id: "vemCaXD2ydA", title: "2H Calm Piano🎹" },
    { id: "oV3jMmDS3rQ", title: "2H Calm Piano🎹" },
    { id: "afjPrrlKgNw", title: "2H Calm Piano🎹" },
    { id: "7DJCL3cZjyc", title: "2H Calm Piano🎹" },
    { id: "6L7AB6w2dgI", title: "2H Calm Piano🎹" },
    { id: "oBZoVxrJsg0", title: "2H Lofi" },
    { id: "t_oodFEK5uo", title: "2H No Music" },
    { id: "GBdCwozYtQw", title: "2H No Music" },
  ],
};

const FRAMEWORKS = [
  {
    id: "what",
    name: "Chuyện gì? - Vậy thì sao? - Giờ sao?",
    desc: "Đi từ sự việc, đến ý nghĩa của nó, rồi đến hành động tiếp theo. Hợp khi chia sẻ một trải nghiệm hay bài học.",
  },
  {
    id: "past",
    name: "Quá khứ – Hiện tại – Tương lai",
    desc: "Kể theo dòng thời gian. Hợp khi nói về một quá trình thay đổi, một hành trình hoặc kế hoạch.",
  },
  {
    id: "past_acronym",
    name: "P.A.S.T",
    desc: "Bối cảnh - Hành động - Lời nói - Suy nghĩ. Hợp khi kể một câu chuyện cụ thể, hình dung rõ khung cảnh.",
  },
  {
    id: "prep",
    name: "P.R.E.P",
    desc: "Luận điểm - Lý do - Giải thích - Luận điểm. Hợp khi cần thuyết phục hoặc trả lời câu hỏi đi thẳng vấn đề.",
  },
  {
    id: "star",
    name: "S.T.A.R",
    desc: "Tình huống - Nhiệm vụ - Hành động - Kết quả. Hợp khi kể thành tích, kinh nghiệm (rất hợp phỏng vấn).",
  },
];
const AI_ROLES = {
  "Giảng viên": {
    icon: GraduationCap,
  },
  "Khách hàng": {
    icon: Briefcase,
  },
  "Nhà tuyển dụng": {
    icon: Users,
  },
  "Người bạn": {
    icon: Coffee,
  },
};

// --- Reusable UI Components ---
const PushButton = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
}) => {
  const baseStyle =
    "relative font-bold rounded-2xl transition-all flex items-center justify-center select-none duration-100 ease-in-out active:translate-y-[4px]";

  const variants = {
    primary:
      "bg-pink-500 text-white border-b-4 border-pink-700 hover:bg-pink-400 active:border-b-0 active:mb-[4px]",
    secondary:
      "bg-purple-500 text-white border-b-4 border-purple-700 hover:bg-purple-400 active:border-b-0 active:mb-[4px]",
    outline:
      "bg-white text-gray-500 border-2 border-gray-200 border-b-4 hover:bg-gray-50 active:border-b-2 active:mb-[2px]",
    active:
      "bg-pink-50 text-pink-500 border-2 border-pink-500 border-b-4 hover:bg-pink-100 active:border-b-2 active:mb-[2px]",
    danger:
      "bg-red-500 text-white border-b-4 border-red-700 hover:bg-red-400 active:border-b-0 active:mb-[4px]",
    navActive:
      "bg-pink-100 text-pink-500 border-2 border-pink-500 border-b-4 active:border-b-2 active:mb-[2px]",
    navInactive:
      "bg-transparent text-gray-500 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200",
  };

  const handlePress = (e) => {
    if (disabled) return;
    playClick();
    if (onClick) onClick(e);
  };

  return (
    <button
      onClick={handlePress}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className} ${
        disabled
          ? "opacity-50 cursor-not-allowed transform-none border-b-0 mb-[4px]"
          : ""
      }`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white rounded-3xl border-2 border-gray-200 shadow-[0_4px_0_0_#e2e8f0] p-5 ${className}`}
  >
    {children}
  </div>
);
// Khung hiển thị prompt + nút copy + link mở các AI
const PromptBox = ({ prompt }) => {
  const [text, setText] = useState(prompt);
  const [copied, setCopied] = useState(false);
  const areaRef = useRef<any>(null);

  // Khi prompt đổi (đổi vai, đổi phong cách) thì cập nhật lại khung
  useEffect(() => {
    setText(prompt);
  }, [prompt]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // Dự phòng khi trình duyệt chặn clipboard (hay gặp trong khung xem trước)
      areaRef.current?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const encoded = encodeURIComponent(text);
  const canPrefill = encoded.length <= 7000;
  const aiLinks = [
    {
      label: "ChatGPT",
      url: canPrefill
        ? `https://chatgpt.com/?q=${encoded}`
        : "https://chatgpt.com",
    },
    {
      label: "Claude",
      url: canPrefill
        ? `https://claude.ai/new?q=${encoded}`
        : "https://claude.ai/new",
    },
    { label: "Gemini", url: "https://gemini.google.com/app" },
  ];

  return (
    <div className="space-y-3">
      <textarea
        ref={areaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full h-72 p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl font-medium text-gray-700 text-sm leading-relaxed focus:border-pink-500 outline-none resize-none transition-colors"
      />
      <PushButton
        variant="primary"
        className="w-full py-4 text-lg"
        onClick={handleCopy}
      >
        {copied ? "✅ Đã copy!" : "📋 Copy prompt"}
      </PushButton>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-gray-500">Mở AI để dán:</span>
        {aiLinks.map((l) => (
          <a
            key={l.label}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              try {
                navigator.clipboard.writeText(text);
              } catch (e) {}
            }}
            className="px-3 py-1.5 rounded-xl border-2 border-gray-200 font-bold text-sm text-gray-600 hover:border-pink-300 hover:text-pink-500 transition-colors"
          >
            {l.label}
          </a>
        ))}
      </div>
      <p className="text-xs font-bold text-gray-400">
        {canPrefill
          ? "ChatGPT và Claude sẽ mở sẵn prompt. Prompt cũng đã được copy, nếu ô chat trống thì cậu dán vào."
          : "Prompt khá dài nên link không điền sẵn được. Prompt đã được copy, cậu dán vào ô chat nhé."}
      </p>
    </div>
  );
};

// --- Sub-Views ---

const Dashboard = ({ userStats, onStartChallenge }) => {
  const levelInfo = calculateLevelInfo(userStats.xp);
  const currentStreak = getCurrentStreak(userStats);
  const challenge = userStats.challenge;
  const weekData = getWeekData(userStats.dailySeconds || {});
  const maxMinutes = Math.max(...weekData.map((d) => d.minutes), 1);
  const [greeting, setGreeting] = useState({
    title: "👋 Chào cậu!",
    desc: "Hôm nay mình nhăn thêm chút nữa nhé?",
  });

  useEffect(() => {
    const greetings = [
      { title: "👋 Chào cậu!", desc: "Hôm nay mình nhăn thêm chút nữa nhé?" },
      {
        title: "🧠 Khởi động nào!",
        desc: "Não hôm nay còn khá phẳng đấy. Mình bắt đầu thôi!",
      },
      { title: "🥺 Ơ kìa...", desc: "Lâu quá không gặp, não nhớ cậu rồi." },
    ];
    setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
  }, []);
  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Top Welcome */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border-2 border-gray-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 mb-2">
            {greeting.title}
          </h2>
          <p className="text-gray-500 font-medium text-lg">{greeting.desc}</p>
        </div>
        <div
          className="text-6xl animate-bounce"
          style={{ animationDuration: "3s" }}
        >
          🧠
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="flex flex-col items-center justify-center p-6 border-orange-200 bg-orange-50 shadow-[0_4px_0_0_#fdba74]">
          <Flame className="text-orange-500 mb-3" size={36} />
          <span className="text-3xl font-black text-orange-700">
            {currentStreak}
          </span>
          <span className="text-xs font-bold text-orange-500 uppercase tracking-wide mt-1">
            Ngày Streak
          </span>
        </Card>
        <Card className="flex flex-col items-center justify-center p-6 border-yellow-200 bg-yellow-50 shadow-[0_4px_0_0_#fde047]">
          <Zap className="text-yellow-500 mb-3" size={36} />
          <span className="text-3xl font-black text-yellow-700">
            {userStats.xp}
          </span>
          <span className="text-xs font-bold text-yellow-600 uppercase tracking-wide mt-1">
            Tổng XP
          </span>
        </Card>
        <Card className="flex flex-col items-center justify-center p-6 border-purple-200 bg-purple-50 shadow-[0_4px_0_0_#d8b4fe]">
          <Crown className="text-purple-500 mb-3" size={36} />
          <span className="text-2xl font-black text-purple-700 text-center">
            {levelInfo.name}
          </span>
          <span className="text-xs font-bold text-purple-500 uppercase tracking-wide mt-1">
            Level {levelInfo.level}
          </span>
        </Card>
        <Card className="flex flex-col items-center justify-center p-6 border-blue-200 bg-blue-50 shadow-[0_4px_0_0_#93c5fd]">
          <Clock className="text-blue-500 mb-3" size={36} />
          <span className="text-3xl font-black text-blue-700">
            {formatStudyTime(userStats.totalSeconds || 0)}
          </span>
          <span className="text-xs font-bold text-blue-500 uppercase tracking-wide mt-1">
            Đã luyện
          </span>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Main CTA */}
        <Card className="border-pink-200 bg-pink-50 shadow-[0_4px_0_0_#fbcfe8] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="text-pink-500" size={24} />
              <h3 className="text-xl font-extrabold text-pink-600">
                Challenge Hôm Nay
              </h3>
              {challenge && challenge.done && (
                <span className="bg-green-100 text-green-700 text-xs font-black px-3 py-1 rounded-full border-2 border-green-200">
                  ✅ Đã xong
                </span>
              )}
            </div>
            {challenge ? (
              <>
                <span className="inline-block bg-pink-500 text-white font-black uppercase tracking-wider px-3 py-1 rounded-full text-xs mb-3">
                  {challenge.category}
                </span>
                <p className="text-gray-700 font-bold text-lg mb-4 bg-white p-4 rounded-2xl border-2 border-pink-100">
                  "{challenge.topic}"
                </p>
              </>
            ) : (
              <p className="text-gray-500 font-bold mb-4 bg-white p-4 rounded-2xl border-2 border-pink-100">
                {CHALLENGE_POOL.length === 0
                  ? "Hôm nay chưa có challenge. Quay lại sau nhé!"
                  : "🎉 Cậu đã trả lời hết tất cả câu hỏi rồi! Chờ câu hỏi mới nhé."}
              </p>
            )}
          </div>
          <PushButton
            variant="primary"
            className="py-4 text-lg w-full"
            disabled={!challenge}
            onClick={() => onStartChallenge(challenge)}
          >
            {challenge && challenge.done ? "Nói Lại" : "Nói Ngay"}{" "}
            <Play size={20} className="ml-2" fill="currentColor" />
          </PushButton>
        </Card>

        {/* Weekly Activity */}
        <Card>
          <h3 className="text-lg font-extrabold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="text-purple-500" /> Báo cáo tuần
          </h3>
          <div className="flex items-end justify-between h-36 gap-2 px-2">
            {weekData.map((d) => {
              const heightPct =
                d.minutes > 0
                  ? Math.max(12, (d.minutes / maxMinutes) * 100)
                  : 4;
              return (
                <div
                  key={d.label}
                  className="flex flex-col items-center justify-end gap-1 flex-1 h-full"
                >
                  <span className="text-[10px] font-bold text-gray-400 h-4">
                    {d.minutes > 0 ? `${d.minutes}p` : ""}
                  </span>
                  <div className="w-full flex-1 flex items-end justify-center">
                    <div
                      className={`w-full max-w-[32px] rounded-t-lg transition-all duration-500 ${
                        d.isToday
                          ? "bg-purple-500"
                          : d.minutes > 0
                          ? "bg-purple-300"
                          : "bg-purple-100"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    ></div>
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      d.isToday ? "text-purple-600" : "text-gray-400"
                    }`}
                  >
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

// --- Chủ đề của tôi: lưu trong trình duyệt ---
const MY_TOPICS_KEY = "nao_nhan_my_topics";

const loadMyTopics = (): string[] => {
  try {
    const saved = localStorage.getItem(MY_TOPICS_KEY);
    const arr = saved ? JSON.parse(saved) : [];
    return Array.isArray(arr) ? arr.filter((t) => typeof t === "string") : [];
  } catch (e) {
    return [];
  }
};

const RandomSpeaking = ({
  onFinish,
  challenge,
  onChallengeUsed,
  onLucky,
  onSaveText,
}) => {
  const [step, setStep] = useState("setup"); // setup | prep | speak | result | edit | discuss
  const [tab, setTab] = useState("general");
  const [feedbackTab, setFeedbackTab] = useState("fluency");
  const rec = useSpeechRecorder();
  const [editStyle, setEditStyle] = useState("Tự nhiên");
  const savedRef = useRef(false); // bài này đã được lưu vào lịch sử chưa
  const editedRef = useRef(false); // cậu đã tự sửa chữ chưa
  const [fromLabel, setFromLabel] = useState(null); // vào từ Challenge / Bảng Vàng / Lịch sử
  const [spokenSeconds, setSpokenSeconds] = useState(0);
  const endAtRef = useRef(0);
  const analysis = analyzeSpeech(rec.transcript, spokenSeconds);
  const vocab = analyzeVocab(rec.transcript);
  const grammar = analyzeGrammar(rec.transcript);
  const pron = analyzePronunciation(rec.segments, rec.transcript);

  // General Categories State
  const [selectedCategories, setSelectedCategories] = useState([
    ...ALL_CATEGORIES,
  ]);

  // My Topics State
  const [myTopics, setMyTopics] = useState<string[]>(loadMyTopics);

  // Mỗi khi danh sách đổi (thêm, xóa, lưu sao) thì lưu lại ngay
  useEffect(() => {
    try {
      localStorage.setItem(MY_TOPICS_KEY, JSON.stringify(myTopics));
    } catch (e) {}
  }, [myTopics]);
  const [newTopic, setNewTopic] = useState("");

  const [isSpinning, setIsSpinning] = useState(false);
  const [revealEffect, setRevealEffect] = useState(false); // For CSS highlight animation
  const [spinnerText, setSpinnerText] = useState("Quay chủ đề thôi!");
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState(null);

  const [selectedFramework, setSelectedFramework] = useState(FRAMEWORKS[0]);

  // Timer Settings
  const [prepMins, setPrepMins] = useState(15);
  const [speakMins, setSpeakMins] = useState(1);
  const [showTimeSettings, setShowTimeSettings] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const speakStartRef = useRef(0);
  const prepEndedAtRef = useRef(0);
  const quickRef = useRef(false);
  const lastSpunRef = useRef<string | null>(null);

  // --- Edit Speech State ---
  const [transcript, setTranscript] = useState("");

  // --- Deep Discussion State ---
  const [aiRole, setAiRole] = useState("Giảng viên");

  // --- Handlers ---
  const toggleCategory = (cat) => {
    playClick();
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const selectAllCategories = () => {
    playClick();
    setSelectedCategories([...ALL_CATEGORIES]);
  };

  const deselectAllCategories = () => {
    playClick();
    setSelectedCategories([]);
  };

  const addMyTopic = () => {
    const t = newTopic.trim();
    if (t === "") return;
    // Không thêm trùng (không phân biệt hoa thường)
    if (!myTopics.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setMyTopics([t, ...myTopics]);
    }
    setNewTopic("");
  };

  // Nút sao: lưu hoặc bỏ lưu chủ đề vừa quay được
  const isSaved = selectedTopic ? myTopics.includes(selectedTopic) : false;
  const toggleSaveTopic = () => {
    if (!selectedTopic) return;
    playClick();
    if (isSaved) {
      setMyTopics(myTopics.filter((t) => t !== selectedTopic));
    } else {
      setMyTopics([selectedTopic, ...myTopics]);
    }
  };

  const removeMyTopic = (index) => {
    playClick();
    const updated = [...myTopics];
    updated.splice(index, 1);
    setMyTopics(updated);
  };

  const spinTimerRef = useRef<any>(null);
  useEffect(() => () => clearTimeout(spinTimerRef.current), []);

  const handleSpin = () => {
    if (tab === "general" && selectedCategories.length === 0) return;
    if (tab === "personal" && myTopics.length === 0) return;

    clearTimeout(spinTimerRef.current);
    setIsSpinning(true);
    setRevealEffect(false);
    setSelectedTopic(null);
    setSelectedCategoryLabel(null);

    const pool: { category: string; topic: string }[] = [];
    if (tab === "general") {
      selectedCategories.forEach((cat) => {
        CATEGORY_DATA[cat].forEach((topic) =>
          pool.push({ category: cat, topic })
        );
      });
    } else {
      myTopics.forEach((topic) =>
        pool.push({ category: "Chủ đề của tôi", topic })
      );
    }

    const totalTicks = 30;
    let i = 0;
    const tick = () => {
      const progress = i / totalTicks;
      i++;
      const item = pool[Math.floor(Math.random() * pool.length)];

      if (i >= totalTicks) {
        // Dừng lại ở chủ đề được chọn
        // May Mắn: quay trúng đúng chủ đề lần trước (cần ít nhất 5 chủ đề để tránh "cày")
        if (lastSpunRef.current === item.topic && pool.length >= 5 && onLucky)
          onLucky();
        lastSpunRef.current = item.topic;
        setSelectedCategoryLabel(item.category);
        setSelectedTopic(item.topic);
        setSpinnerText(item.topic);
        setIsSpinning(false);
        setRevealEffect(true);
        playTick(1);
        setTimeout(playWin, 120);
        return;
      }

      setSpinnerText(item.topic);
      playTick(progress);
      // Quay nhanh lúc đầu, chậm dần về cuối như bánh xe sắp dừng
      spinTimerRef.current = setTimeout(tick, 55 + Math.pow(progress, 3) * 320);
    };
    tick();
  };

  // Nếu vào từ Challenge hôm nay thì đặt sẵn chủ đề và vào thẳng bước chuẩn bị
  useEffect(() => {
    if (challenge) {
      setSelectedTopic(challenge.topic);
      setSelectedCategoryLabel(challenge.category);
      setSpinnerText(challenge.topic);
      setRevealEffect(true);
      setFromLabel(challenge.source || "Challenge hôm nay");
      setStep("setup");
      if (onChallengeUsed) onChallengeUsed();
    }
  }, []);
  const startPrep = () => {
    prepEndedAtRef.current = 0;
    requestNotifyPermission();
    endAtRef.current = Date.now() + prepMins * 60 * 1000;
    setTimeLeft(prepMins * 60);
    setTimeUp(false);
    setStep("prep");
  };

  const startSpeaking = () => {
    quickRef.current =
      prepEndedAtRef.current > 0 &&
      Date.now() - prepEndedAtRef.current <= QUICK_START_SECONDS * 1000;
    prepEndedAtRef.current = 0;
    endAtRef.current = Date.now() + speakMins * 60 * 1000;
    speakStartRef.current = Date.now();
    setTimeLeft(speakMins * 60);
    setTimeUp(false);
    setStep("speak");
    rec.start();
  };

  const endSession = () => {
    const recStats = rec.getStats();
    const spoken = Math.max(
      0,
      Math.round((Date.now() - speakStartRef.current) / 1000)
    );
    setSpokenSeconds(spoken);
    setTimeUp(false);
    rec.stop();
    if (onFinish && selectedTopic && spoken >= 10) {
      savedRef.current = true;
      onFinish(selectedTopic, selectedCategoryLabel, spoken, {
        quick: quickRef.current,
        maxGap: recStats.maxGap,
      });
    }
    setStep("result");
  };
  const resetAll = () => {
    setStep("setup");
    setSelectedTopic(null);
    setRevealEffect(false);
    setSpinnerText("Quay chủ đề thôi!");
    setFeedbackTab("fluency");
    rec.reset();
    savedRef.current = false;
    editedRef.current = false;
    setFromLabel(null);
    setSpokenSeconds(0);
    setTranscript("");
    setTimeUp(false);
  };
  // Chữ nhận diện có thể về muộn sau khi dừng: tự điền vào ô chỉnh sửa
  // (trừ khi cậu đã tự sửa rồi)
  useEffect(() => {
    if (step === "result" && !editedRef.current) setTranscript(rec.transcript);
  }, [step, rec.transcript]);
  // Bản chữ (đã sửa) được lưu vào Lịch sử sau khi cậu ngừng gõ 0,4 giây
  useEffect(() => {
    if (
      (step !== "result" && step !== "edit") ||
      !savedRef.current ||
      !transcript ||
      !onSaveText
    )
      return;
    const t = setTimeout(() => onSaveText(transcript), 400);
    return () => clearTimeout(t);
  }, [step, transcript]);

  // Đếm theo giờ thật, hết giờ thì hiện hộp thoại (không tự chuyển bước)
  useEffect(() => {
    if ((step !== "prep" && step !== "speak") || timeUp) return;
    const id = setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((endAtRef.current - Date.now()) / 1000)
      );
      setTimeLeft(left);
      if (left === 0) {
        clearInterval(id);
        setTimeUp(true);
        if (step === "prep") {
          prepEndedAtRef.current = Date.now();
          notifyTimeUp("⏰ Hết giờ tìm hiểu!", "Tìm hiểu thêm hay nói luôn?");
        } else {
          notifyTimeUp("⏰ Hết giờ nói!", "Bạn muốn nói thêm hay hoàn thành?");
        }
      }
    }, 500);
    return () => clearInterval(id);
  }, [step, timeUp]);

  // Tính giờ nói từ lúc micro thật sự mở (không tính lúc hỏi quyền)
  useEffect(() => {
    if (step === "speak" && rec.isRecording) {
      endAtRef.current = Date.now() + speakMins * 60 * 1000;
      speakStartRef.current = Date.now();
      setTimeLeft(speakMins * 60);
    }
  }, [rec.isRecording]);

  const getMascotQuote = () => {
    if (step === "setup") {
      if (isSpinning) return "🧠 Để mình nghĩ xem hôm nay nên nói gì...";
      if (selectedTopic)
        return "🎉 Não chọn rồi! Thử xem cậu xử lý chủ đề này thế nào nhé.";
      return "🎲 Chọn lĩnh vực não thích và quay chủ đề nào!";
    }
    if (step === "prep") {
      if (timeLeft <= 60)
        return "👀 Còn 1 phút nữa thôi, não đang nóng máy rồi!";
      return `🧠 ${prepMins} phút thôi. Đừng mở ChatGPT nhé, não muốn tự nghĩ trước.`;
    }
    if (step === "speak")
      return "🎙️ Đến lượt cậu rồi. Mình sẽ lắng nghe thật kỹ.";
    if (step === "result") return "🧠 Não đang nóng máy rồi, nói tiếp thôi!";
    if (step === "edit")
      return "✍️ Cùng AI gọt giũa lại từng câu chữ cho thật sắc bén nhé!";
    if (step === "discuss")
      return "🗣️ Đối mặt với những câu hỏi hóc búa để hiểu sâu vấn đề hơn nào!";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Mascot Bubble */}
      <div className="flex items-end gap-4 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div
          className="text-6xl animate-bounce"
          style={{ animationDuration: "3s" }}
        >
          🧠
        </div>
        <div className="bg-white p-4 rounded-3xl rounded-bl-none border-2 border-pink-200 shadow-md flex-1 relative">
          <p className="text-lg font-bold text-gray-700">{getMascotQuote()}</p>
          <div className="absolute -left-3 bottom-0 w-4 h-4 bg-white border-l-2 border-b-2 border-pink-200 transform rotate-45 translate-x-1/2 -translate-y-1/2"></div>
        </div>
      </div>

      {step === "setup" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {fromLabel && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-pink-50 border-2 border-pink-200 rounded-2xl px-4 py-3">
              <span className="font-bold text-pink-600">
                📌 Chủ đề từ: {fromLabel}
              </span>
              <button
                onClick={() => setFromLabel(null)}
                className="text-sm font-bold text-gray-500 hover:text-pink-500 underline"
              >
                Chọn chủ đề khác
              </button>
            </div>
          )}
          {!fromLabel && (
            <>
              {/* Main Tabs */}
              <div className="flex gap-2 bg-gray-200 p-2 rounded-[2rem]">
                <PushButton
                  variant={tab === "general" ? "primary" : "outline"}
                  className="flex-1 py-3 text-lg"
                  onClick={() => {
                    setTab("general");
                    setRevealEffect(false);
                    setSelectedTopic(null);
                    setSpinnerText("Quay chủ đề thôi!");
                  }}
                >
                  <Library size={20} className="mr-2" /> Tổng hợp
                </PushButton>
                <PushButton
                  variant={tab === "personal" ? "primary" : "outline"}
                  className="flex-1 py-3 text-lg"
                  onClick={() => {
                    setTab("personal");
                    setRevealEffect(false);
                    setSelectedTopic(null);
                    setSpinnerText("Quay chủ đề thôi!");
                  }}
                >
                  <User size={20} className="mr-2" /> Của tôi
                </PushButton>
              </div>

              {/* Configuration Area */}
              <Card className="border-gray-200 bg-white">
                {tab === "general" && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-gray-700">
                        Chọn lĩnh vực ({selectedCategories.length}/
                        {ALL_CATEGORIES.length})
                      </h3>
                      <button
                        onClick={
                          selectedCategories.length === ALL_CATEGORIES.length
                            ? deselectAllCategories
                            : selectAllCategories
                        }
                        className="text-pink-500 font-bold text-sm hover:underline"
                      >
                        {selectedCategories.length === ALL_CATEGORIES.length
                          ? "Bỏ chọn tất cả"
                          : "Chọn tất cả"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ALL_CATEGORIES.map((cat) => {
                        const isSelected = selectedCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            onClick={() => toggleCategory(cat)}
                            className={`px-4 py-2 rounded-xl font-bold border-2 transition-all duration-150 flex items-center gap-2
                          ${
                            isSelected
                              ? "bg-pink-100 border-pink-500 text-pink-600"
                              : "bg-white border-gray-200 text-gray-400 hover:border-pink-300 hover:text-pink-400"
                          }`}
                          >
                            {isSelected ? (
                              <CheckSquare size={16} />
                            ) : (
                              <SquareOutline size={16} />
                            )}
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                    {selectedCategories.length === 0 && (
                      <p className="text-red-500 text-sm font-bold mt-2">
                        Vui lòng chọn ít nhất 1 lĩnh vực để quay.
                      </p>
                    )}
                  </div>
                )}

                {tab === "personal" && (
                  <div className="space-y-4 animate-in fade-in">
                    <h3 className="font-bold text-gray-700">
                      Chủ đề của bạn ({myTopics.length})
                    </h3>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        placeholder="Nhập chủ đề mới (VD: Chủ nghĩa duy vật biện chứng)..."
                        className="flex-1 border-2 border-gray-200 rounded-2xl px-4 py-3 font-medium outline-none focus:border-pink-500 transition-colors"
                        onKeyDown={(e) => e.key === "Enter" && addMyTopic()}
                      />
                      <PushButton
                        variant="primary"
                        className="px-6"
                        onClick={addMyTopic}
                        disabled={newTopic.trim() === ""}
                      >
                        <Plus size={20} /> Thêm
                      </PushButton>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {myTopics.length === 0 ? (
                        <p className="text-gray-400 italic text-center py-4">
                          Não có chủ đề nào yêu thích hong? Nếu chưa, có thể bấm
                          ⭐ ở một chủ đề trong Tổng hợp để lưu về đây nhé!
                        </p>
                      ) : (
                        myTopics.map((topic, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 bg-gray-50 border-2 border-gray-100 rounded-2xl group"
                          >
                            <span className="font-bold text-gray-700">
                              {topic}
                            </span>
                            <button
                              onClick={() => removeMyTopic(index)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </>
          )}
          {/* Spinner Box */}
          <Card
            className={`text-center overflow-hidden relative transition-all duration-500 
            ${
              revealEffect
                ? "border-pink-400 bg-pink-50 shadow-[0_0_40px_-10px_rgba(236,72,153,0.5)] scale-[1.02]"
                : "border-gray-200"
            }
          `}
          >
            <div className="absolute -right-10 -top-10 text-9xl text-pink-500 opacity-5 rotate-12 pointer-events-none">
              <Dices />
            </div>

            <div className="relative z-10 py-8">
              {selectedCategoryLabel && !isSpinning && (
                <div className="animate-in zoom-in mb-4">
                  <span className="inline-block bg-pink-500 text-white font-black uppercase tracking-wider px-4 py-1.5 rounded-full text-xs shadow-md">
                    {selectedCategoryLabel}
                  </span>
                </div>
              )}

              <div
                className={`min-h-[160px] flex items-center justify-center p-4 transition-all
                ${isSpinning ? "scale-105 blur-[1px]" : "scale-100"}
                ${revealEffect ? "nn-pop" : ""}
              `}
              >
                <h2
                  className={`font-extrabold leading-tight transition-all duration-300 ${
                    selectedTopic
                      ? "text-3xl md:text-5xl text-pink-600"
                      : isSpinning
                      ? "text-2xl md:text-4xl text-gray-500"
                      : "text-2xl md:text-4xl text-gray-400"
                  }`}
                >
                  {spinnerText}
                </h2>
              </div>

              {selectedTopic &&
                !isSpinning &&
                selectedCategoryLabel !== "Chủ đề của tôi" && (
                  <div className="flex justify-center mt-2 animate-in fade-in">
                    <button
                      onClick={toggleSaveTopic}
                      className={`flex items-center gap-2 px-5 py-2 rounded-2xl border-2 font-bold transition-all ${
                        isSaved
                          ? "bg-yellow-100 border-yellow-400 text-yellow-600"
                          : "bg-white border-gray-200 text-gray-500 hover:border-yellow-300 hover:text-yellow-500"
                      }`}
                    >
                      <Star
                        size={20}
                        fill={isSaved ? "currentColor" : "none"}
                      />
                      {isSaved
                        ? "Đã lưu vào Chủ đề của tôi"
                        : "Lưu vào Chủ đề của tôi"}
                    </button>
                  </div>
                )}
              <div className="mt-6 flex justify-center">
                <PushButton
                  variant={revealEffect ? "primary" : "secondary"}
                  className="py-5 px-12 text-xl"
                  onClick={handleSpin}
                  disabled={
                    isSpinning ||
                    (tab === "general" && selectedCategories.length === 0) ||
                    (tab === "personal" && myTopics.length === 0)
                  }
                >
                  <Dices
                    size={28}
                    className={`mr-3 ${isSpinning ? "animate-spin" : ""}`}
                  />
                  {selectedTopic ? "Quay Lại Lần Nữa" : "QUAY NGAY"}
                </PushButton>
              </div>
            </div>
          </Card>

          {/* Setup Follow-up options (Shown only after topic is picked) */}
          {selectedTopic && (
            <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500 fade-in pb-8">
              {/* Framework Selection */}
              <div>
                <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <BookOpen className="text-purple-500" /> Chọn cấu trúc nói
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {FRAMEWORKS.map((fw) => (
                    <PushButton
                      key={fw.id}
                      variant={
                        selectedFramework.id === fw.id ? "active" : "outline"
                      }
                      className="p-4 flex flex-col items-start text-left h-full"
                      onClick={() => setSelectedFramework(fw)}
                    >
                      <div className="font-extrabold mb-2 text-[15px]">
                        {fw.name}
                      </div>
                      <div className="text-xs font-normal leading-relaxed opacity-80">
                        {fw.desc}
                      </div>
                    </PushButton>
                  ))}
                </div>
              </div>

              {/* Timer Customization */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                    <Clock className="text-blue-500" /> Thời gian luyện tập
                  </h3>
                  <button
                    onClick={() => {
                      playClick();
                      setShowTimeSettings(!showTimeSettings);
                    }}
                    className={`p-2 rounded-xl transition-colors ${
                      showTimeSettings
                        ? "bg-pink-100 text-pink-500"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    <Settings size={20} />
                  </button>
                </div>

                {showTimeSettings ? (
                  <div className="flex flex-col sm:flex-row gap-6 animate-in slide-in-from-top-2">
                    <div className="flex-1 bg-gray-50 p-4 rounded-2xl border-2 border-gray-100">
                      <p className="text-sm font-bold text-gray-500 mb-3 text-center uppercase">
                        Thời gian tìm hiểu
                      </p>
                      <div className="flex items-center justify-center gap-4">
                        <PushButton
                          variant="outline"
                          className="w-12 h-12 !p-0"
                          onClick={() => setPrepMins(Math.max(1, prepMins - 1))}
                        >
                          -
                        </PushButton>
                        <span className="text-3xl font-black text-gray-800 w-16 text-center">
                          {prepMins}p
                        </span>
                        <PushButton
                          variant="outline"
                          className="w-12 h-12 !p-0"
                          onClick={() => setPrepMins(prepMins + 1)}
                        >
                          +
                        </PushButton>
                      </div>
                    </div>
                    <div className="flex-1 bg-gray-50 p-4 rounded-2xl border-2 border-gray-100">
                      <p className="text-sm font-bold text-gray-500 mb-3 text-center uppercase">
                        Thời gian nói
                      </p>
                      <div className="flex items-center justify-center gap-4">
                        <PushButton
                          variant="outline"
                          className="w-12 h-12 !p-0"
                          onClick={() =>
                            setSpeakMins(Math.max(1, speakMins - 1))
                          }
                        >
                          -
                        </PushButton>
                        <span className="text-3xl font-black text-gray-800 w-16 text-center">
                          {speakMins}p
                        </span>
                        <PushButton
                          variant="outline"
                          className="w-12 h-12 !p-0"
                          onClick={() => setSpeakMins(speakMins + 1)}
                        >
                          +
                        </PushButton>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <div className="flex-1 bg-blue-50 text-blue-700 p-4 rounded-2xl border-2 border-blue-100 flex items-center justify-between">
                      <span className="font-bold">Tìm hiểu</span>
                      <span className="text-xl font-black">
                        {prepMins} phút
                      </span>
                    </div>
                    <div className="flex-1 bg-pink-50 text-pink-700 p-4 rounded-2xl border-2 border-pink-100 flex items-center justify-between">
                      <span className="font-bold">Nói</span>
                      <span className="text-xl font-black">
                        {speakMins} phút
                      </span>
                    </div>
                  </div>
                )}
              </Card>

              {/* Start Action */}
              <PushButton
                variant="primary"
                className="w-full py-5 text-2xl mt-4 shadow-lg shadow-pink-200"
                onClick={startPrep}
              >
                Bắt đầu luyện ngay <ChevronRight size={28} className="ml-2" />
              </PushButton>
            </div>
          )}
        </div>
      )}

      {/* --- Prep Step --- */}
      {step === "prep" && (
        <Card className="text-center py-12 border-blue-200 bg-blue-50 animate-in zoom-in duration-300">
          <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider mb-3">
            Đang tìm hiểu chủ đề
          </h3>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-8 px-4 leading-tight">
            {selectedTopic}
          </h2>

          <div className="text-8xl font-black text-blue-600 tabular-nums mb-10 font-mono tracking-tighter">
            {formatTime(timeLeft)}
          </div>

          <div className="bg-white mx-4 p-5 rounded-2xl border-2 border-blue-100 text-left mb-8 shadow-sm">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              Cấu trúc khuyên dùng
            </span>
            <p className="font-extrabold text-gray-800 mt-2 text-lg">
              {selectedFramework.name}
            </p>
            <p className="text-sm text-gray-600 mt-1 font-medium">
              {selectedFramework.desc}
            </p>
          </div>

          <PushButton
            variant="primary"
            className="mx-auto px-10 py-4 text-xl"
            onClick={startSpeaking}
          >
            Bỏ qua, Nói ngay <FastForward size={24} className="ml-2" />
          </PushButton>
        </Card>
      )}

      {/* --- Speak Step --- */}
      {step === "speak" && (
        <Card className="text-center py-16 relative overflow-hidden animate-in zoom-in duration-300 border-red-200 bg-white shadow-2xl">
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <div
              className="w-96 h-96 bg-red-500 rounded-full animate-ping"
              style={{ animationDuration: "2.5s" }}
            ></div>
          </div>
          <div className="relative z-10">
            <div className="items-center justify-center gap-3 mb-6 bg-red-50 inline-flex px-6 py-2 rounded-full border-2 border-red-100">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-500 font-extrabold tracking-widest uppercase">
                Đang Ghi Âm
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-10 px-4 leading-tight">
              {selectedTopic}
            </h2>
            <div className="text-[120px] leading-none font-black text-gray-900 tabular-nums mb-12 font-mono tracking-tighter">
              {formatTime(timeLeft)}
            </div>
            <div className="mx-auto max-w-xl mb-8 px-4">
              {rec.error ? (
                <p className="text-sm font-bold text-red-500 bg-red-50 border-2 border-red-100 rounded-2xl p-3">
                  {rec.error}
                </p>
              ) : (
                <p className="text-sm font-medium text-gray-500 bg-gray-50 border-2 border-gray-100 rounded-2xl p-3 min-h-[64px] text-left">
                  {rec.transcript || rec.interim
                    ? `${rec.transcript} ${rec.interim}`
                    : rec.speechSupported
                    ? "Cậu cứ nói đi, chữ sẽ hiện ở đây..."
                    : "Trình duyệt này chưa chuyển giọng nói thành chữ được, nhưng vẫn ghi âm bình thường."}
                </p>
              )}
            </div>
            <PushButton
              variant="danger"
              className="mx-auto px-12 py-5 text-xl shadow-lg shadow-red-200"
              onClick={endSession}
            >
              <Square size={24} fill="currentColor" className="mr-3" /> Dừng &
              Hoàn thành
            </PushButton>
          </div>
        </Card>
      )}

      {timeUp && (step === "prep" || step === "speak") && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-pink-200 shadow-2xl p-8 max-w-md w-full text-center animate-in zoom-in duration-300">
            <div className="text-6xl mb-3">⏰</div>
            <h3 className="text-3xl font-black text-pink-600 mb-2">
              {step === "prep" ? "Hết giờ tìm hiểu rồi!" : "Hết giờ nói rồi!"}
            </h3>
            <p className="text-gray-500 font-medium mb-6">
              {step === "prep"
                ? "Cậu muốn tìm hiểu thêm hay nói luôn?"
                : "Cậu muốn nói thêm hay hoàn thành?"}
            </p>
            <div className="space-y-3">
              {step === "prep" ? (
                <>
                  <PushButton
                    variant="primary"
                    className="w-full py-3 text-lg"
                    onClick={startSpeaking}
                  >
                    Nói luôn <Mic size={18} className="ml-2" />
                  </PushButton>
                  <PushButton
                    variant="secondary"
                    className="w-full py-3 text-lg"
                    onClick={() => {
                      endAtRef.current = Date.now() + 5 * 60 * 1000;
                      setTimeLeft(5 * 60);
                      setTimeUp(false);
                    }}
                  >
                    Tìm hiểu thêm 5 phút
                  </PushButton>
                </>
              ) : (
                <>
                  <PushButton
                    variant="primary"
                    className="w-full py-3 text-lg"
                    onClick={endSession}
                  >
                    Hoàn thành <CheckCircle2 size={18} className="ml-2" />
                  </PushButton>
                  <PushButton
                    variant="secondary"
                    className="w-full py-3 text-lg"
                    onClick={() => {
                      endAtRef.current = Date.now() + 60 * 1000;
                      setTimeLeft(60);
                      setTimeUp(false);
                    }}
                  >
                    Nói thêm 1 phút
                  </PushButton>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* --- Result Step --- */}
      {step === "result" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8">
          <Card className="border-t-4 border-t-pink-500 shadow-md">
            <div className="mb-6 border-b-2 border-gray-100 pb-6">
              <h2 className="text-2xl font-black text-gray-800 mb-2 flex items-center gap-2">
                <Brain className="text-pink-500" /> Nhận Xét Chi Tiết
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-green-600">
                  🎉 Não hôm nay nhăn thêm một chút rồi đó!
                </span>
                {spokenSeconds >= 10 && (
                  <span className="bg-green-100 border-2 border-green-200 text-green-700 font-black px-3 py-1 rounded-xl shadow-sm text-sm">
                    🧠 +{XP_SPEAK} Nếp Nhăn ✨
                  </span>
                )}
              </div>
            </div>

            <div
              className="flex overflow-x-auto gap-3 pb-4 mb-2 -mx-2 px-2"
              style={{ scrollbarWidth: "none" }}
            >
              <PushButton
                variant={feedbackTab === "fluency" ? "primary" : "outline"}
                className="whitespace-nowrap px-5 py-2.5 text-sm"
                onClick={() => setFeedbackTab("fluency")}
              >
                Độ trôi chảy
              </PushButton>
              <PushButton
                variant={feedbackTab === "vocab" ? "primary" : "outline"}
                className="whitespace-nowrap px-5 py-2.5 text-sm"
                onClick={() => setFeedbackTab("vocab")}
              >
                Từ vựng
              </PushButton>
              <PushButton
                variant={feedbackTab === "grammar" ? "primary" : "outline"}
                className="whitespace-nowrap px-5 py-2.5 text-sm"
                onClick={() => setFeedbackTab("grammar")}
              >
                Ngữ pháp
              </PushButton>
              <PushButton
                variant={
                  feedbackTab === "pronunciation" ? "primary" : "outline"
                }
                className="whitespace-nowrap px-5 py-2.5 text-sm"
                onClick={() => setFeedbackTab("pronunciation")}
              >
                Phát âm
              </PushButton>
            </div>

            <div className="min-h-[250px]">
              {feedbackTab === "fluency" && (
                <div className="animate-in fade-in space-y-4">
                  {rec.audioUrl ? (
                    <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-2xl">
                      <p className="font-bold text-purple-700 mb-2">
                        🎧 Nghe lại bài nói của cậu
                      </p>
                      <audio controls src={rec.audioUrl} className="w-full" />
                    </div>
                  ) : (
                    <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-2xl text-gray-500 font-bold">
                      {rec.error || "Chưa có bản ghi âm."}
                    </div>
                  )}

                  <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl flex gap-3 items-start">
                    <span className="text-2xl">💪</span>
                    <p className="font-bold text-blue-700">
                      {analysis.words === 0
                        ? "🧠 Mình chưa nhận được chữ nào. Cậu kiểm tra micro, hoặc thử nói to và rõ hơn nhé!"
                        : `🧠 Cậu đã nói ${
                            analysis.words
                          } từ trong ${formatTime(
                            spokenSeconds
                          )}. Nghe lại bản ghi để tự chấm xem chỗ nào còn khựng nhé!`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between bg-orange-50 border-2 border-orange-100 p-4 rounded-2xl">
                    <span className="font-bold text-gray-700">Tốc độ nói:</span>
                    <span className="font-black text-orange-600 text-lg">
                      {analysis.words > 0
                        ? `${analysis.wpm} từ/phút - ${analysis.speedLabel}`
                        : "Chưa đo được"}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">
                      Chữ nhận diện được
                    </p>
                    <div className="bg-gray-50 border-2 border-gray-200 p-5 rounded-2xl text-gray-700 leading-loose text-lg font-medium">
                      {rec.transcript ||
                        "(Chưa nhận diện được chữ nào. Có thể trình duyệt chưa hỗ trợ, hoặc micro chưa thu được tiếng.)"}
                    </div>
                  </div>
                </div>
              )}

              {feedbackTab === "vocab" && (
                <div className="animate-in fade-in space-y-3">
                  {analysis.words === 0 ? (
                    <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-2xl text-gray-500 font-bold">
                      Chưa có chữ để phân tích. Cậu nói thêm một bài nhé!
                    </div>
                  ) : (
                    <>
                      <div
                        className={`border-2 p-4 rounded-2xl flex gap-3 items-start ${
                          analysis.fillerTotal === 0
                            ? "bg-green-50 border-green-200"
                            : "bg-orange-50 border-orange-200"
                        }`}
                      >
                        <span className="text-2xl">
                          {analysis.fillerTotal === 0 ? "✨" : "🧐"}
                        </span>
                        <p className="font-bold text-gray-700">
                          {analysis.fillerTotal === 0
                            ? "Mình không thấy từ đệm nào trong bài này. Tốt lắm!"
                            : `Cậu dùng ${analysis.fillerTotal} từ đệm. Thử ngừng một nhịp thay vì chêm từ nhé.`}
                        </p>
                      </div>

                      {analysis.fillers.map((f) => (
                        <div
                          key={f.phrase}
                          className="flex justify-between items-center bg-white border-2 border-gray-200 p-4 rounded-2xl"
                        >
                          <span className="font-black text-gray-800 text-lg">
                            "{f.phrase}"
                          </span>
                          <span className="bg-orange-200 text-orange-800 text-xs font-bold px-3 py-1 rounded-full">
                            {f.count} lần
                          </span>
                        </div>
                      ))}

                      {analysis.repeats.length > 0 && (
                        <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl">
                          <p className="font-bold text-blue-700 mb-1">
                            Từ lặp liền nhau
                          </p>
                          <p className="text-sm font-medium text-gray-600">
                            {analysis.repeats
                              .map((r) => `"${r.word}" (${r.count} lần)`)
                              .join(", ")}
                            . Có thể cậu cố ý (như "dần dần", "từ từ"), hoặc là
                            đang vấp.
                          </p>
                        </div>
                      )}

                      {vocab.weak.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-gray-400 uppercase">
                            Từ có thể nâng cấp
                          </p>
                          {vocab.weak.map((w) => (
                            <div
                              key={w.phrase}
                              className="bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                            >
                              <div>
                                <div className="font-bold text-gray-400 line-through">
                                  "{w.phrase}"
                                </div>
                                <div className="font-black text-blue-600 flex items-center gap-2 mt-1">
                                  <CheckCircle2 size={18} />{" "}
                                  {w.better.join(", ")}
                                </div>
                              </div>
                              <span className="bg-blue-200 text-blue-800 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap self-start sm:self-auto">
                                {w.count} lần
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {vocab.repeatedPhrases.length > 0 && (
                        <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-2xl">
                          <p className="font-bold text-purple-700 mb-1">
                            Cụm từ lặp lại
                          </p>
                          <p className="text-sm font-medium text-gray-600">
                            {vocab.repeatedPhrases
                              .map((r) => `"${r.phrase}" (${r.count} lần)`)
                              .join(", ")}
                            . Thử diễn đạt khác đi ở lần sau để bài đỡ đơn điệu.
                          </p>
                        </div>
                      )}
                      <p className="text-xs font-bold text-gray-400">
                        Lưu ý: bộ nhận diện giọng nói của trình duyệt hay tự bỏ
                        bớt "ờ", "ừm", nên số từ đệm thật có thể nhiều hơn số
                        này.
                      </p>
                    </>
                  )}
                </div>
              )}

              {feedbackTab === "grammar" && (
                <div className="animate-in fade-in space-y-4">
                  {!rec.transcript ? (
                    <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-2xl text-gray-500 font-bold">
                      Chưa có chữ để kiểm tra. Cậu nói thêm một bài nhé!
                    </div>
                  ) : (
                    <>
                      <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl">
                        <p className="font-bold text-blue-700">
                          🧠 Mình kiểm tra được một số lỗi diễn đạt phổ biến
                          bằng quy tắc. Đây chưa phải chấm ngữ pháp đầy đủ. Muốn
                          chấm kỹ hơn, cậu copy prompt ở dưới sang AI nhé.
                        </p>
                      </div>

                      {grammar.length === 0 ? (
                        <div className="bg-green-50 border-2 border-green-200 p-4 rounded-2xl font-bold text-green-700">
                          ✨ Mình không thấy lỗi diễn đạt phổ biến nào trong bài
                          này.
                        </div>
                      ) : (
                        grammar.map((g) => (
                          <div
                            key={g.phrase}
                            className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-black text-red-500">
                                "{g.phrase}"
                              </span>
                              <span className="bg-red-200 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
                                {g.count} lần
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-600">
                              {g.note}
                            </p>
                          </div>
                        ))
                      )}

                      {analysis.repeats.length > 0 && (
                        <div className="bg-orange-50 border-2 border-orange-200 p-4 rounded-2xl">
                          <p className="font-bold text-orange-700 mb-1">
                            Từ lặp liền nhau
                          </p>
                          <p className="text-sm font-medium text-gray-600">
                            {analysis.repeats
                              .map((r) => `"${r.word}" (${r.count} lần)`)
                              .join(", ")}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  <details className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                    <summary className="font-bold text-gray-700 cursor-pointer">
                      🤖 Chấm ngữ pháp đầy đủ bằng AI (copy prompt)
                    </summary>
                    <div className="mt-4">
                      <PromptBox
                        prompt={buildGrammarPrompt({
                          topic: selectedTopic,
                          text: transcript || rec.transcript,
                        })}
                      />
                    </div>
                  </details>
                </div>
              )}

              {feedbackTab === "pronunciation" && (
                <div className="animate-in fade-in space-y-5">
                  {!rec.transcript ? (
                    <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-2xl text-gray-500 font-bold">
                      Chưa có chữ nhận diện để phân tích phát âm. Cậu nói thêm
                      một bài nhé!
                    </div>
                  ) : (
                    <>
                      {pron.avg !== null ? (
                        <div className="flex items-center justify-between bg-blue-50 border-2 border-blue-200 p-4 rounded-2xl">
                          <span className="font-bold text-gray-700">
                            Độ rõ lời nói (theo bộ nhận diện):
                          </span>
                          <span className="font-black text-blue-600 text-lg">
                            {pron.avg}% -{" "}
                            {pron.avg >= 90
                              ? "Rõ ràng"
                              : pron.avg >= 80
                              ? "Khá rõ"
                              : "Có chỗ chưa rõ"}
                          </span>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-2xl text-gray-500 font-bold text-sm">
                          Trình duyệt này không trả về độ tin cậy nên mình chưa
                          đo được độ rõ.
                        </div>
                      )}

                      {pron.low.length > 0 && (
                        <div>
                          <h4 className="font-black text-red-500 mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                            <Flame size={18} /> Đoạn bộ nhận diện nghe không
                            chắc
                          </h4>
                          <div className="space-y-2">
                            {pron.low.map((s, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between gap-3 bg-white border-2 border-gray-200 p-3 rounded-2xl"
                              >
                                <span className="font-bold text-gray-800">
                                  "{s.text}"
                                </span>
                                <span className="bg-red-100 text-red-600 text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">
                                  {Math.round(s.confidence * 100)}%
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs font-bold text-gray-400 mt-2">
                            Cậu nghe lại bản ghi ở tab Độ trôi chảy để tự kiểm
                            tra đoạn này.
                          </p>
                        </div>
                      )}

                      {pron.watch.length > 0 && (
                        <div>
                          <h4 className="font-black text-orange-500 mb-3 uppercase tracking-wide text-sm flex items-center gap-2">
                            <Zap size={18} /> Từ chứa âm dễ nhầm trong bài của
                            cậu
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {pron.watch.map((w) => (
                              <button
                                key={w}
                                onClick={() => {
                                  playClick();
                                  speakText(w);
                                }}
                                className="px-3 py-2 bg-white border-2 border-gray-200 rounded-xl font-black text-gray-700 hover:border-orange-300 hover:text-orange-500 flex items-center gap-2"
                              >
                                <Headphones size={16} /> {w}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs font-bold text-gray-400 mt-2">
                            Đây là danh sách để cậu chú ý luyện, không có nghĩa
                            là cậu nói sai. Bấm vào từ để nghe đọc mẫu
                          </p>
                        </div>
                      )}

                      <p className="text-xs font-bold text-gray-400">
                        Lưu ý: độ rõ này là độ tin cậy do trình duyệt tính,
                        không phải điểm phát âm chính thức. Tiếng ồn, micro kém,
                        tên riêng hoặc từ tiếng Anh cũng làm điểm thấp đi.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card className="border-t-4 border-t-purple-400">
            <h3 className="text-lg font-black text-gray-800 mb-1 flex items-center gap-2">
              <PenTool className="text-purple-500" size={20} /> Chỉnh lại chữ
              bài nói
            </h3>
            <p className="text-sm font-medium text-gray-500 mb-3">
              Bộ nhận diện giọng nói không có dấu câu và đôi khi nghe nhầm. Cậu
              sửa lại cho đúng trước khi hỏi AI hoặc đăng lên Bảng Vàng. Bản đã
              sửa sẽ được lưu vào Lịch sử.
            </p>
            <textarea
              value={transcript}
              onChange={(e) => {
                editedRef.current = true;
                setTranscript(e.target.value);
              }}
              placeholder="Chưa nhận diện được chữ nào. Cậu có thể gõ hoặc dán bài nói vào đây."
              className="w-full h-40 p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl font-medium text-gray-700 leading-relaxed focus:border-pink-500 outline-none resize-y transition-colors"
            />
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <PushButton
                variant="outline"
                className="px-4 py-2 text-sm"
                onClick={() => {
                  editedRef.current = false;
                  setTranscript(rec.transcript);
                }}
              >
                ↩ Về bản gốc
              </PushButton>
              <span className="text-xs font-bold text-gray-400">
                {transcript.trim() ? transcript.trim().split(/\s+/).length : 0}{" "}
                từ
              </span>
            </div>
          </Card>
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <PushButton
              variant="outline"
              className="flex-1 py-4 text-lg bg-white"
              onClick={resetAll}
            >
              <RotateCcw size={20} className="mr-2" /> Về lúc đầu
            </PushButton>
            <PushButton
              variant="secondary"
              className="flex-1 py-4 text-lg"
              onClick={() => setStep("discuss")}
            >
              <Brain size={20} className="mr-2" /> Thảo luận sâu
            </PushButton>
            <PushButton
              variant="primary"
              className="flex-1 py-4 text-lg"
              onClick={() => {
                playClick();
                if (!transcript) setTranscript(rec.transcript);
                setStep("edit");
              }}
            >
              <CheckSquare size={20} className="mr-2" /> Sửa bài nói
            </PushButton>
          </div>
        </div>
      )}

      {/* --- Edit Step --- */}
      {step === "edit" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
          <Card className="border-t-4 border-t-pink-500 shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                <PenTool className="text-pink-500" /> Sửa bài nói cùng AI
              </h2>
              <button
                onClick={() => {
                  playClick();
                  setStep("result");
                }}
                className="text-gray-400 hover:text-gray-600 flex items-center font-bold"
              >
                <ArrowLeft size={20} className="mr-1" /> Quay lại
              </button>
            </div>

            <p className="text-sm font-bold text-gray-500 uppercase mb-2">
              1. Kiểm tra bài nói (sửa chữ nhận diện sai nếu có)
            </p>
            <textarea
              value={transcript}
              onChange={(e) => {
                editedRef.current = true;
                setTranscript(e.target.value);
              }}
              placeholder="Chưa có bài nói. Cậu có thể gõ hoặc dán bài của mình vào đây."
              className="w-full h-48 p-5 bg-gray-50 border-2 border-gray-200 rounded-2xl font-medium text-gray-700 text-lg leading-relaxed focus:border-pink-500 outline-none resize-none transition-colors"
            />

            <p className="text-sm font-bold text-gray-500 uppercase mt-6 mb-3">
              2. Chọn cách sửa
            </p>
            <div className="flex flex-wrap gap-3">
              {Object.keys(STYLE_PROMPT).map((style) => (
                <PushButton
                  key={style}
                  variant={editStyle === style ? "active" : "outline"}
                  className="py-2.5 px-5 text-sm"
                  onClick={() => setEditStyle(style)}
                >
                  {style}
                </PushButton>
              ))}
            </div>

            <p className="text-sm font-bold text-gray-500 uppercase mt-6 mb-3">
              3. Copy prompt rồi dán vào AI
            </p>
            <PromptBox
              prompt={buildEditPrompt({
                style: editStyle,
                topic: selectedTopic,
                text: transcript,
              })}
            />
          </Card>
        </div>
      )}

      {/* --- Discuss Step --- */}
      {step === "discuss" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
          <Card className="border-t-4 border-t-purple-500">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <MessageCircle className="text-purple-500" /> Thảo Luận Sâu
              </h2>
              <button
                onClick={() => {
                  playClick();
                  setStep("result");
                }}
                className="text-gray-400 hover:text-gray-600 flex items-center font-bold"
              >
                <ArrowLeft size={20} className="mr-1" /> Quay lại
              </button>
            </div>

            <p className="text-sm font-bold text-gray-500 uppercase mb-3">
              1. Chọn vai cho AI
            </p>
            <div
              className="flex overflow-x-auto gap-2 pb-2 mb-4"
              style={{ scrollbarWidth: "none" }}
            >
              {Object.keys(AI_ROLES).map((role) => {
                const Icon = AI_ROLES[role].icon;
                return (
                  <PushButton
                    key={role}
                    variant={aiRole === role ? "secondary" : "outline"}
                    className="whitespace-nowrap px-4 py-2 text-sm"
                    onClick={() => setAiRole(role)}
                  >
                    <Icon size={16} className="mr-2" /> {role}
                  </PushButton>
                );
              })}
            </div>

            {!(transcript || rec.transcript) && (
              <p className="text-sm font-bold text-orange-500 bg-orange-50 border-2 border-orange-100 rounded-2xl p-3 mb-4">
                Mình chưa có nội dung bài nói. Cậu dán bài vào chỗ [Dán nội
                dung...] trong prompt bên dưới nhé.
              </p>
            )}

            <p className="text-sm font-bold text-gray-500 uppercase mb-3">
              2. Copy prompt rồi dán vào AI
            </p>
            <PromptBox
              prompt={buildDiscussPrompt({
                role: aiRole,
                topic: selectedTopic,
                framework: selectedFramework.name,
                text: transcript || rec.transcript,
              })}
            />
          </Card>
        </div>
      )}
    </div>
  );
};

// --- 2. PRONUNCIATION COURSE FEATURE ---
const Pronunciation = ({ onFinish }) => {
  const [activeTab, setActiveTab] = useState("L / N");
  const [mode, setMode] = useState("words"); // words or sentences
  const rec = useSpeechRecorder();
  const [recordingKey, setRecordingKey] = useState(null);
  // Mỗi lần đọc xong và nhận diện được chữ thì cộng điểm (chỉ cộng một lần cho mỗi lần ghi)
  const awardedRef = useRef(null);
  const itemRef = useRef("");
  const doneRef = useRef(new Set());
  useEffect(() => {
    if (
      !rec.isRecording &&
      rec.audioUrl &&
      rec.transcript &&
      awardedRef.current !== rec.audioUrl
    ) {
      awardedRef.current = rec.audioUrl;
      const r = compareSpeech(itemRef.current, rec.transcript);
      if (r.score >= 50 && !doneRef.current.has(recordingKey)) {
        doneRef.current.add(recordingKey);
        if (onFinish) onFinish();
      }
    }
  }, [rec.isRecording, rec.audioUrl, rec.transcript]);

  // Đổi âm hoặc đổi chế độ thì dừng ghi và xóa kết quả cũ
  useEffect(() => {
    rec.stop();
    rec.reset();
    setRecordingKey(null);
  }, [activeTab, mode]);

  const handleMic = (key, item) => {
    playClick();
    if (rec.isRecording) {
      if (recordingKey === key) rec.stop();
      return;
    }
    itemRef.current = item;
    setRecordingKey(key);
    rec.start();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-3xl border-2 border-blue-100 shadow-sm">
        <div className="bg-blue-100 p-3 rounded-2xl">
          <Volume2 className="text-blue-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-blue-600">
            Khóa học phát âm
          </h2>
          <p className="text-gray-500 font-medium">
            Chỉnh sửa các lỗi phát âm vùng miền thường gặp.
          </p>
        </div>
      </div>

      <VoicePicker />
      {!rec.speechSupported && (
        <div className="bg-yellow-50 border-2 border-yellow-200 text-yellow-700 font-bold text-sm p-4 rounded-2xl">
          Trình duyệt này chưa chuyển giọng nói thành chữ được, nên chưa chấm
          được phát âm. Cậu mở bằng Chrome hoặc Edge nhé.
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <Card className="w-full md:w-64 shrink-0 p-3 flex flex-row md:flex-col gap-2 overflow-x-auto">
          {Object.keys(PRONUNCIATION_DATA).map((sound) => (
            <PushButton
              key={sound}
              variant={activeTab === sound ? "primary" : "navInactive"}
              className="whitespace-nowrap px-4 py-3"
              onClick={() => setActiveTab(sound)}
            >
              {sound}
            </PushButton>
          ))}
        </Card>

        <Card className="flex-1">
          <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl mb-6">
            <PushButton
              variant={mode === "words" ? "active" : "navInactive"}
              className="flex-1 py-2 text-sm"
              onClick={() => setMode("words")}
            >
              Luyện Từ
            </PushButton>
            <PushButton
              variant={mode === "sentences" ? "active" : "navInactive"}
              className="flex-1 py-2 text-sm"
              onClick={() => setMode("sentences")}
            >
              Luyện Câu
            </PushButton>
          </div>

          <div className="space-y-4">
            {PRONUNCIATION_DATA[activeTab][mode].map((item, idx) => {
              const key = `${activeTab}-${mode}-${idx}`;
              const isThis = recordingKey === key;
              const isRec = isThis && rec.isRecording;

              let panel = null;
              if (isThis) {
                if (isRec) {
                  panel = (
                    <div>
                      <p className="text-sm font-bold text-red-500 animate-pulse mb-2">
                        🎙️ Đang nghe... bấm nút vuông để dừng.
                      </p>
                      <p className="text-sm font-medium text-gray-500 bg-white border-2 border-gray-100 rounded-xl p-3 min-h-[44px]">
                        {rec.transcript || rec.interim
                          ? `${rec.transcript} ${rec.interim}`
                          : "Cậu đọc đi, chữ sẽ hiện ở đây..."}
                      </p>
                    </div>
                  );
                } else if (rec.error) {
                  panel = (
                    <p className="text-sm font-bold text-red-500 bg-red-50 border-2 border-red-100 rounded-xl p-3">
                      {rec.error}
                    </p>
                  );
                } else if (!rec.audioUrl) {
                  panel = (
                    <p className="text-sm font-bold text-gray-400">
                      Đang xử lý...
                    </p>
                  );
                } else if (!rec.transcript) {
                  panel = (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-orange-500">
                        Mình chưa nghe ra chữ nào. Cậu thử đọc to và rõ hơn nhé!
                      </p>
                      <audio controls src={rec.audioUrl} className="w-full" />
                    </div>
                  );
                } else {
                  const result = compareSpeech(item, rec.transcript);
                  const color =
                    result.score >= 80
                      ? "text-green-600"
                      : result.score >= 50
                      ? "text-orange-500"
                      : "text-red-500";
                  const msg =
                    result.score >= 80
                      ? "Chuẩn rồi! 🎉"
                      : result.score >= 50
                      ? "Gần được rồi, thử lại nhé!"
                      : "Chưa ổn lắm, nghe mẫu rồi thử lại nhé!";
                  panel = (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${color}`}>
                          {result.score}%
                        </span>
                        <span className="font-bold text-gray-600">{msg}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.words.map((w, k) => (
                          <span
                            key={k}
                            className={`px-2 py-1 rounded-lg font-black text-lg ${
                              w.ok
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {w.word}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm font-medium text-gray-500">
                        <span className="font-bold">Mình nghe thấy:</span>{" "}
                        {rec.transcript}
                      </p>
                      {result.score >= 50 && (
                        <p className="text-sm font-black text-yellow-600">
                          🧠 +{XP_PRON} Nếp Nhăn ✨
                        </p>
                      )}
                      <audio controls src={rec.audioUrl} className="w-full" />
                    </div>
                  );
                }
              }

              return (
                <div
                  key={key}
                  className="bg-gray-50 border-2 border-gray-200 p-4 rounded-2xl hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-center gap-3">
                    <span className="font-bold text-gray-800 text-lg">
                      {item}
                    </span>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => {
                          playClick();
                          speakText(item);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-500 bg-white border-2 border-gray-200 rounded-xl"
                        title="Nghe đọc mẫu"
                      >
                        <Headphones size={20} />
                      </button>
                      <button
                        onClick={() => handleMic(key, item)}
                        disabled={rec.isRecording && !isRec}
                        className={`p-2 text-white border-b-4 active:border-b-0 active:translate-y-[4px] rounded-xl ${
                          isRec
                            ? "bg-gray-800 border-black animate-pulse"
                            : "bg-red-500 hover:bg-red-400 border-red-700"
                        } ${
                          rec.isRecording && !isRec
                            ? "opacity-40 cursor-not-allowed"
                            : ""
                        }`}
                        title={isRec ? "Dừng" : "Ghi âm"}
                      >
                        {isRec ? (
                          <Square size={20} fill="currentColor" />
                        ) : (
                          <Mic size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                  {panel && <div className="mt-4">{panel}</div>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

// MÀN HÌNH MỚI: THƯ VIỆN NHẠC / VIDEO
// ==========================================
const MusicLibrary = ({ navigate, setSharedMusicId }) => {
  const handlePlayMusic = (videoId) => {
    playClick();
    setSharedMusicId(videoId); // Lưu ID vào state chung
    navigate("reading"); // Chuyển sang trang đọc sách
  };

  const handleRandom = () => {
    // Gom tất cả video thành 1 mảng phẳng
    const allVideos = Object.values(STUDY_MUSIC_DATA).flat();
    const randomVid = allVideos[Math.floor(Math.random() * allVideos.length)];
    setSharedMusicId(randomVid.id);
    navigate("reading");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border-2 border-purple-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 p-4 rounded-2xl">
            <Music className="text-purple-600" size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-purple-600">
              Thư viện Nhạc & Video
            </h2>
            <p className="text-gray-500 font-medium">
              Chọn một không gian để bắt đầu học tập và đọc sách.
            </p>
          </div>
        </div>
        <PushButton
          variant="secondary"
          className="px-6 py-4 w-full sm:w-auto"
          onClick={handleRandom}
        >
          <Dices size={20} className="mr-2" /> Chọn ngẫu nhiên
        </PushButton>
      </div>

      {Object.entries(STUDY_MUSIC_DATA).map(([categoryName, videos]) => (
        <div key={categoryName} className="space-y-4">
          <h3 className="text-xl font-black text-gray-700 flex items-center gap-2">
            <span className="w-2 h-6 bg-purple-500 rounded-full inline-block"></span>{" "}
            {categoryName}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                onClick={() => handlePlayMusic(video.id)}
                className="bg-white rounded-2xl overflow-hidden border-2 border-gray-200 hover:border-purple-500 hover:shadow-[0_4px_0_0_#a855f7] transition-all cursor-pointer group"
              >
                {/* Lấy ảnh Thumbnail chất lượng cao từ YouTube */}
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  <img
                    src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <PlayCircle
                      size={48}
                      className="text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all drop-shadow-md"
                    />
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-bold text-gray-800 line-clamp-2">
                    {video.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// --- 3. READING SPINNER FEATURE ---
const ReadingMode = ({
  sharedMusicId,
  setSharedMusicId,
  onFinish,
  onReadDone,
}) => {
  const [step, setStep] = useState("setup");
  const [maxChapters, setMaxChapters] = useState(10);
  const [spinResult, setSpinResult] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [readTime, setReadTime] = useState(15);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const endAtRef = useRef(0);
  const iframeRef = useRef(null);
  const readCountedRef = useRef(false);
  const rec = useSpeechRecorder();
  const [sumSeconds, setSumSeconds] = useState(0);
  const sumStartRef = useRef(0);
  const sumAnalysis = analyzeSpeech(rec.transcript, sumSeconds);

  // Bắt đầu tính giờ lúc micro thật sự mở (không tính lúc trình duyệt hỏi quyền)
  useEffect(() => {
    if (rec.isRecording) sumStartRef.current = Date.now();
  }, [rec.isRecording]);

  const stopSummary = () => {
    setSumSeconds(Math.round((Date.now() - sumStartRef.current) / 1000));
    rec.stop();
  };
  // Ghi âm tóm tắt xong thì cộng điểm (chỉ cộng một lần cho mỗi lần ghi)
  const sumAwardedRef = useRef(null);
  const rewardedRef = useRef(false);
  useEffect(() => {
    if (
      !rec.isRecording &&
      rec.audioUrl &&
      rec.transcript &&
      sumAwardedRef.current !== rec.audioUrl &&
      !rewardedRef.current
    ) {
      sumAwardedRef.current = rec.audioUrl;
      rewardedRef.current = true;
      if (onFinish) onFinish(sumSeconds);
    }
  }, [rec.isRecording, rec.audioUrl, rec.transcript]);

  // --- Chọn nhạc theo KÊNH (lấy từ STUDY_MUSIC_DATA) ---
  const channelNames = Object.keys(STUDY_MUSIC_DATA);
  const MUSIC_LIST = [
    { id: "random", label: "🎲 Chọn ngẫu nhiên giúp não" },
    ...channelNames.map((name) => ({ id: name, label: `🎧 ${name}` })),
  ];

  // Tìm kênh chứa một video (dùng khi cậu bấm video từ Thư Viện Nhạc)
  const findChannel = (videoId) =>
    channelNames.find((name) =>
      STUDY_MUSIC_DATA[name].some((v) => v.id === videoId)
    );

  const [musicChoice, setMusicChoice] = useState(
    findChannel(sharedMusicId) || "random"
  );
  const [activeVideoId, setActiveVideoId] = useState("");

  // Khi bấm một video ở Thư Viện, ô chọn nhạc nhảy sang kênh của video đó
  useEffect(() => {
    const ch = findChannel(sharedMusicId);
    if (ch) setMusicChoice(ch);
  }, [sharedMusicId]);

  const spinTimerRef = useRef<any>(null);
  useEffect(() => () => clearTimeout(spinTimerRef.current), []);

  const handleSpin = () => {
    clearTimeout(spinTimerRef.current);
    setIsSpinning(true);
    const totalTicks = 26;
    let i = 0;
    const tick = () => {
      const progress = i / totalTicks;
      i++;
      const safeMax = Math.max(1, Math.floor(maxChapters) || 1);
      setSpinResult(Math.floor(Math.random() * safeMax) + 1);
      if (i >= totalTicks) {
        setIsSpinning(false);
        playTick(1);
        setTimeout(playWin, 120);
        return;
      }
      playTick(progress);
      spinTimerRef.current = setTimeout(tick, 55 + Math.pow(progress, 3) * 320);
    };
    tick();
  };

  // Hàm kích hoạt lúc bấm "Vào Chế Độ Đọc"
  const startReading = () => {
    requestNotifyPermission();

    // Chọn kênh (nếu để ngẫu nhiên thì bốc một kênh)
    let channel = musicChoice;
    if (channel === "random") {
      channel = channelNames[Math.floor(Math.random() * channelNames.length)];
    }
    const videos = STUDY_MUSIC_DATA[channel];

    // Nếu cậu bấm một video cụ thể ở Thư Viện và kênh vẫn khớp thì phát đúng video đó
    const pinned = videos.find((v) => v.id === sharedMusicId);
    const video = pinned || videos[Math.floor(Math.random() * videos.length)];

    setActiveVideoId(video.id);
    setSharedMusicId("random");
    const mins = Math.max(1, Math.floor(readTime) || 1);
    endAtRef.current = Date.now() + mins * 60 * 1000;
    setTimeLeft(mins * 60);
    setTimeUp(false);
    readCountedRef.current = false;
    setStep("reading");
  };

  // Bộ đếm ngược: tính theo giờ thật, không bị chậm khi cậu chuyển sang tab khác
  useEffect(() => {
    if (step !== "reading" || timeUp) return;
    const id = setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((endAtRef.current - Date.now()) / 1000)
      );
      setTimeLeft(left);
      if (left === 0) {
        clearInterval(id);
        if (!readCountedRef.current) {
          readCountedRef.current = true;
          if (onReadDone) onReadDone();
        }
        notifyTimeUp(
          "⏰ Hết giờ đọc!",
          `Cậu đã đọc xong Chương ${spinResult}.`
        );
        setTimeUp(true);
      }
    }, 500);
    return () => clearInterval(id);
  }, [step, timeUp]);

  // Đổi giây ra định dạng 15:00
  useEffect(() => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "setVolume",
          args: [timeUp ? 10 : 100],
        }),
        "*"
      );
    } catch (e) {}
  }, [timeUp]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      {step === "setup" && (
        <Card className="text-center py-12">
          <BookHeadphones size={64} className="mx-auto text-purple-500 mb-4" />
          <h2 className="text-3xl font-black mb-2 text-gray-800">
            Đọc Sách Lofi
          </h2>
          <p className="text-gray-500 font-medium mb-8">
            Quay chương ngẫu nhiên, đọc kết hợp nghe nhạc tập trung.
          </p>

          <div className="max-w-md mx-auto space-y-5 mb-8">
            <div className="flex gap-4">
              <div className="text-left flex-1">
                <label className="font-bold text-gray-600 text-sm">
                  Sách này có bao nhiêu chương?
                </label>
                <input
                  type="number"
                  value={maxChapters}
                  onChange={(e) => setMaxChapters(Number(e.target.value))}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold outline-none focus:border-purple-500 mt-1"
                />
              </div>
              <div className="text-left flex-1">
                <label className="font-bold text-gray-600 text-sm">
                  Cài đặt thời gian đọc (phút)
                </label>
                <input
                  type="number"
                  value={readTime}
                  onChange={(e) => setReadTime(Number(e.target.value))}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold outline-none focus:border-purple-500 mt-1"
                />
              </div>
            </div>

            {/* Khung chọn nhạc */}
            <div className="text-left bg-gray-50 p-4 rounded-2xl border-2 border-gray-200">
              <label className="font-bold text-gray-700 text-sm flex items-center gap-2 mb-2">
                <Headphones size={16} className="text-purple-500" /> Hôm nay não
                muốn nghe nhạc kênh nào?
              </label>
              <select
                value={musicChoice}
                onChange={(e) => {
                  setMusicChoice(e.target.value);
                  setSharedMusicId("random"); // bỏ video đã ghim từ Thư Viện
                }}
                className="w-full bg-white border-2 border-gray-200 rounded-xl p-3 font-bold text-gray-700 outline-none focus:border-purple-500 cursor-pointer transition-colors"
              >
                {MUSIC_LIST.map((music) => (
                  <option key={music.id} value={music.id}>
                    {music.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isSpinning && !spinResult && (
            <PushButton
              variant="secondary"
              className="mx-auto px-12 py-4 text-xl"
              onClick={handleSpin}
            >
              Quay Chương Ngay <RotateCcw className="ml-2" />
            </PushButton>
          )}

          {isSpinning && (
            <div className="text-6xl font-black text-purple-500 animate-pulse">
              {spinResult}
            </div>
          )}

          {!isSpinning && spinResult && (
            <div className="animate-in zoom-in">
              <p className="font-bold text-gray-500 uppercase tracking-widest mb-2">
                Vũ trụ đã chọn
              </p>
              <div className="text-6xl font-black text-purple-600 mb-8">
                Chương {spinResult}
              </div>
              <PushButton
                variant="primary"
                className="mx-auto px-12 py-4 text-xl w-full max-w-xs shadow-lg shadow-purple-200"
                onClick={startReading}
              >
                Vào Chế Độ Đọc{" "}
                <Play size={20} className="ml-2" fill="currentColor" />
              </PushButton>
              <PushButton
                variant="outline"
                className="mx-auto mt-3 px-8 py-3"
                onClick={handleSpin}
              >
                Quay lại <RotateCcw size={18} className="ml-2" />
              </PushButton>
            </div>
          )}
        </Card>
      )}

      {step === "reading" && (
        <Card className="flex flex-col items-center py-6">
          <div className="w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden mb-6 shadow-md border-4 border-gray-100">
            <iframe
              ref={iframeRef}
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&controls=1&rel=0&enablejsapi=1`}
              title="Study Music"
              referrerPolicy="strict-origin-when-cross-origin"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>

          <h2 className="text-2xl font-black mb-2 text-gray-800">
            Đang đọc: Chương {spinResult}
          </h2>
          <div className="text-5xl font-black text-purple-600 tabular-nums mb-8 font-mono">
            {formatTime(timeLeft)}
          </div>
          <div className="flex gap-4">
            <PushButton
              variant="outline"
              className="px-8 py-3"
              onClick={() => setStep("setup")}
            >
              Thoát
            </PushButton>
            <PushButton
              variant="secondary"
              className="px-8 py-3"
              onClick={() => setStep("summary")}
            >
              Tóm tắt (Nói) <Mic size={18} className="ml-2" />
            </PushButton>
          </div>
        </Card>
      )}

      {step === "reading" && timeUp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-pink-200 shadow-2xl p-8 max-w-md w-full text-center animate-in zoom-in duration-300">
            <div className="text-6xl mb-3">⏰</div>
            <h3 className="text-3xl font-black text-pink-600 mb-2">
              Hết giờ đọc rồi!
            </h3>
            <p className="text-gray-500 font-medium mb-6">
              Cậu đã đọc xong Chương {spinResult}. Muốn làm gì tiếp?
            </p>
            <div className="space-y-3">
              <PushButton
                variant="primary"
                className="w-full py-3 text-lg"
                onClick={() => {
                  setTimeUp(false);
                  setStep("summary");
                }}
              >
                Tóm tắt (Nói) <Mic size={18} className="ml-2" />
              </PushButton>
              <PushButton
                variant="secondary"
                className="w-full py-3 text-lg"
                onClick={() => {
                  endAtRef.current = Date.now() + 5 * 60 * 1000;
                  setTimeLeft(5 * 60);
                  setTimeUp(false);
                }}
              >
                Đọc thêm 5 phút
              </PushButton>
              <PushButton
                variant="outline"
                className="w-full py-3 text-lg"
                onClick={() => {
                  setTimeUp(false);
                  setStep("setup");
                }}
              >
                Thoát
              </PushButton>
            </div>
          </div>
        </div>
      )}
      {/* MÀN HÌNH: TÓM TẮT SÁCH */}
      {step === "summary" && (
        <Card className="text-center py-12 animate-in slide-in-from-right-8">
          <Mic size={64} className="mx-auto text-purple-500 mb-4" />
          <h2 className="text-3xl font-black mb-4 text-gray-800">
            Tóm tắt Chương {spinResult}
          </h2>
          <p className="text-gray-500 font-medium mb-8">
            Cậu hãy bật mic và chia sẻ ngắn gọn những gì vừa học được nhé!
          </p>

          {!rec.isRecording ? (
            <PushButton
              variant="danger"
              className="mx-auto px-12 py-5 text-xl shadow-lg shadow-red-200"
              onClick={() => rec.start()}
            >
              <Mic size={22} className="mr-3" />
              {rec.audioUrl ? "Ghi âm lại" : "Bắt đầu ghi âm"}
            </PushButton>
          ) : (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 bg-red-50 px-6 py-2 rounded-full border-2 border-red-100">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-500 font-extrabold tracking-widest uppercase">
                  Đang ghi âm
                </span>
              </div>
              <div>
                <PushButton
                  variant="danger"
                  className="mx-auto px-12 py-5 text-xl shadow-lg shadow-red-200"
                  onClick={stopSummary}
                >
                  <Square size={22} fill="currentColor" className="mr-3" />
                  Dừng ghi âm
                </PushButton>
              </div>
            </div>
          )}

          {rec.error && (
            <p className="mt-6 mx-auto max-w-xl text-sm font-bold text-red-500 bg-red-50 border-2 border-red-100 rounded-2xl p-3">
              {rec.error}
            </p>
          )}

          {(rec.isRecording || rec.transcript) && (
            <div className="mt-6 mx-auto max-w-xl text-left">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">
                Chữ nhận diện được
              </p>
              <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-2xl text-gray-700 leading-relaxed font-medium min-h-[64px]">
                {rec.transcript || rec.interim
                  ? `${rec.transcript} ${rec.interim}`
                  : "Cậu cứ nói đi, chữ sẽ hiện ở đây..."}
              </div>
            </div>
          )}

          {!rec.isRecording && rec.audioUrl && (
            <div className="mt-6 mx-auto max-w-xl space-y-4 text-left animate-in fade-in">
              <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-2xl">
                <p className="font-bold text-purple-700 mb-2">
                  🎧 Nghe lại phần tóm tắt của cậu
                </p>
                <audio controls src={rec.audioUrl} className="w-full" />
                {rec.transcript && (
                  <p className="text-sm font-black text-yellow-600 mt-2">
                    🧠 +{XP_SUMMARY} Nếp Nhăn ✨
                  </p>
                )}
              </div>

              {sumAnalysis.words === 0 ? (
                <p className="text-sm font-bold text-orange-500">
                  Mình chưa nhận được chữ nào để phân tích. Cậu kiểm tra micro
                  hoặc thử nói to hơn nhé!
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-3">
                    <div className="text-2xl font-black text-blue-600">
                      {sumAnalysis.words}
                    </div>
                    <div className="text-xs font-bold text-blue-400 uppercase">
                      Từ
                    </div>
                  </div>
                  <div className="bg-orange-50 border-2 border-orange-100 rounded-2xl p-3">
                    <div className="text-2xl font-black text-orange-600">
                      {sumAnalysis.wpm}
                    </div>
                    <div className="text-xs font-bold text-orange-400 uppercase">
                      Từ/phút
                    </div>
                  </div>
                  <div className="bg-pink-50 border-2 border-pink-100 rounded-2xl p-3">
                    <div className="text-2xl font-black text-pink-600">
                      {sumAnalysis.fillerTotal}
                    </div>
                    <div className="text-xs font-bold text-pink-400 uppercase">
                      Từ đệm
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 border-t-2 border-gray-100 pt-8">
            <PushButton
              variant="outline"
              className="mx-auto px-8 py-3"
              disabled={rec.isRecording}
              onClick={() => {
                rec.reset();
                setSumSeconds(0);
                setStep("setup");
                setSpinResult(null);
                rewardedRef.current = false;
              }}
            >
              Hoàn thành & Trở về
            </PushButton>
          </div>
        </Card>
      )}
    </div>
  );
};

// --- 4. BẢNG VÀNG CHUNG (mọi người cùng xem) ---
const REPORTED_KEY = "nao_nhan_reported";
const loadReported = () => {
  try {
    const a = JSON.parse(localStorage.getItem(REPORTED_KEY) || "[]");
    return Array.isArray(a) ? a : [];
  } catch (e) {
    return [];
  }
};
const fmtPostSec = (sec) =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
const fmtPostDate = (ts) => {
  try {
    const d = ts && ts.toDate ? ts.toDate() : null;
    return d ? d.toLocaleDateString("vi-VN") : "vừa xong";
  } catch (e) {
    return "";
  }
};
const PostCard = ({ post, rank, isMine, onReplay, onDelete, onReport }) => {
  const [open, setOpen] = useState(false);
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar profile={post} size={48} />
        <div className="flex-1 min-w-0">
          <p className="font-black text-gray-800 truncate">
            {rank != null && rank < 3 ? medals[rank] + " " : ""}
            {post.name}
            {isMine && (
              <span className="ml-2 text-xs font-black text-pink-500 bg-pink-50 border border-pink-100 rounded-full px-2 py-0.5">
                Bạn
              </span>
            )}
          </p>
          <p className="text-xs font-bold text-gray-400">
            {post.category} · {fmtPostDate(post.createdAt)}
          </p>
        </div>
        <div className="bg-yellow-50 border-2 border-yellow-200 text-yellow-600 font-black px-3 py-2 rounded-2xl flex items-center gap-1 text-sm">
          <Clock size={16} /> {fmtPostSec(post.seconds)}
        </div>
      </div>
      <h3 className="font-extrabold text-gray-800 text-lg">{post.topic}</h3>
      <p
        className={`text-sm font-medium text-gray-600 bg-gray-50 border-2 border-gray-100 rounded-xl p-3 leading-relaxed ${
          open ? "" : "line-clamp-3"
        }`}
      >
        {post.text}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setOpen(!open)}
          className="text-sm font-bold text-gray-500 border-2 border-gray-200 rounded-xl px-3 py-1.5 hover:border-gray-300"
        >
          {open ? "Thu gọn" : "Đọc hết"}
        </button>
        <button
          onClick={() =>
            onReplay({
              topic: post.topic,
              category: post.category,
              source: "Bảng Vàng",
            })
          }
          className="text-sm font-bold text-pink-500 bg-pink-50 border-2 border-pink-100 rounded-xl px-3 py-1.5"
        >
          🎤 Nói chủ đề này
        </button>
        {isMine ? (
          <button
            onClick={() => onDelete(post)}
            className="text-sm font-bold text-red-500 border-2 border-red-100 rounded-xl px-3 py-1.5"
          >
            🗑 Xóa
          </button>
        ) : (
          <button
            onClick={() => onReport(post)}
            className="text-sm font-bold text-gray-400 hover:text-red-500 border-2 border-gray-200 rounded-xl px-3 py-1.5"
          >
            🚩 Báo cáo
          </button>
        )}
      </div>
    </Card>
  );
};
const HallOfFame = ({ onReplay, onDeleted }) => {
  const [mode, setMode] = useState("new"); // new | top
  const [posts, setPosts] = useState(null); // null = đang tải
  const [err, setErr] = useState("");
  const [myUid, setMyUid] = useState(null);
  const [reported, setReported] = useState(loadReported);

  useEffect(() => {
    ensureUser()
      .then(setMyUid)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPosts(null);
    setErr("");
    const unsub = listenPosts(
      mode,
      (list) => setPosts(list),
      (e) => {
        console.error(e);
        setErr(
          `Không tải được Bảng Vàng (${
            (e && (e.code || e.message)) || "lỗi lạ"
          }).`
        );
        setPosts([]);
      }
    );
    return unsub;
  }, [mode]);

  const handleDelete = async (post) => {
    if (!window.confirm("Xóa bài này khỏi Bảng Vàng?")) return;
    try {
      await removePost(post.id);
      if (onDeleted) onDeleted(post);
    } catch (e) {
      console.error(e);
      alert("Chưa xóa được, cậu thử lại nhé.");
    }
  };
  const handleReport = async (post) => {
    if (!window.confirm("Báo cáo bài này là không phù hợp?")) return;
    try {
      await reportPost(post.id);
    } catch (e) {
      console.error(e);
    }
    const next = [...reported, post.id];
    setReported(next);
    try {
      localStorage.setItem(REPORTED_KEY, JSON.stringify(next));
    } catch (e) {}
  };

  const visible = (posts || []).filter((p) => !reported.includes(p.id));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-3xl font-black text-yellow-500 flex items-center gap-3">
          <Trophy size={36} /> Bảng Vàng
        </h2>
        <div className="flex gap-2">
          <PushButton
            variant={mode === "new" ? "active" : "outline"}
            className="px-4 py-2 text-sm"
            onClick={() => setMode("new")}
          >
            Mới nhất
          </PushButton>
          <PushButton
            variant={mode === "top" ? "active" : "outline"}
            className="px-4 py-2 text-sm"
            onClick={() => setMode("top")}
          >
            🏆 Dài nhất
          </PushButton>
        </div>
      </div>
      {err && (
        <p className="text-sm font-bold text-red-500 bg-red-50 border-2 border-red-100 rounded-2xl p-3">
          {err}
        </p>
      )}
      {posts === null ? (
        <Card className="text-center py-12">
          <p className="text-gray-400 font-bold">Đang tải Bảng Vàng...</p>
        </Card>
      ) : visible.length === 0 && !err ? (
        <Card className="text-center py-12">
          <div className="text-6xl mb-3">🏆</div>
          <p className="text-gray-400 font-bold">
            Chưa có bài nào. Vào Hồ Sơ → Lịch sử, bấm "🏆 Đăng" ở một bài nói để
            lên Bảng Vàng nhé!
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((post, i) => (
            <PostCard
              key={post.id}
              post={post}
              rank={mode === "top" ? i : null}
              isMine={!!myUid && post.uid === myUid}
              onReplay={onReplay}
              onDelete={handleDelete}
              onReport={handleReport}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =============== HUY HIỆU ===============
const NONSTOP_SECONDS = 120; // "Một Mạch": nói liên tục từ 2 phút
const NONSTOP_MAX_GAP = 10; // ...và không im quá 10 giây
const QUICK_START_SECONDS = 5; // "Nhanh Như Chớp"

const ALL_TOPIC_GROUPS = ALL_CATEGORIES;

const RANKS = [
  {
    name: "Đồng",
    icon: "🥉",
    ring: "#a15c1a",
    fill: "#e8a45a",
    text: "#92400e",
    bg: "#fef3c7",
  },
  {
    name: "Bạc",
    icon: "🥈",
    ring: "#64748b",
    fill: "#cbd5e1",
    text: "#475569",
    bg: "#f1f5f9",
  },
  {
    name: "Vàng",
    icon: "🥇",
    ring: "#ca8a04",
    fill: "#fde047",
    text: "#a16207",
    bg: "#fef9c3",
  },
  {
    name: "Kim cương",
    icon: "💎",
    ring: "#0891b2",
    fill: "#67e8f9",
    text: "#0e7490",
    bg: "#cffafe",
  },
  {
    name: "Huyền thoại",
    icon: "👑",
    ring: "#7e22ce",
    fill: "#d8b4fe",
    text: "#7e22ce",
    bg: "#f3e8ff",
  },
];
const SINGLE_RANK = {
  name: "Đã đạt",
  icon: "🏅",
  ring: "#ca8a04",
  fill: "#fde047",
  text: "#a16207",
  bg: "#fef9c3",
};

const rankFor = (b, i) => (b.tiers.length === 1 ? SINGLE_RANK : RANKS[i]);

// Danh sách huy hiệu. Muốn đổi mốc thì sửa mảng tiers.
const BADGES = [
  {
    id: "first",
    face: "star",
    name: "Bài Nói Đầu Tiên",
    unit: "bài nói",
    tiers: [1],
    desc: "Hoàn thành bài luyện nói đầu tiên.",
    get: (s: any) => s.sessions || 0,
  },
  {
    id: "streak",
    face: "fire",
    name: "Chuỗi Lửa",
    unit: "ngày",
    tiers: [7, 21, 60, 100, 365],
    desc: "Số ngày luyện tập liên tiếp dài nhất của cậu (kỷ lục streak).",
    get: (s: any) => Math.max(s.bestStreak || 0, getCurrentStreak(s)),
  },
  {
    id: "king",
    face: "king",
    name: "Vua Luyện Nói",
    unit: "bài nói",
    tiers: [10, 50, 100, 500, 1000],
    desc: "Tổng số bài luyện nói đã hoàn thành.",
    get: (s: any) => s.sessions || 0,
  },
  {
    id: "recordxp",
    face: "bolt",
    name: "Kỷ Lục KN",
    unit: "XP",
    tiers: [50, 100, 200, 500, 1000],
    desc: "Số XP cao nhất cậu kiếm được trong một ngày.",
    get: (s: any) => s.bestDayXp || 0,
  },
  {
    id: "night",
    face: "moon",
    name: "Thợ Săn Đêm",
    unit: "ngày",
    tiers: [1, 5, 15, 40, 100],
    desc: "Số ngày cậu luyện tập sau 22:00.",
    get: (s: any) => s.nightDays || 0,
  },
  {
    id: "early",
    face: "sun",
    name: "Thợ Săn Ngày",
    unit: "ngày",
    tiers: [1, 5, 15, 40, 100],
    desc: "Số ngày cậu luyện tập trước 6:00 sáng.",
    get: (s: any) => s.earlyDays || 0,
  },
  {
    id: "quick",
    face: "flash",
    name: "Nhanh Như Chớp",
    unit: "lần",
    tiers: [1, 5, 15, 40, 100],
    desc: "Bấm Nói luôn trong vòng 5 giây sau khi hết giờ chuẩn bị.",
    get: (s: any) => s.quickCount || 0,
  },
  {
    id: "nonstop",
    face: "wind",
    name: "Một Mạch",
    unit: "lần",
    tiers: [1, 5, 15, 40, 100],
    desc: "Nói liên tục từ 2 phút, không im quá 10 giây (cần Chrome hoặc Edge).",
    get: (s: any) => s.nonstopCount || 0,
  },
  {
    id: "bookworm",
    face: "book",
    name: "Mọt Sách",
    unit: "lần",
    tiers: [1, 5, 15, 40, 100],
    desc: "Đọc đủ giờ trong chế độ Đọc Sách.",
    get: (s: any) => s.readDone || 0,
  },
  {
    id: "story",
    face: "story",
    name: "Người Kể Chuyện",
    unit: "chương",
    tiers: [20, 50, 100, 250, 500],
    desc: "Số chương sách đã tóm tắt bằng giọng nói.",
    get: (s: any) => s.summaries || 0,
  },
  {
    id: "thinker",
    face: "think",
    name: "Nhà Tư Duy",
    unit: "chủ đề",
    tiers: [50, 100, 200, 400, 700],
    desc: "Số chủ đề khác nhau đã luyện nói.",
    get: (s: any) => (s.topicSet || []).length,
  },
  {
    id: "knowall",
    face: "smug",
    name: "Biết Tuốt",
    unit: "nhóm",
    tiers: [ALL_TOPIC_GROUPS.length],
    desc: `Luyện đủ tất cả ${ALL_TOPIC_GROUPS.length} nhóm chủ đề.`,
    get: (s: any) =>
      ALL_TOPIC_GROUPS.filter((g) => ((s.topicCounts || {})[g] || 0) > 0)
        .length,
  },
  {
    id: "birthday",
    face: "party",
    name: "Sinh Nhật Não Nhăn",
    unit: "năm",
    tiers: [1, 2, 3, 4, 5],
    desc: "Luyện tập đúng ngày sinh nhật (cài ngày sinh ở cuối khung này).",
    get: (s: any) => s.birthdayYears || 0,
  },
  {
    id: "lucky",
    face: "clover",
    name: "May Mắn",
    unit: "lần",
    tiers: [1, 3, 10, 25, 50],
    desc: "Quay trúng cùng một chủ đề hai lần liên tiếp.",
    get: (s: any) => s.luckyCount || 0,
  },
  {
    id: "smoke",
    face: "smoke",
    name: "Não Bốc Khói",
    unit: "ngày",
    tiers: [1, 3, 7, 15, 30],
    desc: "Số ngày cậu hoàn thành 10 bài nói trong một ngày.",
    get: (s: any) => s.smokeDays || 0,
  },
];

const evalBadge = (b, stats) => {
  const value = b.get(stats);
  let level = 0;
  b.tiers.forEach((t, i) => {
    if (value >= t) level = i + 1;
  });
  const next = level < b.tiers.length ? b.tiers[level] : null;
  return { value, level, next };
};

// --- Cập nhật chỉ số mỗi lần luyện tập (dùng cho addXP và addBonusXP) ---
const applyActivity = (prev, amount, seconds) => {
  const now = new Date();
  const today = toDateKey(now);
  const streak = computeStreak(prev, today);
  const daily = prev.dailySeconds || {};
  const dailyXp = { ...(prev.dailyXp || {}) };
  dailyXp[today] = (dailyXp[today] || 0) + amount;
  const hour = now.getHours();
  const isNight = hour >= 22;
  const isEarly = hour < 6;
  const birthdayToday =
    !!prev.birthday &&
    prev.birthday === today.slice(5) &&
    prev.lastBirthdayYear !== now.getFullYear();
  return {
    ...prev,
    xp: prev.xp + amount,
    streak,
    bestStreak: Math.max(prev.bestStreak || 0, streak),
    lastActiveDate: today,
    totalSeconds: (prev.totalSeconds || 0) + seconds,
    dailySeconds: { ...daily, [today]: (daily[today] || 0) + seconds },
    dailyXp,
    bestDayXp: Math.max(prev.bestDayXp || 0, dailyXp[today]),
    nightDays:
      (prev.nightDays || 0) + (isNight && prev.lastNightDate !== today ? 1 : 0),
    lastNightDate: isNight ? today : prev.lastNightDate || null,
    earlyDays:
      (prev.earlyDays || 0) + (isEarly && prev.lastEarlyDate !== today ? 1 : 0),
    lastEarlyDate: isEarly ? today : prev.lastEarlyDate || null,
    birthdayYears: (prev.birthdayYears || 0) + (birthdayToday ? 1 : 0),
    lastBirthdayYear: birthdayToday
      ? now.getFullYear()
      : prev.lastBirthdayYear || null,
  };
};

// --- Hình con não nhiều biểu cảm ---
const FD = "#3b1a36";
const BRAIN_PATH =
  "M50 18 C40 8 22 12 18 28 C6 32 6 52 16 58 C14 72 28 82 40 78 C44 86 56 86 60 78 C72 82 86 72 84 58 C94 52 94 32 82 28 C78 12 60 8 50 18 Z";
const BRAIN_WRINKLES =
  "M50 18 L50 32 M30 30 q8 -2 12 6 M70 30 q-8 -2 -12 6 M18 46 q7 -4 12 2 M82 46 q-7 -4 -12 2 M26 70 q7 4 12 -1 M74 70 q-7 4 -12 -1";

const eyeDot = (x: number) => (
  <g>
    <circle cx={x} cy="54" r="4.5" fill={FD} />
    <circle cx={x + 1.6} cy="52.4" r="1.5" fill="#fff" />
  </g>
);
const eyeJoy = (x: number) => (
  <path
    d={`M${x - 5} 57 Q${x} 48 ${x + 5} 57`}
    fill="none"
    stroke={FD}
    strokeWidth="3"
    strokeLinecap="round"
  />
);
const eyeWide = (x: number, dx = 0) => (
  <g>
    <circle cx={x} cy="54" r="7" fill="#fff" stroke={FD} strokeWidth="2" />
    <circle cx={x + dx} cy="54" r="3.2" fill={FD} />
  </g>
);
const mouthSmile = (
  <path
    d="M42 66 Q50 75 58 66"
    fill="none"
    stroke={FD}
    strokeWidth="3"
    strokeLinecap="round"
  />
);
const mouthOpen = (
  <g>
    <path d="M41 63 Q50 80 59 63 Z" fill={FD} />
    <path d="M45 72 Q50 77 55 72 Q50 69 45 72 Z" fill="#fb7185" />
  </g>
);
const emo = (ch: string, x: number, y: number, size = 24) => (
  <text x={x} y={y} fontSize={size} textAnchor="middle">
    {ch}
  </text>
);

const BRAIN_FACES: any = {
  smile: (
    <g>
      {eyeDot(38)}
      {eyeDot(62)}
      {mouthSmile}
    </g>
  ),
  star: (
    <g>
      <text
        x="38"
        y="60"
        fontSize="15"
        textAnchor="middle"
        fill="#facc15"
        stroke="#b45309"
        strokeWidth="0.8"
      >
        ★
      </text>
      <text
        x="62"
        y="60"
        fontSize="15"
        textAnchor="middle"
        fill="#facc15"
        stroke="#b45309"
        strokeWidth="0.8"
      >
        ★
      </text>
      {mouthOpen}
      {emo("🎤", 82, 90, 20)}
    </g>
  ),
  fire: (
    <g>
      {eyeDot(38)}
      {eyeDot(62)}
      <path
        d="M31 46 L45 50 M69 46 L55 50"
        stroke={FD}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M42 68 Q52 73 60 64"
        fill="none"
        stroke={FD}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {emo("🔥", 50, 20, 28)}
    </g>
  ),
  king: (
    <g>
      {eyeJoy(38)}
      {eyeJoy(62)}
      {mouthOpen}
      {emo("👑", 50, 20, 28)}
    </g>
  ),
  bolt: (
    <g>
      {eyeWide(38)}
      {eyeWide(62)}
      <ellipse cx="50" cy="70" rx="4" ry="5" fill={FD} />
      {emo("⚡", 84, 24, 26)}
    </g>
  ),
  moon: (
    <g>
      <path
        d="M33 53 Q38 59 43 53 M57 53 Q62 59 67 53"
        fill="none"
        stroke={FD}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M45 69 Q50 72 55 69"
        fill="none"
        stroke={FD}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {emo("🌙", 82, 24, 24)}
      {emo("💤", 88, 46, 14)}
    </g>
  ),
  sun: (
    <g>
      {eyeJoy(38)}
      {eyeJoy(62)}
      {mouthOpen}
      {emo("☀️", 16, 24, 26)}
    </g>
  ),
  flash: (
    <g>
      <path
        d="M2 40 H16 M0 52 H14 M3 64 H17"
        stroke="#38bdf8"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {eyeWide(38, 3)}
      {eyeWide(62, 3)}
      <path
        d="M42 68 Q52 73 60 65"
        fill="none"
        stroke={FD}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  ),
  wind: (
    <g>
      <path
        d="M32 49 L44 54 L32 59 M68 49 L56 54 L68 59"
        fill="none"
        stroke={FD}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {mouthOpen}
      {emo("💨", 86, 62, 22)}
    </g>
  ),
  book: (
    <g>
      <circle
        cx="38"
        cy="54"
        r="8.5"
        fill="#fff"
        fillOpacity="0.6"
        stroke={FD}
        strokeWidth="2"
      />
      <circle
        cx="62"
        cy="54"
        r="8.5"
        fill="#fff"
        fillOpacity="0.6"
        stroke={FD}
        strokeWidth="2"
      />
      <path d="M46.5 54 H53.5" stroke={FD} strokeWidth="2" />
      <circle cx="38" cy="55" r="3" fill={FD} />
      <circle cx="62" cy="55" r="3" fill={FD} />
      {mouthSmile}
      {emo("📖", 50, 96, 24)}
    </g>
  ),
  story: (
    <g>
      {eyeDot(38)}
      {eyeJoy(62)}
      {mouthOpen}
      {emo("💬", 82, 22, 24)}
    </g>
  ),
  think: (
    <g>
      {eyeDot(38)}
      {eyeDot(62)}
      <path
        d="M32 45 L44 47 M56 42 Q62 38 68 44"
        fill="none"
        stroke={FD}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M44 69 H56" stroke={FD} strokeWidth="3" strokeLinecap="round" />
      {emo("💡", 82, 22, 24)}
    </g>
  ),
  smug: (
    <g>
      <path d="M32 54 A6 6 0 0 0 44 54 Z M56 54 A6 6 0 0 0 68 54 Z" fill={FD} />
      <path
        d="M31 54 H45 M55 54 H69"
        stroke={FD}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M42 67 Q54 74 60 64"
        fill="none"
        stroke={FD}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {emo("🌍", 82, 92, 22)}
    </g>
  ),
  party: (
    <g>
      {eyeJoy(38)}
      {eyeJoy(62)}
      {mouthOpen}
      {emo("🎉", 18, 24, 24)}
      {emo("🎂", 82, 92, 22)}
    </g>
  ),
  clover: (
    <g>
      {eyeDot(38)}
      {eyeJoy(62)}
      {mouthSmile}
      <ellipse cx="54" cy="73" rx="3.5" ry="4.5" fill="#fb7185" />
      {emo("🍀", 82, 24, 24)}
    </g>
  ),
  smoke: (
    <g>
      <text
        x="38"
        y="59"
        fontSize="15"
        fontWeight="bold"
        textAnchor="middle"
        fill={FD}
      >
        @
      </text>
      <text
        x="62"
        y="59"
        fontSize="15"
        fontWeight="bold"
        textAnchor="middle"
        fill={FD}
      >
        @
      </text>
      <path
        d="M40 69 q2.5 -5 5 0 t5 0 t5 0 t5 0"
        fill="none"
        stroke={FD}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {emo("☁️", 36, 16, 22)}
      {emo("☁️", 64, 12, 22)}
    </g>
  ),
};

const SHIELD =
  "M50 4 L88 22 Q96 26 96 35 L96 70 Q96 79 89 84 L57 106 Q50 110 43 106 L11 84 Q4 79 4 70 L4 35 Q4 26 12 22 Z";

const BadgeShield = ({ face, level, tiers }) => {
  const locked = level === 0;
  const idx = locked ? 0 : level - 1;
  const rank = tiers.length === 1 ? SINGLE_RANK : RANKS[idx];
  const ring = locked ? "#cbd5e1" : rank.ring;
  const fill = locked ? "#e2e8f0" : rank.fill;
  const showNumber = tiers.length > 1;
  const number = String(tiers[idx]);
  return (
    <svg
      viewBox="0 0 100 112"
      width="96"
      height="108"
      className={locked ? "grayscale opacity-50" : ""}
      aria-hidden="true"
    >
      <path d={SHIELD} fill={ring} />
      <path
        d={SHIELD}
        fill={fill}
        transform="translate(50 56) scale(0.86) translate(-50 -56)"
      />
      <svg
        x="14"
        y="8"
        width="72"
        height="72"
        viewBox="0 0 100 100"
        overflow="visible"
      >
        <path
          d={BRAIN_PATH}
          fill="#f9a8d4"
          stroke="#ec4899"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d={BRAIN_WRINKLES}
          fill="none"
          stroke="#f472b6"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="28" cy="64" r="5" fill="#fb7185" opacity="0.45" />
        <circle cx="72" cy="64" r="5" fill="#fb7185" opacity="0.45" />
        {BRAIN_FACES[face] || BRAIN_FACES.smile}
      </svg>
      {showNumber && (
        <text
          x="50"
          y="100"
          textAnchor="middle"
          fontSize={number.length > 3 ? 20 : 26}
          fontWeight="900"
          fill="#fff"
          stroke={ring}
          strokeWidth="5"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {number}
        </text>
      )}
    </svg>
  );
};

// --- AVATAR & ĐỔI TÊN ---
const AVATAR_EMOJIS = [
  "🧠",
  "😎",
  "🤓",
  "🥳",
  "😴",
  "🤯",
  "🥰",
  "😜",
  "🤔",
  "😇",
  "🦉",
  "🐱",
  "🦊",
  "🐼",
  "🐸",
  "🦄",
  "🐧",
  "🐙",
];
const AVATAR_COLORS = [
  "#fbcfe8",
  "#e9d5ff",
  "#bfdbfe",
  "#bbf7d0",
  "#fef08a",
  "#fed7aa",
  "#fecaca",
  "#e2e8f0",
];
const Avatar = ({ profile, size = 64 }) => {
  const p = profile || { avatar: "🧠", color: AVATAR_COLORS[0] };
  return (
    <div
      className="rounded-full border-2 border-white shadow flex items-center justify-center shrink-0 select-none"
      style={{
        width: size,
        height: size,
        background: p.color,
        fontSize: size * 0.55,
      }}
    >
      {p.avatar}
    </div>
  );
};
const ProfileEditor = ({ initial, first, onSave, onCancel }) => {
  const [name, setName] = useState((initial && initial.name) || "");
  const [avatar, setAvatar] = useState((initial && initial.avatar) || "🧠");
  const [color, setColor] = useState(
    (initial && initial.color) || AVATAR_COLORS[0]
  );
  const clean = name.trim().replace(/\s+/g, " ");
  const valid = clean.length >= 2 && clean.length <= 20;
  const save = () => {
    if (valid) onSave({ name: clean, avatar, color });
  };
  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border-2 border-pink-200 shadow-2xl p-6 max-w-md w-full max-h-[92vh] overflow-y-auto">
        <h3 className="text-2xl font-black text-pink-600 text-center mb-1">
          {first ? "Chào mừng đến Não Nhăn! 🧠" : "Sửa hồ sơ"}
        </h3>
        <p className="text-gray-500 font-medium text-center mb-4">
          {first
            ? "Đặt tên và chọn avatar rồi luyện luôn nhé. Không cần đăng ký."
            : "Đổi tên và avatar của cậu."}
        </p>
        <div className="flex justify-center mb-4">
          <Avatar profile={{ avatar, color }} size={96} />
        </div>
        <label className="font-bold text-gray-600 text-sm">
          Nickname (2–20 ký tự)
        </label>
        <input
          type="text"
          value={name}
          maxLength={20}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="VD: Mei"
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 font-bold outline-none focus:border-pink-500 mt-1 mb-4"
        />
        <p className="font-bold text-gray-600 text-sm mb-2">Chọn avatar</p>
        <div className="grid grid-cols-6 gap-2 mb-4">
          {AVATAR_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setAvatar(e)}
              className={`text-2xl py-2 rounded-xl border-2 transition-colors ${
                avatar === e
                  ? "border-pink-500 bg-pink-50"
                  : "border-gray-200 hover:border-pink-300"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <p className="font-bold text-gray-600 text-sm mb-2">Chọn màu nền</p>
        <div className="flex flex-wrap gap-3 mb-6">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-9 h-9 rounded-full border-4 ${
                color === c ? "border-pink-500" : "border-white shadow"
              }`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
        <div className="flex gap-3">
          {!first && (
            <PushButton
              variant="outline"
              className="flex-1 py-3"
              onClick={onCancel}
            >
              Hủy
            </PushButton>
          )}
          <PushButton
            variant="primary"
            className="flex-1 py-3 text-lg"
            disabled={!valid}
            onClick={save}
          >
            {first ? "Bắt đầu thôi!" : "Lưu"}
          </PushButton>
        </div>
      </div>
    </div>
  );
};
const LogTextEditor = ({ item, onSave, onUnshare }) => {
  const [v, setV] = useState(item.text || "");
  const [busy, setBusy] = useState(false);
  const changed = v !== (item.text || "");
  const unshare = async () => {
    if (
      !window.confirm(
        "Gỡ bài này khỏi Bảng Vàng để sửa lại? Sau đó cậu sửa chữ và đăng lại được."
      )
    )
      return;
    setBusy(true);
    try {
      await onUnshare(item);
    } catch (e) {
      console.error(e);
      alert("Chưa gỡ được, cậu kiểm tra mạng rồi thử lại nhé.");
    }
    setBusy(false);
  };
  return (
    <div className="px-4 pb-4 space-y-2">
      <textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        disabled={!!item.shared}
        rows={5}
        placeholder="Bài này chưa lưu chữ. Cậu có thể gõ hoặc dán bài nói vào đây."
        className="w-full text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-xl p-3 leading-relaxed focus:border-pink-500 outline-none resize-y disabled:bg-gray-50"
      />
      {item.shared ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400">
            Bài này đang ở Bảng Vàng nên chưa sửa được chữ.
          </p>
          <PushButton
            variant="outline"
            className="px-4 py-2 text-sm"
            disabled={busy}
            onClick={unshare}
          >
            {busy ? "Đang gỡ..." : "🗑 Gỡ khỏi Bảng Vàng để sửa lại"}
          </PushButton>
        </div>
      ) : (
        <PushButton
          variant="primary"
          className="px-4 py-2 text-sm"
          disabled={!changed}
          onClick={() => onSave(item, v)}
        >
          Lưu chữ
        </PushButton>
      )}
    </div>
  );
};
// --- 5. PROFILE & STATISTICS ---
const Profile = ({
  userStats,
  onSetBirthday,
  onSeenBadges,
  onReplay,
  onEditProfile,
  onShare,
  onEditText,
  onUnshare,
}) => {
  const [histView, setHistView] = useState("recent"); // recent | top
  const [openKey, setOpenKey] = useState(null);
  const [sharingKey, setSharingKey] = useState(null);
  const [shareMsg, setShareMsg] = useState("");
  const handleShare = async (item, key) => {
    if (
      !window.confirm(
        "Đăng bài nói này công khai lên Bảng Vàng? Mọi người sẽ thấy tên, avatar và chữ bài nói của cậu."
      )
    )
      return;
    setSharingKey(key);
    setShareMsg("");
    try {
      await onShare(item);
      setShareMsg("✅ Đã đăng lên Bảng Vàng!");
    } catch (e) {
      console.error(e);
      setShareMsg(
        `❌ Chưa đăng được (${(e && (e.code || e.message)) || "lỗi lạ"})`
      );
    }
    setSharingKey(null);
  };
  const levelInfo = calculateLevelInfo(userStats.xp);

  const counts = userStats.topicCounts || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const barColors = [
    "bg-pink-500",
    "bg-purple-500",
    "bg-blue-500",
    "bg-orange-400",
    "bg-green-500",
  ];
  const stats = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, n], i) => ({
      label,
      percent: Math.round((n / total) * 100),
      color: barColors[i % barColors.length],
    }));

  const badgeStates = BADGES.map((b) => ({ b, st: evalBadge(b, userStats) }));
  const earnedCount = badgeStates.filter(({ st }) => st.level > 0).length;
  const [openBadge, setOpenBadge] = useState<string | null>(null);
  const [bMonth, setBMonth] = useState(() =>
    userStats.birthday ? userStats.birthday.split("-")[0] : ""
  );
  const [bDay, setBDay] = useState(() =>
    userStats.birthday ? userStats.birthday.split("-")[1] : ""
  );
  useEffect(() => {
    onSetBirthday(bMonth && bDay ? `${bMonth}-${bDay}` : null);
  }, [bMonth, bDay]);

  // Rời trang Hồ Sơ thì ghi nhớ các hạng đã xem để bỏ nhãn MỚI
  const levelsRef = useRef<any>({});
  levelsRef.current = Object.fromEntries(
    badgeStates.map(({ b, st }) => [b.id, st.level])
  );
  const mountedAtRef = useRef(Date.now());
  useEffect(
    () => () => {
      if (Date.now() - mountedAtRef.current > 800)
        onSeenBadges(levelsRef.current);
    },
    []
  );

  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
  const myLog = userStats.log || [];
  const myList =
    histView === "top"
      ? [...myLog].sort((a, b) => b.seconds - a.seconds).slice(0, 5)
      : myLog;
  const fmtSec = (sec) =>
    `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  const fmtDate = (key) => key.split("-").reverse().join("/");
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <Card className="flex flex-col sm:flex-row items-center gap-6 p-8 border-t-8 border-t-pink-500">
        <Avatar profile={userStats.profile} size={96} />
        <div className="text-center sm:text-left flex-1 w-full">
          <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
            <h2 className="text-3xl font-black text-gray-800">
              {(userStats.profile && userStats.profile.name) || "Bạn"}
            </h2>
            <button
              onClick={onEditProfile}
              className="text-sm font-bold text-gray-400 hover:text-pink-500 border-2 border-gray-200 rounded-xl px-3 py-1 flex items-center gap-1"
            >
              <PenTool size={14} /> Sửa
            </button>
          </div>
          <p className="text-pink-500 font-bold text-lg mb-4 flex items-center justify-center sm:justify-start gap-2">
            <Crown size={20} /> Học giả {levelInfo.name} - Level{" "}
            {levelInfo.level}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-1 border-2 border-gray-300 overflow-hidden">
            <div
              className="bg-pink-500 h-full rounded-full transition-all duration-1000"
              style={{ width: `${levelInfo.percentage}%` }}
            ></div>
          </div>
          <p className="text-xs font-bold text-gray-400 text-right">
            {userStats.xp} / {levelInfo.nextXp} XP tới Level{" "}
            {levelInfo.level < 7 ? levelInfo.level + 1 : 7}
          </p>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Badges */}
        <Card className="md:col-span-2">
          <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
            <Medal className="text-yellow-500" /> Huy hiệu ({earnedCount}/
            {BADGES.length})
          </h3>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {badgeStates.map(({ b, st }) => {
              const seen = (userStats.badgeSeen || {})[b.id] || 0;
              const isNew = st.level > seen;
              return (
                <button
                  key={b.id}
                  onClick={() => setOpenBadge(openBadge === b.id ? null : b.id)}
                  className="relative flex flex-col items-center text-center p-2 rounded-2xl hover:bg-gray-50 transition-colors"
                >
                  {isNew && (
                    <span className="absolute top-0 right-1 z-10 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg">
                      MỚI
                    </span>
                  )}
                  <BadgeShield face={b.face} level={st.level} tiers={b.tiers} />
                  <span className="mt-2 text-sm font-black text-gray-800 leading-tight">
                    {b.name}
                  </span>
                  <span className="text-xs font-bold text-gray-400 mt-1">
                    {st.next === null
                      ? b.tiers.length === 1
                        ? "Hoàn thành"
                        : `${st.value} ${b.unit} · Tối đa`
                      : `${st.value} trên ${st.next}`}
                  </span>
                </button>
              );
            })}
          </div>

          {openBadge &&
            (() => {
              const item = badgeStates.find(({ b }) => b.id === openBadge);
              if (!item) return null;
              const { b, st } = item;
              return (
                <div className="mt-4 p-4 rounded-2xl bg-gray-50 border-2 border-gray-200 animate-in fade-in">
                  <p className="font-black text-gray-800">{b.name}</p>
                  <p className="text-sm font-medium text-gray-600 mb-3">
                    {b.desc} Hiện tại: {st.value} {b.unit}.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {b.tiers.map((t, i) => {
                      const rank = rankFor(b, i);
                      const done = st.level > i;
                      return (
                        <span
                          key={i}
                          className="text-xs font-black px-3 py-1 rounded-full border-2"
                          style={{
                            background: done ? rank.bg : "#f8fafc",
                            color: done ? rank.text : "#94a3b8",
                            borderColor: done ? rank.ring : "#e2e8f0",
                          }}
                        >
                          {rank.icon} {rank.name}: {t} {b.unit}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          <div className="mt-6 pt-4 border-t-2 border-gray-100 flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-gray-500">
              🎂 Ngày sinh của cậu:
            </span>
            <select
              value={bDay}
              onChange={(e) => setBDay(e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-700 outline-none focus:border-pink-500"
            >
              <option value="">Ngày</option>
              {Array.from({ length: 31 }, (_, i) =>
                String(i + 1).padStart(2, "0")
              ).map((d) => (
                <option key={d} value={d}>
                  {Number(d)}
                </option>
              ))}
            </select>
            <select
              value={bMonth}
              onChange={(e) => setBMonth(e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-700 outline-none focus:border-pink-500"
            >
              <option value="">Tháng</option>
              {Array.from({ length: 12 }, (_, i) =>
                String(i + 1).padStart(2, "0")
              ).map((m) => (
                <option key={m} value={m}>
                  {Number(m)}
                </option>
              ))}
            </select>
            <span className="text-xs font-bold text-gray-400">
              Chỉ lưu trên máy này, dùng để mở huy hiệu Sinh Nhật.
            </span>
          </div>
        </Card>

        {/* Stats Chart */}
        <Card>
          <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
            <PieChart className="text-blue-500" /> Cân bằng chủ đề
          </h3>
          <p className="text-xs font-bold text-gray-400 mb-4">
            {total === 0
              ? "Chưa có dữ liệu. Luyện vài bài rồi quay lại nhé!"
              : `Cậu đang luyện nhiều nhất về ${stats[0].label}. Thử thêm chủ đề khác nhé!`}
          </p>
          <div className="space-y-3">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-600 w-28">
                  {s.label}
                </span>
                <div className="flex-1 bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${s.color} rounded-full`}
                    style={{ width: `${s.percent}%` }}
                  ></div>
                </div>
                <span className="text-xs font-black text-gray-400 w-8 text-right">
                  {s.percent}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Lịch sử + Bảng vàng của tôi */}
        <Card className="md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
              <History className="text-gray-500" /> Lịch sử & Bảng vàng của tôi
            </h3>
            <div className="flex gap-2">
              <PushButton
                variant={histView === "recent" ? "active" : "outline"}
                className="px-4 py-2 text-sm"
                onClick={() => setHistView("recent")}
              >
                Gần đây
              </PushButton>
              <PushButton
                variant={histView === "top" ? "active" : "outline"}
                className="px-4 py-2 text-sm"
                onClick={() => setHistView("top")}
              >
                🏆 Top 5 dài nhất
              </PushButton>
            </div>
          </div>
          {shareMsg && (
            <p className="text-sm font-bold text-gray-600 mb-3">{shareMsg}</p>
          )}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {myLog.length > 0 ? (
              myList.map((item, i) => {
                const key = `${item.date}-${item.topic}-${item.seconds}-${i}`;
                const open = openKey === key;
                return (
                  <div
                    key={key}
                    className="bg-gray-50 border-2 border-gray-100 rounded-2xl hover:border-pink-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 p-4">
                      {histView === "top" && (
                        <span className="text-2xl">{medals[i]}</span>
                      )}
                      <button
                        className="flex-1 text-left"
                        onClick={() => setOpenKey(open ? null : key)}
                      >
                        <h4 className="font-bold text-gray-800">
                          {item.topic}
                        </h4>
                        <span className="text-xs font-bold text-gray-400">
                          {item.category} · {fmtDate(item.date)} · ⏱{" "}
                          {fmtSec(item.seconds)}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          if (onReplay)
                            onReplay({
                              topic: item.topic,
                              category: item.category,
                              source: "Lịch sử của cậu",
                            });
                        }}
                        className="text-pink-500 hover:text-pink-600 bg-pink-50 px-3 py-2 rounded-xl border-2 border-pink-100 flex items-center gap-1 font-bold text-sm whitespace-nowrap"
                        title="Luyện nói lại chủ đề này"
                      >
                        <Play size={16} /> Nói lại
                      </button>
                      {item.text &&
                        (item.shared ? (
                          <span className="text-xs font-bold text-green-600 whitespace-nowrap">
                            ✅ Đã đăng
                          </span>
                        ) : (
                          <button
                            onClick={() => handleShare(item, key)}
                            disabled={sharingKey === key}
                            className="text-yellow-600 hover:text-yellow-700 bg-yellow-50 px-3 py-2 rounded-xl border-2 border-yellow-200 font-bold text-sm whitespace-nowrap disabled:opacity-50"
                            title="Đăng lên Bảng Vàng chung"
                          >
                            {sharingKey === key ? "Đang đăng..." : "🏆 Đăng"}
                          </button>
                        ))}
                    </div>
                    {open && (
                      <LogTextEditor
                        item={item}
                        onSave={onEditText}
                        onUnshare={onUnshare}
                      />
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 font-bold text-center py-4">
                Cậu chưa luyện bài nào cả. Bắt đầu ngay thôi!
              </p>
            )}
          </div>
        </Card>
        {/* Nút reset dữ liệu */}
        <button
          onClick={() => {
            localStorage.removeItem(STATS_KEY);
            window.location.reload();
          }}
          className="md:col-span-2 text-sm font-bold text-gray-400 hover:text-red-500 underline"
        >
          Xóa dữ liệu và bắt đầu lại
        </button>
      </div>
    </div>
  );
};

// --- Main Application Shell ---
const DEFAULT_STATS = {
  xp: 0,
  streak: 0,
  lastActiveDate: null,
  totalSeconds: 0,
  dailySeconds: {},
  sessions: 0,
  history: [],
  topicCounts: {},
  log: [],
  challenge: null,
  usedChallenges: [],
  usedChallenges: [],
  bestStreak: 0,
  dailyXp: {},
  bestDayXp: 0,
  nightDays: 0,
  lastNightDate: null,
  earlyDays: 0,
  lastEarlyDate: null,
  dailySessions: {},
  smokeDays: 0,
  quickCount: 0,
  nonstopCount: 0,
  readDone: 0,
  summaries: 0,
  topicSet: [],
  luckyCount: 0,
  birthday: null,
  birthdayYears: 0,
  lastBirthdayYear: null,
  badgeSeen: {},
};

const loadStats = () => {
  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) return { ...DEFAULT_STATS, ...JSON.parse(saved) };
  } catch (e) {}
  return DEFAULT_STATS;
};
export default function App() {
  const [currentView, setCurrentView] = useState("dashboard");
  // Trạng thái dùng chung (Global State) để lưu video được chọn từ Thư viện sang Đọc sách
  const [sharedMusicId, setSharedMusicId] = useState("random");
  // Challenge đang được bấm "Nói Ngay" (để truyền sang màn Luyện Nói)
  const [activeChallenge, setActiveChallenge] = useState<any>(null);
  const [editProfile, setEditProfile] = useState(false);
  // Quản lý dữ liệu và tự động lưu vào LocalStorage
  const [userStats, setUserStats] = useState(loadStats);

  useEffect(() => {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(userStats));
    } catch (e) {}
  }, [userStats]);
  // Mỗi ngày một chủ đề mới (kiểm tra khi mở app và mỗi phút, phòng khi qua nửa đêm)
  const ensureTodayChallenge = () => {
    const today = toDateKey();
    setUserStats((prev) => {
      const c = prev.challenge;
      // Giữ nguyên câu hôm nay nếu đã làm xong, hoặc nếu câu đó vẫn còn trong danh sách
      const stillValid =
        c &&
        c.date === today &&
        (c.done || CHALLENGE_POOL.some((p) => p.topic === c.topic));
      if (stillValid) return prev;
      const next = pickChallenge(prev.topicSet || [], c ? c.topic : null);
      if (!next && !c) return prev; // không có gì để chọn, không cần cập nhật
      return { ...prev, challenge: next };
    });
  };

  useEffect(() => {
    ensureTodayChallenge();
    const t = setInterval(ensureTodayChallenge, 60000);
    return () => clearInterval(t);
  }, []);

  const startChallenge = (c) => {
    requestNotifyPermission();
    setActiveChallenge(c);
    setCurrentView("speaking");
  };

  // Hàm để cộng XP sau khi học xong
  const addXP = (amount, topic, category, seconds = 0, extra: any = {}) => {
    setUserStats((prev) => {
      const today = toDateKey();
      const counts = prev.topicCounts || {};
      const sessionsToday = ((prev.dailySessions || {})[today] || 0) + 1;
      const topicSet = prev.topicSet || [];
      return {
        ...applyActivity(prev, amount, seconds),
        sessions: (prev.sessions || 0) + 1,
        history: [topic, ...(prev.history || [])].slice(0, 10),
        topicCounts: { ...counts, [category]: (counts[category] || 0) + 1 },
        challenge:
          prev.challenge && prev.challenge.topic === topic
            ? { ...prev.challenge, done: true }
            : prev.challenge,
        log: [
          { topic, category, seconds, date: today, text: "" },
          ...(prev.log || []),
        ].slice(0, 100),
        dailySessions: {
          ...(prev.dailySessions || {}),
          [today]: sessionsToday,
        },
        smokeDays: (prev.smokeDays || 0) + (sessionsToday === 10 ? 1 : 0),
        topicSet: topicSet.includes(topic) ? topicSet : [...topicSet, topic],
        quickCount: (prev.quickCount || 0) + (extra.quick ? 1 : 0),
        nonstopCount:
          (prev.nonstopCount || 0) +
          (seconds >= NONSTOP_SECONDS &&
          extra.maxGap != null &&
          extra.maxGap <= NONSTOP_MAX_GAP
            ? 1
            : 0),
      };
    });
  };

  // Cộng điểm cho hoạt động phụ (phát âm, tóm tắt): có tính streak,
  // nhưng không ghi vào Lịch sử hay Bảng Vàng
  const addBonusXP = (amount, seconds = 0, kind = "") => {
    setUserStats((prev) => ({
      ...applyActivity(prev, amount, seconds),
      summaries: (prev.summaries || 0) + (kind === "summary" ? 1 : 0),
    }));
  };

  // Lưu chữ nhận diện của bài vừa nói vào lịch sử
  const saveLastText = (text) =>
    setUserStats((prev) => {
      const log = prev.log || [];
      if (!log.length || log[0].text === text) return prev;
      return { ...prev, log: [{ ...log[0], text }, ...log.slice(1)] };
    });
  // Sửa chữ của một bài trong lịch sử (trước khi đăng)
  const updateLogText = (item, text) =>
    setUserStats((prev) => ({
      ...prev,
      log: (prev.log || []).map((l) =>
        l.date === item.date &&
        l.topic === item.topic &&
        l.seconds === item.seconds &&
        l.text === item.text
          ? { ...l, text }
          : l
      ),
    }));
  // Đăng một bài nói từ lịch sử lên Bảng Vàng chung
  const shareLog = async (item) => {
    const p = userStats.profile;
    if (!p || !item.text) throw new Error("thiếu hồ sơ hoặc chữ bài nói");
    const postId = await sharePost({
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      topic: item.topic,
      category: item.category,
      seconds: item.seconds,
      text: item.text,
    });
    setUserStats((prev) => ({
      ...prev,
      log: (prev.log || []).map((l) =>
        l.date === item.date &&
        l.topic === item.topic &&
        l.seconds === item.seconds &&
        l.text === item.text
          ? { ...l, shared: true, postId }
          : l
      ),
    }));
  };
  // Gỡ bài khỏi Bảng Vàng (từ Lịch sử) để sửa lại và đăng lại
  const unshareLog = async (item) => {
    if (item.postId) {
      try {
        await removePost(item.postId);
      } catch (e) {
        // permission-denied = bài đã bị xóa rồi, cứ gỡ dấu "đã đăng"; lỗi mạng thì dừng lại
        if (!(e && e.code === "permission-denied")) throw e;
      }
    }
    setUserStats((prev) => ({
      ...prev,
      log: (prev.log || []).map((l) =>
        l.date === item.date &&
        l.topic === item.topic &&
        l.seconds === item.seconds &&
        l.text === item.text
          ? { ...l, shared: false, postId: null }
          : l
      ),
    }));
  };
  // Khi xóa bài ở Bảng Vàng thì gỡ dấu "đã đăng" ở Lịch sử
  const clearSharedFor = (post) =>
    setUserStats((prev) => ({
      ...prev,
      log: (prev.log || []).map((l) =>
        l.shared &&
        (l.postId === post.id ||
          (!l.postId &&
            l.topic === post.topic &&
            (l.text || "").slice(0, 5000) === post.text))
          ? { ...l, shared: false, postId: null }
          : l
      ),
    }));
  // Tăng một bộ đếm đơn giản (May Mắn, Mọt Sách...)
  const bumpStat = (key) =>
    setUserStats((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "speaking", label: "Luyện Nói", icon: Dices },
    { id: "pronunciation", label: "Phát Âm", icon: Mic },
    { id: "music", label: "Thư Viện Nhạc", icon: Music },
    { id: "reading", label: "Đọc Sách", icon: BookHeadphones },
    { id: "halloffame", label: "Bảng Vàng", icon: Trophy },
    { id: "profile", label: "Hồ Sơ", icon: User },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-gray-800 overflow-hidden selection:bg-pink-200">
      <style>{`
  @keyframes nnPop { 0%{transform:scale(.9);opacity:0} 60%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
  .nn-pop { animation: nnPop .5s ease-out; }
`}</style>
      {(!userStats.profile || editProfile) && (
        <ProfileEditor
          first={!userStats.profile}
          initial={userStats.profile}
          onCancel={() => setEditProfile(false)}
          onSave={(p) => {
            setUserStats((prev) => ({ ...prev, profile: p }));
            setEditProfile(false);
          }}
        />
      )}
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r-2 border-gray-200 p-6 shrink-0 z-20 shadow-sm relative">
        <div
          className="flex items-center gap-4 mb-12 cursor-pointer mt-4"
          onClick={() => setCurrentView("dashboard")}
        >
          <div className="bg-pink-100 p-3 rounded-2xl border-2 border-pink-200 text-4xl">
            🧠
          </div>
          <h1 className="text-3xl font-black text-pink-500 tracking-tight">
            Não Nhăn
          </h1>
        </div>

        <nav className="flex flex-col gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <PushButton
                key={item.id}
                variant={isActive ? "navActive" : "navInactive"}
                className={`justify-start px-5 py-4 w-full text-lg ${
                  isActive ? "bg-pink-50 shadow-inner" : ""
                }`}
                onClick={() => setCurrentView(item.id)}
              >
                <Icon
                  size={24}
                  className="mr-4"
                  strokeWidth={isActive ? 3 : 2}
                />
                <span>{item.label}</span>
              </PushButton>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b-2 border-gray-200 p-4 flex items-center justify-center shrink-0 z-10 sticky top-0 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🧠</span>
            <h1 className="text-2xl font-black text-pink-500 tracking-tight">
              Não Nhăn
            </h1>
          </div>
        </header>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-28 md:pb-8 scroll-smooth">
          <div className="max-w-5xl mx-auto">
            {currentView === "dashboard" && (
              <Dashboard
                userStats={userStats}
                onStartChallenge={startChallenge}
              />
            )}
            {currentView === "speaking" && (
              <RandomSpeaking
                challenge={activeChallenge}
                onChallengeUsed={() => setActiveChallenge(null)}
                onLucky={() => bumpStat("luckyCount")}
                onSaveText={saveLastText}
                onFinish={(topic, category, seconds, extra) =>
                  addXP(XP_SPEAK, topic, category, seconds, extra)
                }
              />
            )}
            {currentView === "pronunciation" && (
              <Pronunciation onFinish={() => addBonusXP(XP_PRON)} />
            )}
            {currentView === "music" && (
              <MusicLibrary
                navigate={setCurrentView}
                setSharedMusicId={setSharedMusicId}
              />
            )}
            {currentView === "reading" && (
              <ReadingMode
                sharedMusicId={sharedMusicId}
                setSharedMusicId={setSharedMusicId}
                onReadDone={() => bumpStat("readDone")}
                onFinish={(seconds) =>
                  addBonusXP(XP_SUMMARY, seconds, "summary")
                }
              />
            )}

            {currentView === "halloffame" && (
              <HallOfFame
                onReplay={startChallenge}
                onDeleted={clearSharedFor}
              />
            )}
            {currentView === "profile" && (
              <Profile
                userStats={userStats}
                onReplay={startChallenge}
                onEditProfile={() => setEditProfile(true)}
                onShare={shareLog}
                onEditText={updateLogText}
                onUnshare={unshareLog}
                onSetBirthday={(v) =>
                  setUserStats((prev) =>
                    prev.birthday === v ? prev : { ...prev, birthday: v }
                  )
                }
                onSeenBadges={(levels) =>
                  setUserStats((prev) => ({ ...prev, badgeSeen: levels }))
                }
              />
            )}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 flex justify-around p-3 z-30 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <div
              key={item.id}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all cursor-pointer ${
                isActive
                  ? "text-pink-500 scale-110"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              onClick={() => {
                playClick();
                setCurrentView(item.id);
              }}
            >
              <div
                className={`p-1.5 rounded-xl mb-1 ${
                  isActive
                    ? "bg-pink-100 border-2 border-pink-500"
                    : "border-2 border-transparent"
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 3 : 2} />
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
