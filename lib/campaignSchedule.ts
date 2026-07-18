export function hasCampaignMessage(cafe: {
  active_campaign_message?: string | null;
}): boolean {
  return Boolean(cafe.active_campaign_message?.trim());
}

export function isCampaignEnded(cafe: {
  campaign_ends_at?: string | null;
}): boolean {
  if (!cafe.campaign_ends_at) return false;
  const end = new Date(cafe.campaign_ends_at).getTime();
  return !Number.isNaN(end) && Date.now() > end;
}

export function isCampaignVisible(cafe: {
  active_campaign_message?: string | null;
  campaign_starts_at?: string | null;
  campaign_ends_at?: string | null;
}): boolean {
  if (!hasCampaignMessage(cafe)) return false;
  return !isCampaignEnded(cafe);
}

export function isCampaignActive(cafe: {
  active_campaign_message?: string | null;
  campaign_starts_at?: string | null;
  campaign_ends_at?: string | null;
}): boolean {
  if (!hasCampaignMessage(cafe)) return false;
  const now = Date.now();
  if (cafe.campaign_starts_at) {
    const start = new Date(cafe.campaign_starts_at).getTime();
    if (!Number.isNaN(start) && now < start) return false;
  }
  if (cafe.campaign_ends_at) {
    const end = new Date(cafe.campaign_ends_at).getTime();
    if (!Number.isNaN(end) && now > end) return false;
  }
  return true;
}

export function campaignPhase(cafe: {
  active_campaign_message?: string | null;
  campaign_starts_at?: string | null;
  campaign_ends_at?: string | null;
}): 'live' | 'upcoming' | 'ended' | null {
  if (!hasCampaignMessage(cafe)) return null;
  if (isCampaignEnded(cafe)) return 'ended';
  if (cafe.campaign_starts_at) {
    const start = new Date(cafe.campaign_starts_at).getTime();
    if (!Number.isNaN(start) && Date.now() < start) return 'upcoming';
  }
  return 'live';
}

export function formatCampaignSchedule(
  startsAt?: string | null,
  endsAt?: string | null,
  timeZone = 'Europe/London',
): string | null {
  if (!startsAt) return null;

  const startDate = new Date(startsAt);
  const endDate = endsAt ? new Date(endsAt) : null;

  const dateFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const startDay = dateFmt.format(startDate);
  const startTime = timeFmt.format(startDate);

  if (!endDate) {
    return `${startDay}, ${startTime}`;
  }

  const endDay = dateFmt.format(endDate);
  const endTime = timeFmt.format(endDate);

  if (startDay === endDay) {
    return `${startDay}, ${startTime} – ${endTime}`;
  }
  return `${startDay}, ${startTime} – ${endDay}, ${endTime}`;
}
