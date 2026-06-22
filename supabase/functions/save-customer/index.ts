import { supabase, functionsUrl } from '../_shared/client.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let serial = '';
    let cafeId = '';
    let customerName: string | null = null;
    let customerEmail: string | null = null;
    let birthday: string | null = null;
    let skip = false;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      serial = body.serial ?? '';
      cafeId = body.cafe_id ?? '';
      customerName = body.customer_name ?? null;
      customerEmail = body.customer_email ?? null;
      birthday = body.birthday ?? null;
      skip = !!body.skip;
    } else {
      const form = await req.formData();
      serial = String(form.get('serial') ?? '');
      cafeId = String(form.get('cafe_id') ?? '');
      customerName = form.get('customer_name') ? String(form.get('customer_name')) : null;
      customerEmail = form.get('customer_email') ? String(form.get('customer_email')) : null;
      birthday = form.get('birthday') ? String(form.get('birthday')) : null;
      skip = form.get('skip') === '1';
    }

    if (!serial) {
      return new Response('serial required', { status: 400 });
    }

    if (!skip) {
      const updates: Record<string, string | null> = {};
      if (customerName) updates.customer_name = customerName;
      if (customerEmail) updates.customer_email = customerEmail;
      if (birthday) updates.birthday = birthday;

      if (Object.keys(updates).length > 0) {
        await supabase.from('passes').update(updates).eq('serial_number', serial);
      }
    }

    return new Response(null, {
      status: 302,
      headers: { Location: functionsUrl(`/wallet/${serial}`) },
    });
  } catch (err) {
    console.error('Save customer error:', err);
    return new Response(`Error: ${(err as Error).message}`, { status: 500 });
  }
});
