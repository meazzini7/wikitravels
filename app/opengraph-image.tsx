import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "WikiTravels — il portale social per viaggiatori";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #dd2166 0%, #f13e7e 45%, #28a19d 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 160, lineHeight: 1, display: "flex" }}>🦩</div>
        <div
          style={{
            marginTop: 24,
            fontSize: 96,
            fontWeight: 800,
            color: "white",
            display: "flex",
          }}
        >
          WikiTravels
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 36,
            color: "rgba(255,255,255,0.9)",
            display: "flex",
          }}
        >
          Il portale social per viaggiatori
        </div>
      </div>
    ),
    { ...size }
  );
}
