# Secure Web Application Authentication Interface

A secure authentication interface built using **React**, **TypeScript**, **Vite**, **React Router**, **Supabase Auth**, and **Cloudflare Turnstile**, ready for deployment to **Cloudflare Pages**.

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have **Node.js** installed (v18+ recommended).

### 2. Environment Setup
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in the configuration variables:
   * `VITE_SUPABASE_URL`: Your Supabase Project API URL.
   * `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase Project `anon`/`public` key.
   * `VITE_TURNSTILE_SITE_KEY`: Your Cloudflare Turnstile Site Key.

### 3. Installation
Install the project dependencies:
```bash
npm install
```

### 4. Running Locally
Start the development server:
```bash
npm run dev
```

---

## 🔒 Security Configuration

### Supabase Settings
1. **User Sign Up**: In the Supabase Dashboard, go to **Authentication** > **Providers** > **Email** and disable *Allow new users to sign up* if this is a strict admin-managed application. (User accounts will be created by administrators through the Supabase Dashboard).
2. **Redirect URLs**: Go to **Authentication** > **URL Configuration** > **Redirect URLs** and add:
   * `http://localhost:5173/reset-password` (for local development testing)
   * `https://<your-cloudflare-pages-domain>/reset-password` (for production)
3. **Turnstile Captcha Verification**: In Supabase Dashboard, go to **Authentication** > **Security** and enable **CAPTCHA** protection. Provide the Cloudflare Turnstile site key and secret key to enforce bot protection on sign-in.

### Cloudflare Turnstile Settings
1. Log in to the Cloudflare Dashboard and navigate to **Turnstile**.
2. Create a new Turnstile widget:
   * Name: `OPD Management`
   * Domain: Add `localhost` (for testing) and your production Cloudflare Pages domain name.
   * Widget Type: Managed (Recommended) or Non-interactive.
3. Copy the **Site Key** (into `.env` as `VITE_TURNSTILE_SITE_KEY`) and the **Secret Key** (into Supabase Dashboard).

---

## 🛡️ Database Row Level Security (RLS) Guidance

> [!CRITICAL]
> **Frontend Route Protection is NOT Database Security!**
> Guarding routes in React (e.g. `/dashboard`) only hides pages on the client-side. A malicious user can directly invoke Supabase API requests using the publishable key to view or alter records.
> **You must enforce Row Level Security (RLS) on all database tables.**

An example implementation is provided at [example-rls.sql](file:///f:/Github/OPDManagement/supabase/example-rls.sql).

### Example Policy for `records` Table
Enable RLS:
```sql
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
```

Create policies (using `auth.uid()` to check ownership):
```sql
-- SELECT: Only read own records
CREATE POLICY "Allow users to view their own records" 
ON public.records FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Only add records matching user_id
CREATE POLICY "Allow users to insert their own records" 
ON public.records FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Only modify own records
CREATE POLICY "Allow users to update their own records" 
ON public.records FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Only remove own records
CREATE POLICY "Allow users to delete their own records" 
ON public.records FOR DELETE TO authenticated
USING (auth.uid() = user_id);
```

---

## 🌐 Cloudflare Pages Deployment

Deploy this project onto **Cloudflare Pages** using the following configuration settings:

| Setting | Value |
| :--- | :--- |
| **Framework Preset** | `Vite` / `None` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### Environment Variables on Cloudflare Pages
Make sure to add the following Environment Variables under **Settings** > **Environment variables** in the Cloudflare Pages project:
* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_PUBLISHABLE_KEY`
* `VITE_TURNSTILE_SITE_KEY`

### Routing & Headers
* [_redirects](file:///f:/Github/OPDManagement/public/_redirects): Enforces Single Page Application routing (SPA) to map all routes to `/index.html` with a 200 response.
* [_headers](file:///f:/Github/OPDManagement/public/_headers): Applies strict security headers (`X-Content-Type-Options`, `Referrer-Policy`, `CSP`, and `Permissions-Policy`).
