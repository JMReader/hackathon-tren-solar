import { Inter, Intel_One_Mono } from "next/font/google";

export const lpInter = Inter({
  variable: "--font-lp-inter",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const lpMono = Intel_One_Mono({
  variable: "--font-lp-intel-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});
