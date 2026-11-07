import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { createClerkClient } from "@clerk/backend";
import * as logger from "firebase-functions/logger";

initializeApp();
const clerkSecret = defineSecret("CLERK_SECRET_KEY");
const PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

/** Deletes denied registrations after the 7-day correction window. */
export const cleanupExpiredDeniedRegistrations = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "Asia/Manila",
    region: "asia-southeast1",
    secrets: [clerkSecret],
    timeoutSeconds: 540,
  },
  async () => {
    const db = getFirestore();
    const clerk = createClerkClient({ secretKey: clerkSecret.value() });
    const denied = await db
      .collection("users")
      .where("approvalStatus", "==", "denied")
      .get();

    for (const item of denied.docs) {
      try {
        const data = item.data();
        if (
          data.role !== "resident" ||
          !["Owner", "Renter"].includes(data.userType)
        )
          continue;
        const deniedAt = data.deniedAt;
        if (
          !(deniedAt instanceof Timestamp) ||
          Date.now() < deniedAt.toMillis() + PERIOD_MS
        )
          continue;

        // Re-read before deletion to avoid acting on a stale query result.
        const latest = await item.ref.get();
        const current = latest.data();
        if (
          !current ||
          current.approvalStatus !== "denied" ||
          !(current.deniedAt instanceof Timestamp) ||
          Date.now() < current.deniedAt.toMillis() + PERIOD_MS
        )
          continue;

        const clerkId = current.user_id;
        if (typeof clerkId !== "string" || !clerkId || clerkId !== item.id) {
          logger.error("Invalid Clerk user ID; skipped", { id: item.id });
          continue;
        }
        try {
          await clerk.users.deleteUser(clerkId);
        } catch (err: unknown) {
          // A missing Clerk user is safe to treat as already deleted.
          const status = (err as { status?: number })?.status;
          if (status !== 404) throw err;
        }
        // Only remove the Firestore record if it is still denied.
        // Clerk deletion revokes the resident's ability to resubmit.
        const finalSnap = await item.ref.get();
        if (finalSnap.data()?.approvalStatus === "denied") {
          await item.ref.delete();
          logger.info("Expired denied registration removed", { id: item.id });
        }
      } catch (err) {
        logger.error("Failed to clean up denied registration", {
          id: item.id,
          err,
        });
      }
    }
  },
);
