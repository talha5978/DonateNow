# DonateNow - Emergency Blood Donation Platform

DonateNow is a high-speed, direct peer-to-peer blood donation and emergency coordination network designed specifically for fast-paced crisis response. It removes human administrative bottlenecks, WhatsApp message chaos, and unverified group forwarding by leveraging intelligent AI extraction, automated hospital slip verification, and a smart wave-sorted feed.

---

## Key Features & Capabilities

- **Smart Wave-Sorted Feed:** Automatically prioritizes emergency requests based on urgency, exact blood group matches, compatibility, and proximity without requiring complex push notification infrastructures.
- **AI-Powered Intake (`AiService`):** Parses messy WhatsApp forwards, Roman Urdu, Urdu, or English text into structured blood request objects using Meta Llama 3.1 8B Instruct.
- **Voice Note Transcription:** Converts audio recordings into clean text using Cloudflare Whisper.
- **Hospital Slip Verification:** Automatically inspects hospital admission slips and prescriptions using Cloudflare Vision AI (Meta Llama 3.2 11B Vision Instruct) to ensure authenticity.
- **Medical Cooldown Enforcement:** Tracks donor recovery cycles with an automated 56-day cooldown rule to protect donor health.
- **Interactive Regional Map:** Allows users to filter active emergency requests across different administrative regions and cities instantly.
- **Intent Switcher:** A persistent floating assistant that lets users seamlessly toggle between donating blood or posting an emergency request.

---

## Application Workflow Diagram

```
+-----------------------------------------------------------------+
|                       User Entry Point                          |
|         (Floating Intent Switcher: Donate vs. Need Blood)       |
+--------------------------------|--------------------------------+
                                 |
         +-----------------------+-----------------------+
         |                                               |
         v                                               v
[ Donate Intent ]                               [ Need Blood Intent ]
- Checks 56-day cooldown                        - Choose Entry Mode:
- Loads Wave-Sorted Feed                          * Manual Form
- Connects with nearby requests                   * WhatsApp Paste (AI)
                                                  * Voice Note (Whisper)
                                                         |
                                                         v
                                              [ AI Extraction Engine ]
                                              (Llama 3.1 8B / Whisper)
                                                         |
                                                         v
                                              [ Hospital Slip Audit ]
                                              (Vision AI Verification)
                                                         |
                                                         v
                                              [ Active Dispatch Feed ]
                                              (Broadcast to Compatible Donors)
                                                         |
                                                         v
                                              [ Fulfillment & Cooldown ]
                                              (Confirmation & Recovery Timer)
```

---

## APIs and Models Used

DonateNow integrates serverless artificial intelligence models through Cloudflare Workers AI and backend data services via Supabase:

1. **Cloudflare Workers AI REST API:**
   - **Text Extraction:** `@cf/meta/llama-3.1-8b-instruct` parses unstructured medical text and chat messages into validated JSON data.
   - **Speech-to-Text:** `@cf/openai/whisper` transcribes audio recordings into text.
   - **Vision Verification:** `@cf/meta/llama-3.2-11b-vision-instruct` audits hospital admission slips and medical receipts for authenticity.
2. **Supabase Services:**
   - **PostgreSQL Database:** Stores relational records for profiles, hospitals, requests, and donations.
   - **Supabase Auth:** Manages secure user authentication including Google OAuth.

---

## System Requirements

- **Node.js:** Version 22.0.0 or higher.
- **Package Manager:** `pnpm` (version 8.0.0 or higher).
- **Supabase CLI:** Installed globally or run via `pnpm dlx supabase`.

---

## Environment Setup

1. Copy the example environment file to create your local `.env` file:
   ```bash
   cp .env.example .env
   ```
2. Fill in your credentials inside the `.env` file:
   ```env
   SUPABASE_URL=https://xxxxxxxxxxxxxxxxx.supabase.co
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxx
   CLOUDFLARE_ACCOUNT_ID=your_account_id_here
   CLOUDFLARE_API_TOKEN=your_api_token_here
   ```

---

## Installation Instructions

Install all project dependencies using `pnpm`:

```bash
pnpm install
```

---

## Database Setup & Migrations

To set up your Supabase database schema and apply migrations locally or remotely:

1. Log in to your Supabase account via the CLI:
   ```bash
   pnpm dlx supabase login
   ```
2. Link your local project to your remote Supabase project:
   ```bash
   pnpm dlx supabase link --project-ref your-project-reference-id
   ```
3. Push database migrations to your Supabase instance:
   ```bash
   pnpm dlx supabase db push
   ```
4. Generate TypeScript types matching your updated database schema:
   ```bash
   pnpm gen-types
   ```

---

## Database Structure

The database consists of five core tables:

1. **`profiles`**: Stores user account details, blood groups, geographical coordinates, availability status, and timestamps of the last donation for medical cooldown enforcement.
2. **`hospitals`**: Contains registered medical facilities, city names, and geographical coordinates for proximity calculation.
3. **`requests`**: Manages emergency blood requirements, target units needed, units fulfilled, urgency levels, status, and verification state.
4. **`donations`**: Tracks completed donations, unit contributions, confirmation tracking, and triggers donor recovery cooldowns.
5. **`confirmations`**: Records arrival logs and verification events between donors and requesters.

---

## Google Auth Configuration Guide

To enable Google sign-in for users, follow these steps:

### Step 1: Google Cloud Console Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services** > **OAuth consent screen**, select **External**, and fill in your app details.
4. Go to **Credentials** > **Create Credentials** > **OAuth client ID**.
5. Select **Web application**.
6. Under **Authorized redirect URIs**, add your Supabase callback URL:
   `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
7. Copy the generated **Client ID** and **Client Secret**.

### Step 2: Supabase Dashboard Setup
1. Open your Supabase Project Dashboard.
2. Navigate to **Authentication** > **Providers** and select **Google**.
3. Toggle **Enable Sign in with Google** to on.
4. Paste your Google **Client ID** and **Client Secret**.
5. Click **Save**.