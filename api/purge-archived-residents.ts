import type { VercelRequest, VercelResponse } from "@vercel/node";

import admin from "firebase-admin";

function getAdminDb() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!raw) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not configured.");
    }

    let serviceAccount: admin.ServiceAccount;

    try {
      serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY contains invalid JSON.");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  return admin.firestore();
}

async function deleteClerkUser(clerkUserId: string) {
  const secret = process.env.CLERK_SECRET_KEY;

  if (!secret) {
    throw new Error("CLERK_SECRET_KEY is not configured.");
  }

  const response = await fetch(
    `https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`,
    {
      method: "DELETE",

      headers: {
        Authorization: `Bearer ${secret}`,
      },
    },
  );

  /*
   * 404 means the Clerk account was already removed.
   * Firestore cleanup can still safely continue.
   */
  if (!response.ok && response.status !== 404) {
    const body = await response.text();

    throw new Error(`Clerk deletion failed (${response.status}): ${body}`);
  }
}

async function deleteResidentNotifications(
  db: admin.firestore.Firestore,
  firestoreResidentId: string,
  clerkUserId: string,
) {
  const results = await Promise.all([
    db
      .collection("notifications")
      .where("residentId", "==", firestoreResidentId)
      .get(),

    db.collection("notifications").where("userId", "==", clerkUserId).get(),
  ]);

  /*
   * A notification could match both queries.
   * Map by path prevents duplicate batch deletes.
   */
  const documentReferences = new Map<
    string,
    admin.firestore.DocumentReference
  >();

  results.forEach((snapshot) => {
    snapshot.docs.forEach((documentSnapshot) => {
      documentReferences.set(documentSnapshot.ref.path, documentSnapshot.ref);
    });
  });

  if (documentReferences.size === 0) {
    return;
  }

  /*
   * Keep each batch safely below Firestore's
   * maximum number of writes per batch.
   */
  let batch = db.batch();
  let operations = 0;

  for (const reference of documentReferences.values()) {
    batch.delete(reference);

    operations += 1;

    if (operations >= 400) {
      await batch.commit();

      batch = db.batch();
      operations = 0;
    }
  }

  if (operations > 0) {
    await batch.commit();
  }
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  /*
   * Vercel Cron invokes this endpoint using GET.
   */
  if (request.method !== "GET") {
    return response.status(405).json({
      success: false,
      error: "Method not allowed.",
    });
  }

  /*
   * Protect the endpoint with CRON_SECRET.
   *
   * Configure the same CRON_SECRET in Vercel.
   */
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return response.status(500).json({
      success: false,
      error: "CRON_SECRET is not configured.",
    });
  }

  const authorization = request.headers.authorization;

  if (authorization !== `Bearer ${cronSecret}`) {
    return response.status(401).json({
      success: false,
      error: "Unauthorized.",
    });
  }

  try {
    const db = getAdminDb();

    const now = admin.firestore.Timestamp.now();

    /*
     * Only archived users are considered.
     *
     * We compare scheduledDeletionAt in application code
     * so we don't require a compound Firestore index.
     */
    const archivedSnapshot = await db
      .collection("users")
      .where("accountStatus", "==", "archived")
      .get();

    const expiredResidents = archivedSnapshot.docs.filter(
      (documentSnapshot) => {
        const resident = documentSnapshot.data();

        const deletionTimestamp = resident.scheduledDeletionAt;

        if (!deletionTimestamp) {
          return false;
        }

        if (typeof deletionTimestamp.toMillis !== "function") {
          return false;
        }

        return deletionTimestamp.toMillis() <= now.toMillis();
      },
    );

    let permanentlyDeleted = 0;

    const failures: Array<{
      residentId: string;
      error: string;
    }> = [];

    for (const residentDocument of expiredResidents) {
      try {
        const resident = residentDocument.data();

        /*
         * TerraDues stores the Clerk user ID as user_id.
         *
         * The Firestore document ID is also used as a
         * fallback because existing TerraDues records
         * commonly use the Clerk ID as the document ID.
         */
        const clerkUserId = String(resident.user_id || residentDocument.id);

        /*
         * Delete Clerk authentication first.
         *
         * If this fails, Firestore is intentionally
         * retained so the cleanup can retry later.
         */
        await deleteClerkUser(clerkUserId);

        /*
         * Remove resident notifications.
         */
        await deleteResidentNotifications(db, residentDocument.id, clerkUserId);

        /*
         * paymentHistory is stored in the resident
         * document in the current TerraDues flow.
         *
         * Deleting this user document therefore also
         * removes the embedded payment history.
         */
        await residentDocument.ref.delete();

        permanentlyDeleted += 1;
      } catch (error) {
        console.error(
          `Failed to permanently delete ${residentDocument.id}:`,
          error,
        );

        failures.push({
          residentId: residentDocument.id,

          error:
            error instanceof Error
              ? error.message
              : "Unknown permanent deletion error.",
        });
      }
    }

    return response.status(200).json({
      success: true,

      archivedResidentsChecked: archivedSnapshot.size,

      expiredResidents: expiredResidents.length,

      permanentlyDeleted,

      failures,
    });
  } catch (error) {
    console.error("Resident archive cleanup failed:", error);

    return response.status(500).json({
      success: false,

      error:
        error instanceof Error
          ? error.message
          : "Resident archive cleanup failed.",
    });
  }
}
