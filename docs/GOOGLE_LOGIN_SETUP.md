# Google Login Setup (Supabase Auth)

CoreForge signs users in with Google through Supabase Auth. The code is already wired
(`src/cloud/`) — these are the one-time dashboard steps. Takes about 10 minutes.

Your project: `qnwkcqjkdyvafhqtbkhx` · Live site: `https://golden007-prog.github.io/DMAT_Core_Module_with_Free_Gemini_key/`

## 1. Create a Google OAuth client

1. Open [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
   (create/select any project).
2. If prompted, configure the **OAuth consent screen** first: External · app name "CoreForge" ·
   add your email · no extra scopes needed (email/profile are default) · add yourself as a test
   user, or publish the app so anyone can sign in.
3. **Create Credentials → OAuth client ID → Web application**, then enter:

   **Authorized JavaScript origins**
   ```
   https://golden007-prog.github.io
   https://qnwkcqjkdyvafhqtbkhx.supabase.co
   http://localhost:5173
   ```

   **Authorized redirect URIs**
   ```
   https://qnwkcqjkdyvafhqtbkhx.supabase.co/auth/v1/callback
   ```

4. Save and copy the **Client ID** and **Client Secret**.

## 2. Enable the Google provider in Supabase

1. Open [Auth → Sign In / Providers](https://supabase.com/dashboard/project/qnwkcqjkdyvafhqtbkhx/auth/providers)
   in the Supabase dashboard.
2. Enable **Google**, paste the Client ID and Client Secret, save.

## 3. Set the redirect allow-list in Supabase

Open [Auth → URL Configuration](https://supabase.com/dashboard/project/qnwkcqjkdyvafhqtbkhx/auth/url-configuration):

- **Site URL:** `https://golden007-prog.github.io/DMAT_Core_Module_with_Free_Gemini_key/`
- **Redirect URLs** (add both):
  ```
  https://golden007-prog.github.io/DMAT_Core_Module_with_Free_Gemini_key/
  http://localhost:5173/
  ```

## 4. Done — test it

Open the live site → **Settings → Account & sync → Sign in with Google**. After the Google
consent screen you land back in CoreForge signed in; a profile row is created automatically and
your sessions/settings start syncing.

## How the pieces fit

```
Browser ──signInWithOAuth──▶ Supabase Auth ──▶ Google consent
   ▲                                                │
   └── redirected back with a session ◀─── /auth/v1/callback
```

- The app's publishable key is shipped in the client (safe — RLS is the security boundary).
- Database access is row-scoped: every table policy requires `auth.uid()` to match the row owner
  (see `supabase/schema.sql`).
- The user's Gemini API key is **never** synced — it stays in the device's localStorage.
