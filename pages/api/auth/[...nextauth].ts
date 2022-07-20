import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import CredentialsProvider from "next-auth/providers/credentials";
/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
async function refreshAccessToken(param: any) {
  try {
    const url = "https://ghuddy.link/api/v1/open/refresh_token";
    const payloadd = {
      refreshToken: param.refreshToken,
      requestId: param.userId,
    };
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(payloadd),
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": "en-US",
      },
    });

    const res = await response.json();

    if (!response.ok) {
      throw res;
    }

    return {
      // @ts-ignore
      ...param,
      accessToken: res.accessToken,
      exp: Date.now() + res.exp * 1000,
      refreshToken: res.refreshToken ?? param.refreshToken, // Fall back to old refresh token
    };
  } catch (error) {
    console.log(error);

    return {
      // @ts-ignore
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export default NextAuth({
  providers: [
    CredentialsProvider({
      // The name to display on the sign in form (e.g. 'Sign in with...')
      name: "ghuddy-auth",
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        phone: {
          label: "phone",
          type: "phone",
          placeholder: "Phone number",
        },
        password: { label: "Password", type: "password" },
        phoneCode: { label: "PhoneCode", type: "phonecode" },
      },
      async authorize(credentials, req) {
        console.log(credentials);
        // @ts-ignore
        const payload = {
          phoneNumber: credentials?.phone,
          password: credentials?.password,
          phoneCode: credentials?.phoneCode,
          requestId: credentials?.phone,
        };
        // @ts-ignore
        const res = await fetch("https://ghuddy.link/api/v1/open/signin", {
          method: "POST",
          body: JSON.stringify(payload),
          headers: {
            "Content-Type": "application/json",
            "Accept-Language": "en-US",
          },
        });
        // @ts-ignore
        const user = await res.json();
        if (!res.ok) {
          throw new Error(user.exception);
        }
        // If no error and we have user data, return it
        if (res.ok && user) {
          return user;
        }
        // Return null if user data could not be retrieved
        return null;
      },
    }),
    // ...add more providers here
  ],
  secret: process.env.JWT_SECRET,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        return {
          ...token,
          // @ts-ignore
          accessToken: user.accessToken,
          // @ts-ignore
          refreshToken: user.refreshToken,
          // @ts-ignore
          userId: user.userId,
        };
      }

      //   return token;
      // Return previous token if the access token has not expired yet
      // if (Date.now() < token.exp) {
      //   return token;
      // }
      //   console.log(token.exp, "tokenn");
      //   return token;

      // Access token has expired, try to update it
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      console.log(session, token, "session");

      // @ts-ignore
      session.user.accessToken = token.accessToken;
      // @ts-ignore
      session.user.refreshToken = token.refreshToken;
      // @ts-ignore
      session.user.userId = token.userId;
      // @ts-ignore
      session.user.exp = token.exp;

      return session;
    },
  },
  theme: {
    colorScheme: "auto", // "auto" | "dark" | "light"
    brandColor: "", // Hex color code #33FF5D
    logo: "/logo.png", // Absolute URL to image
  },
  // Enable debug messages in the console if you are having problems
  debug: process.env.NODE_ENV === "development",
});
