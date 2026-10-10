import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper } from "../../test-utils";
import type { Testimonial } from "../../types/api";
import { TestimonialForm } from "./TestimonialForm";

function makeTestimonial(overrides: Partial<Testimonial> = {}): Testimonial {
  return {
    id: "t1",
    customer_name: "Asha Rao",
    text: "Great service and quality.",
    rating: 5,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

let lastPostBody: Record<string, unknown> | null = null;
let submitCount = 0;

const handlers = [
  http.post("*/api/testimonials", async ({ request }) => {
    submitCount += 1;
    lastPostBody = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(makeTestimonial(), { status: 201 });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  lastPostBody = null;
  submitCount = 0;
});
afterAll(() => server.close());

function renderForm() {
  return render(<TestimonialForm />, { wrapper: TestWrapper });
}

async function fillValidFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/your name/i), "Asha Rao");
  await user.type(screen.getByLabelText(/your testimonial/i), "Great service and quality.");
  await user.click(screen.getByLabelText(/i consent to this testimonial/i));
}

describe("TestimonialForm", () => {
  it("renders the form fields", () => {
    renderForm();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your testimonial/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rating/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/i consent to this testimonial/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit testimonial/i })).toBeInTheDocument();
  });

  it("shows a validation error when the name is missing", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: /submit testimonial/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please enter your name.");
    expect(submitCount).toBe(0);
  });

  it("shows a validation error when the testimonial text is missing", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/your name/i), "Asha Rao");
    await user.click(screen.getByRole("button", { name: /submit testimonial/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please enter your testimonial.",
    );
    expect(submitCount).toBe(0);
  });

  it("requires consent before submitting", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/your name/i), "Asha Rao");
    await user.type(screen.getByLabelText(/your testimonial/i), "Great service.");
    await user.click(screen.getByRole("button", { name: /submit testimonial/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please give consent to display your testimonial publicly.",
    );
    expect(submitCount).toBe(0);
  });

  it("submits trimmed values and shows a success message", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/your name/i), "  Asha Rao  ");
    await user.type(screen.getByLabelText(/your testimonial/i), "  Great service.  ");
    await user.selectOptions(screen.getByLabelText(/rating/i), "5");
    await user.click(screen.getByLabelText(/i consent to this testimonial/i));
    await user.click(screen.getByRole("button", { name: /submit testimonial/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/thank you!/i);
    expect(submitCount).toBe(1);
    expect(lastPostBody).toEqual({
      customer_name: "Asha Rao",
      text: "Great service.",
      rating: 5,
      consent: true,
      website: "",
    });
  });

  it("resets the form after a successful submission", async () => {
    const user = userEvent.setup();
    renderForm();

    await fillValidFields(user);
    await user.click(screen.getByRole("button", { name: /submit testimonial/i }));

    await screen.findByRole("status");
    expect(screen.getByLabelText(/your name/i)).toHaveValue("");
    expect(screen.getByLabelText(/your testimonial/i)).toHaveValue("");
    expect(screen.getByLabelText(/i consent to this testimonial/i)).not.toBeChecked();
  });

  it("shows the server error message when submission fails", async () => {
    server.use(
      http.post("*/api/testimonials", () =>
        HttpResponse.json({ detail: "Spam detected." }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    renderForm();

    await fillValidFields(user);
    await user.click(screen.getByRole("button", { name: /submit testimonial/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Spam detected.");
  });

  it("includes the honeypot value in the payload", async () => {
    const user = userEvent.setup();
    renderForm();

    await fillValidFields(user);
    fireEvent.change(screen.getByLabelText(/^website$/i), {
      target: { value: "http://spam.example" },
    });
    await user.click(screen.getByRole("button", { name: /submit testimonial/i }));

    await screen.findByRole("status");
    expect(lastPostBody?.website).toBe("http://spam.example");
  });
});
