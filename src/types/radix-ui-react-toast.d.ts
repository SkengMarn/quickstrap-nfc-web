// This file helps TypeScript understand the @radix-ui/react-toast module
declare module '@radix-ui/react-toast' {
  import * as React from 'react';

  export interface ToastProps extends React.ComponentPropsWithoutRef<'div'> {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    duration?: number;
    children?: React.ReactNode;
    className?: string;
  }

  export interface ToastActionProps extends React.ComponentPropsWithoutRef<'button'> {
    altText: string;
    children: React.ReactNode;
    className?: string;
  }

  export interface ToastCloseProps extends React.ComponentPropsWithoutRef<'button'> {
    className?: string;
    children?: React.ReactNode;
  }

  export interface ToastTitleProps extends React.ComponentPropsWithoutRef<'div'> {
    children: React.ReactNode;
    className?: string;
  }

  export interface ToastDescriptionProps extends React.ComponentPropsWithoutRef<'div'> {
    children: React.ReactNode;
    className?: string;
  }

  export interface ToastViewportProps extends React.ComponentPropsWithoutRef<'ol'> {
    className?: string;
  }

  export interface ToastProviderProps {
    children: React.ReactNode;
    duration?: number;
    label?: string;
    swipeDirection?: 'up' | 'down' | 'left' | 'right';
    swipeThreshold?: number;
  }

  export const Root: React.ForwardRefExoticComponent<
    ToastProps & React.RefAttributes<HTMLDivElement>
  >;
  
  export const Action: React.ForwardRefExoticComponent<
    ToastActionProps & React.RefAttributes<HTMLButtonElement>
  >;
  
  export const Close: React.ForwardRefExoticComponent<
    ToastCloseProps & React.RefAttributes<HTMLButtonElement>
  >;
  
  export const Title: React.ForwardRefExoticComponent<
    ToastTitleProps & React.RefAttributes<HTMLDivElement>
  >;
  
  export const Description: React.ForwardRefExoticComponent<
    ToastDescriptionProps & React.RefAttributes<HTMLDivElement>
  >;
  
  export const Viewport: React.ForwardRefExoticComponent<
    ToastViewportProps & React.RefAttributes<HTMLOListElement>
  >;
  
  export const Provider: React.FC<ToastProviderProps>;
}
