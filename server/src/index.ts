import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClerkClient, verifyToken } from "@clerk/backend";
import {
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

if (!clerkSecretKey) {
  throw new Error("CLERK_SECRET_KEY is missing from server/.env");
}
if (!adminEmail) {
  throw new Error("ADMIN_EMAIL is missing from server/.env");
}

const clerk = createClerkClient({ secretKey: clerkSecretKey });

const requireAdmin: express.RequestHandler = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required." });
      return;
    }

    const token = authorization.slice(7).trim();
    if (!token) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required." });
      return;
    }

    const verifiedToken = await verifyToken(token, {
      secretKey: clerkSecretKey,
    });
    const clerkUserId = verifiedToken.sub;
    if (!clerkUserId) {
      res
        .status(401)
        .json({ success: false, message: "Invalid authentication token." });
      return;
    }

    const authenticatedUser = await clerk.users.getUser(clerkUserId);
    const primaryEmail =
      authenticatedUser.emailAddresses.find(
        (email) => email.id === authenticatedUser.primaryEmailAddressId,
      )?.emailAddress ?? authenticatedUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail || primaryEmail.trim().toLowerCase() !== adminEmail) {
      res
        .status(403)
        .json({ success: false, message: "Admin access required." });
      return;
    }

    res.locals.adminUserId = clerkUserId;
    res.locals.adminEmail = primaryEmail;
    next();
  } catch (error) {
    console.error("Admin authentication failed:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceAccountPath = join(__dirname, "../firebase-service-account.json");
const serviceAccount = JSON.parse(
  readFileSync(serviceAccountPath, "utf8"),
) as ServiceAccount;

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

const allowedOrigins = [
  "http://localhost:5173",
  "https://terradues-online.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // such as Render health checks and server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res
    .status(200)
    .json({ success: true, message: "TerraDues backend is running." });
});

app.get("/health/firebase", async (_req, res) => {
  try {
    const snapshot = await db.collection("users").limit(1).get();
    res.status(200).json({
      success: true,
      message: "Firebase Admin is connected to TerraDues Firestore.",
      connectionTest: "passed",
      documentsRead: snapshot.size,
    });
  } catch (error) {
    console.error("Firebase Admin connection test failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Firebase Admin connection failed." });
  }
});

app.get("/health/clerk", async (_req, res) => {
  try {
    await clerk.users.getUserList({ limit: 1 });
    res.status(200).json({
      success: true,
      message: "Clerk backend is connected successfully.",
      connectionTest: "passed",
    });
  } catch (error) {
    console.error("Clerk connection test failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Clerk backend connection failed." });
  }
});

app.get("/api/admin/test", requireAdmin, (_req, res) => {
  res
    .status(200)
    .json({ success: true, message: "Admin authentication successful." });
});

type ResidentPayload = {
  userType?: unknown;
  firstName?: unknown;
  middleName?: unknown;
  lastName?: unknown;
  email?: unknown;
  password?: unknown;
  contactNumber?: unknown;
  gender?: unknown;
  phase?: unknown;
  block?: unknown;
  lot?: unknown;
  familyMembers?: unknown;
  ownerName?: unknown;
  ownerContactNumber?: unknown;
  ownerAddress?: unknown;
  ownerNumberOccupants?: unknown;
  picture?: unknown;
  document?: unknown;
};

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const nameRe = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^09\d{9}$/;
const positiveIntegerRe = /^[1-9]\d*$/;

function validateResident(body: ResidentPayload): string | null {
  const userType = text(body.userType);
  const firstName = text(body.firstName);
  const middleName = text(body.middleName);
  const lastName = text(body.lastName);
  const email = text(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const contactNumber = text(body.contactNumber);
  const gender = text(body.gender);
  const phase = text(body.phase);
  const block = text(body.block);
  const lot = text(body.lot);
  const picture = text(body.picture);

  if (userType !== "Owner" && userType !== "Renter")
    return "Invalid user type.";
  if (firstName.length < 2 || !nameRe.test(firstName))
    return "Invalid first name.";
  if (middleName && (middleName.length < 2 || !nameRe.test(middleName)))
    return "Invalid middle name.";
  if (lastName.length < 2 || !nameRe.test(lastName))
    return "Invalid last name.";
  if (!emailRe.test(email)) return "Enter a valid email address.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!phoneRe.test(contactNumber))
    return "Contact number must be an 11-digit number starting with 09.";
  if (!gender) return "Gender is required.";
  if (!positiveIntegerRe.test(phase)) return "Phase must be greater than 0.";
  if (!positiveIntegerRe.test(block)) return "Block must be greater than 0.";
  if (!positiveIntegerRe.test(lot)) return "Lot must be greater than 0.";
  if (!picture) return "Valid Government ID is required.";

  if (userType === "Owner") {
    if (!positiveIntegerRe.test(text(body.familyMembers))) {
      return "Number of family members must be greater than 0.";
    }
  } else {
    const ownerName = text(body.ownerName);
    if (ownerName.length < 2 || !nameRe.test(ownerName))
      return "Invalid owner's name.";
    if (!phoneRe.test(text(body.ownerContactNumber)))
      return "Invalid owner's contact number.";
    if (!text(body.ownerAddress)) return "Owner's address is required.";
    if (!positiveIntegerRe.test(text(body.ownerNumberOccupants))) {
      return "Number of occupants must be greater than 0.";
    }
  }

  return null;
}

function clerkErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      errors?: Array<{ longMessage?: string; message?: string }>;
      message?: string;
    };
    const first = candidate.errors?.[0];
    if (first?.longMessage) return first.longMessage;
    if (first?.message) return first.message;
    if (candidate.message) return candidate.message;
  }
  return "Failed to create Clerk account.";
}

app.post("/api/admin/residents", requireAdmin, async (req, res) => {
  const body = (req.body ?? {}) as ResidentPayload;
  const validationError = validateResident(body);
  if (validationError) {
    res.status(400).json({ success: false, message: validationError });
    return;
  }

  const email = text(body.email).toLowerCase();
  const firstName = text(body.firstName);
  const middleName = text(body.middleName);
  const lastName = text(body.lastName);
  const userType = text(body.userType) as "Owner" | "Renter";

  // Firestore duplicate check. Clerk also enforces unique email addresses.
  const existing = await db
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();
  if (!existing.empty) {
    res.status(409).json({
      success: false,
      message: "A resident with this email already exists.",
    });
    return;
  }

  let createdClerkUserId: string | null = null;

  try {
    const createdUser = await clerk.users.createUser({
      emailAddress: [email],
      password: typeof body.password === "string" ? body.password : "",
      firstName,
      lastName,
      publicMetadata: { role: "resident" },
    });

    createdClerkUserId = createdUser.id;
    const now = Timestamp.now();

    const residentData: Record<string, unknown> = {
      user_id: createdUser.id,
      clerkUserId: createdUser.id,
      role: "resident",
      approvalStatus: "approved",
      accountStatus: "active",
      createdByAdmin: true,
      firstName,
      middleName,
      lastName,
      email,
      contactNumber: text(body.contactNumber),
      gender: text(body.gender),
      userType,
      phase: text(body.phase),
      block: text(body.block),
      lot: text(body.lot),
      address: `Block ${text(body.block)} Lot ${text(body.lot)} Phase ${text(body.phase)}`,
      picture: text(body.picture),
      document: text(body.document) || null,
      createdAt: now,
      updatedAt: now,
      approvedAt: now,
      approvedBy: res.locals.adminUserId,
    };

    if (userType === "Owner") {
      residentData.familyMembers = text(body.familyMembers);
      residentData.ownerName = "";
      residentData.ownerContactNumber = "";
      residentData.ownerAddress = "";
      residentData.ownerNumberOccupants = "";
    } else {
      residentData.familyMembers = "";
      residentData.ownerName = text(body.ownerName);
      residentData.ownerContactNumber = text(body.ownerContactNumber);
      residentData.ownerAddress = text(body.ownerAddress);
      residentData.ownerNumberOccupants = text(body.ownerNumberOccupants);
    }

    await db.collection("users").doc(createdUser.id).set(residentData);

    res.status(201).json({
      success: true,
      message: "Resident account created successfully.",
      residentId: createdUser.id,
    });
  } catch (error) {
    console.error("Create resident failed:", error);

    if (createdClerkUserId) {
      try {
        await clerk.users.deleteUser(createdClerkUserId);
        console.log(`Rolled back Clerk user ${createdClerkUserId}.`);
      } catch (rollbackError) {
        console.error("Failed to roll back Clerk user:", rollbackError);
      }
    }

    const message = clerkErrorMessage(error);
    const lower = message.toLowerCase();
    const status =
      lower.includes("already") ||
      lower.includes("taken") ||
      lower.includes("exists")
        ? 409
        : 500;
    res.status(status).json({ success: false, message });
  }
});

app.listen(PORT, () => {
  console.log(`TerraDues backend running on http://localhost:${PORT}`);
});
