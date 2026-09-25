import { useEffect } from "react";
import { applySeo, type SeoData } from "../../lib/seo";

export interface SeoHeadProps {
  data: SeoData;
}

/**
 * Renders nothing but keeps <head> in sync with the current page's metadata.
 *
 * The effect depends on the JSON snapshot of the props so re-renders with
 * identical data are no-ops and oxlint's exhaustive-deps rule stays happy.
 */
export function SeoHead({ data }: SeoHeadProps): null {
  const serialized = JSON.stringify(data);
  useEffect(() => {
    applySeo(JSON.parse(serialized) as SeoData);
  }, [serialized]);
  return null;
}

export default SeoHead;