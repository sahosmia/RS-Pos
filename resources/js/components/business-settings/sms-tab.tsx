import { SETTINGS_SECTION, SettingsTab } from '@/components/business-settings/settings-tab';
import { type BusinessSettingsApi } from '@/components/business-settings/types';
import { FormInput } from '@/components/form/form-input';
import { FormSection } from '@/components/form/form-section';
import { FormSelect } from '@/components/form/form-select';
import { ToggleRow } from '@/components/form/toggle-row';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { router } from '@inertiajs/react';
import { MessageSquare, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

/** Bulk SMS: the SMS company's HTTP API, set here so changing company never needs a code change. */
export function SmsTab({ form, apiKeySet }: { form: BusinessSettingsApi; apiKeySet: boolean }) {
    const { data, setData, errors } = form;
    const [testPhone, setTestPhone] = useState('');
    const [testing, setTesting] = useState(false);

    const sendTest = () => {
        router.post(
            route('business-settings.sms.test'),
            { phone: testPhone },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setTesting(true),
                onFinish: () => setTesting(false),
                onSuccess: () => toast.success('Test SMS accepted by the SMS company.'),
                onError: (errs) => toast.error(errs.sms ?? errs.phone ?? 'Test SMS failed.'),
            },
        );
    };

    return (
        <SettingsTab value="sms">
            <FormSection
                {...SETTINGS_SECTION}
                title="Bulk SMS"
                description="Connect your SMS company once here. Save first, then send a test."
                icon={MessageSquare}
            >
                <ToggleRow
                    id="sms_enabled"
                    label="Enable SMS"
                    description="When off, the Send Notification dialog will not offer to send SMS."
                    checked={data.sms_enabled}
                    onCheckedChange={(checked) => setData('sms_enabled', checked)}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <FormInput
                            id="sms_gateway_url"
                            label="Gateway URL"
                            type="url"
                            placeholder="https://sms.example.com/api/send"
                            value={data.sms_gateway_url}
                            onChange={(e) => setData('sms_gateway_url', e.target.value)}
                            error={errors.sms_gateway_url}
                            helperText="The HTTP API address given by your SMS company."
                        />
                    </div>
                    <FormSelect
                        id="sms_http_method"
                        label="Request method"
                        value={data.sms_http_method}
                        onChange={(val) => val && setData('sms_http_method', val)}
                        options={[
                            { value: 'GET', label: 'GET' },
                            { value: 'POST', label: 'POST' },
                        ]}
                        error={errors.sms_http_method}
                    />
                    <FormSelect
                        id="sms_auth_mode"
                        label="Send API key as"
                        value={data.sms_auth_mode}
                        onChange={(val) => val && setData('sms_auth_mode', val)}
                        options={[
                            { value: 'param', label: 'Request parameter' },
                            { value: 'bearer', label: 'Bearer token header' },
                        ]}
                        error={errors.sms_auth_mode}
                    />
                    <FormInput
                        id="sms_api_key"
                        label="API key"
                        type="password"
                        autoComplete="new-password"
                        value={data.sms_api_key}
                        onChange={(e) => setData('sms_api_key', e.target.value)}
                        error={errors.sms_api_key}
                        placeholder={apiKeySet ? '•••••••• (saved — leave blank to keep)' : 'Paste your API key'}
                        helperText="Stored encrypted and never shown again."
                    />
                    <FormInput
                        id="sms_sender_id"
                        label="Sender ID"
                        value={data.sms_sender_id}
                        onChange={(e) => setData('sms_sender_id', e.target.value)}
                        error={errors.sms_sender_id}
                    />
                    <FormInput
                        id="sms_api_key_param"
                        label="API key parameter name"
                        value={data.sms_api_key_param}
                        onChange={(e) => setData('sms_api_key_param', e.target.value)}
                        error={errors.sms_api_key_param}
                    />
                    <FormInput
                        id="sms_sender_param"
                        label="Sender parameter name"
                        value={data.sms_sender_param}
                        onChange={(e) => setData('sms_sender_param', e.target.value)}
                        error={errors.sms_sender_param}
                    />
                    <FormInput
                        id="sms_phone_param"
                        label="Phone parameter name"
                        value={data.sms_phone_param}
                        onChange={(e) => setData('sms_phone_param', e.target.value)}
                        error={errors.sms_phone_param}
                    />
                    <FormInput
                        id="sms_message_param"
                        label="Message parameter name"
                        value={data.sms_message_param}
                        onChange={(e) => setData('sms_message_param', e.target.value)}
                        error={errors.sms_message_param}
                    />
                    <FormSelect
                        id="sms_phone_format"
                        label="Phone number format"
                        value={data.sms_phone_format}
                        onChange={(val) => val && setData('sms_phone_format', val)}
                        options={[
                            { value: 'international', label: '8801XXXXXXXXX' },
                            { value: 'local', label: '01XXXXXXXXX' },
                        ]}
                        error={errors.sms_phone_format}
                    />
                    <FormInput
                        id="sms_success_text"
                        label="Success text (optional)"
                        value={data.sms_success_text}
                        onChange={(e) => setData('sms_success_text', e.target.value)}
                        error={errors.sms_success_text}
                        helperText="If set, a reply must contain this text to count as sent."
                    />
                    <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor="sms_extra_params">Extra parameters (optional)</Label>
                        <Textarea
                            id="sms_extra_params"
                            rows={3}
                            placeholder={'type=text\nlanguage=unicode'}
                            value={data.sms_extra_params}
                            onChange={(e) => setData('sms_extra_params', e.target.value)}
                        />
                        <p className="text-muted-foreground text-xs">One name=value per line, sent with every message.</p>
                        {errors.sms_extra_params && <p className="text-destructive text-xs">{errors.sms_extra_params}</p>}
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-full max-w-xs">
                        <FormInput
                            id="sms_test_phone"
                            label="Send a test SMS to"
                            type="tel"
                            placeholder="01XXXXXXXXX"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                        />
                    </div>
                    <Button type="button" variant="outline" disabled={testing || testPhone.trim() === ''} onClick={sendTest}>
                        <Send className="size-4" /> Send test
                    </Button>
                </div>
            </FormSection>
        </SettingsTab>
    );
}
