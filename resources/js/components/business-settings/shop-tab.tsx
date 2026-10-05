import { SETTINGS_SECTION, SettingsTab } from '@/components/business-settings/settings-tab';
import { type BusinessSettingsApi } from '@/components/business-settings/types';
import { FormInput } from '@/components/form/form-input';
import { FormSection } from '@/components/form/form-section';
import { ShoppingBag } from 'lucide-react';

/** Shop name, phone, currency and address. */
export function ShopTab({ form }: { form: BusinessSettingsApi }) {
    const { data, setData, errors } = form;

    return (
        <SettingsTab value="business">
            <FormSection {...SETTINGS_SECTION} title="Shop Information" description="Basic information about your business." icon={ShoppingBag}>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <FormInput
                            id="shop_name"
                            label="Shop Name"
                            value={data.shop_name}
                            onChange={(e) => setData('shop_name', e.target.value)}
                            error={errors.shop_name}
                            placeholder="e.g. My Retail Shop"
                            required
                        />
                    </div>

                    <FormInput
                        id="shop_phone"
                        label="Shop Phone"
                        value={data.shop_phone}
                        onChange={(e) => setData('shop_phone', e.target.value)}
                        error={errors.shop_phone}
                        placeholder="+8801700000000"
                    />

                    <FormInput
                        id="currency_symbol"
                        label="Currency Symbol"
                        value={data.currency_symbol}
                        onChange={(e) => setData('currency_symbol', e.target.value)}
                        error={errors.currency_symbol}
                        placeholder="৳"
                        required
                    />

                    <div className="md:col-span-2">
                        <FormInput
                            id="shop_address"
                            label="Shop Address"
                            value={data.shop_address}
                            onChange={(e) => setData('shop_address', e.target.value)}
                            error={errors.shop_address}
                            placeholder="Street, City, Country"
                        />
                    </div>
                </div>
            </FormSection>
        </SettingsTab>
    );
}
