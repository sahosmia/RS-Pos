import { getAssetActions } from '@/components/assets/asset-actions';
import DataTableCheckbox from '@/components/data-table/data-table-checkbox';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { type AssetListItem } from '@/types/models';
import { Link } from '@inertiajs/react';

interface AssetGridCardProps {
    asset: AssetListItem;
    selected: boolean;
    onToggleSelected: (checked: boolean) => void;
    onEdit: (asset: AssetListItem) => void;
    onDelete: (asset: AssetListItem) => void;
}

/** One asset as a card — the grid view and the mobile list. */
export function AssetGridCard({ asset, selected, onToggleSelected, onEdit, onDelete }: AssetGridCardProps) {
    const money = useMoneyFormat();

    return (
        <div className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                    <DataTableCheckbox checked={selected} onCheckedChange={onToggleSelected} />
                    <div className="min-w-0">
                        <Link href={route('assets.show', asset.id)} className="truncate font-medium underline-offset-2 hover:underline">
                            {asset.name}
                        </Link>
                        <div className="text-muted-foreground text-xs">{asset.purchase_date ?? '—'}</div>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <span className="font-medium tabular-nums">{money(asset.current_value)}</span>
                    <DataTableRowActions actions={getAssetActions(asset, { onEdit, onDelete })} />
                </div>
            </div>
        </div>
    );
}
