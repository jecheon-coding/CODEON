import { type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { supabaseServer } from "@/lib/supabaseServer"
import { verifyPassword } from "@/lib/password"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      id:   "credentials",
      name: "아이디 로그인",
      credentials: {
        login_id:     { label: "아이디",   type: "text"     },
        password:     { label: "비밀번호", type: "password" },
        student_code: { label: "학원코드", type: "text"     },
        student_name: { label: "이름",     type: "text"     },
      },
      async authorize(credentials) {
        // ── 모드 1: 아이디 + 비밀번호 ──────────────────────────────────────
        if (credentials?.login_id && credentials?.password) {
          const { data: user, error } = await supabaseServer
            .from("users")
            .select("id, name, role, status, must_change_password, password_hash, is_active")
            .eq("login_id", credentials.login_id)
            .single()

          if (error || !user) throw new Error("아이디 또는 비밀번호가 틀렸습니다.")
          if (!user.is_active || user.status === "inactive")
            throw new Error("비활성화된 계정입니다. 선생님께 문의하세요.")

          const valid = await verifyPassword(credentials.password, user.password_hash ?? "")
          if (!valid) throw new Error("아이디 또는 비밀번호가 틀렸습니다.")

          return {
            id:                   user.id,
            name:                 user.name,
            email:                null,
            role:                 user.role,
            status:               user.status,
            must_change_password: user.must_change_password ?? false,
          }
        }

        // ── 모드 2: 학원코드 + 이름 ────────────────────────────────────────
        if (credentials?.student_code && credentials?.student_name) {
          const { data: user, error } = await supabaseServer
            .from("users")
            .select("id, name, role, status, must_change_password, is_active")
            .eq("student_code", credentials.student_code)
            .eq("name", credentials.student_name)
            .single()

          if (error || !user) throw new Error("학원코드 또는 이름이 맞지 않아요.")
          if (!user.is_active || user.status === "inactive")
            throw new Error("비활성화된 계정입니다. 선생님께 문의하세요.")

          return {
            id:                   user.id,
            name:                 user.name,
            email:                null,
            role:                 user.role,
            status:               user.status,
            must_change_password: user.must_change_password ?? false,
          }
        }

        return null
      },
    }),
  ],

  secret:  process.env.NEXTAUTH_SECRET,
  pages:   { signIn: "/login" },
  session: { strategy: "jwt" },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true

      const { data: existing } = await supabaseServer
        .from("users")
        .select("id, role, status")
        .eq("email", user.email)
        .maybeSingle()

      if (!existing) {
        const { data: created, error } = await supabaseServer
          .from("users")
          .insert({
            email:         user.email,
            name:          user.name,
            image:         user.image,
            auth_provider: "google",
            role:          "parent",
            status:        "active",
          })
          .select("id")
          .single()

        if (error || !created) {
          console.error("[auth] Google 사용자 생성 실패:", error?.message)
          return false
        }
        ;(user as any).dbId   = created.id
        ;(user as any).role   = "parent"
        ;(user as any).status = "active"
      } else {
        ;(user as any).dbId   = existing.id
        ;(user as any).role   = existing.role
        ;(user as any).status = existing.status
      }
      return true
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = account?.provider === "google"
          ? (user as any).dbId
          : (user as any).id

        token.role                 = (user as any).role
        token.status               = (user as any).status
        token.must_change_password = (user as any).must_change_password
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id                   = token.id as string
        session.user.role                 = token.role as "student" | "parent" | "admin"
        session.user.status               = token.status as string
        session.user.must_change_password = token.must_change_password as boolean
      }
      return session
    },
  },
}
