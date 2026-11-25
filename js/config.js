/* Sarahs' Fragrance — the only file you need to edit.
 *
 * 1. WhatsApp — put your number in `whatsappNumber` below.
 *    International format, digits only, no "+" and no leading 0.
 *    Ghana example: 0241234567 becomes 233241234567.
 *
 * 2. Supabase (live stock for every visitor) —
 *    a. Create a free project at supabase.com.
 *    b. Open the SQL Editor, paste `supabase/schema.sql`, run it.
 *    c. Authentication → Users → Add user (email + password, auto-confirm).
 *      Turn off public sign-ups under Authentication → Sign In / Providers.
 *    d. In the SQL Editor, allow that same email into the dashboard:
 *         insert into public.admins (email) values ('you@example.com');
 *      Only emails in `public.admins` can read orders or change the shop.
 *    e. Project Settings → API: copy the Project URL and the public key
 *      (`anon` or `sb_publishable_…`) into `supabaseUrl` and
 *      `supabaseAnonKey` below.
 *    Both pages switch to live mode on reload.
 *
 * 3. Until step 2 is done the site runs in demo mode, saved in this browser
 *    only. Admin demo password: see `demoAdminPassword` below.
 */

window.SF_CONFIG = {
  storeName: "Sarahs' Fragrance",
  currency: "GH₵",

  /* Orders are sent to this WhatsApp number. */
  whatsappNumber: "233507007324",

  /* Pre-filled first message for the "Chat on WhatsApp" buttons. */
  whatsappGreeting: "Hi Sarah, I'd like to order these:",

  /* Leave both empty for demo mode. */
  supabaseUrl: "https://ublnleooepasrgsfhpni.supabase.co",
  supabaseAnonKey: "sb_publishable_PGqFkMc3-e1epGB99uainw_Lhtl4YTl",

  /* Used only in demo mode, when Supabase is not connected yet. */
  demoAdminPassword: "spring2026",
};

window.SF = window.SF || {};
window.SF.config = window.SF_CONFIG;
