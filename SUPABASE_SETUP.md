# Supabase setup (step by step)

This makes login, roles, admin provisioning, password‑reset emails, and per‑user
data **real and multi‑device**. You only do this once. Follow it top to bottom —
no coding required on your side.

When you're done, tell me and I'll do **Part 2** (wiring the app to your project).

---

## 1. Create a Supabase project
1. Go to <https://supabase.com> and sign up (free).
2. Click **New project**. Give it a name (e.g. `account-power-map`).
3. Set a **database password** (save it somewhere; you won't need it day‑to‑day).
4. Pick the region closest to you and click **Create new project**. Wait ~2 min.

## 2. Create the database tables & security rules
1. In the left sidebar open **SQL Editor** → **New query**.
2. Open the file `supabase/schema.sql` from this project, copy **all** of it, paste
   it into the editor, and click **Run**. You should see "Success".

## 3. Lock the system down (no public sign‑ups)
1. Sidebar → **Authentication** → **Providers** → **Email**: make sure **Email** is
   enabled and **"Confirm email"** is ON.
2. Sidebar → **Authentication** → **Sign In / Providers** (or **Settings**) → turn
   **OFF** "Allow new users to sign up". This makes it a closed system — only you/an
   admin can create accounts.

## 4. Create yourself (the first admin)
1. Sidebar → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter **your email** and a **password**, tick **Auto confirm user**, and create.
3. Sidebar → **SQL Editor** → New query, paste this (use your email), and **Run**:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
   You are now the one and only admin. Everyone else will default to `user`.

## 5. Deploy the admin Edge Function
This is the secure, server‑side piece that lets you (an admin) create/reset/remove
users. It never runs in the browser.
1. Sidebar → **Edge Functions** → **Create a function**.
2. Name it exactly: `admin-users`.
3. Replace the sample code with the contents of
   `supabase/functions/admin-users/index.ts` from this project, then **Deploy**.
   - You don't need to set any secrets — Supabase provides the service key to the
     function automatically.

## 6. Tell the app where your project is
1. Sidebar → **Project Settings** → **API**. Copy two values:
   - **Project URL**
   - **anon public** key (the public one — safe for the browser).
2. In this project, copy `.env.example` to a new file named `.env` and fill in:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
   ```

## 7. Set the password‑reset link target
1. Sidebar → **Authentication** → **URL Configuration**.
2. Set **Site URL** to where you run the app (for local dev: `http://localhost:5173`).
3. Add the same URL under **Redirect URLs**. This is where the "reset password"
   email link sends users back to.

---

## ✅ When you've finished steps 1–7
Tell me, and I'll wire the app to Supabase (Part 2): real login, admin panel backed
by the Edge Function, reset‑password emails, and your charts saved to the cloud and
synced across devices. After that, restart `npm run dev` and we'll test together.

If a step is unclear or you hit an error message, paste it to me and I'll help.
