import { useState } from "react";
import { createReleaseStateFromCheckoutSession } from "../domain/evidence";
import { createReleaseRoomStore } from "../domain/store";
import {
  createCheckoutSession,
  readCheckoutSession,
  retryPayment,
  submitPaymentWithLostResponse,
  writeCheckoutSession,
  type CheckoutRetryMode,
  type CheckoutSession,
} from "./sandbox";

interface CheckoutSandboxProps {
  readonly storage: Storage;
}

export function CheckoutSandbox({ storage }: CheckoutSandboxProps) {
  const [session, setSession] = useState<CheckoutSession>(() =>
    readCheckoutSession(storage),
  );
  const [handoffStatus, setHandoffStatus] = useState<
    "idle" | "sent" | "blocked"
  >("idle");

  const updateSession = (
    transition: (current: CheckoutSession) => CheckoutSession,
  ) => {
    setSession((current) => {
      const next = transition(current);
      writeCheckoutSession(storage, next);
      return next;
    });
  };

  const submit = () => {
    updateSession(submitPaymentWithLostResponse);
    setHandoffStatus("idle");
  };

  const retry = (mode: CheckoutRetryMode) => {
    updateSession((current) => retryPayment(current, mode));
    setHandoffStatus("idle");
  };

  const sendEvidence = () => {
    if (session.status !== "completed") return;
    const store = createReleaseRoomStore(storage);
    const existing = store.getState();
    const hasExistingReview =
      existing.stateVersion !== 12 ||
      existing.proposals.length > 0 ||
      existing.verifications.length > 0 ||
      existing.activity.length > 0 ||
      existing.humanDecision !== "pending";
    if (hasExistingReview) {
      setHandoffStatus("blocked");
      return;
    }
    store.setState(createReleaseStateFromCheckoutSession(session));
    setHandoffStatus("sent");
  };

  const reset = () => {
    const next = createCheckoutSession();
    writeCheckoutSession(storage, next);
    setSession(next);
    setHandoffStatus("idle");
  };

  const statusMessage =
    handoffStatus === "sent"
      ? "Evidence session sent. Release Evidence Room will load this exact checkout trace."
      : handoffStatus === "blocked"
        ? "The existing review has activity, so its evidence and audit trail were not replaced. Open the Release Evidence Room and explicitly reset the demo before starting a new review."
        : session.status === "response_lost"
          ? "Response lost after acceptance. Choose a retry mode."
          : session.status === "completed"
            ? `${session.observedSideEffects} side effects observed. Evidence is ready for review.`
            : "";

  return (
    <main className="checkout-shell">
      <header className="checkout-header">
        <div>
          <p className="eyebrow">PUBLIC, FICTIONAL TEST TARGET</p>
          <h1>Checkout QA Sandbox</h1>
          <p className="tagline">Generate evidence. Review the same session.</p>
        </div>
        <div className="sandbox-safety">
          <strong>No real payment</strong>
          <span>No account · no card · no network service · browser-local state</span>
        </div>
      </header>

      <section className="checkout-grid" aria-label="Checkout test flow">
        <article className="panel checkout-cart">
          <p className="panel-kicker">01 · TEST CART</p>
          <h2>QA Runner</h2>
          <div className="cart-item">
            <div className="product-mark" aria-hidden="true">QA</div>
            <div>
              <strong>Retry-safe checkout fixture</strong>
              <p>One fictional item · one payment intent</p>
            </div>
            <span>$42.00</span>
          </div>
          <dl className="checkout-meta">
            <div><dt>Session</dt><dd>{session.sessionId}</dd></div>
            <div><dt>Intent</dt><dd>intent_8421</dd></div>
            <div><dt>Route</dt><dd>route_7f3c</dd></div>
          </dl>
        </article>

        <article className="panel checkout-runner">
          <p className="panel-kicker">02 · CONTROLLED FAILURE</p>
          <h2>Response-loss retry</h2>
          {session.status === "ready" && (
            <>
              <p>The server will accept the first request, but the browser will not receive its response.</p>
              <button className="primary-action" type="button" onClick={submit}>
                Place order · lose response
              </button>
            </>
          )}
          {session.status === "response_lost" && (
            <>
              <p className="sandbox-alert">Response lost after acceptance</p>
              <p>Choose how the client retries the same payment intent.</p>
              <div className="button-row">
                <button className="primary-action" type="button" onClick={() => retry("reuse_key")}>
                  Retry with the same key
                </button>
                <button className="danger-action" type="button" onClick={() => retry("new_key")}>
                  Retry with a new key
                </button>
              </div>
            </>
          )}
          {session.status === "completed" && (
            <>
              <p
                className={`sandbox-result sandbox-result-${session.observedSideEffects === 1 ? "safe" : "risk"}`}
              >
                {session.observedSideEffects} side effects observed
              </p>
              <p>
                {session.observedSideEffects === 1
                  ? "The stable key resolved to the original operation."
                  : "A new key created a second accepted operation for the same intent."}
              </p>
              <div className="button-row">
                <button className="primary-action" type="button" onClick={sendEvidence}>
                  Send evidence to Release Room
                </button>
                <button className="secondary-action" type="button" onClick={reset}>
                  Reset sandbox
                </button>
              </div>
            </>
          )}
        </article>
      </section>

      <section className="panel checkout-trace" aria-labelledby="trace-title">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">03 · RUNTIME TRACE</p>
            <h2 id="trace-title">Accepted operations</h2>
          </div>
          <span className="version-chip">{session.attempts.length} attempts</span>
        </div>
        {session.attempts.length === 0 ? (
          <p className="timeline-empty">Run the controlled scenario to generate evidence.</p>
        ) : (
          <ol className="checkout-attempts">
            {session.attempts.map((attempt, index) => (
              <li key={`${attempt.phase}-${index}`}>
                <strong>{attempt.phase.replaceAll("_", " ")}</strong>
                <code>{attempt.idempotencyKeyRef}</code>
                <code>{attempt.operationRef}</code>
                <span>{attempt.response === "lost" ? "response lost" : "response received"}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="notice" role="status" aria-live="polite">
          {statusMessage}
        </p>
        {handoffStatus !== "idle" && (
          <a className="primary-link" href="/">Open Release Evidence Room</a>
        )}
      </section>
    </main>
  );
}
