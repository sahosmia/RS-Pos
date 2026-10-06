import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowLeft, LoaderCircle, Plus, Save, X } from 'lucide-react';
import { type MouseEventHandler, type ReactNode } from 'react';

export interface AddButtonProps extends Omit<ButtonProps, 'title'> {
    href?: string;
    title?: ReactNode;
    label?: ReactNode;
    children?: ReactNode;
    onClick?: MouseEventHandler<HTMLButtonElement>;
}

export function AddButton({
    href,
    title,
    label,
    children,
    className,
    variant = 'default',
    size = 'default',
    ...props
}: AddButtonProps) {
    const content = label ?? title ?? children;

    if (href) {
        return (
            <Button asChild variant={variant} size={size} className={cn('gap-1.5', className)} {...props}>
                <Link href={href}>
                    <Plus className="size-4" />
                    {content}
                </Link>
            </Button>
        );
    }

    return (
        <Button variant={variant} size={size} className={cn('gap-1.5', className)} onClick={props.onClick} {...props}>
            <Plus className="size-4" />
            {content}
        </Button>
    );
}

export interface BackButtonProps extends Omit<ButtonProps, 'title'> {
    href?: string;
    title?: ReactNode;
    label?: ReactNode;
    children?: ReactNode;
    onClick?: MouseEventHandler<HTMLButtonElement>;
}

export function BackButton({
    href,
    title,
    label,
    children,
    className,
    variant = 'outline',
    size = 'default',
    onClick,
    ...props
}: BackButtonProps) {
    const content = label ?? title ?? children ?? 'Back';

    if (href) {
        return (
            <Button asChild variant={variant} size={size} className={cn('gap-1.5', className)} {...props}>
                <Link href={href}>
                    <ArrowLeft className="size-4" />
                    {content}
                </Link>
            </Button>
        );
    }

    const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
        if (onClick) {
            onClick(e);
        } else {
            window.history.back();
        }
    };

    return (
        <Button variant={variant} size={size} className={cn('gap-1.5', className)} onClick={handleClick} {...props}>
            <ArrowLeft className="size-4" />
            {content}
        </Button>
    );
}

export interface CancelButtonProps extends Omit<ButtonProps, 'title'> {
    href?: string;
    title?: ReactNode;
    label?: ReactNode;
    children?: ReactNode;
    onClick?: MouseEventHandler<HTMLButtonElement>;
}

export function CancelButton({
    href,
    title,
    label,
    children,
    className,
    variant = 'ghost',
    size = 'default',
    ...props
}: CancelButtonProps) {
    const content = label ?? title ?? children ?? 'Cancel';

    if (href) {
        return (
            <Button asChild variant={variant} size={size} className={cn('gap-1.5', className)} {...props}>
                <Link href={href}>
                    <X className="size-4" />
                    {content}
                </Link>
            </Button>
        );
    }

    return (
        <Button variant={variant} size={size} className={cn('gap-1.5', className)} onClick={props.onClick} {...props}>
            <X className="size-4" />
            {content}
        </Button>
    );
}

export interface SaveButtonProps extends Omit<ButtonProps, 'title'> {
    title?: ReactNode;
    label?: ReactNode;
    children?: ReactNode;
    processing?: boolean;
    loading?: boolean;
}

export function SaveButton({
    title,
    label,
    children,
    processing,
    loading,
    disabled,
    type = 'submit',
    variant = 'default',
    size = 'default',
    className,
    ...props
}: SaveButtonProps) {
    const isProcessing = processing || loading;
    const content = label ?? title ?? children ?? 'Save';

    return (
        <Button
            type={type}
            disabled={disabled || isProcessing}
            variant={variant}
            size={size}
            className={cn('gap-1.5', className)}
            onClick={props.onClick}
            {...props}
        >
            {isProcessing ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            {content}
        </Button>
    );
}
