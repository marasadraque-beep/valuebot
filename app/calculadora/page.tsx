import type { Metadata } from "next";
import Calculadora from "./calculadora";

export const metadata: Metadata = {
  title: "Calculadora de investimento | ValueBot AI",
  description:
    "Simula a evolução do capital investido, dos reforços mensais e do efeito da inflação.",
};

export default function CalculadoraPage() {
  return <Calculadora />;
}
