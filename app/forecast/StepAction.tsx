"use client";

import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  cue: string;
};

export function StepAction({ cue, children, className = "", ...buttonProps }: Props) {
  return <div className="step-action">
    <p className="action-cue"><strong>지금 할 일</strong><span>{cue}</span></p>
    <button {...buttonProps} className={`primary guided-action ${className}`.trim()}>{children}</button>
  </div>;
}
