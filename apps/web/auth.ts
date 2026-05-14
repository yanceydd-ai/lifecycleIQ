import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${process.env.API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json();
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.displayName,
            role: data.user.role,
            accessToken: data.accessToken,
          };
        } catch {
          return null;
        }
      },
    }),

    MicrosoftEntraID({
      clientId: process.env.AUTH_ENTRA_CLIENT_ID!,
      clientSecret: process.env.AUTH_ENTRA_CLIENT_SECRET!,
      issuer: process.env.AUTH_ENTRA_TENANT_ID
        ? `https://login.microsoftonline.com/${process.env.AUTH_ENTRA_TENANT_ID}/v2.0/`
        : undefined,
    }),
  ],

  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'microsoft-entra-id') {
        if (!profile?.email) return false;

        try {
          const res = await fetch(`${process.env.API_URL}/api/v1/auth/sso`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: profile.email,
              internalSecret: process.env.SSO_INTERNAL_SECRET,
            }),
          });

          return res.ok ? true : '/login?error=NotProvisioned';
        } catch {
          return '/login?error=SSOError';
        }
      }
      return true;
    },

    async jwt({ token, account, profile, user }) {
      if (user) {
        token.role = (user as any).role;
        token.accessToken = (user as any).accessToken;
      }

      if (account?.provider === 'microsoft-entra-id' && profile?.email) {
        try {
          const res = await fetch(`${process.env.API_URL}/api/v1/auth/sso`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: profile.email,
              internalSecret: process.env.SSO_INTERNAL_SECRET,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            token.accessToken = data.accessToken;
            token.role = data.user.role;
          }
        } catch {
          console.error('[SSO] Failed to fetch LifecycleIQ token for', profile.email);
        }
      }

      return token;
    },

    session({ session, token }) {
      (session.user as any).role = token.role;
      (session.user as any).accessToken = token.accessToken;
      return session;
    },
  },

  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
});
