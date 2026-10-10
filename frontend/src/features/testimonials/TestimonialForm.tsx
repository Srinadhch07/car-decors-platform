import { type FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { api } from "../../lib/api/client";
import { Button } from "../../components/ui";

const MAX_NAME_LENGTH = 120;
const MAX_TEXT_LENGTH = 1000;

interface FormState {
  customer_name: string;
  text: string;
  rating: string;
  consent: boolean;
  website: string;
}

const INITIAL_FORM: FormState = {
  customer_name: "",
  text: "",
  rating: "",
  consent: false,
  website: "",
};

const fieldCls =
  "w-full rounded-md border border-border-light bg-white px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500";

export function TestimonialForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitted(false);

    const customerName = form.customer_name.trim();
    const text = form.text.trim();
    if (!customerName) {
      setError("Please enter your name.");
      return;
    }
    if (!text) {
      setError("Please enter your testimonial.");
      return;
    }
    if (!form.consent) {
      setError("Please give consent to display your testimonial publicly.");
      return;
    }

    setSubmitting(true);
    try {
      await api.submitTestimonial({
        customer_name: customerName,
        text,
        rating: form.rating ? Number(form.rating) : null,
        consent: form.consent,
        website: form.website,
      });
      setForm(INITIAL_FORM);
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Your testimonial could not be submitted. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {submitted && (
        <p
          role="status"
          className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          Thank you! Your testimonial has been submitted and will appear once it is
          reviewed.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="testimonial-name" className="mb-1 block text-sm font-medium text-text-primary">
          Your name
        </label>
        <input
          id="testimonial-name"
          name="customer_name"
          type="text"
          value={form.customer_name}
          maxLength={MAX_NAME_LENGTH}
          required
          autoComplete="name"
          onChange={(event) => update("customer_name", event.target.value)}
          className={fieldCls}
        />
      </div>

      <div>
        <label htmlFor="testimonial-text" className="mb-1 block text-sm font-medium text-text-primary">
          Your testimonial
        </label>
        <textarea
          id="testimonial-text"
          name="text"
          value={form.text}
          maxLength={MAX_TEXT_LENGTH}
          rows={4}
          required
          onChange={(event) => update("text", event.target.value)}
          className={fieldCls}
        />
        <p className="mt-1 text-right text-xs text-text-muted">
          {form.text.length}/{MAX_TEXT_LENGTH}
        </p>
      </div>

      <div>
        <label htmlFor="testimonial-rating" className="mb-1 block text-sm font-medium text-text-primary">
          Rating (optional)
        </label>
        <select
          id="testimonial-rating"
          name="rating"
          value={form.rating}
          onChange={(event) => update("rating", event.target.value)}
          className={fieldCls}
        >
          <option value="">No rating</option>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value} {value === 1 ? "star" : "stars"}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-start gap-2">
        <input
          id="testimonial-consent"
          name="consent"
          type="checkbox"
          checked={form.consent}
          required
          onChange={(event) => update("consent", event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border-light text-orange-600 focus:ring-orange-500"
        />
        <label htmlFor="testimonial-consent" className="text-sm text-text-secondary">
          I consent to this testimonial being displayed publicly on this website.
        </label>
      </div>

      {/* Honeypot: hidden from people, tempting to naive spam bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="testimonial-website">Website</label>
        <input
          id="testimonial-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(event) => update("website", event.target.value)}
        />
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        <Send className="h-4 w-4" />
        {submitting ? "Submitting..." : "Submit testimonial"}
      </Button>
    </form>
  );
}

export default TestimonialForm;
