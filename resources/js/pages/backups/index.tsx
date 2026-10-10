import { FormInput } from '@/components/form/form-input';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { pageContainer } from '@/lib/page-container';
import { type BreadcrumbItem } from '@/types';
import { type BackupListItem } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Backups', href: '/backups' }];

interface BackupsIndexProps {
    backups: BackupListItem[];
}

const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

export default function BackupsIndex({ backups }: BackupsIndexProps) {
    const [runningBackup, setRunningBackup] = useState(false);
    const [restoring, setRestoring] = useState<BackupListItem | null>(null);
    const [deleting, setDeleting] = useState<BackupListItem | null>(null);
    const [restoreConfirmation, setRestoreConfirmation] = useState('');
    const [processing, setProcessing] = useState(false);

    const runBackupNow = () => {
        setRunningBackup(true);
        router.post(route('backups.store'), undefined, {
            preserveScroll: true,
            onFinish: () => setRunningBackup(false),
        });
    };

    const confirmRestore = () => {
        if (!restoring) return;

        setProcessing(true);
        router.post(
            route('backups.restore', restoring.filename),
            { confirmation: restoreConfirmation },
            {
                preserveScroll: true,
                onFinish: () => {
                    setProcessing(false);
                    setRestoring(null);
                    setRestoreConfirmation('');
                },
            },
        );
    };

    const confirmDelete = () => {
        if (!deleting) return;

        router.delete(route('backups.destroy', deleting.filename), {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Backups" />

            <div className={pageContainer.medium}>
                <PageHeader
                    title="Backups"
                    description="প্রতিদিন রাতে automatic backup হয় (শেষ ৩ দিনেরটা থাকে) — Backup & Download চাপলে এখনই backup হয়ে সরাসরি ডাউনলোড হবে (প্রতিটি zip-এ database ও storage-এর ছবি/ফাইল দুটোই থাকে)"
                    actions={
                        <>
                            <Button onClick={runBackupNow} disabled={runningBackup}>
                                {runningBackup ? 'Backing up...' : 'Backup & Download'}
                            </Button>
                        </>
                    }
                />

                {backups.length === 0 ? (
                    <EmptyState title="No backups yet" description="“Backup & Download” চাপুন, অথবা রাতের scheduled backup-এর জন্য অপেক্ষা করুন" />
                ) : (
                    <div className="rounded-brand-card bg-card overflow-x-auto shadow-[var(--brand-card-shadow-elevated)]">
                        <table className="w-full text-sm">
                            <thead className="bg-brand-table-header text-muted-foreground text-xs font-semibold">
                                <tr>
                                    <th className="px-4 py-2.5 text-left font-medium">File</th>
                                    <th className="px-4 py-2.5 text-left font-medium">Date</th>
                                    <th className="px-4 py-2.5 text-right font-medium">Size</th>
                                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {backups.map((backup) => (
                                    <tr
                                        key={backup.filename}
                                        className="border-brand-table-divider hover:bg-brand-table-row-hover motion-colors border-t"
                                    >
                                        <td className="px-4 py-2 font-mono">{backup.filename}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{backup.date}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{formatSize(backup.size_in_bytes)}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <a href={route('backups.download', backup.filename)}>Download</a>
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => setRestoring(backup)}>
                                                    Restore
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => setDeleting(backup)}>
                                                    Delete
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={restoring !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setRestoring(null);
                        setRestoreConfirmation('');
                    }
                }}
                title="Restore this backup?"
                description={`"${restoring?.filename}" থেকে database restore হবে — এটা irreversible, বর্তমান database-এর একটা safety backup আগে নেওয়া হবে।`}
                confirmLabel="Restore"
                processing={processing}
                confirmDisabled={restoreConfirmation !== 'RESTORE'}
                onConfirm={confirmRestore}
            >
                <div className="pt-2">
                    <FormInput
                        id="restore_confirmation"
                        label="Type RESTORE to confirm"
                        value={restoreConfirmation}
                        onChange={(e) => setRestoreConfirmation(e.target.value)}
                        placeholder="RESTORE"
                    />
                </div>
            </ConfirmDialog>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete this backup?"
                description={`"${deleting?.filename}" স্থায়ীভাবে মুছে যাবে।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
