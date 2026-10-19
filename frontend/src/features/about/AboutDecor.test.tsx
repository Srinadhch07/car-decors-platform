import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AngularPattern,
  ContourLines,
  DriftParticles,
  FineLines,
  FlowCurves,
  GeoDrift,
  LightSweep,
  LineShards,
  OrbitRings,
  OutlineGeometry,
  PerspectiveGrid,
  TimelineFlow,
} from "./AboutDecor";

describe("AboutDecor", () => {
  it("renders the full decorative family as hidden, image-free layers", () => {
    const { container } = render(
      <div>
        <ContourLines />
        <DriftParticles />
        <OrbitRings />
        <TimelineFlow />
        <FlowCurves />
        <LineShards />
        <OutlineGeometry />
        <AngularPattern />
        <PerspectiveGrid />
        <GeoDrift />
        <FineLines />
        <LightSweep />
      </div>,
    );

    const pieces = container.querySelectorAll('.about-decor[aria-hidden="true"]');
    expect(pieces.length).toBe(12);
    expect(container.querySelectorAll("img").length).toBe(0);
  });
});
