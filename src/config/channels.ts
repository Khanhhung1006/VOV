export interface Channel {
  id: string;
  name: string;
  description: string;
  streamUrl: string;
  category: string;
  logo: string;
  backups?: string[];
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
      <linearGradient id="bg-${title.replace(/\s+/g, '-')}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}" />
        <stop offset="100%" stop-color="${color2}" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#bg-${title.replace(/\s+/g, '-')})" />
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
    name: 'VOV Giao Thông Hà Nội',
    description: 'Kênh thông tin giao thông đô thị, tin tức và ca nhạc đồng hành thủ đô.',
    streamUrl: 'https://play.vovgiaothong.vn/live/gthn/playlist.m3u8',
    category: 'VOV',
    logo: generateLogo('VOV', 'GT HÀ NỘI', '#2F8DFF', '#0A2540')
  },
  {
    id: 'vov-giaothong-hcm',
    name: 'VOV Giao Thông TP.HCM',
    description: 'Cập nhật giao thông trực tiếp, tin tức thời sự và giải trí tại TP. Hồ Chí Minh.',
    streamUrl: 'https://play.vovgiaothong.vn/live/gthcm/playlist.m3u8',
    category: 'VOV',
    logo: generateLogo('VOV', 'GT TP.HCM', '#55D8FF', '#2F8DFF')
  },
  {
    id: 'vov1',
    name: 'VOV1 - Thời sự Chính trị',
    description: 'Kênh Thời sự, Chính trị, Ngoại giao của Đài Tiếng nói Việt Nam.',
    streamUrl: 'https://audio-lss.vov.vn/live/vov1.m3u8',
    category: 'Tin tức',
    logo: generateLogo('VOV 1', 'THỜI SỰ', '#E52D27', '#B31217')
  },
  {
    id: 'vov2',
    name: 'VOV2 - Văn hóa Xã hội',
    description: 'Kênh Văn hóa, Đời sống, Khoa giáo và Khoa học công nghệ quốc gia.',
    streamUrl: 'https://audio-lss.vov.vn/live/vov2.m3u8',
    category: 'VOV',
    logo: generateLogo('VOV 2', 'VĂN HÓA', '#4776E6', '#8E54E9')
  },
  {
    id: 'vov3',
    name: 'VOV3 - Âm nhạc Giải trí',
    description: 'Kênh Âm nhạc, Thông tin giải trí sôi động dành cho giới trẻ.',
    streamUrl: 'https://audio-lss.vov.vn/live/vov3.m3u8',
    category: 'Âm nhạc',
    logo: generateLogo('VOV 3', 'ÂM NHẠC', '#7B61FF', '#FF61A6')
  },
  {
    id: 'vov5',
    name: 'VOV5 - Đối ngoại',
    description: 'Kênh phát thanh Đối ngoại quốc gia phát sóng bằng nhiều ngôn ngữ.',
    streamUrl: 'https://audio-lss.vov.vn/live/vov5.m3u8',
    backups: [
      'https://play.vovgiaothong.vn/live/vov5/playlist.m3u8',
      'https://audio-sp.vov.vn/live/vov5.m3u8',
      'https://live.vov.vn/live/vov5.m3u8'
    ],
    category: 'Thế giới',
    logo: generateLogo('VOV 5', 'QUỐC TẾ', '#00c6ff', '#0072ff')
  },
  {
    id: 'voh-999',
    name: 'VOH - Radio TP.HCM FM 99.9',
    description: 'Kênh Thông tin - Thương mại - Giải trí của Đài Tiếng nói Nhân dân TP.HCM.',
    streamUrl: 'https://live.voh.com.vn/voh999/playlist.m3u8',
    backups: ['https://stream-155.zeno.fm/4q7y9hvkp2zuv'],
    category: 'Tin tức',
    logo: generateLogo('VOH', 'FM 99.9', '#F12711', '#F5AF19')
  },
  {
    id: 'xone-fm',
    name: 'XONE FM - Music 24/7',
    description: 'Kênh âm nhạc giới trẻ hàng đầu, phát sóng âm nhạc quốc tế và Việt Nam sôi động.',
    streamUrl: 'https://stream-176.zeno.fm/umt5gqmg3reuv',
    backups: ['https://stream-155.zeno.fm/4q7y9hvkp2zuv'],
    category: 'Âm nhạc',
    logo: generateLogo('XONE', 'MUSIC 24/7', '#11998E', '#38EF7D')
  },
  {
    id: 'joyfm',
    name: 'JoyFM - Sức khỏe & Đời sống',
    description: 'Kênh chuyên biệt về sức khỏe, y tế gia đình và đời sống xã hội.',
    streamUrl: 'https://play.vovgiaothong.vn/live/joyfm/playlist.m3u8',
    backups: ['https://audio-lss.vov.vn/live/vov2.m3u8'],
    category: 'Tin tức',
    logo: generateLogo('JOY', 'FM 98.9', '#FF4E50', '#F9D423')
  },
  {
    id: 'vov-fm-suckhoe',
    name: 'VOV FM Sức Khỏe',
    description: 'Chuyên trang sức khỏe cộng đồng, tư vấn y tế chất lượng cao.',
    streamUrl: 'https://audio-lss.vov.vn/live/vov2.m3u8',
    category: 'VOV',
    logo: generateLogo('VOV', 'SỨC KHỎE', '#1D976C', '#93F9B9')
  },
  {
    id: 'vov-fm-giaoduc',
    name: 'VOV FM Giáo Dục',
    description: 'Kênh phát thanh khoa học, giáo dục, hướng nghiệp quốc gia.',
    streamUrl: 'https://audio-lss.vov.vn/live/vov2.m3u8',
    category: 'VOV',
    logo: generateLogo('VOV', 'GIÁO DỤC', '#3A1C71', '#D76D77')
  },
  {
    id: 'voh-nhandan',
    name: 'VOH - Tiếng nói Nhân dân TP.HCM',
    description: 'Kênh thời sự, chính trị, đời sống tổng hợp thuộc đài VOH TP.HCM.',
    streamUrl: 'https://stream-155.zeno.fm/4q7y9hvkp2zuv',
    backups: ['https://ice5.securenetsystems.net/KALI'],
    category: 'Tin tức',
    logo: generateLogo('VOH', 'NHÂN DÂN', '#0052D4', '#65C7F7')
  },
  {
    id: 'xone-tophits',
    name: 'XONE FM - Top Hits Giới trẻ',
    description: 'Cập nhật bảng xếp hạng và các ca khúc Hot nhất thị trường âm nhạc quốc tế.',
    streamUrl: 'https://mplaylist-zmp3.zmdcdn.me/99YFw722aFg/zhls/live/855a669d5ad8b386eac9/index.m3u8',
    backups: ['https://stream-176.zeno.fm/umt5gqmg3reuv'],
    category: 'Âm nhạc',
    logo: generateLogo('XONE', 'TOP HITS', '#8A2387', '#E94057')
  },
  {
    id: 'hanoi-fm',
    name: 'Hà Nội FM 90MHz',
    description: 'Kênh tin tức thủ đô, giải trí văn hóa đặc sắc của Đài PT-TH Hà Nội.',
    streamUrl: 'https://ha-noi-community-radio.radiocult.fm/stream',
    backups: ['https://play.vovgiaothong.vn/live/gthn/playlist.m3u8'],
    category: 'Tin tức',
    logo: generateLogo('HN', 'FM 90', '#1F1C2C', '#928DAB')
  },
  {
    id: 'radio-vnr',
    name: 'Radio Việt Nam - VNR',
    description: 'Kênh âm nhạc chọn lọc, phát sóng liên tục 24/7 chất lượng âm thanh HD.',
    streamUrl: 'https://stream.zeno.fm/jxniabwipmhtv',
    backups: ['https://stream-155.zeno.fm/4q7y9hvkp2zuv'],
    category: 'Tin tức',
    logo: generateLogo('VNR', 'RADIO VN', '#2C3E50', '#FD746C')
  },
  {
    id: 'rfi-tiengviet',
    name: 'RFI Tiếng Việt',
    description: 'Chương trình phát thanh quốc tế của đài RFI phát đi từ Paris, Pháp.',
    streamUrl: 'https://rfienvietnamien64k.ice.infomaniak.ch/rfienvietnamien-64.mp3',
    backups: ['https://replaynewsvi.ice.infomaniak.ch/replaynewsve-128.mp3'],
    category: 'Thế giới',
    logo: generateLogo('RFI', 'TIẾNG VIỆT', '#D31027', '#EA00D9')
  },
  {
    id: 'zing-bolero',
    name: 'Zing Bolero & Trữ Tình',
    description: 'Tuyển chọn những ca khúc trữ tình quê hương ngọt ngào và sâu lắng nhất.',
    streamUrl: 'https://vnno-ne-3-tf-multi-playlist-zmp3.zmdcdn.me/BJ7DyJjfG_E/zhls/playback-realtime/audio/5bace800d4453d1b6454/audio.m3u8',
    backups: ['https://stream.zeno.fm/jxniabwipmhtv'],
    category: 'Âm nhạc',
    logo: generateLogo('ZING', 'BOLERO', '#f857a6', '#ff5858')
  },
  {
    id: 'bbc-world',
    name: 'BBC World Service',
    description: 'Kênh thời sự chính luận và tin tức toàn cầu 24/7 từ Luân Đôn, Anh Quốc.',
    streamUrl: 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service',
    backups: ['https://ha-noi-community-radio.radiocult.fm/stream'],
    category: 'Thế giới',
    logo: generateLogo('BBC', 'WORLD', '#B21F1F', '#1A2A6C')
  }
];

export function getStreamUrlFallback(id: string) {
  const channel = CHANNELS.find(c => c.id === id);
  if (channel && channel.backups && channel.backups.length > 0) {
    return channel.backups[0];
  }
  return 'https://ice1.somafm.com/groovesalad-128-mp3';
}
