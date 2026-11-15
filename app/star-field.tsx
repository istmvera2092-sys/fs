import type { CSSProperties } from "react";

export default function StarField() {
  return <div className="star-field" aria-hidden="true">{Array.from({ length: 48 }, (_, index) => (
    <i key={index} style={{
      left: ((index * 37 + 7) % 100) + "%",
      top: ((index * 23 + 3) % 97) + "%",
      "--delay": -(index % 9) + "s",
      "--duration": (3 + index % 5) + "s",
      "--size": (index % 5 === 0 ? 3 : 1.5) + "px",
    } as CSSProperties} />
  ))}</div>;
}
