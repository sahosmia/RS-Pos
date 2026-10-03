import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import { type MessageChannel } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

interface SendNotificationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Contacts currently selected on the Contacts list page. */
    recipients: { id: number; name: string; email: string | null }[];
    onSuccess?: () => void;
}

export default function SendNotificationModal({ open, onOpenChange, recipients, onSuccess }: SendNotificationModalProps) {
    const { t } = useTranslation();

    const form = useForm({
        ids: [] as number[],
        channel: 'sms' as MessageChannel,
        subject: '',
        message: '',
    });

    // Email is only offered when every selected contact actually has one on
    // file — phone (needed for SMS/WhatsApp) is a required field, so those
    // two channels are always available for a bulk send.
    const emailAvailable = recipients.length > 0 && recipients.every((contact) => !!contact.email);

    const availableChannels = useMemo(() => {
        const channelOptions: { value: MessageChannel; label: string }[] = [
            { value: 'sms', label: t('contactNotification', 'sms') },
            { value: 'whatsapp', label: t('contactNotification', 'whatsapp') },
            { value: 'email', label: t('contactNotification', 'email_channel') },
        ];

        return channelOptions.filter((option) => option.value !== 'email' || emailAvailable);
    }, [t, emailAvailable]);

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({ ids: recipients.map((contact) => contact.id), channel: 'sms', subject: '', message: '' });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('contacts.send-notification'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(
                    `${t('contactNotification', 'sent_toast_prefix')} ${recipients.length} ${t('contactNotification', 'sent_toast_suffix')}`,
                );
                onOpenChange(false);
                onSuccess?.();
            },
            onError: () => toast.error(t('contactNotification', 'error_toast')),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={t('contactNotification', 'title')}
            description={`${t('contactNotification', 'sending_to_prefix')} ${recipients.length} ${t('contactNotification', 'sending_to_suffix')}`}
            submitLabel={t('contactNotification', 'send')}
            processing={form.processing}
            onSubmit={submit}
        >
            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="channel" required>{t('contactNotification', 'channel')}</Label>
                <Select value={form.data.channel} onValueChange={(value) => form.setData('channel', value as MessageChannel)}>
                    <SelectTrigger id="channel">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {availableChannels.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {!emailAvailable && <p className="text-muted-foreground text-xs">{t('contactNotification', 'email_unavailable_hint')}</p>}
                <InputError message={form.errors.channel} />
            </div>

            {form.data.channel === 'email' && (
                <FormInput
                    id="subject"
                    label={t('contactNotification', 'subject')}
                    value={form.data.subject}
                    onChange={(e) => form.setData('subject', e.target.value)}
                    error={form.errors.subject}
                    required
                />
            )}

            <div className="grid min-w-0 content-start gap-2">
                <Label htmlFor="message" required>{t('contactNotification', 'message')}</Label>
                <Textarea
                    id="message"
                    placeholder="Write your message"
                    value={form.data.message}
                    onChange={(e) => form.setData('message', e.target.value)}
                    rows={4}
                    maxLength={1000}
                    required
                />
                <InputError message={form.errors.message} />
            </div>
        </FormModal>
    );
}
