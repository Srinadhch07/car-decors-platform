import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  EnquiryFineLines,
  EnquiryGradient,
  HeroContours,
  HeroLineMotif,
  HeroParticles,
  LightSweep,
  LocationRings,
  OptionAccents,
  OptionIconRings,
  RouteLines,
  SectionDivider,
} from "./ContactDecor";

describe("ContactDecor", () => {
  it("renders every decorative piece as aria-hidden", () => {
    const { container } = render(
      <div>
        <HeroContours />
        <HeroLineMotif />
        <HeroParticles />
        <OptionIconRings />
        <OptionAccents />
        <EnquiryGradient />
        <EnquiryFineLines />
        <LocationRings />
        <RouteLines />
        <LightSweep />
        <SectionDivider />
      </div>,
    );

    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(11);
  });
});
