export type Point = [lat: number, lon: number];

/** The path in a GPX file: its track points, or else its route points, or else its waypoints. */
export function parseGpx(xml: string): Point[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  for (const tag of ["trkpt", "rtept", "wpt"]) {
    const points = Array.from(doc.getElementsByTagNameNS("*", tag))
      .map((node): Point => [Number(node.getAttribute("lat")), Number(node.getAttribute("lon"))])
      .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180);
    if (points.length > 0) return points;
  }
  return [];
}
