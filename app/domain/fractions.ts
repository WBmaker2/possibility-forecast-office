import type { Fraction, HalfRelation } from "./types";

export function createFraction(numerator: number, denominator: number): Fraction {
  if (!Number.isInteger(denominator) || denominator <= 0) {
    throw new Error("denominator must be a positive integer");
  }
  if (!Number.isInteger(numerator) || numerator < 0 || numerator > denominator) {
    throw new Error("numerator must be an integer between 0 and denominator");
  }
  return { numerator, denominator };
}

export function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function reduceFraction(fraction: Fraction): Fraction {
  const divisor = greatestCommonDivisor(fraction.numerator, fraction.denominator);
  return {
    numerator: fraction.numerator / divisor,
    denominator: fraction.denominator / divisor,
  };
}

export function compareFractions(left: Fraction, right: Fraction): number {
  return left.numerator * right.denominator - right.numerator * left.denominator;
}

export function relationToHalf(fraction: Fraction): HalfRelation {
  const doubledNumerator = fraction.numerator * 2;
  if (doubledNumerator < fraction.denominator) return "below";
  if (doubledNumerator > fraction.denominator) return "above";
  return "equal";
}

export function addFractions(left: Fraction, right: Fraction): Fraction {
  return createFraction(
    left.numerator + right.numerator,
    left.denominator + right.denominator,
  );
}
