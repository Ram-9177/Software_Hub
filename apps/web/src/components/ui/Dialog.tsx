import React, { type ReactNode } from 'react';
import { Modal } from './Modal';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}) => {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      maxWidth={maxWidth}
      footer={footer}
    >
      {children}
    </Modal>
  );
};

export default Dialog;
