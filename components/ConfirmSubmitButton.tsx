'use client';

import type { ButtonHTMLAttributes } from 'react';

type ConfirmSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  confirmMessage: string;
};

export default function ConfirmSubmitButton({
  confirmMessage,
  onClick,
  ...props
}: ConfirmSubmitButtonProps) {
  return (
    <button
      {...props}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    />
  );
}
