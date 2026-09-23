import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_THEME } from "../../../lib/theme";
import { THEME_PRESETS } from "../../../lib/theme";
import { ThemeEditor } from "./ThemeEditor";

const racingRed = THEME_PRESETS.find((p) => p.id === "racing-red")!.colors;

function renderEditor(theme: typeof DEFAULT_THEME = DEFAULT_THEME) {
  const onChange = vi.fn();
  render(<ThemeEditor value={theme} onChange={onChange} />);
  return { onChange };
}

describe("ThemeEditor", () => {
  it("loads the saved theme into the preset and hex inputs", () => {
    renderEditor();
    expect(screen.getByLabelText("Website theme preset")).toHaveValue("automotive-orange");
    expect(screen.getByLabelText("Brand color hex code")).toHaveValue("#F97316");
    expect(screen.getByLabelText("Body text hex code")).toHaveValue("#1A1A1A");
  });

  it("reports selection of a preset as a complete theme", async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor();
    await user.selectOptions(screen.getByLabelText("Website theme preset"), "racing-red");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ preset: "racing-red", primary: racingRed.primary }),
    );
  });

  it("keeps current colors when choosing the Custom option", async () => {
    const user = userEvent.setup();
    const theme = { ...DEFAULT_THEME, primary: "#DC2626" };
    const { onChange } = renderEditor(theme);
    await user.selectOptions(screen.getByLabelText("Website theme preset"), "custom");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ preset: "custom", primary: "#DC2626" }),
    );
  });

  it("reports hex code edits", () => {
    const { onChange } = renderEditor();
    fireEvent.change(screen.getByLabelText("Brand color hex code"), {
      target: { value: "#123456" },
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ primary: "#123456" }));
  });

  it("warns about low body-text contrast", () => {
    renderEditor({ ...DEFAULT_THEME, foreground: "#FFFFFF", background: "#FFFFFF" });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/Body text: low contrast/i);
  });

  it("does not warn for the default theme", () => {
    renderEditor();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not mutate the document root while editing", () => {
    document.documentElement.removeAttribute("style");
    renderEditor();
    expect(document.documentElement.style.getPropertyValue("--theme-primary")).toBe("");
  });
});