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
                <DialogFooter className="gap-2">
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
    // The browser's Back button: Inertia handles it from the history itself (no efore event), so it needs its own guard.
    const pendingBackRef = useRef(false);
    const historyGuardedRef = useRef(false);

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

    // Browser Back blocking: while the form is dirty, sit one history entry above the page. Back then only lands on
    // the same URL, and we put the guard entry back and ask first.
    useEffect(() => {
        if (!isDirty || isProcessing) return;

        if (!historyGuardedRef.current) {
            window.history.pushState(window.history.state, '', window.location.href);
            historyGuardedRef.current = true;
        }

        const handlePopState = (event: PopStateEvent) => {
            if (shouldBypassRef.current) return;

            // Inertia's own handler would re-render this page from history with a fresh mount (losing the form and this
            // dialog), so it must never see the event: this listener runs first (capture) and stops it.
            event.stopImmediatePropagation();

            window.history.pushState(window.history.state, '', window.location.href);
            pendingBackRef.current = true;
            setShowModal(true);
        };

        window.addEventListener('popstate', handlePopState, true);

        return () => {
            window.removeEventListener('popstate', handlePopState, true);
        };
    }, [isDirty, isProcessing]);

    const confirmLeave = useCallback(() => {
        shouldBypassRef.current = true;
        setShowModal(false);

        if (pendingBackRef.current) {
            // Past the guard entry we re-pushed and the page's own entry, to wherever Back was heading.
            pendingBackRef.current = false;
            window.history.go(-2);

            return;
        }
        if (pendingVisitRef.current) {
            const { url, options } = pendingVisitRef.current;
            pendingVisitRef.current = null;
            router.visit(url, options as VisitOptions);
        }
    }, []);

    const cancelLeave = useCallback(() => {
        pendingVisitRef.current = null;
        pendingBackRef.current = false;
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
