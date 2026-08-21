import type { ComponentChildren } from "preact";

import { ChevronDownIcon } from "./Icon.tsx";

export function SelectField({
  children,
  className = "",
}: {
  children: ComponentChildren;
  className?: string;
}) {
  return (
    <span class={`select-field${className ? ` ${className}` : ""}`}>
      {children}
      <ChevronDownIcon />
    </span>
  );
}
