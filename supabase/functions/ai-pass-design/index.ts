import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, supabase } from '../_shared/client.ts';
import { json, lastPathSegment } from '../_shared/utils.ts';

async function authorizeUser(authHeader: string | null): Promise<
  { ok: true; userId: string; email: string } | { ok: false; response: Response }
> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) };
  }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!anonKey) {
    return { ok: false, response: json({ error: 'Server misconfigured' }, 500) };
  }

  const authClient = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user?.email) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) };
  }

  return { ok: true, userId: user.id, email: user.email.toLowerCase() };
}

async function authorizeCafeOwner(
  authHeader: string | null,
  cafeId: string,
): Promise<{ ok: true; cafe: Record<string, unknown> } | { ok: false; response: Response }> {
  const auth = await authorizeUser(authHeader);
  if (!auth.ok) return auth;

  const { data: cafe, error } = await supabase
    .from('cafes')
    .select('*')
    .eq('id', cafeId)
    .maybeSingle();

  if (error || !cafe) {
    return { ok: false, response: json({ error: 'Cafe not found' }, 404) };
  }

  const cafeEmail = cafe.email ? String(cafe.email).toLowerCase() : '';
  const ownerEmail = cafe.owner_email ? String(cafe.owner_email).toLowerCase() : '';
  const ownerId = cafe.owner_id ? String(cafe.owner_id) : '';

  if (cafeEmail !== auth.email && ownerEmail !== auth.email && ownerId !== auth.userId) {
    return { ok: false, response: json({ error: 'Forbidden' }, 403) };
  }

  return { ok: true, cafe };
}

interface QuizInput {
  program_mode?: string;
  reward?: string;
  stamp_goal?: number;
  levels?: Array<{ stamp_count: number; reward: string }>;
  visit_frequency?: string;
  goal_priority?: string;
  business_name?: string;
  biz_type?: string;
  brand_colour?: string;
  sells?: string;
  vibe?: string;
}

interface DesignSuggestion {
  pass_template: 'classic';
  background_color: string;
  foreground_color: string;
  label_color: string;
  welcome_message: string;
  stamp_message: string;
  reward_message: string;
  reward?: string;
  stamp_goal?: number;
  levels?: Array<{ stamp_count: number; reward: string }>;
  rationale: string;
}

function parseRgb(color: string): [number, number, number] | null {
  const m = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function lumin(rgb: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

/** Force readable Wallet colours — never white-on-white. */
function enforceContrast(suggestion: DesignSuggestion): DesignSuggestion {
  const bg = parseRgb(suggestion.background_color) ?? [255, 255, 255];
  let fg = parseRgb(suggestion.foreground_color) ?? [40, 40, 40];
  let label = parseRgb(suggestion.label_color) ?? [120, 120, 120];
  const bgLum = lumin(bg);
  const lightBg = bgLum > 0.55;

  if (lightBg) {
    // Dark text on light cards
    if (lumin(fg) > 0.35) fg = [40, 28, 18];
    if (lumin(label) > 0.5) label = [110, 100, 90];
    return {
      ...suggestion,
      background_color: `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`,
      foreground_color: `rgb(${fg[0]}, ${fg[1]}, ${fg[2]})`,
      label_color: `rgb(${label[0]}, ${label[1]}, ${label[2]})`,
    };
  }

  // Light accent on dark cards — labels must stay readable (OF X STAMPS)
  if (lumin(fg) < 0.45) fg = [201, 169, 110];
  if (lumin(label) < 0.42) label = [176, 164, 148];
  return {
    ...suggestion,
    background_color: `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`,
    foreground_color: `rgb(${fg[0]}, ${fg[1]}, ${fg[2]})`,
    label_color: `rgb(${label[0]}, ${label[1]}, ${label[2]})`,
  };
}

function shopFallback(quiz: QuizInput): DesignSuggestion {
  const name = quiz.business_name || 'your shop';
  const vibe = (quiz.vibe || quiz.goal_priority || '').toLowerCase();
  const type = (quiz.biz_type || '').toLowerCase();
  const sells = (quiz.sells || '').toLowerCase();
  const brand = (quiz.brand_colour || '').toLowerCase();

  let bg = 'rgb(255, 252, 248)';
  let fg = 'rgb(72, 48, 32)';
  let label = 'rgb(120, 108, 96)';

  if (vibe.includes('premium') || vibe.includes('dark') || brand.includes('black')) {
    bg = 'rgb(26, 24, 20)';
    fg = 'rgb(201, 169, 110)';
    label = 'rgb(138, 128, 112)';
  } else if (brand.includes('green') || type.includes('salad') || sells.includes('juice')) {
    fg = 'rgb(36, 92, 64)';
  } else if (brand.includes('blue') || type.includes('sushi') || sells.includes('sushi')) {
    fg = 'rgb(24, 72, 140)';
  } else if (type.includes('coffee') || sells.includes('coffee') || sells.includes('espresso') || brand.includes('brown')) {
    fg = 'rgb(92, 52, 28)';
  } else if (type.includes('bakery') || sells.includes('pastry') || sells.includes('cake')) {
    fg = 'rgb(140, 72, 48)';
  } else if (type.includes('bar')) {
    bg = 'rgb(22, 18, 28)';
    fg = 'rgb(210, 190, 230)';
    label = 'rgb(140, 130, 150)';
  }

  if (quiz.brand_colour?.startsWith('rgb') || quiz.brand_colour?.startsWith('#')) {
    if (quiz.brand_colour.startsWith('rgb')) fg = quiz.brand_colour;
  }

  const reward = quiz.reward || 'Free coffee';
  const goal = Number(quiz.stamp_goal) || 10;
  return enforceContrast({
    pass_template: 'classic',
    background_color: bg,
    foreground_color: fg,
    label_color: label,
    welcome_message: `Welcome to ${name}`,
    stamp_message: 'Thanks for visiting!',
    reward_message: 'Well done — your reward is ready',
    reward,
    stamp_goal: goal,
    levels: quiz.program_mode === 'stamps_levels' ? quiz.levels : undefined,
    rationale: `Colours chosen for ${name} based on what you sell and the vibe you picked.`,
  });
}

function parseSuggestion(raw: string, quiz: QuizInput): DesignSuggestion {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return shopFallback(quiz);

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<DesignSuggestion>;
    const base = shopFallback(quiz);
    return enforceContrast({
      pass_template: 'classic',
      background_color: parsed.background_color || base.background_color,
      foreground_color: parsed.foreground_color || base.foreground_color,
      label_color: parsed.label_color || base.label_color,
      welcome_message: String(parsed.welcome_message || base.welcome_message).slice(0, 80),
      stamp_message: String(parsed.stamp_message || base.stamp_message).slice(0, 80),
      reward_message: String(parsed.reward_message || base.reward_message).slice(0, 80),
      reward: parsed.reward || base.reward,
      stamp_goal: Number(parsed.stamp_goal) || base.stamp_goal,
      levels: Array.isArray(parsed.levels) ? parsed.levels : base.levels,
      rationale: String(parsed.rationale || base.rationale).slice(0, 220),
    });
  } catch {
    return shopFallback(quiz);
  }
}

async function callAnthropic(
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs: number,
): Promise<{ ok: true; text: string } | { ok: false; status?: number; detail: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, status: res.status, detail: detail.slice(0, 300) };
    }

    const data = await res.json();
    const text = Array.isArray(data.content)
      ? data.content.map((c: { text?: string }) => c.text ?? '').join('')
      : '';
    return { ok: true, text };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function askClaude(quiz: QuizInput): Promise<DesignSuggestion & { source: 'ai' | 'fallback'; fallback_reason?: string }> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return { ...shopFallback(quiz), source: 'fallback', fallback_reason: 'ANTHROPIC_API_KEY missing' };
  }

  const prompt = `You design Apple Wallet loyalty pass branding colours for a real independent shop.

Return ONLY JSON:
{
  "background_color": "rgb(r, g, b)",
  "foreground_color": "rgb(r, g, b)",
  "label_color": "rgb(r, g, b)",
  "welcome_message": "...",
  "stamp_message": "...",
  "reward_message": "...",
  "reward": "...",
  "stamp_goal": 10,
  "levels": [],
  "rationale": "one short sentence"
}

CRITICAL colour rules (Apple Wallet):
- Large stamp counts use foreground_color ON background_color — they MUST be clearly readable
- Never use white/near-white foreground on white/cream backgrounds
- Never use dark brown on near-black backgrounds
- Dark text on light cards, or bright/gold text on dark cards
- label_color must be muted but still readable (not the same as background)

Personalisation (follow closely):
- Derive palette, tone, and reward copy from the shop facts below
- Match atmosphere + wallet feel + colour mood — don't invent a generic cafe look
- Use brand colour notes when provided
- Messages should sound like this specific shop, not a template

Design rules:
- Stamp loyalty only (not points)
- Stamp goal usually 8–12 unless shop answers imply otherwise
- If program_mode is stamps_levels, return 2–3 levels like [{"stamp_count":5,"reward":"Free pastry"}]
- Otherwise levels: []
- Short warm copy, no emojis, no competitor brand names

Shop facts:
Name: ${quiz.business_name || 'Independent shop'}
Type: ${quiz.biz_type || 'cafe'}
Detailed shop brief:
${quiz.sells || 'unknown'}
Preferred brand colour hint: ${quiz.brand_colour || 'none'}
Vibe / atmosphere / feel: ${quiz.vibe || quiz.goal_priority || 'simple'}
Visit frequency: ${quiz.visit_frequency || 'unknown'}
Loyalty priority: ${quiz.goal_priority || 'unknown'}
Program: ${quiz.program_mode || 'stamps'}
Reward hint: ${quiz.reward || 'Free coffee'}
Goal hint: ${quiz.stamp_goal || 10}
Levels hint: ${JSON.stringify(quiz.levels || [])}`;

  // Prefer current Sonnet IDs; keep older aliases as backup.
  const models = [
    'claude-sonnet-4-5-20250929',
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-latest',
  ];

  const errors: string[] = [];
  for (const model of models) {
    const result = await callAnthropic(apiKey, model, prompt, 20_000);
    if (!result.ok) {
      const msg = `${model}: ${result.status ?? 'err'} ${result.detail}`;
      console.error('Anthropic error', msg);
      errors.push(msg);
      continue;
    }
    const suggestion = parseSuggestion(result.text, quiz);
    return { ...suggestion, source: 'ai' };
  }

  return {
    ...shopFallback(quiz),
    source: 'fallback',
    fallback_reason: errors.slice(0, 2).join(' | ') || 'All Anthropic models failed',
  };
}

function lockedQuizToInput(raw: unknown, cafe: Record<string, unknown>): QuizInput {
  if (!raw || typeof raw !== 'object') return {};
  const q = raw as Record<string, unknown>;
  const shopStory = typeof q.shop_story === 'string' ? q.shop_story : '';
  const atmosphere = typeof q.atmosphere === 'string' ? q.atmosphere : '';
  const atmosphereNotes = typeof q.atmosphere_notes === 'string' ? q.atmosphere_notes : '';
  const colourMood = typeof q.colour_mood === 'string' ? q.colour_mood : '';
  const brandNotes = typeof q.brand_colour_notes === 'string' ? q.brand_colour_notes : '';
  const walletFeel = typeof q.wallet_feel === 'string' ? q.wallet_feel : '';
  const regulars = Array.isArray(q.regulars) ? q.regulars.map(String).join(', ') : '';
  const sells = [
    shopStory,
    atmosphereNotes ? `Space notes: ${atmosphereNotes}` : '',
    atmosphere ? `Atmosphere: ${atmosphere}` : '',
    regulars ? `Regulars: ${regulars}` : '',
    brandNotes ? `Brand colour notes: ${brandNotes}` : '',
    walletFeel ? `Wallet feel: ${walletFeel}` : '',
  ].filter(Boolean).join('\n');

  return {
    program_mode: typeof q.program_mode === 'string' ? q.program_mode : undefined,
    reward: typeof q.reward === 'string' ? q.reward : String(cafe.reward || 'Free coffee'),
    stamp_goal: Number(q.stamp_goal) || Number(cafe.stamp_goal) || 10,
    levels: Array.isArray(q.levels) ? q.levels as Array<{ stamp_count: number; reward: string }> : [],
    visit_frequency: typeof q.visit_frequency === 'string' ? q.visit_frequency : undefined,
    goal_priority: typeof q.loyalty_goal === 'string' ? q.loyalty_goal : undefined,
    business_name: String(cafe.name || ''),
    sells,
    brand_colour: colourMood || brandNotes || undefined,
    vibe: [atmosphere, walletFeel, colourMood].filter(Boolean).join('; '),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const segment = lastPathSegment(new URL(req.url));
    const cafeId = segment && segment !== 'ai-pass-design' ? segment : null;

    const body = await req.json().catch(() => ({}));
    const apply = body.apply === true;
    const useLockedQuiz = body.use_locked_quiz === true;
    let quiz: QuizInput = {
      ...(typeof body.quiz === 'object' && body.quiz ? body.quiz : {}),
      biz_type: typeof body.biz_type === 'string' ? body.biz_type : body.quiz?.biz_type,
    };

    if (cafeId && apply) {
      const auth = await authorizeCafeOwner(req.headers.get('Authorization'), cafeId);
      if (!auth.ok) return auth.response;

      const locked = auth.cafe.pass_design_locked_at != null;
      if (useLockedQuiz || locked) {
        quiz = {
          ...lockedQuizToInput(auth.cafe.pass_design_quiz, auth.cafe),
          ...quiz,
          biz_type: quiz.biz_type,
        };
      }

      quiz.business_name = quiz.business_name || String(auth.cafe.name || '');
      quiz.reward = String(auth.cafe.reward || quiz.reward || 'Free coffee');
      quiz.stamp_goal = Number(auth.cafe.stamp_goal) || Number(quiz.stamp_goal) || 10;

      const suggestion = await askClaude(quiz);
      const { error } = await supabase.from('cafes').update({
        pass_template: 'classic',
        pass_design_mode: 'ai',
        background_color: suggestion.background_color,
        foreground_color: suggestion.foreground_color,
        label_color: suggestion.label_color,
        ai_background_color: suggestion.background_color,
        ai_foreground_color: suggestion.foreground_color,
        ai_label_color: suggestion.label_color,
        welcome_message: suggestion.welcome_message,
        stamp_message: suggestion.stamp_message,
        reward_message: suggestion.reward_message,
        // Never change locked reward answers from AI
        ...(!locked && suggestion.reward ? { reward: suggestion.reward } : {}),
        ...(!locked && suggestion.stamp_goal ? { stamp_goal: suggestion.stamp_goal } : {}),
      }).eq('id', cafeId);

      if (error) return json({ error: error.message }, 500);
      return json({
        ok: true,
        suggestion,
        applied: true,
        source: suggestion.source,
        fallback_reason: suggestion.fallback_reason ?? null,
      });
    }

    const auth = await authorizeUser(req.headers.get('Authorization'));
    if (!auth.ok) return auth.response;

    if (cafeId) {
      const cafeAuth = await authorizeCafeOwner(req.headers.get('Authorization'), cafeId);
      if (cafeAuth.ok) {
        quiz.business_name = quiz.business_name || String(cafeAuth.cafe.name || '');
        if (useLockedQuiz || cafeAuth.cafe.pass_design_locked_at) {
          quiz = {
            ...lockedQuizToInput(cafeAuth.cafe.pass_design_quiz, cafeAuth.cafe),
            ...quiz,
            business_name: quiz.business_name || String(cafeAuth.cafe.name || ''),
          };
        }
      }
    }

    const suggestion = await askClaude(quiz);
    return json({
      ok: true,
      suggestion,
      applied: false,
      source: suggestion.source,
      fallback_reason: suggestion.fallback_reason ?? null,
    });
  } catch (err) {
    console.error('ai-pass-design', err);
    return json({ error: (err as Error).message }, 500);
  }
});
