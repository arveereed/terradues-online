import crypto from "node:crypto";
import type { Request, RequestHandler } from "express";
import { verifyToken } from "@clerk/backend";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const number = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const paid = (row: Record<string, any>) =>
  clean(row.status).toLowerCase() === "paid";

const getEnv = () => ({
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  paymongoSecretKey: process.env.PAYMONGO_SECRET_KEY ?? "",
  paymongoWebhookSecret: process.env.PAYMONGO_WEBHOOK_SECRET ?? "",
  frontendUrl: (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(
    /\/$/,
    "",
  ),
});

async function residentIdFromBearer(req: Request) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) throw new Error("AUTH_REQUIRED");
  const token = authorization.slice(7).trim();
  const { clerkSecretKey } = getEnv();
  if (!clerkSecretKey) throw new Error("CLERK_SECRET_KEY is missing.");
  const verified = await verifyToken(token, { secretKey: clerkSecretKey });
  if (!verified.sub) throw new Error("AUTH_REQUIRED");
  return verified.sub;
}

function parsePaymongoSignature(header: string) {
  const result: Record<string, string> = {};
  for (const part of header.split(",")) {
    const [key, ...rest] = part.trim().split("=");
    if (key) result[key] = rest.join("=");
  }
  return result;
}

function safeEqualHex(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export const createPaymongoCheckoutHandler: RequestHandler = async (
  req,
  res,
) => {
  try {
    const db = getFirestore();
    const { paymongoSecretKey, frontendUrl } = getEnv();
    if (!paymongoSecretKey)
      throw new Error("PAYMONGO_SECRET_KEY is missing from server/.env");

    const residentId = await residentIdFromBearer(req);
    const requestedMonthKey = clean(req.body?.monthKey);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonthKey)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid billing month." });
      return;
    }

    const residentRef = db.collection("users").doc(residentId);
    const residentSnap = await residentRef.get();
    if (!residentSnap.exists) {
      res
        .status(404)
        .json({ success: false, message: "Resident was not found." });
      return;
    }

    const resident = residentSnap.data() as Record<string, any>;
    if (clean(resident.approvalStatus).toLowerCase() !== "approved") {
      res.status(403).json({
        success: false,
        message: "Only approved residents can pay online.",
      });
      return;
    }

    const history: Record<string, any>[] = Array.isArray(
      resident.paymentHistory,
    )
      ? [...resident.paymentHistory]
      : [];
    // Do not require this to be the physically newest Firestore row. Demo Clock
    // may have created future rows that are intentionally preserved. Pay the
    // exact month selected by TerraDues' existing billing clock.
    const targetBill = history.find(
      (row) => clean(row.monthKey) === requestedMonthKey,
    );

    if (!targetBill) {
      res.status(409).json({
        success: false,
        message: "Your billing record changed. Refresh the page and try again.",
      });
      return;
    }

    const amount = Math.max(0, number(targetBill.remainingBalance));
    if (paid(targetBill) || amount <= 0) {
      res
        .status(409)
        .json({ success: false, message: "This bill is already paid." });
      return;
    }

    const amountCentavos = Math.round(amount * 100);
    const transactionId = `TD-${residentId.slice(-8)}-${requestedMonthKey.replace("-", "")}-${Date.now()}`;
    const transactionRef = db
      .collection("paymentTransactions")
      .doc(transactionId);
    const now = Timestamp.now();

    await transactionRef.set({
      id: transactionId,
      residentId,
      userId: clean(resident.user_id) || residentId,
      monthKey: requestedMonthKey,
      monthLabel: clean(targetBill.monthLabel) || requestedMonthKey,
      amount,
      amountCentavos,
      currency: "PHP",
      provider: "paymongo",
      status: "creating_checkout",
      createdAt: now,
      updatedAt: now,
    });

    const paymongoResponse = await fetch(
      "https://api.paymongo.com/v2/checkout_sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${paymongoSecretKey}:`).toString("base64")}`,
          "Content-Type": "application/json",
          "Idempotency-Key": transactionId,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              line_items: [
                {
                  name: `TerraDues - ${clean(targetBill.monthLabel) || requestedMonthKey}`,
                  description: "Residential monthly dues",
                  amount: amountCentavos,
                  currency: "PHP",
                  quantity: 1,
                },
              ],
              payment_method_types: ["card", "gcash", "paymaya", "qrph"],
              success_url: `${frontendUrl}/app/payment-history?payment=success`,
              cancel_url: `${frontendUrl}/app/payment-history?payment=cancelled`,
              reference_number: transactionId,
              description: `TerraDues payment for ${clean(targetBill.monthLabel) || requestedMonthKey}`,
              send_email_receipt: true,
              metadata: {
                transactionId,
                residentId,
                monthKey: requestedMonthKey,
              },
            },
          },
        }),
      },
    );

    const data = (await paymongoResponse.json().catch(() => ({}))) as Record<
      string,
      any
    >;
    if (!paymongoResponse.ok) {
      await transactionRef.update({
        status: "checkout_failed",
        paymongoError: data,
        updatedAt: Timestamp.now(),
      });
      res.status(502).json({
        success: false,
        message:
          clean(data?.errors?.[0]?.detail) ||
          "PayMongo could not create the checkout session.",
      });
      return;
    }

    const checkoutSessionId = clean(data?.data?.id);
    const checkoutUrl = clean(data?.data?.attributes?.checkout_url);
    if (!checkoutSessionId || !checkoutUrl)
      throw new Error("PayMongo returned an incomplete checkout session.");

    await transactionRef.update({
      status: "pending",
      paymongoCheckoutSessionId: checkoutSessionId,
      checkoutUrl,
      updatedAt: Timestamp.now(),
    });

    res.status(201).json({ success: true, transactionId, checkoutUrl });
  } catch (error) {
    console.error("Create PayMongo checkout failed:", error);
    const auth = error instanceof Error && error.message === "AUTH_REQUIRED";
    res.status(auth ? 401 : 500).json({
      success: false,
      message: auth
        ? "Authentication required."
        : error instanceof Error
          ? error.message
          : "Unable to start payment.",
    });
  }
};

export const paymongoWebhookHandler: RequestHandler = async (req, res) => {
  try {
    const db = getFirestore();
    const { paymongoWebhookSecret, paymongoSecretKey } = getEnv();
    if (!paymongoWebhookSecret)
      throw new Error("PAYMONGO_WEBHOOK_SECRET is missing.");
    if (!Buffer.isBuffer(req.body)) {
      res
        .status(400)
        .json({ success: false, message: "Webhook body must be raw." });
      return;
    }

    const rawBody = req.body.toString("utf8");
    const parts = parsePaymongoSignature(
      String(req.headers["paymongo-signature"] ?? ""),
    );
    const timestamp = parts.t;
    const supplied = paymongoSecretKey.startsWith("sk_live_")
      ? parts.li
      : parts.te;
    if (!timestamp || !supplied) {
      res
        .status(401)
        .json({ success: false, message: "Missing PayMongo signature." });
      return;
    }

    const expected = crypto
      .createHmac("sha256", paymongoWebhookSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    if (!safeEqualHex(expected, supplied)) {
      res
        .status(401)
        .json({ success: false, message: "Invalid PayMongo signature." });
      return;
    }

    const envelope = JSON.parse(rawBody) as Record<string, any>;
    const event = envelope.data as Record<string, any> | undefined;

    // PayMongo webhook payloads use an Event wrapper. Current payloads put
    // the event name/resource under data.attributes, while some Checkout
    // payload examples expose them directly under data. Support both shapes.
    const eventAttributes = event?.attributes as
      | Record<string, any>
      | undefined;
    const eventType = clean(eventAttributes?.type) || clean(event?.type);

    console.log("PayMongo webhook received:", {
      eventId: clean(event?.id),
      eventType,
      livemode: eventAttributes?.livemode ?? event?.livemode,
    });

    if (eventType !== "checkout_session.payment.paid") {
      res.status(200).json({ success: true, ignored: true, eventType });
      return;
    }

    const session = (eventAttributes?.data ?? event?.data) as
      | Record<string, any>
      | undefined;
    const sessionId = clean(session?.id);
    const attributes = session?.attributes as Record<string, any> | undefined;
    const transactionId = clean(attributes?.reference_number);
    if (!sessionId || !transactionId) {
      res
        .status(400)
        .json({ success: false, message: "Invalid checkout payload." });
      return;
    }

    const eventId =
      clean(event?.id) ||
      crypto
        .createHash("sha256")
        .update(`${sessionId}:${rawBody}`)
        .digest("hex");
    const eventRef = db.collection("paymongoWebhookEvents").doc(eventId);
    const paymentRef = db.collection("paymentTransactions").doc(transactionId);

    await db.runTransaction(async (tx) => {
      const eventSnap = await tx.get(eventRef);
      if (eventSnap.exists) return;

      const paymentSnap = await tx.get(paymentRef);
      if (!paymentSnap.exists)
        throw new Error("Payment transaction was not found.");
      const paymentTx = paymentSnap.data() as Record<string, any>;

      if (paymentTx.status === "paid") {
        tx.set(eventRef, {
          type: eventType,
          transactionId,
          duplicate: true,
          processedAt: Timestamp.now(),
        });
        return;
      }
      if (clean(paymentTx.paymongoCheckoutSessionId) !== sessionId) {
        throw new Error("Checkout session does not match the transaction.");
      }

      const payments = Array.isArray(attributes?.payments)
        ? attributes.payments
        : [];
      const successfulPayment = payments.find(
        (p: any) => clean(p?.attributes?.status).toLowerCase() === "paid",
      );
      const actualCentavos = number(successfulPayment?.attributes?.amount);
      const expectedCentavos = number(paymentTx.amountCentavos);
      if (!successfulPayment || actualCentavos !== expectedCentavos) {
        throw new Error("Verified PayMongo amount does not match TerraDues.");
      }

      const residentId = clean(paymentTx.residentId);
      const residentRef = db.collection("users").doc(residentId);
      const residentSnap = await tx.get(residentRef);
      if (!residentSnap.exists) throw new Error("Resident was not found.");
      const resident = residentSnap.data() as Record<string, any>;
      const history: Record<string, any>[] = Array.isArray(
        resident.paymentHistory,
      )
        ? [...resident.paymentHistory]
        : [];
      const targetIndex = history.findIndex(
        (row) => clean(row.monthKey) === clean(paymentTx.monthKey),
      );
      if (targetIndex < 0) throw new Error("Billing month was not found.");

      const target = history[targetIndex];
      const totalDue = number(target.totalDue, number(paymentTx.amount));
      const remainingBeforePayment = Math.max(
        0,
        number(target.remainingBalance, totalDue - number(target.collection)),
      );
      if (Math.round(remainingBeforePayment * 100) !== expectedCentavos) {
        throw new Error(
          "The resident bill changed after checkout was created.",
        );
      }

      const paidAt = Timestamp.now();
      // datePaid is the real date PayMongo confirmed the payment. Demo Clock
      // selects which billing month is being tested; it must not spoof the
      // provider payment timestamp.
      const paidDate = new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
      })
        .format(new Date())
        .replaceAll("/", "-");

      history[targetIndex] = {
        ...target,
        collection: Math.min(
          totalDue,
          number(target.collection) + number(paymentTx.amount),
        ),
        remainingBalance: 0,
        status: "Paid",
        datePaid: paidDate,
        updatedAt: paidAt,
      };
      history.sort((a, b) =>
        clean(b.monthKey).localeCompare(clean(a.monthKey)),
      );
      const paidMonth =
        history.find(
          (row) => clean(row.monthKey) === clean(paymentTx.monthKey),
        ) ?? history[targetIndex];

      // Update only the month that this verified transaction paid. The existing
      // TerraDues billing initializer remains responsible for reconciling any
      // later Demo Clock months on the next resident/admin refetch.
      tx.update(residentRef, {
        paymentHistory: history,
        paymentStatus: "Paid",
        paymentDate: clean(paidMonth?.datePaid),
        currentMonthDue: number(paidMonth?.totalDue),
        remainingBalance: 0,
        updatedAt: paidAt,
      });

      tx.update(paymentRef, {
        status: "paid",
        paidAt,
        providerPaymentId: clean(successfulPayment.id),
        paymentMethod: clean(successfulPayment?.attributes?.source?.type),
        updatedAt: paidAt,
      });

      tx.set(eventRef, {
        type: eventType,
        checkoutSessionId: sessionId,
        transactionId,
        processedAt: paidAt,
      });
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("PayMongo webhook failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Webhook processing failed." });
  }
};
