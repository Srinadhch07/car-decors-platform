import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, InputHTMLAttributes, RefObject } from "react";
import { Mail, MessageCircle, Phone, Send } from "lucide-react";
import { Container } from "../../components/ui";
import { useScrollReveal } from "../../lib/motion";
import { useShopSettings, hasContent } from "../../context/ShopSettingsContext";
import { ENQUIRY_SUBJECTS, MAX_CONTACT, MAX_MESSAGE, MAX_NAME } from "./contactContent";
import {
  buildEnquiryText,
  buildMailtoEnquiryUrl,
  buildWhatsAppEnquiryUrl,
  isValidContact,
} from "./enquiry";
import { EnquiryFineLines, EnquiryGradient } from "./ContactDecor";

interface EnquiryFormState {
  name: string;
  contact: string;
  subject: string;
  message: string;
}

type EnquiryErrors = Partial<Record<keyof EnquiryFormState, string>>;
type Status = "idle" | "opening" | "ready";
type HandoffChannel = "whatsapp" | "email";

const EMPTY_FORM: EnquiryFormState = { name: "", contact: "", subject: "", message: "" };

/**
 * Section C — enquiry composer.
 *
 * There is no backend enquiry endpoint in this project, so this never POSTs.
 * It validates the visitor's input, composes a readable message and hands it
 * off to a real configured channel (WhatsApp deep link or the visitor's email
 * client). The status text is deliberately honest: it confirms the handoff,
 * never that a message was delivered.
 */
export function EnquiryComposer() {
  const { data: shop } = useShopSettings();
  const scopeRef = useScrollReveal("[data-reveal]", { y: 30, stagger: 0.08, start: "top 84%" });

  const [form, setForm] = useState<EnquiryFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [channel, setChannel] = useState<HandoffChannel | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const hasWhatsApp = hasContent(shop?.whatsapp_number);
  const hasEmail = hasContent(shop?.email);
  const hasPhone = hasContent(shop?.phone);
  const canCompose = hasWhatsApp || hasEmail;

  const update = useCallback((key: keyof EnquiryFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    setStatus((prev) => (prev === "ready" ? "idle" : prev));
  }, []);

  const validate = useCallback((): EnquiryErrors => {
    const next: EnquiryErrors = {};

    const name = form.name.trim();
    if (!name) next.name = "Please enter your name.";
    else if (name.length > MAX_NAME) next.name = `Please keep your name under ${MAX_NAME} characters.`;

    const contact = form.contact.trim();
    if (!contact) next.contact = "Add a phone number or email so we can reply.";
    else if (contact.length > MAX_CONTACT) next.contact = `Please keep this under ${MAX_CONTACT} characters.`;
    else if (!isValidContact(contact)) next.contact = "Enter a valid phone number or email address.";

    const message = form.message.trim();
    if (!message) next.message = "Tell us how we can help.";
    else if (message.length > MAX_MESSAGE) next.message = `Please keep your message under ${MAX_MESSAGE} characters.`;

    return next;
  }, [form]);

  const handoff = useCallback(
    (target: HandoffChannel) => {
      const text = buildEnquiryText(
        {
          name: form.name.trim(),
          contact: form.contact.trim(),
          subject: form.subject,
          message: form.message.trim(),
        },
        { shopName: shop?.shop_name },
      );

      try {
        if (target === "whatsapp" && hasContent(shop?.whatsapp_number)) {
          window.open(
            buildWhatsAppEnquiryUrl(shop!.whatsapp_number, text),
            "_blank",
            "noopener,noreferrer",
          );
        } else if (target === "email" && hasContent(shop?.email)) {
          window.location.href = buildMailtoEnquiryUrl(shop!.email as string, form.subject, text);
        }
      } catch {
        /* A browser can block external handlers; the status text still guides the user. */
      }

      setChannel(target);
      setStatus("opening");
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setStatus("ready"), 900);
    },
    [form, shop],
  );

  const submit = useCallback(
    (target: HandoffChannel) => {
      if (status === "opening") return;

      const next = validate();
      setErrors(next);
      if (Object.keys(next).length > 0) {
        if (next.name) nameRef.current?.focus();
        else if (next.contact) contactRef.current?.focus();
        else if (next.message) messageRef.current?.focus();
        return;
      }
      handoff(target);
    },
    [handoff, status, validate],
  );

  const handleFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submit(hasContent(shop?.whatsapp_number) ? "whatsapp" : "email");
    },
    [shop, submit],
  );

  if (!canCompose && !hasPhone) return null;

  return (
    <section id="enquiry" ref={scopeRef} className="section-y relative overflow-hidden bg-surface">
      <EnquiryGradient className="inset-0" />
      <EnquiryFineLines className="inset-0 opacity-50" />

      <Container className="relative z-10">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-14">
          <div data-reveal className="lg:sticky lg:top-24">
            <span className="eyebrow">Enquiry</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              Send Us an Enquiry
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-text-secondary sm:text-base">
              {canCompose
                ? "Tell us what you need. We'll prepare your message and open WhatsApp or your email app so you can send it straight to us."
                : "Tell us what you need and give us a call — we're happy to help you find the right accessories."}
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Your name so we know who we're helping",
                "A phone number or email to reach you",
                "What you need — a product, price or advice",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 text-sm text-text-secondary">
                  <Send className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div data-reveal className="card-surface p-6 sm:p-8">
            {canCompose ? (
              <form className="space-y-5" onSubmit={handleFormSubmit} noValidate>
                <Field
                  id="enquiry-name"
                  label="Your Name"
                  error={errors.name}
                  inputRef={nameRef}
                  inputProps={{
                    value: form.name,
                    onChange: (event) => update("name", event.target.value),
                    placeholder: "e.g. Ravi Kumar",
                    maxLength: MAX_NAME,
                    autoComplete: "name",
                  }}
                />

                <Field
                  id="enquiry-contact"
                  label="Phone or Email"
                  error={errors.contact}
                  inputRef={contactRef}
                  inputProps={{
                    value: form.contact,
                    onChange: (event) => update("contact", event.target.value),
                    placeholder: "So we can get back to you",
                    maxLength: MAX_CONTACT,
                    autoComplete: "email",
                  }}
                />

                <div>
                  <label htmlFor="enquiry-subject" className="field-label">
                    Enquiry Type <span className="font-normal normal-case tracking-normal text-text-muted">(optional)</span>
                  </label>
                  <select
                    id="enquiry-subject"
                    className="field"
                    value={form.subject}
                    onChange={(event) => update("subject", event.target.value)}
                  >
                    <option value="">Choose a topic</option>
                    {ENQUIRY_SUBJECTS.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="enquiry-message" className="field-label">
                    Message
                  </label>
                  <textarea
                    id="enquiry-message"
                    ref={messageRef}
                    className={errors.message ? "field field-error min-h-[8rem] resize-y" : "field min-h-[8rem] resize-y"}
                    value={form.message}
                    onChange={(event) => update("message", event.target.value)}
                    placeholder="Tell us what you're looking for…"
                    maxLength={MAX_MESSAGE}
                    aria-invalid={errors.message ? true : undefined}
                    aria-describedby={errors.message ? "enquiry-message-error" : undefined}
                  />
                  <div className="mt-1.5 flex items-start justify-between gap-3">
                    <FieldError id="enquiry-message-error" message={errors.message} />
                    <span className="ml-auto text-xs text-text-muted">
                      {form.message.length}/{MAX_MESSAGE}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                  {hasWhatsApp && (
                    <button
                      type="submit"
                      disabled={status === "opening"}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-orange-700 active:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      Send on WhatsApp
                    </button>
                  )}
                  {hasEmail && (
                    <button
                      type="button"
                      onClick={() => submit("email")}
                      disabled={status === "opening"}
                      className="inline-flex items-center gap-2 rounded-xl border border-orange-600/40 bg-white px-6 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
                    >
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      Send via Email
                    </button>
                  )}
                </div>

                <p className="text-xs leading-relaxed text-text-muted">
                  This form prepares your message and opens WhatsApp or your email app — nothing is sent
                  until you confirm there.
                </p>

                <StatusMessage status={status} channel={channel} />
              </form>
            ) : (
              <div className="flex flex-col items-start">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-orange-600/10 text-orange-600">
                  <Phone className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-text-primary">Call Us to Enquire</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
                  Online messaging isn't set up yet. Give us a call and we'll help you right away.
                </p>
                <a
                  href={`tel:${shop!.phone}`}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-orange-700 active:bg-orange-800"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  Call {shop!.phone}
                </a>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  inputRef: RefObject<HTMLInputElement | null>;
  inputProps: InputHTMLAttributes<HTMLInputElement>;
}

function Field({ id, label, error, inputRef, inputProps }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        className={error ? "field field-error" : "field"}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
      {message}
    </p>
  );
}

function StatusMessage({ status, channel }: { status: Status; channel: HandoffChannel | null }) {
  if (status === "idle" || !channel) return null;

  const opening = status === "opening";
  const target = channel === "whatsapp" ? "WhatsApp" : "your email app";
  const text = opening
    ? `Opening ${target}…`
    : `${target} is opening with your enquiry — press Send there to reach us.`;

  return (
    <p role="status" aria-live="polite" className="text-xs font-medium text-orange-700">
      {text}
    </p>
  );
}
