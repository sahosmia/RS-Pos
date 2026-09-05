import HeadingSmall from '@/components/heading-small';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type BackupListItem } from '@/types/models';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

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

    const uploadForm = useForm<{ file: File | null; confirmation: string }>({
        file: null,
        confirmation: '',
    });

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

    const submitUpload: FormEventHandler = (e) => {
        e.preventDefault();

        uploadForm.post(route('backups.upload-restore'), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => uploadForm.reset(),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Backups" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall
                        title="Backups"
                        description="প্রতিদিন রাতে automatic backup হয় — এখান থেকে এখনই backup নেওয়া, ডাউনলোড, বা restore করা যায়"
                    />
                    <Button onClick={runBackupNow} disabled={runningBackup}>
                        {runningBackup ? 'Backing up...' : 'Backup Now'}
                    </Button>
                </div>

                {backups.length === 0 ? (
                    <EmptyState title="No backups yet" description="“Backup Now” চাপুন, অথবা রাতের scheduled backup-এর জন্য অপেক্ষা করুন" />
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">File</th>
                                    <th className="px-4 py-2 text-left font-medium">Date</th>
                                    <th className="px-4 py-2 text-right font-medium">Size</th>
                                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {backups.map((backup) => (
                                    <tr key={backup.filename} className="border-t">
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

                <div className="max-w-md space-y-3 rounded-lg border p-4">
                    <HeadingSmall
                        title="Upload & Restore"
                        description="নতুন হোস্টিং-এ migrate করার সময় — অন্য জায়গার backup zip আপলোড করে সরাসরি restore করুন"
                    />
                    <form onSubmit={submitUpload} className="space-y-3">
                        <Input type="file" accept=".zip" onChange={(e) => uploadForm.setData('file', e.target.files?.[0] ?? null)} required />
                        <div className="grid gap-2">
                            <Label htmlFor="upload_confirmation">Type RESTORE to confirm</Label>
                            <Input
                                id="upload_confirmation"
                                value={uploadForm.data.confirmation}
                                onChange={(e) => uploadForm.setData('confirmation', e.target.value)}
                                placeholder="RESTORE"
                                required
                            />
                        </div>
                        <Button type="submit" variant="destructive" disabled={uploadForm.processing || uploadForm.data.confirmation !== 'RESTORE'}>
                            {uploadForm.processing ? 'Uploading...' : 'Upload & Restore'}
                        </Button>
                    </form>
                </div>
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
                <div className="grid gap-2 pt-2">
                    <Label htmlFor="restore_confirmation">Type RESTORE to confirm</Label>
                    <Input
                        id="restore_confirmation"
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
