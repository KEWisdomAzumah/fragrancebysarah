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
 *    d. Project Settings → API: copy the Project URL and the `anon` public key
 *      into `supabaseUrl` and `supabaseAnonKey` below.
 *    Both pages switch to live mode on reload.
 *
 * 3. Until step 2 is done the site runs in demo mode, saved in this browser
 *    only. Admin demo password: see `demoAdminPassword` below.
 */

window.SF_CONFIG = {
  storeName: "Sarahs' Fragrance",
  currency: "GH₵",

  /* Orders are sent to this WhatsApp number. */
  whatsappNumber: "",

  /* Pre-filled first message for the "Chat on WhatsApp" buttons. */
  whatsappGreeting: "Hi Sarah, I'd like to ask about your diffusers.",

  /* Leave both empty for demo mode. */
  supabaseUrl: "",
  supabaseAnonKey: "",

  /* Used only in demo mode, when Supabase is not connected yet. */
  demoAdminPassword: "spring2026",
};

window.SF = window.SF || {};
window.SF.config = window.SF_CONFIG;
