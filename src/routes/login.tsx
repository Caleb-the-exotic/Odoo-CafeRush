import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { usePosAuth } from "@/store";
import { usePersisted } from "@/store/admin";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { createServerFn } from "@tanstack/react-start";
import "@/lib/i18n";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; tab?: string } => {
    return {
      redirect: search.redirect as string | undefined,
      tab: search.tab as string | undefined,
    };
  },
  head: () => ({ meta: [{ title: "Sign in — OdooCafé" }] }),
  component: LoginPage,
});

// ─── Server Function: Send verification code via Brevo SMTP Relay ─────────────
export const sendOtpEmailFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; otp: string }) => d)
  .handler(async ({ data }) => {
    const { email, otp } = data;
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER || "odoocafesupport@gmail.com",
          pass: process.env.SMTP_PASS || "nwguzuqndqzuwdem",
        },
      });

      await transporter.sendMail({
        from: '"OdooCafé Support" <odoocafesupport@gmail.com>',
        to: email,
        subject: "Your OTP Code",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 500px;">
            <h2>Verification Code</h2>
            <p>Your OTP is:</p>
            <h1 style="color: #5D1E31; letter-spacing: 2px;">${otp}</h1>
            <p>Valid for 5 minutes.</p>
          </div>
        `,
      });
      return { ok: true };
    } catch (err) {
      console.error("Nodemailer OTP SMTP failed:", err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

// ─── Server Function: Send welcome email to new users via Brevo SMTP Relay ───
export const sendSignupWelcomeEmailFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; username: string }) => d)
  .handler(async ({ data }) => {
    const { email, username } = data;
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER || "odoocafesupport@gmail.com",
          pass: process.env.SMTP_PASS || "nwguzuqndqzuwdem",
        },
      });

      await transporter.sendMail({
        from: '"OdooCafé Support" <odoocafesupport@gmail.com>',
        to: email,
        subject: "Welcome to OdooCafé!",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 500px;">
            <h2 style="color: #5D1E31; margin-bottom: 20px;">Welcome to OdooCafé, ${username}!</h2>
            <p>Thank you for signing up with us. We are thrilled to have you as part of the OdooCafé family.</p>
            <p>Get ready to browse our delicious wood-fired pizzas, fresh masala tea, coffee, and more. You can place your orders online and they will be ready when you arrive!</p>
            <div style="margin: 25px 0; padding: 15px; border-left: 4px solid #5D1E31; background: #fdf6f0; border-radius: 4px;">
              <strong>Exclusive Offer:</strong> Use promo code <span style="font-family: monospace; font-weight: bold; background: #f5dcd0; padding: 2px 6px; border-radius: 3px; color: #5D1E31;">WELCOME10</span> at checkout to get 10% off your first order!
            </div>
            <p>Best regards,</p>
            <p><strong>The OdooCafé Team</strong></p>
          </div>
        `,
      });
      return { ok: true };
    } catch (err) {
      console.error("Nodemailer welcome SMTP failed:", err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

// ─── Server Function: Send purchase receipt/bill email to the customer ────────
export const sendPurchaseReceiptEmailFn = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      email: string;
      customerName: string;
      orderNumber: string;
      items: Array<{ name: string; price: number; qty: number }>;
      subtotal: number;
      discount: number;
      tax: number;
      total: number;
      tableLabel?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { email, customerName, orderNumber, items, subtotal, discount, tax, total, tableLabel } =
      data;
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER || "odoocafesupport@gmail.com",
          pass: process.env.SMTP_PASS || "nwguzuqndqzuwdem",
        },
      });

      const itemsListHtml = items
        .map(
          (item) => `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: left;">
              <div style="font-weight: bold; color: #333;">${item.name}</div>
              <div style="font-size: 12px; color: #666;">${item.qty} x ₹${item.price.toFixed(2)}</div>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #333;">
              ₹${(item.price * item.qty).toFixed(2)}
            </td>
          </tr>
        `,
        )
        .join("");

      const discountRowHtml =
        discount > 0
          ? `
          <tr>
            <td style="padding: 8px 0; text-align: left; color: #2e7d32;">Discount</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #2e7d32;">-₹${discount.toFixed(2)}</td>
          </tr>
        `
          : "";

      const tableRowHtml = tableLabel
        ? `<p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>Table:</strong> ${tableLabel}</p>`
        : "";

      await transporter.sendMail({
        from: '"OdooCafé" <odoocafesupport@gmail.com>',
        to: email,
        subject: `Your OdooCafé Receipt — Order #${orderNumber}`,
        html: `
          <div style="font-family: sans-serif; padding: 25px; border: 1px solid #ddd; border-radius: 12px; max-width: 500px; margin: 0 auto; background: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <!-- Header -->
            <div style="text-align: center; border-bottom: 2px solid #5D1E31; padding-bottom: 20px; margin-bottom: 20px;">
              <h1 style="color: #5D1E31; margin: 0; font-size: 26px; font-family: Georgia, serif;">OdooCafé</h1>
              <p style="margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; tracking-spacing: 1px; color: #888;">Wood-Fired Pizza & Chai</p>
            </div>
            
            <!-- Order Details -->
            <div style="margin-bottom: 20px;">
              <h2 style="color: #333; font-size: 18px; margin: 0 0 10px 0;">Thank you for your order, ${customerName}!</h2>
              <p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>Order Number:</strong> #${orderNumber}</p>
              <p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>Date:</strong> ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
              ${tableRowHtml}
            </div>

            <!-- Receipt Items -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr>
                  <th style="padding-bottom: 8px; border-bottom: 2px solid #eee; text-align: left; font-size: 13px; text-transform: uppercase; color: #888;">Items</th>
                  <th style="padding-bottom: 8px; border-bottom: 2px solid #eee; text-align: right; font-size: 13px; text-transform: uppercase; color: #888;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsListHtml}
              </tbody>
            </table>

            <!-- Calculation totals -->
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; color: #555;">
              <tbody>
                <tr>
                  <td style="padding: 8px 0; text-align: left;">Subtotal</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">₹${subtotal.toFixed(2)}</td>
                </tr>
                ${discountRowHtml}
                <tr>
                  <td style="padding: 8px 0; text-align: left;">Tax (GST 5%)</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">₹${tax.toFixed(2)}</td>
                </tr>
                <tr style="border-top: 2px solid #5D1E31; font-size: 16px; color: #333; font-weight: bold;">
                  <td style="padding: 12px 0 0 0; text-align: left; font-size: 18px; color: #5D1E31;">Total Paid</td>
                  <td style="padding: 12px 0 0 0; text-align: right; font-size: 18px; color: #5D1E31;">₹${total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #ddd; font-size: 12px; color: #888;">
              <p style="margin: 5px 0;">We hope you enjoyed your meal! See you again soon.</p>
              <p style="margin: 5px 0; font-weight: bold; color: #5D1E31;">OdooCafé Team</p>
            </div>
          </div>
        `,
      });
      return { ok: true };
    } catch (err) {
      console.error("Receipt email SMTP failed:", err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

// ─── Color styling tokens ────────────────────────────────────────────────────
const INK = "oklch(0.1 0.005 264)";
const INK_MID = "oklch(0.45 0.01 264)";
const INK_LIGHT = "oklch(0.55 0.01 264)";
const PAPER = "oklch(0.974 0.005 85)";
const BORDER = "1px solid oklch(0.85 0.01 264)";
const INPUT_BG = "oklch(0.99 0.003 85)";
const WARM_BG = "oklch(0.955 0.006 80)";
const WARM_BORDER = "1px solid oklch(0.88 0.01 80)";
const TAB_BG = "oklch(0.93 0.008 80)";

const btnStyle = { background: INK, color: PAPER } as React.CSSProperties;
const inputStyle = { border: BORDER, background: INPUT_BG, color: INK } as React.CSSProperties;

const CUSTOMER_KEY = "cafe.customer";

function getCustomer(): { name: string; email: string; avatar?: string } | null {
  try {
    return JSON.parse(sessionStorage.getItem(CUSTOMER_KEY) ?? "null");
  } catch {
    return null;
  }
}
function setCustomer(c: { name: string; email: string; avatar?: string } | null) {
  if (c) sessionStorage.setItem(CUSTOMER_KEY, JSON.stringify(c));
  else sessionStorage.removeItem(CUSTOMER_KEY);
}

function LoginPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string; tab?: string };
  // Default to "/" NOT "/pos" so plain /login shows only the Customer tab
  const redirect = search.redirect || "/";

  // Employee & Admin tabs are hidden from public view.
  // They appear only when:
  //   • URL has ?tab=employee or ?tab=admin  (staff bookmark their URL)
  //   • OR the page was reached via a protected redirect (e.g., /pos or /admin route guard)
  const tabParam = search.tab;
  const showEmployeeTab = tabParam === "employee" || redirect.startsWith("/pos");
  const showAdminTab = tabParam === "admin" || redirect.startsWith("/admin");

  const getDefaultTab = (): "customer" | "employee" | "admin" => {
    if (tabParam === "admin" || redirect.startsWith("/admin")) return "admin";
    if (tabParam === "employee" || redirect.startsWith("/pos")) return "employee";
    return "customer";
  };

  const [activeTab, setActiveTab] = useState<"customer" | "employee" | "admin">(getDefaultTab);

  // Auth Store methods
  const { loginWithPassword, registerUser, requestPasswordReset, resetPassword } = usePosAuth();
  const [, setAdminAuthed] = usePersisted<boolean>("bistro.admin.authed", false);

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Signup states
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  // Forget password states
  const [isForgetPassword, setIsForgetPassword] = useState(false);
  const [forgetEmail, setForgetEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [customer, setCustomerState] = useState(getCustomer);

  // Welcome / Thank you modal states
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");

  // Parse Google OAuth redirect hash parameters on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      if (accessToken) {
        fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data && data.name) {
              const c = {
                name: data.name,
                email: data.email,
                avatar:
                  data.picture ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=1a1a2e&color=fff&size=64`,
              };
              setCustomer(c);
              setCustomerState(c);
              window.history.replaceState(null, "", window.location.pathname);
              nav({ to: "/pos/menu" });
            }
          })
          .catch((err: any) => {
            console.error("Google userinfo failed", err);
            toast.error("Failed to log in with Google");
          });
      }
    }
  }, [nav]);

  const handleGoogleSignIn = () => {
    const clientId = "821677291943-2ouai3qri34r03vgj1sjrdmfs3uqajun.apps.googleusercontent.com";
    const redirectUri = window.location.origin + "/login";
    const scope = "email profile openid";
    const responseType = "token";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${encodeURIComponent(scope)}`;
    window.location.href = authUrl;
  };

  const handleSignOut = () => {
    setCustomer(null);
    setCustomerState(null);
    sessionStorage.removeItem("cafe.customer.table");
  };

  // Submit Sign In (Employee & Customer credentials)
  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const r = loginWithPassword(username, password);
    if (!r.ok) {
      setError(r.error || "Login failed");
    } else {
      if (r.user?.role === "customer") {
        const c = { name: r.user.name, email: r.user.email };
        setCustomer(c);
        setCustomerState(c);
        toast.success(`Welcome, ${r.user.name}`);
        nav({ to: "/pos/menu" });
      } else {
        toast.success(`Signed in as ${r.user?.name}`);
        // Employees always go to /pos unless a specific redirect was requested
        const dest = redirect === "/" || redirect === "" ? "/pos" : redirect;
        nav({ to: dest });
      }
    }
  };

  // Submit Admin Login
  const handleAdminSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (username === "Admin" && password === "Admin@123") {
      setAdminAuthed(true);
      toast.success("Welcome, Admin");
      nav({ to: "/admin" });
    } else {
      setError("Invalid admin credentials");
    }
  };

  // Submit Signup
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const role = activeTab === "employee" ? "server" : "customer";
    const r = await registerUser(signupUsername, signupPassword, signupEmail, role);
    if (!r.ok) {
      setError(r.error || "Signup failed");
    } else {
      // Trigger SMTP welcome email asynchronously
      sendSignupWelcomeEmailFn({ data: { email: signupEmail, username: signupUsername } }).catch(
        (err: any) => console.error("Welcome email failed:", err),
      );

      setWelcomeName(signupUsername);
      setShowWelcomeModal(true);

      setUsername(signupUsername);
      setPassword(signupPassword);
      setIsSigningUp(false);
      setSignupUsername("");
      setSignupPassword("");
      setSignupEmail("");
    }
  };

  // Submit request OTP code
  const handleForgetPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const r = requestPasswordReset(forgetEmail);
    if (!r.ok || !r.token) {
      setError("No account found with this Gmail address.");
    } else {
      toast.loading("Sending 6-digit verification code to your Gmail...");
      console.log(`[DEV ONLY] Password reset code generated for ${forgetEmail}:`, r.token);
      const emailResult = await sendOtpEmailFn({ data: { email: forgetEmail, otp: r.token } });
      toast.dismiss();
      if (emailResult.ok) {
        toast.success("Verification code sent to your Gmail.");
        setOtpSent(true);
      } else {
        setError(emailResult.error || "Failed to send email. Check your internet connection.");
      }
    }
  };

  // Submit verify OTP code and change password
  const handleOtpVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const ok = await resetPassword(otpCode, newPassword);
    if (ok) {
      toast.success("Password reset successfully. You can now log in.");
      setIsForgetPassword(false);
      setOtpSent(false);
      setOtpCode("");
      setNewPassword("");
    } else {
      setError("Invalid verification code.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center" style={{ background: PAPER }}>
      <div className="flex-1 grid lg:grid-cols-2">
        {/* Left decorative panel */}
        <div
          className="hidden lg:flex flex-col justify-between p-12"
          style={{ background: INK, color: PAPER }}
        >

          <div className="flex items-center gap-3">
            <Link to="/">
              <img
                src="/Odoocafe white.png"
                alt="OdooCafé"
                className="h-12 w-auto object-contain hover:opacity-80 transition-opacity"
              />
            </Link>
          </div>
          <div>
            <h2
              className="text-4xl font-semibold leading-tight"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              Run your dining room beautifully.
            </h2>
            <p className="mt-4 max-w-md" style={{ opacity: 0.75 }}>
              A modern POS for full-service restaurants — orders, tables, payments, kitchen, and a
              customer-facing display.
            </p>
          </div>
          <div className="text-xs" style={{ opacity: 0.55 }}>
            © OdooCafé Systems
          </div>
        </div>

        {/* Right form panel */}
        <div
          className="flex flex-col items-center justify-center p-6"
          style={{ background: PAPER }}
        >
          <div className="w-full max-w-sm">
            {/* Tab switcher: Customer | Employee | Admin */}
            {/* Employee & Admin tabs are hidden unless explicitly accessed via URL ?tab=employee / ?tab=admin */}
            {!isSigningUp && !isForgetPassword && (showEmployeeTab || showAdminTab) && (
              <div className="flex p-1 rounded-lg mb-8" style={{ background: TAB_BG }}>
                {(["customer", ...(showEmployeeTab ? ["employee"] : []), ...(showAdminTab ? ["admin"] : [])] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab as "customer" | "employee" | "admin");
                      setError("");
                      setUsername("");
                      setPassword("");
                    }}
                    className="flex-1 py-1.5 text-sm font-medium rounded-md transition-all capitalize"
                    style={
                      activeTab === tab
                        ? { background: INK, color: PAPER, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }
                        : { color: INK_MID }
                    }
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}

            {/* ── FORGET PASSWORD VIEW ── */}
            {isForgetPassword ? (
              <div>
                <h1
                  className="text-2xl font-semibold"
                  style={{ fontFamily: "'DM Serif Display', serif", color: INK }}
                >
                  Reset Password
                </h1>
                <p className="text-sm mt-1 mb-6" style={{ color: INK_MID }}>
                  {!otpSent
                    ? "Verify your email to create a new password."
                    : "Enter verification code and your new password."}
                </p>

                {!otpSent ? (
                  <form onSubmit={handleForgetPasswordRequest} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium block" style={{ color: INK_MID }}>
                        Gmail Address
                      </label>
                      <input
                        type="email"
                        required
                        autoFocus
                        value={forgetEmail}
                        onChange={(e) => setForgetEmail(e.target.value)}
                        className="mt-1 w-full rounded-lg px-3 py-2.5"
                        style={inputStyle}
                        placeholder="your-email@gmail.com"
                      />
                    </div>
                    {error && <div className="text-sm text-red-600">{error}</div>}
                    <button className="w-full rounded-lg py-2.5 font-semibold" style={btnStyle}>
                      Send Code
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgetPassword(false);
                        setError("");
                      }}
                      className="w-full text-center text-xs font-semibold hover:underline block pt-2"
                      style={{ color: INK_MID }}
                    >
                      Back to sign in
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleOtpVerifySubmit} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium block" style={{ color: INK_MID }}>
                        6-Digit Verification Code
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        className="mt-1 w-full rounded-lg px-3 py-2.5 text-center tracking-widest font-mono text-lg"
                        style={inputStyle}
                        placeholder="123456"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block" style={{ color: INK_MID }}>
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-1 w-full rounded-lg px-3 py-2.5"
                        style={inputStyle}
                        placeholder="••••••••"
                      />
                    </div>
                    {error && <div className="text-sm text-red-600">{error}</div>}
                    <button className="w-full rounded-lg py-2.5 font-semibold" style={btnStyle}>
                      Reset Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setError("");
                      }}
                      className="w-full text-center text-xs font-semibold hover:underline block pt-2"
                      style={{ color: INK_MID }}
                    >
                      Re-enter email
                    </button>
                  </form>
                )}
              </div>
            ) : isSigningUp ? (
              /* ── SIGN UP VIEW ── */
              <div>
                <h1
                  className="text-2xl font-semibold"
                  style={{ fontFamily: "'DM Serif Display', serif", color: INK }}
                >
                  Sign up
                </h1>
                <p className="text-sm mt-1 mb-6" style={{ color: INK_MID }}>
                  Create a new {activeTab === "employee" ? "Employee" : "Customer"} account.
                </p>

                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium block" style={{ color: INK_MID }}>
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      className="mt-1 w-full rounded-lg px-3 py-2.5"
                      style={inputStyle}
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block" style={{ color: INK_MID }}>
                      Gmail ID
                    </label>
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg px-3 py-2.5"
                      style={inputStyle}
                      placeholder="your-email@gmail.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block" style={{ color: INK_MID }}>
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="mt-1 w-full rounded-lg px-3 py-2.5"
                      style={inputStyle}
                      placeholder="••••••••"
                    />
                  </div>
                  {error && <div className="text-sm text-red-600">{error}</div>}
                  <button className="w-full rounded-lg py-2.5 font-semibold" style={btnStyle}>
                    Sign Up
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSigningUp(false);
                      setError("");
                    }}
                    className="w-full text-center text-xs font-semibold hover:underline block pt-2"
                    style={{ color: INK_MID }}
                  >
                    Already have an account? Sign in
                  </button>
                </form>
              </div>
            ) : (
              /* ── SIGN IN VIEW ── */
              <div>
                <h1
                  className="text-2xl font-semibold"
                  style={{ fontFamily: "'DM Serif Display', serif", color: INK }}
                >
                  {activeTab === "customer"
                    ? "Customer Login"
                    : activeTab === "employee"
                      ? "Employee Login"
                      : "Admin Login"}
                </h1>
                <p className="text-sm mt-1 mb-6" style={{ color: INK_MID }}>
                  {activeTab === "customer"
                    ? "Sign in to browse the menu, place orders, and receive bills."
                    : activeTab === "employee"
                      ? "Sign in using staff credentials."
                      : "Sign in to view analytics & reports."}
                </p>

                {activeTab === "customer" && customer ? (
                  /* Customer logged in with Google info */
                  <div
                    className="rounded-xl p-4 flex flex-col items-center gap-4"
                    style={{ background: WARM_BG, border: WARM_BORDER }}
                  >
                    {customer.avatar && (
                      <img
                        src={customer.avatar}
                        alt={customer.name}
                        className="h-14 w-14 rounded-full object-cover border"
                        style={{ borderColor: "oklch(0.85 0.01 264)" }}
                      />
                    )}
                    <div className="text-center">
                      <div className="font-semibold" style={{ color: INK }}>
                        {customer.name}
                      </div>
                      <div className="text-sm" style={{ color: INK_MID }}>
                        {customer.email}
                      </div>
                    </div>
                    <div className="flex gap-2 w-full mt-2">
                      <button
                        onClick={() => nav({ to: "/pos/menu" })}
                        className="flex-1 rounded-lg py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
                        style={btnStyle}
                      >
                        Order now →
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-black/5 transition-colors border"
                        style={{ borderColor: "oklch(0.85 0.01 264)", color: INK_MID }}
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard form login for credentials */
                  <form
                    onSubmit={activeTab === "admin" ? handleAdminSignInSubmit : handleSignInSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-xs font-medium block" style={{ color: INK_MID }}>
                        Username
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-1 w-full rounded-lg px-3 py-2.5"
                        style={inputStyle}
                        placeholder={activeTab === "admin" ? "admin" : "Enter username"}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block" style={{ color: INK_MID }}>
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 w-full rounded-lg px-3 py-2.5"
                        style={inputStyle}
                        placeholder="••••••••"
                      />
                    </div>
                    {error && <div className="text-sm text-red-600">{error}</div>}
                    <button
                      className="w-full rounded-lg py-2.5 font-semibold hover:opacity-90 transition-opacity"
                      style={btnStyle}
                    >
                      Sign In
                    </button>

                    {/* Action buttons footer */}
                    <div className="flex flex-col gap-2 pt-4 border-t border-dashed mt-6">
                      {activeTab !== "admin" && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsSigningUp(true);
                              setError("");
                            }}
                            className="text-center text-xs font-semibold hover:underline block"
                            style={{ color: INK_MID }}
                          >
                            New user? Sign up here
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsForgetPassword(true);
                              setError("");
                            }}
                            className="text-center text-xs font-semibold hover:underline block"
                            style={{ color: INK_MID }}
                          >
                            Forget password?
                          </button>
                        </>
                      )}
                    </div>
                  </form>
                )}

                {/* Customer Google Login Button Option */}
                {activeTab === "customer" && !customer && (
                  <div className="mt-4 flex flex-col gap-3">
                    <div className="relative flex py-2 items-center">
                      <div
                        className="flex-grow border-t"
                        style={{ borderColor: "oklch(0.85 0.01 264)" }}
                      ></div>
                      <span
                        className="flex-shrink mx-4 text-xs font-medium"
                        style={{ color: INK_LIGHT }}
                      >
                        or
                      </span>
                      <div
                        className="flex-grow border-t"
                        style={{ borderColor: "oklch(0.85 0.01 264)" }}
                      ></div>
                    </div>
                    <button
                      onClick={handleGoogleSignIn}
                      className="w-full inline-flex items-center justify-center gap-3 rounded-xl py-2.5 text-sm font-semibold shadow-sm transition-all hover:shadow-lg active:scale-[0.98] border"
                      style={{
                        background: INPUT_BG,
                        color: INK,
                        borderColor: "oklch(0.85 0.01 264)",
                      }}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── WELCOME / THANK YOU MODAL ── */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-2xl p-8 text-center shadow-2xl relative border animate-in zoom-in-95 duration-200"
            style={{ background: PAPER, borderColor: "oklch(0.85 0.01 264)" }}
          >
            <div className="h-16 w-16 bg-[#5D1E31]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
              🎉
            </div>
            <h2
              className="text-2xl font-bold"
              style={{ fontFamily: "'DM Serif Display', serif", color: INK }}
            >
              Thank You, {welcomeName}!
            </h2>
            <p className="mt-2 text-sm" style={{ color: INK_MID }}>
              Your account has been successfully created. We are excited to serve you!
            </p>

            <div
              className="mt-6 p-4 rounded-xl text-left border"
              style={{ background: WARM_BG, borderColor: "oklch(0.88 0.01 80)" }}
            >
              <div
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: INK_MID }}
              >
                First-Order Welcome Gift
              </div>
              <div className="text-sm font-medium mt-1" style={{ color: INK }}>
                Use coupon code{" "}
                <span className="font-mono bg-[#5D1E31]/10 text-[#5D1E31] px-1.5 py-0.5 rounded font-bold">
                  WELCOME10
                </span>{" "}
                at checkout to get <strong className="text-[#5D1E31]">10% off</strong> your first
                order.
              </div>
            </div>

            <p className="mt-4 text-xs" style={{ color: INK_LIGHT }}>
              A welcome email with your details and coupon code has been sent.
            </p>

            <button
              onClick={() => setShowWelcomeModal(false)}
              className="mt-6 w-full rounded-xl py-3 font-semibold transition-opacity hover:opacity-90"
              style={btnStyle}
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
