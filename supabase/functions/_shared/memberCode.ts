import { supabase } from './client.ts';

/** 4-digit code unique within a cafe — for staff lookup at the counter. */
export async function generateUniqueMemberCode(cafeId: string): Promise<string> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const { data } = await supabase
      .from('passes')
      .select('id')
      .eq('cafe_id', cafeId)
      .eq('member_code', code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error('Could not allocate member code');
}

/** Ensures every pass has a cafe-unique 4-digit code (e.g. legacy rows). */
export async function ensureMemberCode(
  pass: Record<string, unknown>,
  cafeId: string,
): Promise<string> {
  if (pass.member_code) return String(pass.member_code);
  const code = await generateUniqueMemberCode(cafeId);
  await supabase
    .from('passes')
    .update({ member_code: code })
    .eq('serial_number', String(pass.serial_number));
  return code;
}
