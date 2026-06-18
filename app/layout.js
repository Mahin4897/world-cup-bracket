import "./globals.css";

export const metadata = {
  title: "World Cup 2026 - Bracket Predictor",
  description:
    "Predict the FIFA World Cup 2026 group stage and knockout bracket. 48 teams, 12 groups.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
