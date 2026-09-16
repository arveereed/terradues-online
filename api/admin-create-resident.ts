import type { VercelRequest, VercelResponse } from "@vercel/node";
import admin from "firebase-admin";
import { createPublicKey, verify as verifySignature } from "node:crypto";

function getDb() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw)
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not configured.");
    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(raw) as admin.ServiceAccount,
      ),
    });
  }
  return admin.firestore();
}
function b64url(input: string) {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
async function authenticateAdmin(req: VercelRequest) {
  const secret = process.env.CLERK_SECRET_KEY;
  const adminEmail = process.env.VITE_ADMIN_EMAIL;
  if (!secret || !adminEmail)
    throw new Error("Server admin authentication is not configured.");
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("Unauthorized.");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Unauthorized.");
  const header = JSON.parse(b64url(parts[0]).toString("utf8"));
  const payload = JSON.parse(b64url(parts[1]).toString("utf8"));
  if (header.alg !== "RS256" || !header.kid || !payload.sub)
    throw new Error("Unauthorized.");
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now || payload.nbf > now + 5)
    throw new Error("Session expired.");
  const jwksRes = await fetch("https://api.clerk.com/v1/jwks", {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!jwksRes.ok) throw new Error("Unable to verify admin session.");
  const jwks = (await jwksRes.json()) as {
    keys: Array<JsonWebKey & { kid?: string }>;
  };
  const jwk = jwks.keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("Unauthorized.");
  const key = createPublicKey({ key: jwk as any, format: "jwk" });
  const ok = verifySignature(
    "RSA-SHA256",
    Buffer.from(`${parts[0]}.${parts[1]}`),
    key,
    b64url(parts[2]),
  );
  if (!ok) throw new Error("Unauthorized.");
  const userRes = await fetch(
    `https://api.clerk.com/v1/users/${encodeURIComponent(payload.sub)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  if (!userRes.ok) throw new Error("Unauthorized.");
  const user = (await userRes.json()) as any;
  const emails = (user.email_addresses || []).map((e: any) =>
    String(e.email_address || "").toLowerCase(),
  );
  if (!emails.includes(adminEmail.toLowerCase()))
    throw new Error("Admin access required.");
}
const text = (v: unknown) => String(v ?? "").trim();
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed." });
  let clerkUserId = "";
  try {
    await authenticateAdmin(req);
    const b = req.body ?? {};
    const userType = text(b.userType) as "Owner" | "Renter";
    if (!["Owner", "Renter"].includes(userType))
      return res
        .status(400)
        .json({ success: false, error: "Invalid user type." });
    const required = [
      "firstName",
      "lastName",
      "email",
      "password",
      "contactNumber",
      "gender",
      "phase",
      "block",
      "lot",
      "picture",
    ];
    for (const k of required)
      if (!text(b[k]))
        return res
          .status(400)
          .json({ success: false, error: `${k} is required.` });
    if (text(b.password).length < 8)
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters.",
      });
    if (userType === "Owner" && !text(b.familyMembers))
      return res.status(400).json({
        success: false,
        error: "Number of family members is required.",
      });
    if (
      userType === "Renter" &&
      [
        "ownerName",
        "ownerContactNumber",
        "ownerAddress",
        "ownerNumberOccupants",
      ].some((k) => !text(b[k]))
    )
      return res.status(400).json({
        success: false,
        error: "Complete all homeowner details for the renter.",
      });
    const secret = process.env.CLERK_SECRET_KEY!;
    const createRes = await fetch("https://api.clerk.com/v1/users", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: [text(b.email).toLowerCase()],
        password: text(b.password),
        first_name: text(b.firstName),
        last_name: text(b.lastName),
      }),
    });
    const created = (await createRes.json()) as any;
    if (!createRes.ok) {
      const msg =
        created?.errors?.[0]?.long_message ||
        created?.errors?.[0]?.message ||
        created?.message ||
        "Clerk could not create the resident account.";
      return res.status(createRes.status).json({ success: false, error: msg });
    }
    clerkUserId = created.id;
    const first = text(b.firstName),
      middle = text(b.middleName),
      last = text(b.lastName);
    const data: any = {
      userType,
      user_id: clerkUserId,
      firstName: first,
      middleName: middle,
      lastName: last,
      fullName: [first, middle, last].filter(Boolean).join(" "),
      email: text(b.email).toLowerCase(),
      contactNumber: text(b.contactNumber),
      gender: text(b.gender),
      phase: text(b.phase),
      block: text(b.block),
      lot: text(b.lot),
      address: `Blk ${text(b.block)} Lot ${text(b.lot)} Phase ${text(b.phase)}`,
      picture: text(b.picture),
      document: text(b.document) || null,
      role: "resident",
      approvalStatus: "approved",
      accountStatus: "active",
      createdByAdmin: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };
    if (userType === "Owner") {
      data.familyMembers = text(b.familyMembers);
      data.forRent = false;
    } else {
      data.ownerName = text(b.ownerName);
      data.ownerContactNumber = text(b.ownerContactNumber);
      data.ownerAddress = text(b.ownerAddress);
      data.ownerNumberOccupants = text(b.ownerNumberOccupants);
    }
    await getDb().collection("users").doc(clerkUserId).set(data);
    return res.status(201).json({ success: true, userId: clerkUserId });
  } catch (error) {
    console.error("Admin create resident failed:", error);
    if (clerkUserId) {
      try {
        await fetch(
          `https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
            },
          },
        );
      } catch {}
    }
    const msg =
      error instanceof Error ? error.message : "Failed to create resident.";
    const status = /Unauthorized|Admin access|required|expired/i.test(msg)
      ? 401
      : 500;
    return res.status(status).json({ success: false, error: msg });
  }
}
