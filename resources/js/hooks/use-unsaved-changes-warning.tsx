import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type VisitOptions } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UnsavedChangesModalProps {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

export function UnsavedChangesModal({
    open,
    onConfirm,
    onCancel,
    title = 'Unsaved Changes',
    description = 'You have unsaved changes. Are you sure you want to leave?',
    confirmLabel = 'Discard & Leave',
    cancelLabel = 'Stay / Keep Editing',
}: UnsavedChangesModalProps) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button type="button" variant="destructive" onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function useUnsavedChangesWarning(isDirty: boolean, isProcessing: boolean = false) {
    const [showModal, setShowModal] = useState(false);
    const pendingVisitRef = useRef<{
        url: string | URL;
        options?: Record<string, unknown>;
    } | null>(null);
    const shouldBypassRef = useRef(false);

    const bypass = useCallback(() => {
        shouldBypassRef.current = true;
    }, []);

    // Browser Leave/Reload Blocking
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!isDirty || isProcessing || shouldBypassRef.current) return;
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty, isProcessing]);

    // Inertia Router Navigation Blocking
    useEffect(() => {
        if (!isDirty || isProcessing) return;

        const unbind = router.on('before', (event) => {
            if (shouldBypassRef.current) {
                shouldBypassRef.current = false;
                return;
            }

            const visit = event.detail.visit;

            // Only guard actually leaving the page: a GET to another path. Writes (saving, or creating a
            // category/brand/unit from a modal on this page) and same-page reloads must go through untouched —
            // blocking them popped this modal mid-task, and "Discard" then replayed the request without its
            // onSuccess/onError callbacks, so nothing seemed to happen.
            const isLeavingPage = visit.method === 'get' && new URL(visit.url, window.location.href).pathname !== window.location.pathname;
            if (!isLeavingPage) return;

            event.preventDefault();

            pendingVisitRef.current = {
                url: visit.url,
                options: {
                    method: visit.method,
                    data: visit.data,
                    replace: visit.replace,
                    preserveScroll: visit.preserveScroll,
                    preserveState: visit.preserveState,
                    only: visit.only,
                    headers: visit.headers,
                    errorBag: visit.errorBag,
                    forceFormData: visit.forceFormData,
                    queryStringArrayFormat: visit.queryStringArrayFormat,
                },
            };

            setShowModal(true);
        });

        return () => {
            unbind();
        };
    }, [isDirty, isProcessing]);

    const confirmLeave = useCallback(() => {
        shouldBypassRef.current = true;
        setShowModal(false);

        if (pendingVisitRef.current) {
            const { url, options } = pendingVisitRef.current;
            pendingVisitRef.current = null;
            router.visit(url, options as VisitOptions);
        }
    }, []);

    const cancelLeave = useCallback(() => {
        pendingVisitRef.current = null;
        setShowModal(false);
    }, []);

    const UnsavedChangesModalComponent = useCallback(() => {
        return <UnsavedChangesModal open={showModal} onConfirm={confirmLeave} onCancel={cancelLeave} />;
    }, [showModal, confirmLeave, cancelLeave]);

    return {
        showModal,
        confirmLeave,
        cancelLeave,
        bypass,
        UnsavedChangesModal: UnsavedChangesModalComponent,
    };
}
