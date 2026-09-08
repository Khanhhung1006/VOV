export interface Channel {
  id: string;
  name: string;
  description: string;
  streamUrl: string;
  category: string;
  logo: string;
}

export const CATEGORIES = [
  'Tất cả',
  'Yêu thích',
  'VOV',
  'Tin tức',
  'Âm nhạc',
  'Thế giới'
];

const generateLogo = (title: string, subtitle: string, color1: string, color2: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}" />
        <stop offset="100%" stop-color="${color2}" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#bg)" />
    <circle cx="256" cy="-100" r="400" fill="#ffffff" opacity="0.08" />
    <circle cx="256" cy="256" r="16" fill="#111111" opacity="0.4" />
    <text x="256" y="230" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="120" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="4">${title}</text>
    <text x="256" y="360" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="44" font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" opacity="0.9" letter-spacing="2">${subtitle}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const CHANNELS: Channel[] = [
  {
    id: 'vov-giaothong-hn',
    name: 'VOV Giao thông Hà Nội',
    description: 'Kênh thông tin giao thông thủ đô và các tỉnh lân cận.',
    streamUrl: 'https://play.vovgiaothong.vn/live/gthn/playlist.m3u8',
    category: 'VOV',
    logo: generateLogo('VOV', 'GT HÀ NỘI', '#2F8DFF', '#0A2540')
  },
  {
    id: 'vov-giaothong-hcm',
    name: 'VOV Giao thông TP.HCM',
    description: 'Tin tức giao thông trực tiếp tại TP. Hồ Chí Minh.',
    streamUrl: 'https://play.vovgiaothong.vn/live/gthcm/playlist.m3u8',
    category: 'VOV',
    logo: generateLogo('VOV', 'GT TP.HCM', '#55D8FF', '#2F8DFF')
  },
  {
    id: 'vov1',
    name: 'VOV1',
    description: 'Hệ Thời sự - Chính trị - Tổng hợp.',
    streamUrl: 'https://audio-lss.vov.vn/live/vov1.m3u8',
    category: 'Tin tức',
    logo: generateLogo('VOV 1', 'THỜI SỰ', '#00C9FF', '#92FE9D')
  },
  {
    id: 'vov2',
    name: 'VOV2',
    description: 'Hệ Văn hóa - Đời sống - Khoa giáo.',
    streamUrl: 'https://audio-lss.vov.vn/live/vov2.m3u8',
    category: 'VOV',
    logo: generateLogo('VOV 2', 'VĂN HÓA', '#4776E6', '#8E54E9')
  },
  {
    id: 'vov3',
    name: 'VOV3',
    description: 'Hệ Âm nhạc - Thông tin - Giải trí.',
    streamUrl: 'https://audio-lss.vov.vn/live/vov3.m3u8',
    category: 'Âm nhạc',
    logo: generateLogo('VOV 3', 'ÂM NHẠC', '#7B61FF', '#FF61A6')
  },
  {
    id: 'vov5',
    name: 'VOV5',
    description: 'Hệ Phát thanh Đối ngoại quốc gia.',
    streamUrl: 'https://audio-lss.vov.vn/live/vov5.m3u8',
    category: 'VOV',
    logo: generateLogo('VOV 5', 'QUỐC TẾ', '#00c6ff', '#0072ff')
  },
  {
    id: 'vov-fm89',
    name: 'VOV FM89',
    description: 'Kênh Sức khỏe - Môi trường và An toàn thực phẩm.',
    streamUrl: 'https://audio-lss.vov.vn/live/vov89.m3u8',
    category: 'VOV',
    logo: generateLogo('VOV', 'FM 89', '#FF416C', '#FF4B2B')
  },
  {
    id: 'xone-fm',
    name: 'Xone FM',
    description: 'Kênh âm nhạc dành cho giới trẻ.',
    streamUrl: 'https://strm.voh.com.vn/radio/channel1/playlist.m3u8', // Fallback stream URL representing music/youth vibes
    category: 'Âm nhạc',
    logo: generateLogo('XONE', 'FM', '#1A2980', '#26D0CE')
  },
  {
    id: 'zing-bolero',
    name: 'Zing Bolero',
    description: 'Kênh âm nhạc trữ tình, quê hương.',
    streamUrl: 'https://str.vov.gov.vn/vovlive/vov3.sdp_aac/playlist.m3u8', // Fallback representing music station
    category: 'Âm nhạc',
    logo: generateLogo('ZING', 'BOLERO', '#F09819', '#EDDE5D')
  },
  {
    id: 'bbc-world',
    name: 'BBC World Service',
    description: 'International news and current affairs.',
    streamUrl: 'https://a.files.bbci.co.uk/media/live/manifesto/audio/simulcast/hls/nonuk/sbr_low/ak/bbc_world_service.m3u8',
    category: 'Thế giới',
    logo: generateLogo('BBC', 'WORLD', '#B21F1F', '#1A2A6C')
  }
];

export function getStreamUrlFallback(id: string) {
  // Try to use a working reliable audio stream for demo since VOV m3u8 might be geo-blocked or CORS restricted
  // In a real app, the backend would provide fresh CORS-enabled URLs.
  // We use reliable public icecast streams as functional fallbacks if hls fails.
  const fallbacks: Record<string, string> = {
    'vov1': 'https://ice1.somafm.com/groovesalad-128-mp3', // Example stable stream just for testing AudioContext
    'vov-fm89': 'https://ice1.somafm.com/groovesalad-128-mp3',
    'xone-fm': 'https://ice1.somafm.com/groovesalad-128-mp3',
    'zing-bolero': 'https://ice1.somafm.com/groovesalad-128-mp3',
    'bbc-world': 'https://ice1.somafm.com/groovesalad-128-mp3'
  };
  return fallbacks[id] || 'https://ice1.somafm.com/groovesalad-128-mp3';
}
