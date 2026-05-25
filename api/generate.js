// api/generate.js
// Vercel Serverless Function — Gemini API로 사이트 콘텐츠 생성

const SYSTEM_PROMPT = `당신은 GEO·SEO 최적화 웹사이트 생성기입니다.
사용자의 한 줄 요청을 받아 아래 JSON 구조로만 응답하세요.
JSON 외 다른 텍스트, 설명, 마크다운 코드블록은 절대 포함하지 마세요.

응답 JSON 구조:
{
  "siteName": "사이트 이름 (영문 대문자 권장, 예: PAULA BROW)",
  "category": "beauty | food | tech | fitness | education | finance | health | shopping | service",
  "bannerText": "상단 띠배너 한 줄 (할인·이벤트 안내, 한국어)",
  "navItems": ["메뉴1", "메뉴2", "메뉴3", "메뉴4"],
  "heroEyebrow": "헤로 위 작은 영문 라벨 (예: 'PAULA BROW · IT\\'S REALISM')",
  "heroHeadlineSmall": "헤드라인 위 작은 숫자/키워드 (없으면 빈 문자열)",
  "heroHeadlineMain": "메인 헤드라인 1줄 (한국어, 강력하게)",
  "heroHeadlineSub": "헤드라인 둘째 줄 (한국어, 보완)",
  "heroDescription": "히어로 설명 1-2 문장 (한국어, 80자 내외)",
  "ctaPrimary": "첫번째 버튼 (한국어, 예: '지금 예약하기')",
  "ctaSecondary": "두번째 버튼 (한국어, 예: '시술 후기 보기')",
  "featuresTitle": "특징 섹션 제목 (한국어)",
  "featuresSub": "특징 섹션 부제 (한국어, 짧게)",
  "features": [
    {"icon": "이모지1개", "title": "짧은 제목", "text": "1문장 설명"},
    {"icon": "이모지1개", "title": "짧은 제목", "text": "1문장 설명"},
    {"icon": "이모지1개", "title": "짧은 제목", "text": "1문장 설명"}
  ],
  "urlSlug": "URL용 짧은 영문 슬러그 (소문자+하이픈, 예: paula-brow)"
}

규칙:
- 모든 텍스트는 한국어 (siteName, heroEyebrow, urlSlug만 영문 허용)
- features는 반드시 정확히 3개
- 구체적이고 사실 기반으로 (AI 검색에 잘 인용되도록)
- 짧고 임팩트 있게, 군더더기 X
- 사용자가 카페·식당이면 food, 미용·뷰티면 beauty, IT면 tech 등 카테고리 정확히 분류`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: '프롬프트가 비어있습니다' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });
  }

  try {
    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: prompt.trim() }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.9,
          maxOutputTokens: 2048
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errText);
      return res.status(500).json({
        error: 'AI 호출 실패',
        detail: errText.slice(0, 200)
      });
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('Empty Gemini response:', JSON.stringify(data).slice(0, 500));
      return res.status(500).json({ error: 'AI 응답이 비어있습니다' });
    }

    let siteData;
    try {
      siteData = JSON.parse(text);
    } catch (e) {
      console.error('JSON parse failed:', text.slice(0, 500));
      return res.status(500).json({ error: 'AI 응답 파싱 실패' });
    }

    return res.status(200).json({ success: true, site: siteData });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({
      error: '서버 오류',
      detail: err.message
    });
  }
}
