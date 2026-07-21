export type StampEventType = 'earn' | 'redeem';

export type PlanId = 'starter' | 'pro' | 'multi';
export type OrderStatus = 'pending_payment' | 'paid' | 'shipped' | 'delivered';
export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  email: string | null;
  owner_name: string | null;
  city: string | null;
  postcode: string | null;
  business_type: string | null;
  logo_url: string | null;
  card_color: string | null;
  stamps_per_reward: number;
  pass_template: string;
  background_color: string | null;
  foreground_color: string | null;
  label_color: string | null;
  show_customer_name_on_pass: boolean;
  onboarding_status: 'pending_activation' | 'ordered' | 'complete';
  plan_selected: PlanId | null;
  order_status: OrderStatus;
  kit_received: boolean;
  shipping_address_line1: string | null;
  shipping_phone: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status: SubscriptionStatus;
  stripe_checkout_session_id?: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_stamps: number;
  lifetime_visits: number;
  created_at: string;
  last_visit_at: string | null;
}

export interface StampEvent {
  id: string;
  business_id: string;
  customer_id: string;
  event_type: StampEventType;
  stamps: number;
  note: string | null;
  created_at: string;
  customer?: Pick<Customer, 'name' | 'email'>;
}

export interface Campaign {
  id: string;
  business_id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'ended';
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface Cafe {
  id: string;
  name: string;
  email: string;
  reward: string;
  stamp_goal: number;
  minimum_spend: number | null;
  background_color: string | null;
  foreground_color: string | null;
  label_color: string | null;
  logo_url: string | null;
  pass_template: string;
  show_customer_name_on_pass: boolean;
  collect_customer_details: boolean;
  plan?: string;
  status?: string;
  active_campaign_message?: string | null;
}

export interface Pass {
  id: string;
  cafe_id: string;
  serial_number: string;
  stamp_count: number;
  lifetime_stamps: number;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  last_stamp_at: string | null;
  created_at: string;
}

export interface Stamp {
  id: string;
  pass_id: string;
  cafe_id: string;
  created_at: string;
}

export interface Redemption {
  id: string;
  pass_id: string;
  cafe_id: string;
  created_at: string;
}

export interface RewardTier {
  id: string;
  cafe_id: string;
  stamp_count: number;
  reward: string;
  created_at: string;
}

export interface Chip {
  id: string;
  code: string;
  cafe_id: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalCustomers: number;
  newCustomersThisMonth: number;
  stampsThisWeek: number;
  redemptionsThisWeek: number;
  activeCampaigns: number;
}

export interface LoyaltyActivity {
  id: string;
  type: 'stamp' | 'redeem';
  customerName: string | null;
  created_at: string;
  passId: string;
  memberCode: string | null;
  stampCount: number | null;
}

type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      businesses: TableDef<
        Business,
        {
          owner_id: string;
          name: string;
          email?: string | null;
          owner_name?: string | null;
          city?: string | null;
          postcode?: string | null;
          business_type?: string | null;
          logo_url?: string | null;
          card_color?: string | null;
          stamps_per_reward?: number;
          pass_template?: string;
          background_color?: string | null;
          foreground_color?: string | null;
          label_color?: string | null;
          show_customer_name_on_pass?: boolean;
          onboarding_status?: 'pending_activation' | 'ordered' | 'complete';
          plan_selected?: PlanId | null;
          order_status?: OrderStatus;
          kit_received?: boolean;
          shipping_address_line1?: string | null;
          shipping_phone?: string | null;
          subscription_status?: SubscriptionStatus;
        }
      >;
      customers: TableDef<Customer>;
      stamp_events: TableDef<StampEvent>;
      campaigns: TableDef<Campaign>;
      cafes: TableDef<Cafe, Partial<Cafe>, Partial<Cafe>>;
      passes: TableDef<Pass, Partial<Pass>, Partial<Pass>>;
      stamps: TableDef<Stamp, Partial<Stamp>, Partial<Stamp>>;
      redemptions: TableDef<Redemption, Partial<Redemption>, Partial<Redemption>>;
      reward_tiers: TableDef<RewardTier, Partial<RewardTier>, Partial<RewardTier>>;
      chips: TableDef<Chip, Partial<Chip>, Partial<Chip>>;
    };
    Views: Record<string, never>;
    Functions: {
      owner_dashboard_stats: {
        Args: { p_cafe_id: string };
        Returns: {
          total_customers: number;
          new_customers_this_month: number;
          stamps_this_week: number;
          redemptions_this_week: number;
        };
      };
    };
    Enums: Record<string, never>;
  };
}
